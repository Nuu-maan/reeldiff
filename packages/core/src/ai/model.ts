import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import type { ModelConfig, ModelTask } from "../config/schema.ts";
import { ReeldiffError } from "../errors.ts";

export const defaultKeyEnv: Record<ModelConfig["provider"], string | undefined> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  ollama: undefined,
  "openai-compatible": "OPENAI_COMPATIBLE_API_KEY",
};

function apiKey(config: ModelConfig): string | undefined {
  const name = config.apiKeyEnv ?? defaultKeyEnv[config.provider];
  if (!name) return undefined;
  const key = process.env[name];
  if (!key) {
    throw new ReeldiffError(
      `${config.provider} needs an API key in the ${name} environment variable. Set it in your shell or a .env file.`,
    );
  }
  return key;
}

export function languageModel(config: ModelConfig | undefined, task: ModelTask): LanguageModel {
  if (!config) {
    throw new ReeldiffError(
      `${task} needs a model. Add model: { provider, model } to reeldiff.config.ts.`,
    );
  }
  const id = config[task] ?? config.model;
  const key = apiKey(config);
  switch (config.provider) {
    case "openai":
      return createOpenAI({ apiKey: key, baseURL: config.baseUrl })(id);
    case "anthropic":
      return createAnthropic({ apiKey: key, baseURL: config.baseUrl })(id);
    case "google":
      return createGoogleGenerativeAI({ apiKey: key, baseURL: config.baseUrl })(id);
    case "openrouter":
      return createOpenRouter({ apiKey: key, baseURL: config.baseUrl })(id, {
        usage: { include: true },
      });
    case "ollama":
      return createOpenAICompatible({
        name: "ollama",
        baseURL: config.baseUrl ?? "http://localhost:11434/v1",
      })(id);
    case "openai-compatible":
      if (!config.baseUrl) {
        throw new ReeldiffError("The openai-compatible provider needs model.baseUrl.");
      }
      return createOpenAICompatible({ name: "custom", baseURL: config.baseUrl, apiKey: key })(id);
  }
}

export type Usage = { inputTokens: number; outputTokens: number; calls: number; costUsd?: number };

type MeteredResult = {
  usage: { inputTokens?: number; outputTokens?: number };
  providerMetadata?: Record<string, Record<string, unknown> | undefined>;
};

const reportedCost = (result: MeteredResult) => {
  const usage = result.providerMetadata?.openrouter?.usage as { cost?: number } | undefined;
  return typeof usage?.cost === "number" ? usage.cost : undefined;
};

export class UsageMeter {
  readonly byTask = new Map<ModelTask, Usage>();

  add(task: ModelTask, result: MeteredResult) {
    const current = this.byTask.get(task) ?? { inputTokens: 0, outputTokens: 0, calls: 0 };
    current.inputTokens += result.usage.inputTokens ?? 0;
    current.outputTokens += result.usage.outputTokens ?? 0;
    current.calls += 1;
    const cost = reportedCost(result);
    if (cost !== undefined) current.costUsd = (current.costUsd ?? 0) + cost;
    this.byTask.set(task, current);
  }

  get total(): Usage {
    const total: Usage = { inputTokens: 0, outputTokens: 0, calls: 0 };
    for (const usage of this.byTask.values()) {
      total.inputTokens += usage.inputTokens;
      total.outputTokens += usage.outputTokens;
      total.calls += usage.calls;
      if (usage.costUsd !== undefined) total.costUsd = (total.costUsd ?? 0) + usage.costUsd;
    }
    return total;
  }
}
