import { chromium } from "playwright";
import type { Flow, Step } from "../flow/schema.ts";
import { runSteps, type StepResult } from "./steps.ts";

export type ReplayOptions = {
  baseUrl: string;
  headed?: boolean;
  storageState?: string;
  stepDelay?: number;
  stepTimeout?: number;
  onStep?: (result: StepResult) => void;
};

export type ReplayResult = {
  flowId: string;
  status: "passed" | "failed";
  durationMs: number;
  steps: StepResult[];
};

export const withStart = (flow: Flow): Step[] => [
  { action: "goto", url: flow.start },
  ...flow.steps,
];

export async function replay(flow: Flow, options: ReplayOptions): Promise<ReplayResult> {
  const started = Date.now();
  const browser = await chromium.launch({ headless: !options.headed });
  try {
    const context = await browser.newContext({
      baseURL: options.baseUrl,
      viewport: flow.viewport,
      reducedMotion: "reduce",
      storageState: options.storageState,
    });
    const steps = await runSteps(await context.newPage(), withStart(flow), {
      stepDelay: options.stepDelay ?? 400,
      stepTimeout: options.stepTimeout ?? 10_000,
      onStep: options.onStep,
    });
    return {
      flowId: flow.id,
      status: steps.every((s) => s.status === "passed") ? "passed" : "failed",
      durationMs: Date.now() - started,
      steps,
    };
  } finally {
    await browser.close();
  }
}
