import * as z from "zod";

const url = z.url({ protocol: /^https?$/ });

export const providers = [
  "openai",
  "anthropic",
  "google",
  "openrouter",
  "ollama",
  "openai-compatible",
] as const;

const modelId = z.string().min(1);

export const modelConfigSchema = z.strictObject({
  provider: z.enum(providers),
  model: modelId.meta({ description: "Default model id for every AI task" }),
  baseUrl: url.optional().meta({ description: "Custom endpoint, required for openai-compatible" }),
  apiKeyEnv: z
    .string()
    .regex(/^[A-Z_][A-Z0-9_]*$/)
    .optional()
    .meta({ description: "Env var holding the API key, when not the provider default" }),
  explore: modelId.optional().meta({ description: "Model id for explore, defaults to model" }),
  heal: modelId.optional().meta({ description: "Model id for heal, defaults to model" }),
  summarize: modelId.optional().meta({ description: "Model id for summaries, defaults to model" }),
});

export type ModelConfig = z.infer<typeof modelConfigSchema>;
export type ModelTask = "explore" | "heal" | "summarize";

export const authProfileSchema = z.union([
  z.strictObject({ storageState: z.string().min(1) }),
  z.strictObject({ flow: z.string().min(1) }),
]);

export const configSchema = z.strictObject({
  baseUrl: url
    .optional()
    .meta({ description: "Deployment to replay against, e.g. the PR preview" }),
  compareUrl: url
    .optional()
    .meta({ description: "Deployment to compare against for before/after" }),
  model: modelConfigSchema.optional(),
  auth: z.record(z.string(), authProfileSchema).default({}),
  framework: z.enum(["nextjs-app", "nextjs-pages", "none"]).default("none"),
  uiPaths: z.array(z.string().min(1)).default([]),
  storage: z.looseObject({ type: z.enum(["s3", "local"]) }).optional(),
  notify: z.looseObject({}).optional(),
  diffThreshold: z.number().min(0).max(1).default(0.01),
  mask: z.array(z.string().min(1)).default([]),
  stepDelay: z
    .number()
    .int()
    .min(0)
    .default(400)
    .meta({ description: "Pause after each step in ms, so videos are watchable" }),
});

export type Config = z.infer<typeof configSchema>;
export type ConfigInput = z.input<typeof configSchema>;

export const defineConfig = (config: ConfigInput): ConfigInput => config;
