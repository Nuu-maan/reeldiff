import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import * as z from "zod";
import { ReeldiffError } from "../errors.ts";
import { type Config, configSchema } from "./schema.ts";

export const configFileNames = [
  "reeldiff.config.ts",
  "reeldiff.config.mts",
  "reeldiff.config.js",
  "reeldiff.config.mjs",
];

export type LoadedConfig = { config: Config; path: string; rootDir: string };

async function findConfig(cwd: string) {
  for (const name of configFileNames) {
    const path = resolve(cwd, name);
    try {
      await access(path);
      return path;
    } catch {}
  }
  throw new ReeldiffError(
    `No config found in ${cwd}. Create reeldiff.config.ts, or run reeldiff init.`,
  );
}

export async function loadConfig(
  options: { cwd?: string; path?: string } = {},
): Promise<LoadedConfig> {
  const cwd = options.cwd ?? process.cwd();
  const path = options.path ? resolve(cwd, options.path) : await findConfig(cwd);

  let exported: unknown;
  try {
    exported = (await import(pathToFileURL(path).href)).default;
  } catch (error) {
    throw new ReeldiffError(`Could not load ${path}: ${(error as Error).message}`);
  }

  const result = configSchema.safeParse(exported);
  if (!result.success) {
    throw new ReeldiffError(`Invalid config in ${path}\n${z.prettifyError(result.error)}`);
  }
  return { config: result.data, path, rootDir: dirname(path) };
}
