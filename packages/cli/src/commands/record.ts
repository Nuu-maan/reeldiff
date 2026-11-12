import { relative } from "node:path";
import { createRunDir, record, writeManifest } from "@reeldiff/core";
import { prepare, printStep, reportFailure, type TargetFlags } from "./shared.ts";

export async function recordCommand(flowId: string, flags: TargetFlags) {
  const started = Date.now();
  const { config, rootDir, baseUrl, flow, storageState } = await prepare(flowId, flags);
  const { runId, dir } = await createRunDir(rootDir);

  console.log(`Recording ${flow.id} against ${baseUrl.origin}${flags.headed ? " (headed)" : ""}`);
  const recording = await record(flow, {
    baseUrl: baseUrl.href,
    runDir: dir,
    headed: flags.headed,
    storageState,
    stepDelay: config.stepDelay,
    mask: config.mask,
    onStep: printStep,
  });

  await writeManifest(dir, {
    version: 1,
    runId,
    createdAt: new Date(started).toISOString(),
    baseUrl: baseUrl.origin,
    durationMs: Date.now() - started,
    flows: [recording],
  });

  const out = relative(process.cwd(), dir).replaceAll("\\", "/") || ".";
  if (recording.video) console.log(`\nVideo     ${out}/${recording.video}`);
  console.log(`Steps     ${out}/flows/${flow.id}/steps/`);
  console.log(`Manifest  ${out}/manifest.json`);
  if (recording.status === "broken") {
    const failed = recording.steps.find((step) => step.status === "failed");
    reportFailure(failed ?? { index: 0, error: recording.reason });
    return;
  }
  console.log(`
${flow.id} recorded in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}
