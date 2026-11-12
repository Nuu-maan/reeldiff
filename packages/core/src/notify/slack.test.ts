import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, test } from "vitest";
import type { Manifest } from "../manifest.ts";
import type { RunReport } from "./notifier.ts";
import { slackMessage, slackNotifier } from "./slack.ts";

const manifest = (overrides: Partial<Manifest> = {}): Manifest => ({
  version: 1,
  runId: "r1",
  createdAt: "2026-11-12T10:00:00.000Z",
  baseUrl: "https://preview.example.com",
  durationMs: 95_000,
  pr: { number: 7, title: "Rounder buttons", url: "https://github.com/acme/app/pull/7" },
  summary: {
    headline: "Buttons are rounder",
    bullets: ["New project is pill shaped", "Cards <softer>"],
    perFlow: {},
  },
  flows: [
    {
      id: "create-project",
      title: "Create a project",
      kind: "flow",
      status: "changed",
      viewport: { width: 1440, height: 900 },
      durationMs: 9000,
      poster: "flows/create-project/poster.png",
      steps: [],
    },
    {
      id: "billing",
      title: "Billing",
      kind: "flow",
      status: "broken",
      reason: "Timeout",
      viewport: { width: 1440, height: 900 },
      durationMs: 2000,
      steps: [],
    },
  ],
  ...overrides,
});

const report = (base = "https://demos.example.com/runs/r1/", m = manifest()): RunReport => ({
  manifest: m,
  runUrl: `${base}index.html`,
  assetUrl: (path) => (path ? new URL(path, base).href : undefined),
});

describe("slackMessage", () => {
  test("has the PR line, bullets, poster, buttons and footer", () => {
    const { text, blocks } = slackMessage(report());
    expect(text).toBe("Rounder buttons (#7): Buttons are rounder");
    expect(blocks.map((block) => block.type)).toEqual([
      "header",
      "section",
      "image",
      "actions",
      "context",
    ]);
    expect(JSON.stringify(blocks[0])).toContain("🎬 Rounder buttons (#7)");
    expect(JSON.stringify(blocks[1])).toContain("Cards &lt;softer&gt;");
    expect(blocks[2]).toMatchObject({
      image_url: "https://demos.example.com/runs/r1/flows/create-project/poster.png",
    });
    expect(JSON.stringify(blocks[3])).toContain("https://github.com/acme/app/pull/7");
    expect(JSON.stringify(blocks[4])).toContain(
      "2 flows affected · 1 changed · ⚠️ 1 broken · ran in 1m 35s",
    );
  });

  test("skips the image when the poster isn't publicly reachable", () => {
    const local: RunReport = { manifest: manifest(), assetUrl: () => undefined };
    expect(slackMessage(local).blocks.map((block) => block.type)).toEqual([
      "header",
      "section",
      "actions",
      "context",
    ]);
  });

  test("keeps the header within Slack's 150 character limit", () => {
    const long = manifest({ pr: { number: 1, title: "x".repeat(400) } });
    const header = slackMessage(report(undefined, long)).blocks[0] as { text: { text: string } };
    expect(header.text.text.length).toBeLessThanOrEqual(150);
  });
});

test("posts to the webhook and reports failures without leaking the URL", async () => {
  const received: string[] = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      received.push(body);
      res.writeHead(req.url === "/bad-secret-path" ? 400 : 200).end("ok");
    });
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  await slackNotifier(`${base}/hook`).send(report());
  expect(JSON.parse(received[0] ?? "{}").blocks).toHaveLength(5);

  const failure = await slackNotifier(`${base}/bad-secret-path`)
    .send(report())
    .catch((error: Error) => error);
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).not.toContain("bad-secret-path");
  server.close();
});
