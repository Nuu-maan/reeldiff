import { defineConfig } from "reeldiff";

export default defineConfig({
  baseUrl: process.env.REELDIFF_HEAD_URL ?? "http://localhost:3100",
  model: {
    provider: "openrouter",
    model: "anthropic/claude-haiku-5.5",
    apiKeyEnv: process.env.OPENROUTER_API_KEY ? undefined : "OPENROUTER",
  },
  framework: "nextjs-app",
  uiPaths: ["src/**/*.tsx"],
  mask: ["[data-reeldiff-mask]"],
});
