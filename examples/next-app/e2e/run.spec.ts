import { spawn, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";

const cli = resolve("node_modules/reeldiff/dist/cli.mjs");
const listen = (server: Server) =>
  new Promise<string>((done) =>
    server.listen(0, "127.0.0.1", () =>
      done(`http://127.0.0.1:${(server.address() as AddressInfo).port}`),
    ),
  );

async function project(webhook: string) {
  const cwd = await mkdtemp(join(tmpdir(), "reeldiff-run-"));
  const git = (...args: string[]) => spawnSync("git", args, { cwd, encoding: "utf8" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  await writeFile(
    join(cwd, "reeldiff.config.mjs"),
    `export default ${JSON.stringify({
      stepDelay: 0,
      uiPaths: ["src/**"],
      notify: { slack: { webhookUrl: webhook }, githubComment: false },
    })};\n`,
  );
  await mkdir(join(cwd, ".reeldiff", "flows"), { recursive: true });
  await writeFile(
    join(cwd, ".reeldiff", "flows", "upgrade-plan.yaml"),
    await readFile(resolve(".reeldiff/flows/upgrade-plan.yaml"), "utf8"),
  );
  await mkdir(join(cwd, "src", "features", "billing"), { recursive: true });
  await writeFile(join(cwd, "src", "features", "billing", "plan-picker.tsx"), "export {};\n");
  git("add", ".");
  git("commit", "-q", "-m", "base");
  await writeFile(
    join(cwd, "src", "features", "billing", "plan-picker.tsx"),
    "export const x = 1;\n",
  );
  git("commit", "-qam", "change billing");
  return cwd;
}

test.describe("reeldiff run", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "chromium", "drives its own Chromium");
  });
  test.describe.configure({ timeout: 180_000 });

  test("posts only when the UI actually changed", async ({ baseURL }) => {
    const posts: string[] = [];
    const slack = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        posts.push(body);
        res.writeHead(200).end("ok");
      });
    });
    const webhook = `${await listen(slack)}/hook`;

    const upstream = new URL(baseURL ?? "");
    const restyled = createServer((req, res) => {
      const forward = request(
        {
          host: upstream.hostname,
          port: upstream.port,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, "accept-encoding": "identity" },
        },
        (reply) => {
          if (!reply.headers["content-type"]?.includes("text/html")) {
            res.writeHead(reply.statusCode ?? 200, reply.headers);
            reply.pipe(res);
            return;
          }
          let html = "";
          reply.on("data", (chunk) => {
            html += chunk;
          });
          reply.on("end", () => {
            const headers = { ...reply.headers };
            delete headers["content-length"];
            res.writeHead(reply.statusCode ?? 200, headers);
            res.end(
              html.replace("</head>", "<style>main h3{font-size:28px!important}</style></head>"),
            );
          });
        },
      );
      req.pipe(forward);
    });
    const restyledUrl = await listen(restyled);

    const cwd = await project(webhook);
    const run = (compare: string) =>
      new Promise<{ status: number | null; stdout: string; stderr: string }>((done) => {
        const child = spawn(
          process.execPath,
          [
            cli,
            "run",
            "--base",
            "HEAD~1",
            "--head",
            "HEAD",
            "--url",
            baseURL ?? "",
            "--compare-url",
            compare,
            "--repo",
            "acme/plot",
            "--pr",
            "5",
            "--title",
            "Billing tweak",
          ],
          { cwd, env: { ...process.env, GITHUB_TOKEN: "", GH_TOKEN: "", GITHUB_EVENT_PATH: "" } },
        );
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
          stdout += chunk;
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });
        child.on("close", (status) => done({ status, stdout, stderr }));
      });

    const same = await run(baseURL ?? "");
    expect(same.status, same.stderr).toBe(0);
    expect(same.stdout).toContain("upgrade-plan: unchanged");
    expect(same.stdout).toContain("Not notifying");
    expect(posts).toHaveLength(0);

    const different = await run(restyledUrl);
    expect(different.status, different.stderr).toBe(0);
    expect(different.stdout).toContain("upgrade-plan: changed");
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0] ?? "{}").text).toContain("Billing tweak (#5)");

    slack.close();
    restyled.close();
  });
});
