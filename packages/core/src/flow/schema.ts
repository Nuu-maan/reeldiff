import * as z from "zod";

const text = z.string().min(1);

export const targetSchema = z
  .union([
    z.strictObject({
      role: text.meta({ description: "ARIA role, e.g. button, link, textbox" }),
      name: text.optional().meta({ description: "Exact accessible name" }),
    }),
    z.strictObject({ label: text }),
    z.strictObject({ placeholder: text }),
    z.strictObject({ text: text }),
    z.strictObject({ testId: text }),
    z.strictObject({
      css: text.meta({ description: "Last resort when no user-facing locator fits" }),
    }),
  ])
  .meta({
    description: "Prefer role+name, then label, placeholder, text, testId. css is a last resort.",
  });

const intent = text.meta({
  description: "What the step does in plain words. Used to heal the step.",
});
const caption = text.optional().meta({ description: "Shown on the replay page and the video" });

const targeted = { target: targetSchema, intent, caption };

export const stepSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("goto"), url: text, intent: intent.optional(), caption }),
  z.strictObject({ action: z.literal("click"), ...targeted }),
  z.strictObject({ action: z.literal("fill"), ...targeted, value: z.string() }),
  z.strictObject({ action: z.literal("select"), ...targeted, value: text }),
  z.strictObject({
    action: z.literal("press"),
    key: text.meta({ description: "Playwright key name, e.g. Enter or Control+A" }),
    target: targetSchema.optional(),
    intent,
    caption,
  }),
  z.strictObject({
    action: z.literal("scroll"),
    target: targetSchema.optional(),
    y: z.number().optional().meta({ description: "Pixels to scroll when there is no target" }),
    intent,
    caption,
  }),
  z.strictObject({ action: z.literal("hover"), ...targeted }),
  z.strictObject({
    action: z.literal("wait"),
    target: targetSchema.optional(),
    ms: z.number().int().positive().optional(),
    intent: intent.optional(),
    caption,
  }),
  z.strictObject({
    action: z.literal("expect"),
    ...targeted,
    state: z.enum(["visible", "hidden"]).default("visible"),
  }),
]);

export const flowSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers and dashes"),
  title: text,
  description: text.optional(),
  start: text.default("/").meta({ description: "Path or URL the flow starts from" }),
  auth: text.default("none").meta({ description: 'Auth profile from the config, or "none"' }),
  viewport: z
    .strictObject({ width: z.number().int().positive(), height: z.number().int().positive() })
    .default({ width: 1440, height: 900 }),
  covers: z.array(text).default([]).meta({ description: "Globs of source files this flow covers" }),
  steps: z.array(stepSchema).min(1),
});

export type Target = z.infer<typeof targetSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Flow = z.infer<typeof flowSchema>;
export type FlowInput = z.input<typeof flowSchema>;
