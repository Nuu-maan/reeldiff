import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { parseFlow } from "../flow/load.ts";
import { record } from "../record/record.ts";
import { compareFlow, shouldNotify } from "./compare.ts";

vi.setConfig({ testTimeout: 90_000 });

const page = (label: string) => `<!doctype html><title>x</title>
<style>body{font:16px sans-serif;margin:40px} button{font-size:24px;padding:12px 24px}</style>
<button onclick="done.hidden=false">${label}</button><p id="done" hidden>Done</p>`;

let server: ReturnType<typeof createServer>;
let base = "";

beforeAll(async () => {
  server = createServer((req, res) => {
    const label = req.url?.startsWith("/v2") ? "Save changes now" : "Save";
    res.writeHead(200, { "content-type": "text/html" }).end(page(label));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((done) => server.close(() => done())));

const flow = (start: string) =>
  parseFlow(
    `id: save\ntitle: Save\nstart: ${start}\nsteps:\n  - { action: click, target: { role: button }, intent: Save }\n  - { action: expect, target: { text: Done }, intent: Saved }\n`,
    "save.yaml",
  );

async function compare(beforeStart: string) {
  const runDir = await mkdtemp(join(tmpdir(), "reeldiff-compare-"));
  const head = await record(flow("/v1"), { baseUrl: base, runDir, stepDelay: 0 });
  const before = await record(flow(beforeStart), {
    baseUrl: base,
    runDir,
    stepDelay: 0,
    before: true,
  });
  return compareFlow(runDir, head, before, 0.001);
}

describe("compareFlow", () => {
  test("the same UI is unchanged", async () => {
    const result = await compare("/v1");
    expect(result.status).toBe("unchanged");
    expect(result.steps.every((step) => step.diff === 0 && step.changed === false)).toBe(true);
    expect(result.steps[0]?.before).toMatch(/steps\/1\.before\.png$/);
  });

  test("a changed button label is changed", async () => {
    const result = await compare("/v2");
    expect(result.status).toBe("changed");
    expect(result.steps[0]?.changed).toBe(true);
    expect(result.steps[0]?.diff).toBeGreaterThan(0.001);
  });
});

describe("shouldNotify", () => {
  const flows = (...statuses: string[]) => ({
    flows: statuses.map((status) => ({ status })) as never,
  });

  test("skips when nothing is affected or nothing changed", () => {
    expect(shouldNotify(flows()).notify).toBe(false);
    expect(shouldNotify(flows("unchanged", "unchanged"))).toEqual({
      notify: false,
      reason: "Affected flows look the same as before, so there's nothing to show.",
    });
  });

  test("notifies for changed, new and broken flows", () => {
    expect(shouldNotify(flows("unchanged", "changed")).notify).toBe(true);
    expect(shouldNotify(flows("new")).notify).toBe(true);
    expect(shouldNotify(flows("unchanged", "broken"))).toEqual({
      notify: true,
      reason: "1 flow(s) broke.",
    });
  });
});
