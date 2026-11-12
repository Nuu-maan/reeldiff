import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { localStorage } from "./local.ts";
import { contentTypeFor, publishRun, runPrefix, type StorageProvider } from "./storage.ts";

test("builds run prefixes like the PRD layout", () => {
  expect(runPrefix({ repo: "acme/app", pr: 12, runId: "r1" })).toBe("runs/acme/app/pr-12/r1");
  expect(runPrefix({ runId: "r1" })).toBe("runs/local/r1");
});

test("publishes every file with its content type and returns the page URL", async () => {
  const runDir = await mkdtemp(join(tmpdir(), "reeldiff-run-"));
  await mkdir(join(runDir, "flows", "a", "steps"), { recursive: true });
  await writeFile(join(runDir, "index.html"), "<!doctype html>");
  await writeFile(join(runDir, "manifest.json"), "{}");
  await writeFile(join(runDir, "flows", "a", "steps", "1.png"), "png");

  const puts: [string, string][] = [];
  const memory: StorageProvider = {
    name: "memory",
    put: async (key, _body, type) => {
      puts.push([key, type]);
    },
    url: (key) => `https://cdn.example.com/${key}`,
  };
  const published = await publishRun(memory, runDir, "runs/acme/app/pr-1/r1");

  expect(published).toEqual({
    prefix: "runs/acme/app/pr-1/r1",
    url: "https://cdn.example.com/runs/acme/app/pr-1/r1/index.html",
    files: 3,
  });
  expect(puts.sort()).toEqual([
    ["runs/acme/app/pr-1/r1/flows/a/steps/1.png", "image/png"],
    ["runs/acme/app/pr-1/r1/index.html", "text/html; charset=utf-8"],
    ["runs/acme/app/pr-1/r1/manifest.json", "application/json; charset=utf-8"],
  ]);
  expect(contentTypeFor("video.MP4")).toBe("video/mp4");
});

test("local storage copies files and only has URLs with a public base", async () => {
  const dir = await mkdtemp(join(tmpdir(), "reeldiff-published-"));
  const storage = localStorage(dir, "https://demos.example.com/base");
  await storage.put("runs/x/index.html", new TextEncoder().encode("hi"), "text/html");
  expect(await readFile(join(dir, "runs", "x", "index.html"), "utf8")).toBe("hi");
  expect(storage.url("runs/x/index.html")).toBe("https://demos.example.com/base/runs/x/index.html");
  expect(localStorage(dir).url("runs/x/index.html")).toBeUndefined();
});
