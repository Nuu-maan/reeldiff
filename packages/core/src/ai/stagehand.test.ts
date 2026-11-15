import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ClientLLM } from "@browserbasehq/stagehand";
import { MockLanguageModelV4 } from "ai/test";
import { expect, test } from "vitest";
import { UsageMeter } from "./model.ts";
import { openAiSession, stagehandModel } from "./stagehand.ts";

type Request = Parameters<ClientLLM["generate"]>[0];

const reply = (text: string) =>
  new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 40, noCache: 40, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 8, text: 8, reasoning: 0 },
      },
      warnings: [],
    },
  });

test("answers structured requests with json_schema output and meters usage", async () => {
  const model = reply(
    '{"elements":[{"elementId":"0-1","description":"Save","method":"click","arguments":[]}]}',
  );
  const meter = new UsageMeter();
  const request = {
    systemPrompt: "Find elements",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "find the save button" },
          { type: "image", data: "aGVsbG8=", mimeType: "image/png" },
        ],
      },
    ],
    responseFormat: {
      type: "json_schema",
      name: "observe",
      schema: { type: "object", properties: { elements: { type: "array" } } },
    },
  } as unknown as Request;

  const result = (await stagehandModel(model, meter, "heal").generate(request)) as Record<
    string,
    unknown
  >;

  expect(result.outputFormat).toBe("json_schema");
  expect(result.structuredContent).toMatchObject({ elements: [{ elementId: "0-1" }] });
  expect(result.usage).toEqual({ inputTokens: 40, outputTokens: 8, totalTokens: 48 });
  expect(meter.byTask.get("heal")).toMatchObject({ calls: 1, inputTokens: 40 });

  const sent = JSON.stringify(model.doGenerateCalls[0]?.prompt);
  expect(sent).toContain("find the save button");
  expect(sent).toContain("image/png");
});

test("answers plain requests as text", async () => {
  const result = (await stagehandModel(reply("done"), new UsageMeter(), "explore").generate({
    messages: [{ role: "user", content: { type: "text", text: "hi" } }],
  } as unknown as Request)) as Record<string, unknown>;
  expect(result).toMatchObject({ outputFormat: "text", content: { type: "text", text: "done" } });
});

test("an AI session starts with the auth profile's storage state", async () => {
  const dir = await mkdtemp(join(tmpdir(), "reeldiff-state-"));
  const state = join(dir, "state.json");
  const cookie = { name: "sid", value: "abc", domain: "example.test", path: "/" };
  await writeFile(
    state,
    JSON.stringify({
      cookies: [{ ...cookie, expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }],
      origins: [],
    }),
  );
  const session = await openAiSession({
    flow: { viewport: { width: 800, height: 600 } },
    storageState: state,
    model: reply("{}"),
    meter: new UsageMeter(),
    task: "heal",
  });
  try {
    expect(await session.page.context().cookies("http://example.test")).toEqual([
      expect.objectContaining(cookie),
    ]);
  } finally {
    await session.close();
  }
}, 60_000);
