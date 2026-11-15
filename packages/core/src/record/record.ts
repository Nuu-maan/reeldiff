import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import type { Flow } from "../flow/schema.ts";
import type { ManifestFlow, ManifestStep } from "../manifest.ts";
import { withStart } from "../replay/replay.ts";
import { type PointerTrack, runSteps, type StepResult } from "../replay/steps.ts";
import { renderCursorSprites } from "./cursor.ts";
import { framesToMp4 } from "./ffmpeg.ts";
import { installOverlay } from "./overlay.ts";
import { type Screencast, startScreencast } from "./screencast.ts";
import { captureSnapshot, localizeAssets, rrwebInitScript } from "./snapshot.ts";

export type RecordOptions = {
  baseUrl: string;
  runDir: string;
  headed?: boolean;
  storageState?: string;
  stepDelay?: number;
  stepTimeout?: number;
  mask?: string[];
  before?: boolean;
  onStep?: (result: StepResult) => void;
};

type Capture = {
  screenshot: string;
  snapshot?: string;
  target?: ManifestStep["target"];
  scroll?: ManifestStep["scroll"];
};

type OverlayPage = {
  __reeldiff: { show(): void; hide(): void; caption(text: string | null): void };
};

const overlay = (page: Page, call: "show" | "hide") =>
  page.evaluate((method) => (window as unknown as OverlayPage).__reeldiff[method](), call);

// Head and before captures run at different speeds, so wait out finite animations before every screenshot.
const settle = (page: Page) =>
  page
    .waitForFunction(
      () =>
        document
          .getAnimations()
          .every(
            (a) =>
              a.playState !== "running" ||
              a.effect?.getTiming().iterations === Number.POSITIVE_INFINITY,
          ),
      undefined,
      { timeout: 2_000 },
    )
    .catch(() => {});

export const maskSelector = (mask: string[] = []) => ["input[type=password]", ...mask].join(", ");

export async function record(flow: Flow, options: RecordOptions): Promise<ManifestFlow> {
  const flowPath = `flows/${flow.id}`;
  const flowDir = join(options.runDir, flowPath);
  const framesDir = options.before ? undefined : await mkdtemp(join(tmpdir(), "reeldiff-frames-"));
  await mkdir(join(flowDir, "steps"), { recursive: true });
  if (!options.before) await mkdir(join(flowDir, "snapshots"), { recursive: true });
  const mask = maskSelector(options.mask);

  const browser = await chromium.launch({ headless: !options.headed });
  const captures = new Map<number, Capture>();
  const assets = new Map<string, string>();
  let results: StepResult[] = [];
  let screencast: Screencast | undefined;
  const pointer: PointerTrack | undefined = options.before ? undefined : { moves: [], presses: [] };

  try {
    const context = await browser.newContext({
      baseURL: options.baseUrl,
      viewport: flow.viewport,
      storageState: options.storageState,
    });
    await context.addInitScript(installOverlay, mask);
    if (!options.before) await context.addInitScript({ content: await rrwebInitScript() });
    const page = await context.newPage();
    if (framesDir) screencast = await startScreencast(page, framesDir, flow.viewport);

    const capture = async (name: string): Promise<Capture> => {
      screencast?.pause();
      await overlay(page, "hide");
      await settle(page);
      const screenshot = `${flowPath}/steps/${name}${options.before ? ".before" : ""}.png`;
      await page.screenshot({ path: join(options.runDir, screenshot), animations: "disabled" });
      if (options.before) return { screenshot };
      let snapshot: string | undefined = `${flowPath}/snapshots/${name}.json`;
      try {
        const json = JSON.stringify(await captureSnapshot(page, mask));
        await writeFile(
          join(options.runDir, snapshot),
          await localizeAssets(json, page, options.runDir, `${flowPath}/assets`, assets),
        );
      } catch {
        snapshot = undefined;
      }
      await overlay(page, "show");
      await page.evaluate(() => new Promise(requestAnimationFrame));
      screencast?.resume();
      const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
      return { screenshot, snapshot, scroll };
    };

    results = await runSteps(page, withStart(flow), {
      stepDelay: options.stepDelay ?? 400,
      stepTimeout: options.stepTimeout ?? 10_000,
      humanize: !options.before,
      pointer,
      onStep: options.onStep,
      beforeStep: async ({ step, index, target }) => {
        if (index === 0) return;
        const shot = await capture(String(index));
        const box = target ? await target.boundingBox({ timeout: 2_000 }).catch(() => null) : null;
        captures.set(index, { ...shot, target: box ?? undefined });
        await page.evaluate(
          (text) => (window as unknown as OverlayPage).__reeldiff.caption(text),
          step.caption ?? null,
        );
      },
    });

    const recordedUntil = Date.now();
    const final = await capture("final").catch(() => undefined);
    const frames = await screencast?.stop();
    await context.close();

    const firstStep = results[1] ?? results[0];
    const videoStart = firstStep ? firstStep.startedAt : recordedUntil;
    const video = frames?.length ? `${flowPath}/video.mp4` : undefined;
    if (frames && video && framesDir && pointer) {
      await framesToMp4(
        frames,
        join(options.runDir, video),
        { start: videoStart, end: recordedUntil + 1_000 },
        { track: pointer, sprites: await renderCursorSprites(browser, framesDir) },
      );
    }

    const steps: ManifestStep[] = results.slice(1).map((result) => {
      const step = result.step;
      const shot = captures.get(result.index);
      return {
        index: result.index,
        label: result.label,
        action: step.action,
        intent: "intent" in step ? step.intent : undefined,
        caption: step.caption,
        status: result.status,
        error: result.error,
        startMs: result.startedAt - videoStart,
        endMs: result.startedAt - videoStart + result.durationMs,
        screenshot: shot?.screenshot,
        snapshot: shot?.snapshot,
        target: shot?.target,
        scroll: shot?.scroll,
      };
    });

    const passed =
      results.length === withStart(flow).length && results.every((r) => r.status === "passed");
    return {
      id: flow.id,
      title: flow.title,
      description: flow.description,
      kind: "flow",
      status: passed ? "new" : "broken",
      reason: passed ? undefined : results.find((r) => r.status === "failed")?.error,
      viewport: flow.viewport,
      video,
      poster: final?.screenshot,
      durationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
      steps,
    };
  } finally {
    await browser.close();
    if (framesDir) await rm(framesDir, { recursive: true, force: true });
  }
}
