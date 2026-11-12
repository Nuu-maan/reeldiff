import { spawnSync } from "node:child_process";
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
