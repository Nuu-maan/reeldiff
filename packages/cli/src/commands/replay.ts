import { replay } from "@reeldiff/core";
import { firstFailure, prepare, printStep, reportFailure, type TargetFlags } from "./shared.ts";

export async function replayCommand(flowId: string, flags: TargetFlags) {
  const { config, baseUrl, flow, storageState } = await prepare(flowId, flags);

  console.log(`Replaying ${flow.id} against ${baseUrl.origin}${flags.headed ? " (headed)" : ""}`);
  const result = await replay(flow, {
    baseUrl: baseUrl.href,
    headed: flags.headed,
    storageState,
    stepDelay: config.stepDelay,
    onStep: printStep,
  });

  if (reportFailure(firstFailure(result.steps))) return;
  console.log(`\n${flow.id} passed in ${(result.durationMs / 1000).toFixed(1)}s`);
}
