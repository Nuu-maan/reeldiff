import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { flowJsonSchema } from "./json-schema.ts";
import { parseFlow } from "./load.ts";

const prdSample = `
id: create-project
title: Create a new project
description: User creates a project from the dashboard.
start: /dashboard
auth: default
viewport: { width: 1440, height: 900 }
covers:
  - "app/projects/**"
steps:
  - action: click
    target: { role: button, name: "New project" }
    intent: Click the "New project" button
    caption: Start a new project from the dashboard
  - action: fill
    target: { label: "Project name" }
    value: "Acme launch"
    intent: Type a name into the project name field
  - action: expect
    target: { text: "Acme launch" }
    intent: The new project appears on the page
`;

describe("parseFlow", () => {
  test("accepts the PRD sample flow and fills defaults", () => {
    const flow = parseFlow(prdSample, "create-project.yaml");
    expect(flow.steps).toHaveLength(3);
    expect(flow.steps[2]).toMatchObject({ action: "expect", state: "visible" });
  });

  test("defaults start, auth, viewport and covers", () => {
    const flow = parseFlow("id: x\ntitle: X\nsteps:\n  - action: goto\n    url: /a\n", "x.yaml");
    expect(flow).toMatchObject({
      start: "/",
      auth: "none",
      viewport: { width: 1440, height: 900 },
      covers: [],
    });
  });

  test("rejects a step without an intent", () => {
    const source = "id: x\ntitle: X\nsteps:\n  - action: click\n    target: { text: Go }\n";
    expect(() => parseFlow(source, "x.yaml")).toThrow(/intent/);
  });

  test("rejects unknown actions and target kinds", () => {
    const badAction = "id: x\ntitle: X\nsteps:\n  - action: tap\n    intent: Tap\n";
    const badTarget =
      "id: x\ntitle: X\nsteps:\n  - action: click\n    target: { xpath: //a }\n    intent: Go\n";
    expect(() => parseFlow(badAction, "x.yaml")).toThrow(/Invalid flow x.yaml/);
    expect(() => parseFlow(badTarget, "x.yaml")).toThrow(/Invalid flow x.yaml/);
  });

  test("requires the id to match the file name", () => {
    expect(() => parseFlow(prdSample, "other.yaml")).toThrow(/must match the file name "other"/);
  });

  test("points YAML syntax errors at a line and column", () => {
    expect(() => parseFlow("id: x\nsteps: [\n", "x.yaml")).toThrow(/^x\.yaml:\d+:\d+: /);
  });
});

test("committed JSON Schema is up to date (run pnpm schema)", async () => {
  const committed = await readFile(
    new URL("../../schema/flow.schema.json", import.meta.url),
    "utf8",
  );
  expect(committed).toBe(flowJsonSchema());
});
