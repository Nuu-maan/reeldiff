import { type ClientLLM, localBrowser, Stagehand } from "@browserbasehq/stagehand";
import {
  type FilePart,
  generateText,
  jsonSchema,
  type LanguageModel,
  type ModelMessage,
  Output,
  type TextPart,
} from "ai";
import { chromium, type Page } from "playwright";
import type { ModelTask } from "../config/schema.ts";
import { ReeldiffError } from "../errors.ts";
import type { Flow } from "../flow/schema.ts";
import type { UsageMeter } from "./model.ts";

type GenerateRequest = Parameters<ClientLLM["generate"]>[0];
type Part = { type: string; text?: string; data?: string; mimeType?: string };

const partsOf = (content: unknown): Part[] =>
  (Array.isArray(content) ? content : [content]) as Part[];

function toMessages(request: GenerateRequest): ModelMessage[] {
  return request.messages.map((message) => {
    const parts = partsOf(message.content);
    if (message.role === "assistant") {
      return {
        role: "assistant",
        content: parts.map((p) => p.text ?? "").join("\n"),
      };
    }
    return {
      role: "user",
      content: parts.flatMap((p): (TextPart | FilePart)[] => {
        if (p.type === "text" && p.text) return [{ type: "text", text: p.text }];
        if (p.type === "image" && p.data) {
          return [{ type: "file", data: p.data, mediaType: p.mimeType ?? "image/png" }];
        }
        return [];
      }),
    };
  });
}

export function stagehandModel(
  model: LanguageModel,
  meter: UsageMeter,
  task: ModelTask,
): ClientLLM {
  return {
    async generate(request: GenerateRequest) {
      const requested = "responseFormat" in request ? request.responseFormat : undefined;
      const format = requested?.type === "json_schema" ? requested : undefined;
      const result = await generateText({
        model,
        system: request.systemPrompt,
        temperature: request.temperature,
        messages: toMessages(request),
        ...(format
          ? { output: Output.object({ schema: jsonSchema(format.schema as object) }) }
          : {}),
      });
      meter.add(task, result);
      const usage = {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        totalTokens: result.usage.totalTokens ?? 0,
      };
      if (format) {
        return {
          role: "assistant",
          content: { type: "text", text: JSON.stringify(result.output) },
          usage,
          outputFormat: "json_schema",
          structuredContent: result.output as Record<string, unknown>,
        };
      }
      return {
        role: "assistant",
        content: { type: "text", text: result.text },
        usage,
        outputFormat: "text",
      };
    },
  } as ClientLLM;
}

export type AiSession = {
  page: Page;
  stagehand: Stagehand;
  close(): Promise<void>;
};

export async function openAiSession(options: {
  flow: Pick<Flow, "viewport">;
  headed?: boolean;
  model: LanguageModel;
  meter: UsageMeter;
  task: ModelTask;
}): Promise<AiSession> {
  const browser = await localBrowser.launch({
    executablePath: chromium.executablePath(),
    headless: !options.headed,
    args: [`--window-size=${options.flow.viewport.width},${options.flow.viewport.height + 120}`],
  });
  try {
    const stagehand = await Stagehand.create({
      browser,
      model: stagehandModel(options.model, options.meter, options.task),
      logging: { level: "warn" },
    });
    if (!browser.cdpUrl) throw new ReeldiffError("The AI browser did not expose a CDP endpoint.");
    const playwright = await chromium.connectOverCDP(browser.cdpUrl);
    const context = playwright.contexts()[0] ?? (await playwright.newContext());
    const page = context.pages()[0] ?? (await context.newPage());
    await page.setViewportSize(options.flow.viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    return {
      page,
      stagehand,
      async close() {
        await stagehand.close().catch(() => {});
        await playwright.close().catch(() => {});
        await browser.close().catch(() => {});
      },
    };
  } catch (error) {
    await browser.close().catch(() => {});
    throw error;
  }
}
