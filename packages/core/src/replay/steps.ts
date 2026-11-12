import type { Locator, Page } from "playwright";
import type { Step } from "../flow/schema.ts";
import { describeTarget, locate } from "./locate.ts";

export type StepResult = {
  index: number;
  step: Step;
  label: string;
  status: "passed" | "failed";
  startedAt: number;
  durationMs: number;
  error?: string;
};

export type StepContext = { page: Page; step: Step; index: number; target?: Locator };

export type RunOptions = {
  stepDelay: number;
  stepTimeout: number;
  humanize?: boolean;
  beforeStep?: (context: StepContext) => Promise<void>;
  onStep?: (result: StepResult) => void;
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

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

async function glideTo(page: Page, target: Locator, timeout: number) {
  await target.scrollIntoViewIfNeeded({ timeout });
  const box = await target.boundingBox({ timeout });
  if (!box) return;
  const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const from = await page.evaluate(
    () => (window as unknown as { __reeldiffPointer?: { x: number; y: number } }).__reeldiffPointer,
  );
  const start = from ?? { x: to.x, y: to.y - 120 };
  const frames = 24;
  for (let frame = 1; frame <= frames; frame++) {
    const t = easeInOut(frame / frames);
    await page.mouse.move(start.x + (to.x - start.x) * t, start.y + (to.y - start.y) * t);
    await page.waitForTimeout(16);
  }
}

const pointerActions = new Set(["click", "fill", "select", "hover"]);

async function perform(context: StepContext, options: RunOptions) {
  const { page, step, target } = context;
  const timeout = options.stepTimeout;
  // Scroll the same way in every mode, or before/after screenshots end up at different offsets.
  if (target && pointerActions.has(step.action)) {
    await target.scrollIntoViewIfNeeded({ timeout });
    if (options.humanize) await glideTo(page, target, timeout);
  }
  switch (step.action) {
    case "goto":
      return void (await page.goto(step.url, { timeout }));
    case "click":
      return target?.click({ timeout });
    case "fill":
      if (!options.humanize) return target?.fill(step.value, { timeout });
      await target?.fill("", { timeout });
      return target?.pressSequentially(step.value, { delay: 35, timeout });
    case "select": {
      if (!target) return;
      const native = await target.evaluate((el) => el.tagName === "SELECT", undefined, { timeout });
      if (native) return void (await target.selectOption(step.value, { timeout }));
      await target.click({ timeout });
      const option = page.getByRole("option", { name: step.value, exact: true });
      await option.scrollIntoViewIfNeeded({ timeout });
      if (options.humanize) {
        await page.waitForTimeout(250);
        await glideTo(page, option, timeout);
      }
      return option.click({ timeout });
    }
    case "press":
      return target ? target.press(step.key, { timeout }) : page.keyboard.press(step.key);
    case "scroll":
      return target ? target.scrollIntoViewIfNeeded({ timeout }) : page.mouse.wheel(0, step.y ?? 0);
    case "hover":
      return target?.hover({ timeout });
    case "wait":
      return target
        ? target.waitFor({ state: "visible", timeout })
        : page.waitForTimeout(step.ms ?? 0);
    case "expect":
      return target?.waitFor({ state: step.state, timeout });
  }
}

const firstLine = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "";

export async function runStep(
  page: Page,
  step: Step,
  index: number,
  options: RunOptions,
): Promise<StepResult> {
  const startedAt = Date.now();
  const context: StepContext = {
    page,
    step,
    index,
    target: "target" in step && step.target ? locate(page, step.target) : undefined,
  };
  const result: StepResult = {
    index,
    step,
    label: describeStep(step),
    status: "passed",
    startedAt,
    durationMs: 0,
  };
  try {
    await options.beforeStep?.(context);
    await perform(context, options);
    await page.waitForLoadState("networkidle", { timeout: options.stepTimeout });
    if (options.stepDelay) await page.waitForTimeout(options.stepDelay);
  } catch (error) {
    result.status = "failed";
    result.error = firstLine(error);
  }
  result.durationMs = Date.now() - startedAt;
  return result;
}

export async function runSteps(
  page: Page,
  steps: Step[],
  options: RunOptions,
): Promise<StepResult[]> {
  const results: StepResult[] = [];
  for (const [index, step] of steps.entries()) {
    const result = await runStep(page, step, index, options);
    results.push(result);
    options.onStep?.(result);
    if (result.status === "failed") break;
  }
  return results;
}
