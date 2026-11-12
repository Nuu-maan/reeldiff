import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { loadConfig } from "./load.ts";

async function dirWith(files: Record<string, string>) {
  const dir = await mkdtemp(join(tmpdir(), "reeldiff-config-"));
  for (const [name, content] of Object.entries(files)) await writeFile(join(dir, name), content);
  return dir;
}

test("loads a TypeScript config and applies defaults", async () => {
  const cwd = await dirWith({
    "reeldiff.config.ts":
      'const config: { baseUrl: string } = { baseUrl: "http://localhost:3100" };\nexport default config;\n',
  });
  const { config, rootDir } = await loadConfig({ cwd });
  expect(rootDir).toBe(cwd);
  expect(config).toMatchObject({ baseUrl: "http://localhost:3100", stepDelay: 400, auth: {} });
});

test("explains invalid fields", async () => {
  const cwd = await dirWith({
    "reeldiff.config.mjs": 'export default { baseUrl: "not a url", stepDelay: -1, typo: 1 };\n',
  });
  await expect(loadConfig({ cwd })).rejects.toThrow(/Invalid config[\s\S]*baseUrl[\s\S]*stepDelay/);
});

test("says how to fix a missing config", async () => {
  const cwd = await dirWith({});
  await expect(loadConfig({ cwd })).rejects.toThrow(/Create reeldiff.config.ts/);
});

test("treats empty env values for optional URLs as unset", async () => {
  const cwd = await dirWith({
    "reeldiff.config.mjs":
      'export default { baseUrl: "http://localhost:3100", compareUrl: "", notify: { slack: { webhookUrl: "" } } };\n',
  });
  const { config } = await loadConfig({ cwd });
  expect(config.compareUrl).toBeUndefined();
  expect(config.notify.slack?.webhookUrl).toBeUndefined();
});
