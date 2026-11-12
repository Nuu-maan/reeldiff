import { access } from "node:fs/promises";
import { resolve } from "node:path";
import {
  type Config,
  type Flow,
  flowsDir,
  loadConfig,
  loadFlow,
  ReeldiffError,
  type StepResult,
} from "@reeldiff/core";

export type TargetFlags = { headed?: boolean; url?: string; config?: string };

export function parseBaseUrl(value: string | undefined): URL {
  if (!value) throw new ReeldiffError("No base URL. Set baseUrl in the config or pass --url.");
  try {
    return new URL(value);
  } catch {
    throw new ReeldiffError(`"${value}" is not a valid URL.`);
  }
}

export async function storageStateFor(flow: Flow, config: Config, rootDir: string) {
  if (flow.auth === "none") return undefined;
  const profile = config.auth[flow.auth];
  if (!profile) {
    const known = Object.keys(config.auth);
    throw new ReeldiffError(
      `Flow "${flow.id}" uses auth profile "${flow.auth}", which isn't in the config.${known.length ? ` Known profiles: ${known.join(", ")}` : ""}`,
    );
  }
  if (!("storageState" in profile)) {
    // shortcut: login-flow auth profiles aren't supported yet, add with the auth command (#5)
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

export async function prepare(flowId: string, flags: TargetFlags) {
  const loaded = await loadConfig({ path: flags.config });
  const baseUrl = parseBaseUrl(flags.url ?? loaded.config.baseUrl);
  const flow = await loadFlow(flowsDir(loaded.rootDir), flowId);
  const storageState = await storageStateFor(flow, loaded.config, loaded.rootDir);
  return { ...loaded, baseUrl, flow, storageState };
}

export const printStep = (result: StepResult) =>
  console.log(
    `${result.status === "passed" ? "✓" : "✗"} ${result.index} ${result.label} (${result.durationMs}ms)`,
  );

export type Failure = { index: number; error?: string; intent?: string };

export function reportFailure(failed: Failure | undefined) {
  if (!failed) return false;
  console.error(`
Step ${failed.index} failed: ${failed.error}`);
  if (failed.intent) console.error(`Intent: ${failed.intent}`);
  process.exitCode = 1;
  return true;
}

export const firstFailure = (steps: StepResult[]): Failure | undefined => {
  const failed = steps.find((step) => step.status === "failed");
  if (!failed) return undefined;
  return {
    index: failed.index,
    error: failed.error,
    intent: "intent" in failed.step ? failed.step.intent : undefined,
  };
};
