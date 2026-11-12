import { access } from "node:fs/promises";
import { resolve } from "node:path";
import {
  type Config,
  type Flow,
  flowsDir,
  loadConfig,
  loadFlow,
  ReeldiffError,
  replay,
  type StepResult,
} from "@reeldiff/core";

type ReplayFlags = { headed?: boolean; url?: string; config?: string };

function parseBaseUrl(value: string | undefined) {
  if (!value) throw new ReeldiffError("No base URL. Set baseUrl in the config or pass --url.");
  try {
    return new URL(value);
  } catch {
    throw new ReeldiffError(`"${value}" is not a valid URL.`);
  }
}

async function storageStateFor(flow: Flow, config: Config, rootDir: string) {
  if (flow.auth === "none") return undefined;
  const profile = config.auth[flow.auth];
  if (!profile) {
    const known = Object.keys(config.auth);
    throw new ReeldiffError(
      `Flow "${flow.id}" uses auth profile "${flow.auth}", which isn't in the config.${known.length ? ` Known profiles: ${known.join(", ")}` : ""}`,
    );
  }
  if (!("storageState" in profile)) {
    // shortcut: login-flow auth profiles aren't supported yet, add with the auth command
    throw new ReeldiffError(
      `Auth profile "${flow.auth}" uses a login flow, which isn't supported yet. Use storageState.`,
    );
  }
  const path = resolve(rootDir, profile.storageState);
  try {
    await access(path);
  } catch {
    throw new ReeldiffError(
      `Auth profile "${flow.auth}" points to ${path}, which doesn't exist. Save a logged-in session there first.`,
    );
  }
  return path;
}

const printStep = (result: StepResult) =>
  console.log(
    `${result.status === "passed" ? "✓" : "✗"} ${result.index} ${result.label} (${result.durationMs}ms)`,
  );

export async function replayCommand(flowId: string, flags: ReplayFlags) {
  const { config, rootDir } = await loadConfig({ path: flags.config });
  const baseUrl = parseBaseUrl(flags.url ?? config.baseUrl);
  const flow = await loadFlow(flowsDir(rootDir), flowId);
  const storageState = await storageStateFor(flow, config, rootDir);

  console.log(`Replaying ${flow.id} against ${baseUrl.origin}${flags.headed ? " (headed)" : ""}`);
  const result = await replay(flow, {
    baseUrl: baseUrl.href,
    headed: flags.headed,
    storageState,
    stepDelay: config.stepDelay,
    onStep: printStep,
  });

  const failed = result.steps.find((step) => step.status === "failed");
  if (failed) {
    console.error(`\nStep ${failed.index} failed: ${failed.error}`);
    if ("intent" in failed.step && failed.step.intent)
      console.error(`Intent: ${failed.step.intent}`);
    process.exitCode = 1;
    return;
  }
  console.log(`\n${flow.id} passed in ${(result.durationMs / 1000).toFixed(1)}s`);
}
