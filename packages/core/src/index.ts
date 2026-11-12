import pkg from "../package.json" with { type: "json" };

export const version: string = pkg.version;

export { configFileNames, type LoadedConfig, loadConfig } from "./config/load.ts";
export { type Config, type ConfigInput, configSchema, defineConfig } from "./config/schema.ts";
export { ReeldiffError } from "./errors.ts";
export { flowsDir, loadFlow, loadFlows, parseFlow } from "./flow/load.ts";
export {
  type Flow,
  type FlowInput,
  flowSchema,
  type Step,
  stepSchema,
  type Target,
  targetSchema,
} from "./flow/schema.ts";
export { describeTarget, locate } from "./replay/locate.ts";
export { type ReplayOptions, type ReplayResult, replay } from "./replay/replay.ts";
export { describeStep, type StepResult } from "./replay/steps.ts";
