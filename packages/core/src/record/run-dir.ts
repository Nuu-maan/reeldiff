import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { type Manifest, manifestSchema } from "../manifest.ts";

export const newRunId = (date = new Date()) =>
  date
    .toISOString()
    .replace(/\.\d+Z$/, "")
    .replace(/[:]/g, "-");

export async function createRunDir(rootDir: string, runId = newRunId()) {
  const dir = resolve(rootDir, ".reeldiff", "out", runId);
  await mkdir(dir, { recursive: true });
  return { runId, dir };
}

export async function writeManifest(runDir: string, manifest: Manifest) {
  const valid = manifestSchema.parse(manifest);
  await writeFile(join(runDir, "manifest.json"), `${JSON.stringify(valid, null, 2)}\n`);
  return valid;
}
