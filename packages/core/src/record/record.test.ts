import { spawnSync } from "node:child_process";
import { access, mkdtemp, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { parseFlow } from "../flow/load.ts";
import { record } from "./record.ts";

vi.setConfig({ testTimeout: 60_000 });

const page = `<!doctype html>
<title>Fixture</title>
<label for="card">Card</label><input id="card" data-secret>
<label for="pin">PIN</label><input id="pin" type="password">
<button onclick="done.hidden=false">Pay</button>
<p id="done" hidden>Paid</p>`;

let server: ReturnType<typeof createServer>;
let baseUrl = "";

beforeAll(async () => {
  server = createServer((_, res) => res.writeHead(200, { "content-type": "text/html" }).end(page));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((done) => server.close(() => done())));

const flow = parseFlow(
  `id: pay
title: Pay
steps:
  - { action: fill, target: { label: Card }, value: "4111 1111", intent: Enter the card, caption: Card details stay private }
  - { action: fill, target: { label: PIN }, value: "9876", intent: Enter the PIN }
  - { action: click, target: { role: button, name: Pay }, intent: Pay }
  - { action: expect, target: { text: Paid }, intent: Payment confirms }
`,
  "pay.yaml",
);

test("records a video, per-step screenshots and masked snapshots", async () => {
  const runDir = await mkdtemp(join(tmpdir(), "reeldiff-record-"));
  const result = await record(flow, { baseUrl, runDir, stepDelay: 100, mask: ["[data-secret]"] });

  expect(result.status).toBe("new");
  expect(result.steps.map((s) => s.index)).toEqual([1, 2, 3, 4]);
  for (const file of [
    result.video,
    result.poster,
    ...result.steps.flatMap((s) => [s.screenshot, s.snapshot]),
  ]) {
    await access(join(runDir, file ?? "missing"));
  }

  const starts = result.steps.map((s) => s.startMs);
  expect(starts).toEqual([...starts].sort((a, b) => a - b));
  expect(result.steps[0]?.caption).toBe("Card details stay private");
  expect(result.steps[2]?.target?.width).toBeGreaterThan(0);

  const lastSnapshot = await readFile(join(runDir, result.steps[3]?.snapshot ?? ""), "utf8");
  expect(lastSnapshot).not.toContain("4111");
  expect(lastSnapshot).not.toContain("9876");
  expect(lastSnapshot).not.toContain("reeldiff-overlay");

  const probe = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_name,width,height",
      "-of",
      "csv=p=0",
      join(runDir, result.video ?? ""),
    ],
    { encoding: "utf8" },
  );
  expect(probe.stdout.trim()).toBe("h264,1440,900");
});

test("marks the flow broken and keeps the failing step", async () => {
  const runDir = await mkdtemp(join(tmpdir(), "reeldiff-record-"));
  const broken = parseFlow(
    "id: pay\ntitle: Pay\nsteps:\n  - { action: click, target: { role: button, name: Refund }, intent: Refund }\n",
    "pay.yaml",
  );
  const result = await record(broken, { baseUrl, runDir, stepDelay: 0, stepTimeout: 2_000 });
  expect(result.status).toBe("broken");
  expect(result.steps[0]).toMatchObject({ status: "failed", intent: "Refund" });
});
