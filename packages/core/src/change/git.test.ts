import { execFileSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { changedFiles } from "./git.ts";

test("a missing base ref explains how to fetch history", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "reeldiff-git-"));
  execFileSync("git", ["init", "-q"], { cwd });
  execFileSync(
    "git",
    ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "x"],
    { cwd },
  );
  await expect(changedFiles(cwd, "origin/main", "HEAD")).rejects.toThrow(/fetch-depth: 0/);
});
