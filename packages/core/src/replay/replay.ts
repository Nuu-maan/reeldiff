import { chromium, type Page } from "playwright";
import type { Flow, Step } from "../flow/schema.ts";
import { describeTarget, locate } from "./locate.ts";

export type ReplayOptions = {
  baseUrl: string;
  headed?: boolean;
  storageState?: string;
  stepDelay?: number;
  stepTimeout?: number;
  onStep?: (result: StepResult) => void;
};

export type StepResult = {
  index: number;
  step: Step;
  label: string;
  status: "passed" | "failed";
  durationMs: number;
  error?: string;
};

export type ReplayResult = {
  flowId: string;
  status: "passed" | "failed";
  durationMs: number;
  steps: StepResult[];
};

export function describeStep(step: Step): string {
  const target = "target" in step && step.target ? ` ${describeTarget(step.target)}` : "";
  switch (step.action) {
    case "goto":
      return `goto ${step.url}`;
    case "fill":
      return `fill${target}`;
    case "select":
      return `select${target} with "${step.value}"`;
    case "press":
      return `press ${step.key}${target}`;
    case "wait":
      return step.target ? `wait for${target}` : `wait ${step.ms ?? 0}ms`;
    case "expect":
      return `expect${target} ${step.state}`;
    default:
      return `${step.action}${target}`;
  }
}

async function perform(page: Page, step: Step, timeout: number) {
  switch (step.action) {
    case "goto":
      return void (await page.goto(step.url, { timeout }));
    case "click":
      return locate(page, step.target).click({ timeout });
    case "fill":
      return locate(page, step.target).fill(step.value, { timeout });
    case "select": {
      const field = locate(page, step.target);
      const native = await field.evaluate((el) => el.tagName === "SELECT", undefined, { timeout });
      if (native) return void (await field.selectOption(step.value, { timeout }));
      await field.click({ timeout });
      return page.getByRole("option", { name: step.value, exact: true }).click({ timeout });
    }
    case "press":
      return step.target
        ? locate(page, step.target).press(step.key, { timeout })
        : page.keyboard.press(step.key);
    case "scroll":
      return step.target
        ? locate(page, step.target).scrollIntoViewIfNeeded({ timeout })
        : page.mouse.wheel(0, step.y ?? 0);
    case "hover":
      return locate(page, step.target).hover({ timeout });
    case "wait":
      return step.target
        ? locate(page, step.target).waitFor({ state: "visible", timeout })
        : page.waitForTimeout(step.ms ?? 0);
    case "expect":
      return locate(page, step.target).waitFor({ state: step.state, timeout });
  }
}

const firstLine = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "";

export async function replay(flow: Flow, options: ReplayOptions): Promise<ReplayResult> {
  const { stepDelay = 400, stepTimeout = 10_000 } = options;
  const started = Date.now();
  const steps: StepResult[] = [];
  const browser = await chromium.launch({ headless: !options.headed });

  try {
    const context = await browser.newContext({
      baseURL: options.baseUrl,
      viewport: flow.viewport,
      reducedMotion: "reduce",
      storageState: options.storageState,
    });
    const page = await context.newPage();
    const run: Step[] = [{ action: "goto", url: flow.start }, ...flow.steps];

    for (const [index, step] of run.entries()) {
      const stepStarted = Date.now();
      const result: StepResult = {
        index,
        step,
        label: describeStep(step),
        status: "passed",
        durationMs: 0,
      };
      try {
        await perform(page, step, stepTimeout);
        await page.waitForLoadState("networkidle", { timeout: stepTimeout });
        if (stepDelay) await page.waitForTimeout(stepDelay);
      } catch (error) {
        result.status = "failed";
        result.error = firstLine(error);
      }
      result.durationMs = Date.now() - stepStarted;
      steps.push(result);
      options.onStep?.(result);
      if (result.status === "failed") break;
    }
  } finally {
    await browser.close();
  }

  return {
    flowId: flow.id,
    status: steps.every((s) => s.status === "passed") ? "passed" : "failed",
    durationMs: Date.now() - started,
    steps,
  };
}
