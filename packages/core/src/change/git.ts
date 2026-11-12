import { execFile } from "node:child_process";
import { posix } from "node:path";
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

export async function diffText(
  cwd: string,
  base: string,
  head: string,
  firstGlobs: string[],
  maxChars = 80_000,
): Promise<string> {
  const files = await changedFiles(cwd, base, head);
  const first = (file: string) => firstGlobs.some((glob) => posix.matchesGlob(file, glob));
  const ordered = [...files.filter(first), ...files.filter((file) => !first(file))];
  let text = "";
  for (const file of ordered) {
    if (text.length >= maxChars) break;
    const { stdout } = await run("git", ["diff", "--relative", `${base}...${head}`, "--", file], {
      cwd,
      maxBuffer: 16 * 1024 * 1024,
    });
    text += stdout;
  }
  return text.length > maxChars
    ? `${text.slice(0, maxChars)}
[diff truncated]`
    : text;
}
