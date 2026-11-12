import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";

const cli = resolve("node_modules/reeldiff/dist/cli.mjs");

const reeldiff = (args: string[], cwd = process.cwd()) =>
  spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });

test.describe("reeldiff replay", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "chromium", "replay drives its own Chromium");
  });
  test.describe.configure({ timeout: 60_000 });

  for (const flow of ["create-project", "complete-task", "upgrade-plan"]) {
    test(`replays ${flow}`, ({ baseURL }) => {
      const result = reeldiff(["replay", flow, "--url", baseURL ?? ""]);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain(`${flow} passed`);
      expect(result.status).toBe(0);
    });
  }

  test("fails on a broken flow and names the step and its intent", async ({ baseURL }) => {
    const cwd = await mkdtemp(join(tmpdir(), "reeldiff-broken-"));
    await writeFile(join(cwd, "reeldiff.config.mjs"), "export default { stepDelay: 0 };\n");
    await mkdir(join(cwd, ".reeldiff", "flows"), { recursive: true });
    await writeFile(
      join(cwd, ".reeldiff", "flows", "delete-project.yaml"),
      [
        "id: delete-project",
        "title: Delete a project",
        "start: /dashboard",
        "steps:",
        '  - { action: click, target: { role: button, name: "Delete project" }, intent: Delete the first project }',
      ].join("\n"),
    );

    const result = reeldiff(["replay", "delete-project", "--url", baseURL ?? ""], cwd);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('✗ 1 click button "Delete project"');
    expect(result.stderr).toContain("Step 1 failed");
    expect(result.stderr).toContain("Intent: Delete the first project");
  });
});
