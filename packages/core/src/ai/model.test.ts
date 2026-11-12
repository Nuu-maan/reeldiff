import { afterEach, describe, expect, test } from "vitest";
import { languageModel, UsageMeter } from "./model.ts";

const secret = "sk-test-not-a-real-key-1234";

afterEach(() => {
  delete process.env.REELDIFF_TEST_KEY;
  delete process.env.OPENROUTER_API_KEY;
});

describe("languageModel", () => {
  test("asks for a model when the config has none", () => {
    expect(() => languageModel(undefined, "heal")).toThrow(/heal needs a model/);
  });

  test("names the missing env var and never the key", () => {
    expect(() =>
      languageModel(
        { provider: "openrouter", model: "x/y", apiKeyEnv: "REELDIFF_TEST_KEY" },
        "explore",
      ),
    ).toThrow(/REELDIFF_TEST_KEY/);
  });

  test("uses the provider default env var", () => {
    expect(() => languageModel({ provider: "openrouter", model: "x/y" }, "explore")).toThrow(
      /OPENROUTER_API_KEY/,
    );
    process.env.OPENROUTER_API_KEY = secret;
    expect(languageModel({ provider: "openrouter", model: "x/y" }, "explore")).toBeTruthy();
  });

  test("picks the task model over the default", () => {
    process.env.REELDIFF_TEST_KEY = secret;
    const model = languageModel(
      { provider: "openai", model: "big", summarize: "small", apiKeyEnv: "REELDIFF_TEST_KEY" },
      "summarize",
    );
    expect(typeof model === "object" && model.modelId).toBe("small");
  });

  test("needs a base URL for openai-compatible and none for ollama", () => {
    process.env.REELDIFF_TEST_KEY = secret;
    expect(() =>
      languageModel(
        { provider: "openai-compatible", model: "m", apiKeyEnv: "REELDIFF_TEST_KEY" },
        "heal",
      ),
    ).toThrow(/baseUrl/);
    expect(languageModel({ provider: "ollama", model: "llama3" }, "heal")).toBeTruthy();
  });
});

describe("UsageMeter", () => {
  test("sums tokens per task and reported OpenRouter cost", () => {
    const meter = new UsageMeter();
    meter.add("explore", { usage: { inputTokens: 100, outputTokens: 10 } });
    meter.add("explore", {
      usage: { inputTokens: 50, outputTokens: 5 },
      providerMetadata: { openrouter: { usage: { cost: 0.002 } } },
    });
    meter.add("summarize", { usage: { inputTokens: 1, outputTokens: 1 } });
    expect(meter.byTask.get("explore")).toEqual({
      inputTokens: 150,
      outputTokens: 15,
      calls: 2,
      costUsd: 0.002,
    });
    expect(meter.total).toEqual({ inputTokens: 151, outputTokens: 16, calls: 3, costUsd: 0.002 });
  });
});
