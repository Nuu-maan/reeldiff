import { defineConfig } from "reeldiff";

export default defineConfig({
  baseUrl: process.env.REELDIFF_HEAD_URL ?? "http://localhost:3100",
  compareUrl: process.env.REELDIFF_BASE_URL,
  model: {
    provider: "openrouter",
    model: "anthropic/claude-haiku-5.5",
    apiKeyEnv: process.env.OPENROUTER_API_KEY ? undefined : "OPENROUTER",
  },
  framework: "nextjs-app",
  uiPaths: ["src/**/*.tsx"],
  storage: process.env.S3_BUCKET
    ? {
        type: "s3",
        bucket: process.env.S3_BUCKET,
        endpoint: process.env.S3_ENDPOINT,
        publicUrl: process.env.S3_PUBLIC_URL ?? "",
      }
    : { type: "local", dir: ".reeldiff/published" },
  notify: {
    slack: { webhookUrl: process.env.SLACK_WEBHOOK_URL },
    githubComment: true,
  },
  mask: ["[data-reeldiff-mask]"],
});
