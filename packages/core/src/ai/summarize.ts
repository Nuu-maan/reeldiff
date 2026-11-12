import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { generateText, type LanguageModel, Output } from "ai";
import * as z from "zod";
import type { Manifest, ManifestFlow } from "../manifest.ts";
import type { UsageMeter } from "./model.ts";

export const summarySchema = z.object({
  headline: z.string().max(80).describe("What changed in the UI, under 80 characters, plain words"),
  bullets: z
    .array(z.string())
    .min(1)
    .max(4)
    .describe("1 to 4 short bullets a PM or designer would care about"),
  perFlow: z
    .array(
      z.object({
        flowId: z.string(),
        note: z.string().describe("At most two short sentences about what looks different"),
      }),
    )
    .describe("One short note per affected flow id"),
});

export type Summary = NonNullable<Manifest["summary"]>;

export type SummarizeInput = {
  flows: ManifestFlow[];
  runDir: string;
  diff?: string;
  pr?: { title: string; body?: string };
};

const system = `You write the "what changed" note for a pull request demo that goes to a team Slack channel.
Readers are designers, PMs and engineers. Describe visible UI changes, not code. Be concrete and short.
No hype, no emoji, no em dashes. If the screenshots show no visible change for a flow, say so plainly.`;

function pairsFor(flows: ManifestFlow[], limit = 6) {
  const queues = flows.map((flow) =>
    flow.steps
      .filter((step) => step.changed && step.before && step.screenshot)
      .map((step) => ({ flow, step })),
  );
  const pairs: { flow: ManifestFlow; step: ManifestFlow["steps"][number] }[] = [];
  while (pairs.length < limit && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && pairs.length < limit) pairs.push(next);
    }
  }
  return pairs;
}

export function fallbackSummary(input: SummarizeInput): Summary {
  const shown = input.flows.filter((flow) => flow.status !== "unchanged");
  const describe = (flow: ManifestFlow) =>
    flow.status === "broken"
      ? `${flow.title} broke${flow.reason ? `: ${flow.reason}` : ""}`
      : flow.status === "changed"
        ? `${flow.title} looks different in ${flow.steps.filter((s) => s.changed).length} step(s)`
        : `${flow.title} recorded`;
  return {
    headline: (input.pr?.title ?? "UI changes").slice(0, 80),
    bullets: (shown.length ? shown : input.flows).slice(0, 4).map(describe),
    perFlow: Object.fromEntries(input.flows.map((flow) => [flow.id, describe(flow)])),
  };
}

export async function summarize(
  input: SummarizeInput,
  model: LanguageModel,
  meter: UsageMeter,
): Promise<Summary> {
  const changes = input.flows
    .map((flow) => {
      const steps = flow.steps
        .filter((step) => step.changed || step.status === "failed")
        .map(
          (step) =>
            `  - step ${step.index} (${step.intent ?? step.label}): ${step.status === "failed" ? `failed: ${step.error}` : "looks different"}`,
        );
      return `- ${flow.id} "${flow.title}" [${flow.status}]${steps.length ? `\n${steps.join("\n")}` : ""}`;
    })
    .join("\n");

  const images = await Promise.all(
    pairsFor(input.flows)
      .flatMap(({ flow, step }) => [
        { label: `${flow.id} step ${step.index} before`, file: step.before as string },
        { label: `${flow.id} step ${step.index} after`, file: step.screenshot as string },
      ])
      .map(async ({ label, file }) => ({ label, data: await readFile(join(input.runDir, file)) })),
  );

  const result = await generateText({
    model,
    system,
    output: Output.object({ schema: summarySchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              input.pr
                ? `PR title: ${input.pr.title}\nPR description:\n${input.pr.body?.slice(0, 4_000) ?? "(none)"}`
                : "",
              `Affected flows:\n${changes}`,
              input.diff ? `Code diff (UI files first, may be truncated):\n${input.diff}` : "",
              images.length ? "Before/after screenshots follow, in pairs." : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
          ...images.flatMap((image) => [
            { type: "text" as const, text: image.label },
            { type: "file" as const, data: image.data, mediaType: "image/png" },
          ]),
        ],
      },
    ],
  });
  meter.add("summarize", result);
  const known = new Set(input.flows.map((flow) => flow.id));
  return {
    headline: result.output.headline.slice(0, 80),
    bullets: result.output.bullets.slice(0, 4),
    perFlow: Object.fromEntries(
      result.output.perFlow
        .filter((entry) => known.has(entry.flowId))
        .map((entry) => [
          entry.flowId,
          entry.note.length > 280 ? `${entry.note.slice(0, 279)}…` : entry.note,
        ]),
    ),
  };
}
