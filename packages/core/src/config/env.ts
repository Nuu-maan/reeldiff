import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export function loadNearestEnv(startDir: string): string | undefined {
  let dir = startDir;
  while (true) {
    const file = join(dir, ".env");
    if (existsSync(file)) {
      process.loadEnvFile(file);
      return file;
    }
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}
