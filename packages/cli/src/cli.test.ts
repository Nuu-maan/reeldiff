import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { version } from "@reeldiff/core";
import { expect, test } from "vitest";

const cli = resolve("dist/cli.mjs");
const run = (args: string[], cwd?: string) => {
  const { status, stdout, stderr } = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
  });
  return { status, stdout: stdout.trim(), stderr: stderr.trim() };
};

test("prints the version", () => {
  expect(run(["--version"]).stdout).toBe(version);
});

test("lists the replay command in help", () => {
  expect(run(["--help"]).stdout).toMatch(/Usage: reeldiff[\s\S]*replay/);
});

test("explains a missing config without a stack trace", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "reeldiff-cli-"));
  const result = run(["replay", "anything"], cwd);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/^No config found/);
  expect(result.stderr).not.toMatch(/at .*\.mjs/);
});

test("names known flows when the flow id is wrong", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "reeldiff-cli-"));
  await writeFile(
    join(cwd, "reeldiff.config.mjs"),
    'export default { baseUrl: "http://localhost:1" };\n',
  );
  await mkdir(join(cwd, ".reeldiff", "flows"), { recursive: true });
  await writeFile(
    join(cwd, ".reeldiff", "flows", "signup.yaml"),
    "id: signup\ntitle: Sign up\nsteps:\n  - { action: goto, url: / }\n",
  );
  const result = run(["replay", "login"], cwd);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/No flow "login".*Known flows: signup/);
});

test("affected lists flows and routes for a git range", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "reeldiff-git-"));
  const git = (...args: string[]) => spawnSync("git", args, { cwd, encoding: "utf8" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  await writeFile(
    join(cwd, "reeldiff.config.mjs"),
    'export default { framework: "nextjs-app", uiPaths: ["app/**", "components/**"] };\n',
  );
  await mkdir(join(cwd, ".reeldiff", "flows"), { recursive: true });
  await writeFile(
    join(cwd, ".reeldiff", "flows", "billing.yaml"),
    'id: billing\ntitle: Billing\ncovers: ["components/billing/**"]\nsteps:\n  - { action: goto, url: /settings/billing }\n',
  );
  await mkdir(join(cwd, "components", "billing"), { recursive: true });
  await mkdir(join(cwd, "app", "settings", "team"), { recursive: true });
  await writeFile(join(cwd, "README.md"), "x\n");
  git("add", ".");
  git("commit", "-q", "-m", "base");
  await writeFile(join(cwd, "components", "billing", "plan.tsx"), "export {};\n");
  await writeFile(join(cwd, "app", "settings", "team", "page.tsx"), "export {};\n");
  await writeFile(join(cwd, "README.md"), "y\n");
  git("add", ".");
  git("commit", "-q", "-m", "change");

  const result = run(["affected", "--base", "HEAD~1", "--head", "HEAD", "--json"], cwd);
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({
    files: ["README.md", "app/settings/team/page.tsx", "components/billing/plan.tsx"],
    flows: [{ id: "billing", files: ["components/billing/plan.tsx"] }],
    routes: [{ route: "/settings/team", files: ["app/settings/team/page.tsx"] }],
    unmatched: [],
  });
});

test("the example workflow matches what reeldiff init writes", async () => {
  const { workflowTemplate } = await import("./templates.ts");
  const example = readFileSync(resolve("../../examples/github/reeldiff.yml"), "utf8");
  expect(example).toBe(workflowTemplate);
});

test("init writes config, workflow and ignore entries without overwriting", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "reeldiff-init-"));
  await writeFile(join(cwd, "package.json"), JSON.stringify({ dependencies: { next: "16" } }));
  await mkdir(join(cwd, "app"));
  await writeFile(join(cwd, ".gitignore"), "node_modules/");
  expect(run(["init"], cwd).status).toBe(0);
  expect(readFileSync(join(cwd, "reeldiff.config.ts"), "utf8")).toContain(
    'framework: "nextjs-app"',
  );
  expect(readFileSync(join(cwd, ".gitignore"), "utf8")).toBe(
    "node_modules/\n**/.reeldiff/out/\n**/.reeldiff/auth/\n**/.reeldiff/published/\n",
  );
  await writeFile(join(cwd, "reeldiff.config.ts"), "keep me");
  expect(run(["init"], cwd).stdout).toContain("already exists");
  expect(readFileSync(join(cwd, "reeldiff.config.ts"), "utf8")).toBe("keep me");
});
