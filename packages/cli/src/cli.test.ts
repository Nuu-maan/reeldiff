import { execFileSync } from "node:child_process";
import { version } from "@reeldiff/core";
import { expect, test } from "vitest";

const run = (...args: string[]) =>
  execFileSync(process.execPath, ["dist/cli.mjs", ...args], { encoding: "utf8" }).trim();

test("prints the version", () => {
  expect(run("--version")).toBe(version);
});

test("prints usage by default", () => {
  expect(run()).toContain("Usage: reeldiff");
});
