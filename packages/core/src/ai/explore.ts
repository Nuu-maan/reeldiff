import { generateText, type LanguageModel, Output } from "ai";
import * as z from "zod";
import { ReeldiffError } from "../errors.ts";
import { type Flow, flowSchema, type Step, type Target } from "../flow/schema.ts";
import { slugify } from "../flow/slug.ts";
import { describeTarget } from "../replay/locate.ts";
import { type ReplayResult, replay } from "../replay/replay.ts";
import { runStep } from "../replay/steps.ts";
import { deriveTarget } from "./derive-target.ts";
import type { UsageMeter } from "./model.ts";
import { openAiSession } from "./stagehand.ts";

const decisionSchema = z.object({
  thought: z.string().describe("One short sentence about what to do next and why"),
  done: z.boolean().describe("True only when the goal is visibly achieved on the current page"),
  step: z
    .object({
      action: z.enum(["click", "fill", "select", "press", "hover"]),
      element: z.string().describe('The element in plain words, e.g. "the New project button"'),
      value: z
        .string()
        .nullable()
        .describe("Text to type for fill, or the option label for select"),
      key: z.string().nullable().describe("Key name for press, e.g. Enter"),
      intent: z.string().describe("What this step does, in plain words, under 60 characters"),
      caption: z
        .string()
        .nullable()
        .describe(
          "Optional caption telling viewers what changes on screen, under 50 characters, not starting with Click. Null for routine steps",
        ),
    })
    .nullable()
    .describe("The next step, or null when done"),
  proof: z
    .object({
      element: z.string().describe("A visible element that proves the goal was achieved"),
      intent: z.string(),
    })
    .nullable()
    .describe("Set when done"),
  title: z.string().nullable().describe("Set when done: a short flow title in sentence case"),
  description: z.string().nullable().describe("Set when done: one sentence describing the flow"),
});

type Decision = z.infer<typeof decisionSchema>;

const system = `You drive a web app to reach a goal, one step at a time, so the steps can be saved as a repeatable demo.
Rules:
- Propose exactly one step per turn, using elements visible in the accessibility tree.
- Describe elements the way a person would: their visible label or text and their type.
- Use realistic, short sample values when typing. Never type real personal data.
- Don't repeat a step that already succeeded. If a step failed, try a different element or approach.
- Set done to true only when the page visibly shows the goal was achieved, and give a proof element.`;

export type ExploreEvent = { label: string; status: "passed" | "failed"; error?: string };

export type ExploreOptions = {
  goal: string;
  url: URL;
  model: LanguageModel;
  meter: UsageMeter;
  headed?: boolean;
  maxSteps?: number;
  stepTimeout?: number;
  onStep?: (event: ExploreEvent) => void;
};

export type ExploreResult = { flow: Flow; replay: ReplayResult };

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max)}\n…` : text;

function buildStep(next: NonNullable<Decision["step"]>, target: Target): Step {
  const base = { target, intent: next.intent, ...(next.caption ? { caption: next.caption } : {}) };
  switch (next.action) {
    case "fill":
      return { action: "fill", ...base, value: next.value ?? "" };
    case "select":
      return { action: "select", ...base, value: next.value ?? "" };
    case "press":
      return { action: "press", ...base, key: next.key ?? "Enter" };
    default:
      return { action: next.action, ...base };
  }
}

export async function explore(options: ExploreOptions): Promise<ExploreResult> {
  const viewport = { width: 1440, height: 900 };
  const session = await openAiSession({
    flow: { viewport },
    headed: options.headed,
    model: options.model,
    meter: options.meter,
    task: "explore",
  });
  const run = { stepDelay: 300, stepTimeout: options.stepTimeout ?? 10_000 };
  const steps: Step[] = [];
  const history: string[] = [];
  let finished: Decision | undefined;

  try {
    const { page, stagehand } = session;
    await page.goto(options.url.href);
    await page.waitForLoadState("networkidle");

    const ground = async (element: string) => {
      const { data } = await stagehand.observe(`Find ${element}`);
      for (const action of data.slice(0, 3)) {
        const target = await deriveTarget(page, action.selector).catch(() => undefined);
        if (target) return target;
      }
      throw new ReeldiffError(`Couldn't find ${element} on the page.`);
    };

    let failures = 0;
    for (let turn = 0; turn < (options.maxSteps ?? 20); turn++) {
      const tree = truncate(await page.locator("body").ariaSnapshot(), 12_000);
      const screenshot = await page.screenshot({ type: "jpeg", quality: 60 });
      const result = await generateText({
        model: options.model,
        system,
        output: Output.object({ schema: decisionSchema }),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Goal: ${options.goal}\nCurrent URL: ${page.url()}\n\nSteps so far:\n${history.join("\n") || "(none)"}\n\nAccessibility tree:\n${tree}`,
              },
              { type: "file", data: screenshot, mediaType: "image/jpeg" },
            ],
          },
        ],
      });
      options.meter.add("explore", result);
      const decision = result.output;

      if (decision.done) {
        finished = decision;
        break;
      }
      const next = decision.step;
      if (!next) continue;

      let step: Step;
      try {
        step = buildStep(next, await ground(next.element));
      } catch (error) {
        const message = (error as Error).message;
        history.push(`- FAILED to find ${next.element}: ${message}`);
        options.onStep?.({ label: next.intent, status: "failed", error: message });
        if (++failures >= 4) break;
        continue;
      }

      const outcome = await runStep(page, step, steps.length + 1, run);
      const label =
        `${step.action} ${"target" in step && step.target ? describeTarget(step.target) : ""}`.trim();
      options.onStep?.({ label, status: outcome.status, error: outcome.error });
      if (outcome.status === "passed") {
        steps.push(step);
        history.push(`- ${label}: ${next.intent}`);
        failures = 0;
      } else {
        history.push(`- FAILED ${label}: ${outcome.error}`);
        if (++failures >= 4) break;
      }
    }

    if (!finished?.proof || !finished.title) {
      throw new ReeldiffError(
        `The agent didn't reach the goal${steps.length ? ` after ${steps.length} steps` : ""}. Try a more specific goal or a different start URL.`,
      );
    }
    const proof = await ground(finished.proof.element);
    steps.push({
      action: "expect",
      target: proof,
      intent: finished.proof.intent,
      state: "visible",
    });

    const flow = flowSchema.parse({
      id: slugify(finished.title),
      title: finished.title,
      ...(finished.description ? { description: finished.description } : {}),
      start: `${options.url.pathname}${options.url.search}`,
      steps,
    });
    const check = await replay(flow, { baseUrl: options.url.origin, stepTimeout: run.stepTimeout });
    return { flow, replay: check };
  } finally {
    await session.close();
  }
}
