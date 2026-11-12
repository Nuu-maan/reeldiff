import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MockLanguageModelV4 } from "ai/test";
import { expect, test } from "vitest";
import type { ManifestFlow } from "../manifest.ts";
import { UsageMeter } from "./model.ts";
import { fallbackSummary, summarize } from "./summarize.ts";

const flow = (id: string, status: ManifestFlow["status"], changed = false): ManifestFlow => ({
  id,
  title: `Flow ${id}`,
  kind: "flow",
  status,
  viewport: { width: 1440, height: 900 },
  durationMs: 1000,
  steps: [
    {
      index: 1,
      label: "click button",
      action: "click",
      intent: "Open the dialog",
      status: "passed",
      startMs: 0,
      endMs: 500,
      screenshot: `flows/${id}/steps/1.png`,
      before: changed ? `flows/${id}/steps/1.before.png` : undefined,
      changed,
    },
  ],
});

test("summarizes with one structured call and drops notes for unknown flows", async () => {
  const runDir = await mkdtemp(join(tmpdir(), "reeldiff-summary-"));
  await mkdir(join(runDir, "flows", "a", "steps"), { recursive: true });
  await writeFile(join(runDir, "flows", "a", "steps", "1.png"), "after");
  await writeFile(join(runDir, "flows", "a", "steps", "1.before.png"), "before");

  const model = new MockLanguageModelV4({
    doGenerate: {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            headline: "The new project button moved to the header",
            bullets: ["New project now sits next to the title"],
            perFlow: [
              { flowId: "a", note: "Button moved" },
              { flowId: "ghost", note: "Should be dropped" },
            ],
          }),
        },
      ],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 900, noCache: 900, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 60, text: 60, reasoning: 0 },
      },
      warnings: [],
    },
  });
  const meter = new UsageMeter();

  const summary = await summarize(
    {
      flows: [flow("a", "changed", true), flow("b", "unchanged")],
      runDir,
      diff: "diff --git a/x.tsx b/x.tsx",
      pr: { title: "Move the button", body: "Moves it" },
    },
    model,
    meter,
  );

  expect(summary).toEqual({
    headline: "The new project button moved to the header",
    bullets: ["New project now sits next to the title"],
    perFlow: { a: "Button moved" },
  });
  expect(meter.total.calls).toBe(1);
  const prompt = JSON.stringify(model.doGenerateCalls[0]?.prompt);
  expect(prompt).toContain("Move the button");
  expect(prompt).toContain("a step 1 before");
  expect(prompt.match(/image\/png/g)).toHaveLength(2);
});

test("falls back to a plain summary without a model", () => {
  const summary = fallbackSummary({
    flows: [
      flow("a", "changed", true),
      flow("b", "unchanged"),
      { ...flow("c", "broken"), reason: "Timeout" },
    ],
    runDir: "",
    pr: { title: "Tidy billing" },
  });
  expect(summary.headline).toBe("Tidy billing");
  expect(summary.bullets).toEqual(["Flow a looks different in 1 step(s)", "Flow c broke: Timeout"]);
});
