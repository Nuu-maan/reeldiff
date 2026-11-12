import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ReeldiffError } from "../errors.ts";

const run = promisify(execFile);

export async function changedFiles(cwd: string, base: string, head: string): Promise<string[]> {
  try {
    const { stdout } = await run(
      "git",
      ["diff", "--name-only", "--relative", "--no-renames", `${base}...${head}`],
      { cwd, maxBuffer: 16 * 1024 * 1024 },
    );
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new ReeldiffError(
      `git diff ${base}...${head} failed: ${stderr || (error as Error).message}`,
    );
  }
}
