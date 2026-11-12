# Config reference

`reeldiff.config.ts` (or `.mts`, `.js`, `.mjs`) sits at the root of the app Reeldiff records. Paths in the config and in flows are relative to that folder. TypeScript configs load with Node's built-in type stripping, so only erasable syntax is allowed (no `enum`).

```ts
import { defineConfig } from "reeldiff";

export default defineConfig({
  baseUrl: process.env.REELDIFF_HEAD_URL,
  compareUrl: process.env.REELDIFF_BASE_URL,
  model: { provider: "openrouter", model: "anthropic/claude-haiku-5.5" },
  auth: {
    default: { storageState: ".reeldiff/auth/default.json" },
  },
  framework: "nextjs-app",
  uiPaths: ["app/**", "components/**"],
  storage: { type: "s3", bucket: "reeldiff", endpoint: process.env.S3_ENDPOINT, publicUrl: "https://demos.example.com" },
  notify: {
    slack: { webhookUrl: process.env.SLACK_WEBHOOK_URL },
    githubComment: true,
  },
  diffThreshold: 0.01,
  mask: ["[data-reeldiff-mask]"],
  stepDelay: 400,
});
```

The nearest `.env` file is loaded first. It never overrides variables already set in the shell.

| Field | Default | What it does |
| --- | --- | --- |
| `baseUrl` | | Deployment to record, usually the PR preview. `--url` overrides it. |
| `compareUrl` | | Deployment to compare against. Without it, flows are marked `new` and every run posts. |
| `model` | | Enables `explore`, `heal` and AI summaries. See below. |
| `auth` | `{}` | Named auth profiles. A flow picks one with `auth: <name>`. Today a profile is `{ storageState: "<file>" }`, a Playwright session file. |
| `framework` | `none` | Route adapter for UI files no flow covers: `nextjs-app`, `nextjs-pages` or `none`. |
| `uiPaths` | `[]` | Globs of UI source files. Unmatched ones become single-page snapshots. |
| `storage` | `{ type: "local", dir: ".reeldiff/published" }` | Where runs are published. See below. |
| `notify.slack.webhookUrl` | | Slack incoming webhook. Read it from env. |
| `notify.githubComment` | `true` | Post or update one PR comment. Needs `GITHUB_TOKEN`. |
| `diffThreshold` | `0.01` | Share of pixels that must differ in the most-changed 64×64 area for a step to count as changed. |
| `mask` | `[]` | Extra selectors to blur in video and screenshots and mask in snapshots. Password inputs are always masked. |
| `stepDelay` | `400` | Pause after each step in ms, so videos are watchable. |

## Model

```ts
model: {
  provider: "openrouter",           // openai | anthropic | google | openrouter | ollama | openai-compatible
  model: "anthropic/claude-haiku-5.5",
  apiKeyEnv: "MY_KEY",              // optional, when the key isn't in the provider's default variable
  baseUrl: "https://llm.internal/v1", // required for openai-compatible, optional otherwise
  summarize: "a-cheaper-model",     // optional per-task model ids: explore, heal, summarize
}
```

| Provider | Default key variable |
| --- | --- |
| `openai` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `google` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| `openrouter` | `OPENROUTER_API_KEY` |
| `ollama` | none, `baseUrl` defaults to `http://localhost:11434/v1` |
| `openai-compatible` | `OPENAI_COMPATIBLE_API_KEY` |

A normal run makes one model call, for the summary. Healing adds one call per broken step. Without a model, or when its key is missing, runs still work and use a plain summary. Token use, and cost when the provider reports it, appear in the job summary and the PR comment.

## Storage

```ts
storage: { type: "local", dir: ".reeldiff/published", publicUrl: "https://demos.example.com" }
storage: { type: "s3", bucket: "reeldiff", endpoint: "https://<account>.r2.cloudflarestorage.com", region: "auto", publicUrl: "https://demos.example.com", prefix: "" }
```

Runs are published to `runs/<owner>/<repo>/pr-<n>/<runId>/`. S3 credentials come from the AWS SDK's usual env variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`). Slack shows the poster image and the PR comment shows thumbnails only when `publicUrl` points at an https address.
