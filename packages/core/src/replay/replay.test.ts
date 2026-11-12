import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

vi.setConfig({ testTimeout: 30_000 });

import { parseFlow } from "../flow/load.ts";
import { replay } from "./replay.ts";

const page = `<!doctype html>
<title>Fixture</title>
<label for="who">Name</label><input id="who">
<label for="size">Size</label>
<select id="size"><option>Small</option><option>Large</option></select>
<button aria-haspopup="listbox" aria-label="Color" onclick="list.hidden=false">Pick</button>
<ul id="list" role="listbox" hidden>
  <li role="option" onclick="color.textContent=this.textContent;list.hidden=true">Teal</li>
</ul>
<p id="color"></p>
<button onclick="setTimeout(()=>out.textContent=who.value+' '+size.value+' '+color.textContent,300)">Save</button>
<p id="out"></p>`;

let server: ReturnType<typeof createServer>;
let baseUrl = "";

beforeAll(async () => {
  server = createServer((_, res) => res.writeHead(200, { "content-type": "text/html" }).end(page));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((done) => server.close(() => done())));

const flow = (steps: string) =>
  parseFlow(`id: fixture\ntitle: Fixture\nsteps:\n${steps}`, "fixture.yaml");

test("replays fill, native and custom select, click and expect", async () => {
  const result = await replay(
    flow(`
  - { action: fill, target: { label: Name }, value: Ada, intent: Type a name }
  - { action: select, target: { label: Size }, value: Large, intent: Pick a size }
  - { action: select, target: { role: button, name: Color }, value: Teal, intent: Pick a color }
  - { action: click, target: { role: button, name: Save }, intent: Save }
  - { action: expect, target: { text: Ada Large Teal }, intent: The summary shows }
`),
    { baseUrl, stepDelay: 0 },
  );
  expect(result.steps.map((s) => [s.label, s.error ?? s.status])).toEqual([
    ["goto /", "passed"],
    ['fill label "Name"', "passed"],
    ['select label "Size" with "Large"', "passed"],
    ['select button "Color" with "Teal"', "passed"],
    ['click button "Save"', "passed"],
    ['expect text "Ada Large Teal" visible', "passed"],
  ]);
  expect(result.status).toBe("passed");
  expect(result.steps[1]?.label).not.toContain("Ada");
});

test("stops at the first failing step and reports it", async () => {
  const result = await replay(
    flow(`
  - { action: click, target: { role: button, name: Delete }, intent: Delete it }
  - { action: click, target: { role: button, name: Save }, intent: Save }
`),
    { baseUrl, stepDelay: 0, stepTimeout: 2_000 },
  );
  expect(result.status).toBe("failed");
  expect(result.steps).toHaveLength(2);
  expect(result.steps[1]).toMatchObject({ status: "failed", label: 'click button "Delete"' });
  expect(result.steps[1]?.error).toMatch(/Timeout/);
});
