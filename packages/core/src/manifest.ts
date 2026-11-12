import * as z from "zod";

const box = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() });

export const manifestStepSchema = z.object({
  index: z.number().int(),
  label: z.string(),
  action: z.string(),
  intent: z.string().optional(),
  caption: z.string().optional(),
  status: z.enum(["passed", "failed"]),
  error: z.string().optional(),
  startMs: z.number(),
  endMs: z.number(),
  screenshot: z.string().optional(),
  before: z.string().optional(),
  snapshot: z.string().optional(),
  target: box.optional(),
  scroll: z.object({ x: z.number(), y: z.number() }).optional(),
  diff: z.number().optional(),
  changed: z.boolean().optional(),
});

export const flowStatusSchema = z.enum(["changed", "unchanged", "new", "broken"]);

export const manifestFlowSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  kind: z.enum(["flow", "route"]).default("flow"),
  status: flowStatusSchema,
  reason: z.string().optional(),
  viewport: z.object({ width: z.number(), height: z.number() }),
  video: z.string().optional(),
  poster: z.string().optional(),
  durationMs: z.number(),
  steps: z.array(manifestStepSchema),
  healed: z.string().optional(),
});

export const manifestSchema = z.object({
  version: z.literal(1),
  runId: z.string(),
  createdAt: z.string(),
  baseUrl: z.string(),
  compareUrl: z.string().optional(),
  repo: z.string().optional(),
  pr: z
    .object({
      number: z.number(),
      title: z.string(),
      url: z.string().optional(),
      sha: z.string().optional(),
    })
    .optional(),
  summary: z
    .object({
      headline: z.string(),
      bullets: z.array(z.string()),
      perFlow: z.record(z.string(), z.string()).default({}),
    })
    .optional(),
  usage: z
    .object({ inputTokens: z.number(), outputTokens: z.number(), costUsd: z.number().optional() })
    .optional(),
  durationMs: z.number(),
  flows: z.array(manifestFlowSchema),
});

export type Manifest = z.infer<typeof manifestSchema>;
export type ManifestFlow = z.infer<typeof manifestFlowSchema>;
export type ManifestStep = z.infer<typeof manifestStepSchema>;
export type FlowStatus = z.infer<typeof flowStatusSchema>;
