import pkg from "../package.json" with { type: "json" };

export const version: string = pkg.version;

export { deriveTarget } from "./ai/derive-target.ts";
export {
  type ExploreEvent,
  type ExploreOptions,
  type ExploreResult,
  explore,
} from "./ai/explore.ts";
export { type HealChange, type HealOptions, type HealResult, heal } from "./ai/heal.ts";
export { defaultKeyEnv, languageModel, type Usage, UsageMeter } from "./ai/model.ts";
export {
  type Affected,
  type AffectedFlow,
  type AffectedRoute,
  findAffected,
} from "./change/affected.ts";
export { compareFlow, shouldNotify } from "./change/compare.ts";
export { diffRatio } from "./change/diff.ts";
export { changedFiles } from "./change/git.ts";
export type { RouteAdapter } from "./change/route-adapter.ts";
export { loadNearestEnv } from "./config/env.ts";
export { configFileNames, type LoadedConfig, loadConfig } from "./config/load.ts";
export {
  type Config,
  type ConfigInput,
  configSchema,
  defineConfig,
  type ModelConfig,
  type ModelTask,
  providers,
} from "./config/schema.ts";
export { ReeldiffError } from "./errors.ts";
export { setStepTargets } from "./flow/edit.ts";
export { findFlowFile, flowsDir, loadFlow, loadFlows, parseFlow } from "./flow/load.ts";
export {
  type Flow,
  type FlowInput,
  flowSchema,
  type Step,
  stepSchema,
  type Target,
  targetSchema,
} from "./flow/schema.ts";
export { slugify } from "./flow/slug.ts";
export { stringifyFlow } from "./flow/stringify.ts";
export {
  type FlowStatus,
  type Manifest,
  type ManifestFlow,
  type ManifestStep,
  manifestSchema,
} from "./manifest.ts";
export { toMp4 } from "./record/ffmpeg.ts";
export { maskSelector, type RecordOptions, record } from "./record/record.ts";
export { createRunDir, newRunId, writeManifest } from "./record/run-dir.ts";
export { describeTarget, locate } from "./replay/locate.ts";
export { type ReplayOptions, type ReplayResult, replay } from "./replay/replay.ts";
export { describeStep, type StepResult } from "./replay/steps.ts";
