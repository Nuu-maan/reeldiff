import type { LanguageModel } from "ai";
import type { Flow, Step, Target } from "../flow/schema.ts";
import { describeTarget } from "../replay/locate.ts";
import { withStart } from "../replay/replay.ts";
import { runStep, type StepResult } from "../replay/steps.ts";
import { deriveTarget } from "./derive-target.ts";
import type { UsageMeter } from "./model.ts";
import { openAiSession } from "./stagehand.ts";

export type HealChange = { stepIndex: number; intent: string; from: Target; to: Target };

export type HealResult = {
  status: "passed" | "healed" | "broken";
  changes: HealChange[];
  steps: StepResult[];
};

export type HealOptions = {
  baseUrl: string;
  model: LanguageModel;
  meter: UsageMeter;
  headed?: boolean;
  stepDelay?: number;
  stepTimeout?: number;
  onStep?: (result: StepResult) => void;
  onHeal?: (change: HealChange) => void;
};

const observeInstruction = (step: Step & { intent: string }) =>
  step.action === "expect"
    ? `Find the element that shows this: ${step.intent}`
    : `Find the element to ${step.action} for this step: ${step.intent}`;

export async function heal(flow: Flow, options: HealOptions): Promise<HealResult> {
  const session = await openAiSession({
    flow,
    headed: options.headed,
    model: options.model,
    meter: options.meter,
    task: "heal",
  });
  const run = { stepDelay: options.stepDelay ?? 400, stepTimeout: options.stepTimeout ?? 10_000 };
  const steps: StepResult[] = [];
  const changes: HealChange[] = [];

  try {
    const base = new URL(options.baseUrl);
    const all = withStart(flow).map((step) =>
      step.action === "goto" ? { ...step, url: new URL(step.url, base).href } : step,
    );

    for (const [index, step] of all.entries()) {
      let result = await runStep(session.page, step, index, run);
      const healable = result.status === "failed" && "target" in step && step.target && step.intent;
      if (healable) {
        const { data } = await session.stagehand.observe(
          observeInstruction(step as Step & { intent: string }),
        );
        for (const action of data.slice(0, 3)) {
          const target = await deriveTarget(session.page, action.selector).catch(() => undefined);
          if (!target || describeTarget(target) === describeTarget(step.target as Target)) continue;
          const retried = await runStep(session.page, { ...step, target } as Step, index, run);
          if (retried.status === "passed") {
            const change = {
              stepIndex: index - 1,
              intent: step.intent as string,
              from: step.target as Target,
              to: target,
            };
            changes.push(change);
            options.onHeal?.(change);
            result = retried;
            break;
          }
        }
      }
      steps.push(result);
      options.onStep?.(result);
      if (result.status === "failed") break;
    }
  } finally {
    await session.close();
  }

  const broken = steps.some((s) => s.status === "failed") || steps.length < flow.steps.length + 1;
  return { status: broken ? "broken" : changes.length ? "healed" : "passed", changes, steps };
}
