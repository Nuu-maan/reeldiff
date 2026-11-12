import * as z from "zod";

const url = z.url({ protocol: /^https?$/ });

// Workflows pass unset secrets as empty strings, so treat "" as not set.
const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), url.optional());

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
  baseUrl: optionalUrl.meta({ description: "Custom endpoint, required for openai-compatible" }),
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

export const storageConfigSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("local"),
    dir: z.string().min(1).default(".reeldiff/published"),
    publicUrl: optionalUrl.meta({ description: "Where dir is served, if anywhere" }),
  }),
  z.strictObject({
    type: z.literal("s3"),
    bucket: z.string().min(1),
    endpoint: optionalUrl.meta({ description: "For R2, MinIO and other S3-compatible stores" }),
    region: z.string().min(1).default("auto"),
    publicUrl: url.meta({
      description: "Public base URL of the bucket, used in Slack and PR links",
    }),
    prefix: z.string().default(""),
  }),
]);

export type StorageConfig = z.infer<typeof storageConfigSchema>;
export type ModelTask = "explore" | "heal" | "summarize";

export const authProfileSchema = z.union([
  z.strictObject({ storageState: z.string().min(1) }),
  z.strictObject({ flow: z.string().min(1) }),
]);

export const configSchema = z.strictObject({
  baseUrl: optionalUrl.meta({ description: "Deployment to replay against, e.g. the PR preview" }),
  compareUrl: optionalUrl.meta({ description: "Deployment to compare against for before/after" }),
  model: modelConfigSchema.optional(),
  auth: z.record(z.string(), authProfileSchema).default({}),
  framework: z.enum(["nextjs-app", "nextjs-pages", "none"]).default("none"),
  uiPaths: z.array(z.string().min(1)).default([]),
  storage: storageConfigSchema.default({ type: "local", dir: ".reeldiff/published" }),
  notify: z
    .strictObject({
      slack: z
        .strictObject({
          webhookUrl: optionalUrl.meta({ description: "Incoming webhook URL, read from env" }),
        })
        .optional(),
      githubComment: z.boolean().default(true),
    })
    .default({ githubComment: true }),
  diffThreshold: z.number().min(0).max(1).default(0.01).meta({
    description:
      "Fraction of pixels that must differ in the most-changed 64×64 area for a step to count as changed",
  }),
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
