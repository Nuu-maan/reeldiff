import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";

const repoEnv = resolve("../../.env");
if (existsSync(repoEnv)) process.loadEnvFile(repoEnv);
const keyEnv = ["OPENROUTER_API_KEY", "OPENROUTER"].find((name) => process.env[name]);

const cli = resolve("node_modules/reeldiff/dist/cli.mjs");
const reeldiff = (args: string[], cwd: string) =>
  spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });

async function project(flows: Record<string, string> = {}) {
  const cwd = await mkdtemp(join(tmpdir(), "reeldiff-ai-"));
  const model = { provider: "openrouter", model: "anthropic/claude-haiku-5.5", apiKeyEnv: keyEnv };
  await writeFile(
    join(cwd, "reeldiff.config.mjs"),
    `export default ${JSON.stringify({ stepDelay: 0, model })};\n`,
  );
  await mkdir(join(cwd, ".reeldiff", "flows"), { recursive: true });
  for (const [id, yaml] of Object.entries(flows)) {
    await writeFile(join(cwd, ".reeldiff", "flows", `${id}.yaml`), yaml);
  }
  return cwd;
}

test.describe("AI commands (live model)", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "chromium", "drives its own Chromium");
    test.skip(!keyEnv, "set OPENROUTER_API_KEY to run live AI tests");
  });
  test.describe.configure({ timeout: 300_000 });

  test("heal fixes a renamed button and rewrites the flow", async ({ baseURL }) => {
    const stale = [
      "id: open-dialog",
      "title: Open the new project dialog",
      "start: /dashboard",
      "steps:",
      '  - { action: click, target: { role: button, name: "Add project" }, intent: Open the new project dialog }',
      '  - { action: expect, target: { role: dialog, name: "New project" }, intent: The dialog is open }',
    ].join("\n");
    const cwd = await project({ "open-dialog": stale });

    const result = reeldiff(["heal", "open-dialog", "--url", baseURL ?? ""], cwd);
    expect(result.stdout).toContain('healed step 1: button "Add project" → button "New project"');
    expect(result.status).toBe(0);
    const updated = await readFile(join(cwd, ".reeldiff", "flows", "open-dialog.yaml"), "utf8");
    expect(updated).toContain("name: New project");
    expect(reeldiff(["replay", "open-dialog", "--url", baseURL ?? ""], cwd).status).toBe(0);
  });

  test("explore turns a one-line goal into a flow that replays", async ({ baseURL }) => {
    const cwd = await project();
    const result = reeldiff(
      ["explore", "Upgrade to the Team plan", "--url", `${baseURL}/settings/billing`],
      cwd,
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("It replays cleanly");
    const [file] = await readdir(join(cwd, ".reeldiff", "flows"));
    expect(file).toMatch(/\.yaml$/);
    expect(await readFile(join(cwd, ".reeldiff", "flows", file ?? ""), "utf8")).toContain(
      "name: Upgrade to Team",
    );
  });
});
