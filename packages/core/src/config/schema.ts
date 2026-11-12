import * as z from "zod";

const url = z.url({ protocol: /^https?$/ });

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
  model: z.looseObject({ provider: z.string().min(1), model: z.string().min(1) }).optional(),
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
