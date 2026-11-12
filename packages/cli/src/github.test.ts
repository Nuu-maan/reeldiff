import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Manifest, RunReport } from "@reeldiff/core";
import { afterEach, describe, expect, test } from "vitest";
import { commentMarkdown, githubContext } from "./github.ts";

const manifest: Manifest = {
  version: 1,
  runId: "r1",
  createdAt: "2026-11-12T10:00:00.000Z",
  baseUrl: "https://preview.example.com",
  durationMs: 65_000,
  summary: {
    headline: "The plan cards are taller",
    bullets: ["Upgrade buttons moved down"],
    perFlow: { "upgrade-plan": "Cards grew | taller" },
  },
  flows: [
    {
      id: "upgrade-plan",
      title: "Upgrade plan",
      kind: "flow",
      status: "changed",
      viewport: { width: 1440, height: 900 },
      durationMs: 5000,
      poster: "flows/upgrade-plan/poster.png",
      steps: [],
      healed: "id: upgrade-plan\nsteps: []\n",
    },
    {
      id: "create-project",
      title: "Create project",
      kind: "flow",
      status: "unchanged",
      viewport: { width: 1440, height: 900 },
      durationMs: 5000,
      steps: [],
    },
  ],
};

const report: RunReport = {
  manifest,
  runUrl: "https://demos.example.com/runs/r1/index.html",
  assetUrl: (path) => (path ? `https://demos.example.com/runs/r1/${path}` : undefined),
};

describe("commentMarkdown", () => {
  const body = commentMarkdown(report, "model: 1 call, 900 tokens · $0.0010");

  test("starts with the marker so later runs update it", () => {
    expect(body.startsWith("<!-- reeldiff -->\n### 🎬 The plan cards are taller")).toBe(true);
  });

  test("links each flow into the replay page and escapes table cells", () => {
    expect(body).toContain(
      "[Upgrade plan](https://demos.example.com/runs/r1/index.html?flow=upgrade-plan) | changed | Cards grew \\| taller |",
    );
    expect(body).toContain("**[Watch the demo](https://demos.example.com/runs/r1/index.html)**");
  });

  test("shows posters for shown flows and healed suggestions", () => {
    expect(body).toContain(
      '<img src="https://demos.example.com/runs/r1/flows/upgrade-plan/poster.png"',
    );
    expect(body).toContain("Suggested fix for <code>upgrade-plan</code>");
    expect(body).toContain(
      "<sub>Recorded by Reeldiff · 2 flows · 1 changed · ran in 1m 5s · model: 1 call",
    );
  });
});

describe("githubContext", () => {
  afterEach(() => {
    delete process.env.GITHUB_EVENT_PATH;
    delete process.env.GITHUB_REPOSITORY;
  });

  test("reads the PR from a pull_request event", async () => {
    const dir = await mkdtemp(join(tmpdir(), "reeldiff-event-"));
    const event = join(dir, "event.json");
    await writeFile(
      event,
      JSON.stringify({
        pull_request: {
          number: 12,
          title: "Taller cards",
          body: null,
          html_url: "https://github.com/acme/app/pull/12",
          head: { sha: "abc123" },
          base: { sha: "def456" },
        },
      }),
    );
    process.env.GITHUB_EVENT_PATH = event;
    process.env.GITHUB_REPOSITORY = "acme/app";
    expect(await githubContext({})).toMatchObject({
      repo: "acme/app",
      pr: {
        number: 12,
        title: "Taller cards",
        url: "https://github.com/acme/app/pull/12",
        sha: "abc123",
        baseSha: "def456",
      },
    });
  });

  test("flags override and validate", async () => {
    expect(await githubContext({ repo: "acme/app", pr: "3", title: "Local test" })).toMatchObject({
      pr: { number: 3, title: "Local test", url: "https://github.com/acme/app/pull/3" },
    });
    await expect(githubContext({ pr: "abc" })).rejects.toThrow(/PR number/);
  });
});
