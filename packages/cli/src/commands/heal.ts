import { readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import {
  describeTarget,
  findFlowFile,
  flowsDir,
  heal,
  languageModel,
  setStepTargets,
  UsageMeter,
} from "@reeldiff/core";
import {
  firstFailure,
  prepare,
  printStep,
  printUsage,
  reportFailure,
  type TargetFlags,
} from "./shared.ts";

export async function healCommand(flowId: string, flags: TargetFlags) {
  const { config, rootDir, baseUrl, flow } = await prepare(flowId, flags);
  const meter = new UsageMeter();
  const model = languageModel(config.model, "heal");

  console.log(`Healing ${flow.id} against ${baseUrl.origin}${flags.headed ? " (headed)" : ""}`);
  const result = await heal(flow, {
    baseUrl: baseUrl.href,
    model,
    meter,
    headed: flags.headed,
    stepDelay: config.stepDelay,
    onStep: printStep,
    onHeal: (change) =>
      console.log(
        `  healed step ${change.stepIndex + 1}: ${describeTarget(change.from)} → ${describeTarget(change.to)}`,
      ),
  });

  if (result.changes.length) {
    const file = await findFlowFile(flowsDir(rootDir), flow.id);
    const source = await readFile(file, "utf8");
    const targets = new Map(result.changes.map((change) => [change.stepIndex, change.to]));
    await writeFile(file, setStepTargets(source, targets));
    console.log(
      `\nUpdated ${relative(process.cwd(), file).replaceAll("\\", "/")}. Review the change before committing.`,
    );
  }
  printUsage(meter);

  if (result.status === "broken") {
    reportFailure(firstFailure(result.steps));
    return;
  }
  console.log(
    result.status === "healed"
      ? `${flow.id} healed and passes.`
      : `${flow.id} passes, nothing to heal.`,
  );
}
