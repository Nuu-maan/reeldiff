import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import type { Flow } from "../flow/schema.ts";
import type { ManifestFlow, ManifestStep } from "../manifest.ts";
import { withStart } from "../replay/replay.ts";
import { runSteps, type StepResult } from "../replay/steps.ts";
import { toMp4 } from "./ffmpeg.ts";
import { installOverlay } from "./overlay.ts";
import { captureSnapshot, rrwebInitScript } from "./snapshot.ts";

export type RecordOptions = {
  baseUrl: string;
  runDir: string;
  headed?: boolean;
  storageState?: string;
  stepDelay?: number;
  stepTimeout?: number;
  mask?: string[];
  onStep?: (result: StepResult) => void;
};

type Capture = { screenshot: string; snapshot?: string; target?: ManifestStep["target"] };

type OverlayPage = {
  __reeldiff: { show(): void; hide(): void; caption(text: string | null): void };
};

const overlay = (page: Page, call: "show" | "hide") =>
  page.evaluate((method) => (window as unknown as OverlayPage).__reeldiff[method](), call);

export const maskSelector = (mask: string[] = []) => ["input[type=password]", ...mask].join(", ");

export async function record(flow: Flow, options: RecordOptions): Promise<ManifestFlow> {
  const flowPath = `flows/${flow.id}`;
  const flowDir = join(options.runDir, flowPath);
  const videoTmp = join(tmpdir(), `reeldiff-video-${flow.id}-${Date.now()}`);
  await mkdir(join(flowDir, "steps"), { recursive: true });
  await mkdir(join(flowDir, "snapshots"), { recursive: true });
  const mask = maskSelector(options.mask);

  const browser = await chromium.launch({ headless: !options.headed });
  const captures = new Map<number, Capture>();
  let results: StepResult[] = [];
  let pageCreatedAt = 0;

  try {
    const context = await browser.newContext({
      baseURL: options.baseUrl,
      viewport: flow.viewport,
      storageState: options.storageState,
      recordVideo: { dir: videoTmp, size: flow.viewport, fps: 30 },
    });
    await context.addInitScript(installOverlay, mask);
    await context.addInitScript({ content: await rrwebInitScript() });
    const page = await context.newPage();
    pageCreatedAt = Date.now();

    const capture = async (name: string): Promise<Capture> => {
      await overlay(page, "hide");
      const screenshot = `${flowPath}/steps/${name}.png`;
      await page.screenshot({ path: join(options.runDir, screenshot), animations: "disabled" });
      let snapshot: string | undefined = `${flowPath}/snapshots/${name}.json`;
      try {
        await writeFile(
          join(options.runDir, snapshot),
          JSON.stringify(await captureSnapshot(page, mask)),
        );
      } catch {
        snapshot = undefined;
      }
      await overlay(page, "show");
      return { screenshot, snapshot };
    };

    results = await runSteps(page, withStart(flow), {
      stepDelay: options.stepDelay ?? 400,
      stepTimeout: options.stepTimeout ?? 10_000,
      humanize: true,
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

    const final = await capture("final").catch(() => undefined);
    const video = page.video();
    await context.close();

    const firstStep = results[1] ?? results[0];
    const videoStart = firstStep ? firstStep.startedAt : pageCreatedAt;
    const webm = video ? await video.path() : undefined;
    if (webm) await toMp4(webm, join(flowDir, "video.mp4"), (videoStart - pageCreatedAt) / 1000);

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
      video: webm ? `${flowPath}/video.mp4` : undefined,
      poster: final?.screenshot,
      durationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
      steps,
    };
  } finally {
    await browser.close();
    await rm(videoTmp, { recursive: true, force: true });
  }
}
