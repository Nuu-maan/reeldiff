export type Framework = "nextjs-app" | "nextjs-pages" | "none";

export const configTemplate = (
  framework: Framework,
  uiPaths: string[],
) => `import { defineConfig } from "reeldiff";

export default defineConfig({
  // The deployment to record, usually the PR preview.
  baseUrl: process.env.REELDIFF_HEAD_URL ?? "http://localhost:3000",
  // Optional: production or the base branch preview, for before/after.
  compareUrl: process.env.REELDIFF_BASE_URL,
  // Optional: enables explore, heal and AI summaries. The key is read from env.
  // model: { provider: "openrouter", model: "anthropic/claude-haiku-5.5" },
  framework: "${framework}",
  uiPaths: ${JSON.stringify(uiPaths)},
  notify: {
    slack: { webhookUrl: process.env.SLACK_WEBHOOK_URL },
    githubComment: true,
  },
  mask: ["[data-reeldiff-mask]"],
});
`;

export const workflowTemplate = `name: Reeldiff

on:
  deployment_status:

permissions:
  contents: read
  pull-requests: write

jobs:
  demo:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: npm ci
      - uses: actions/cache@v6
        with:
          path: ~/.cache/ms-playwright
          key: playwright-\${{ runner.os }}-\${{ hashFiles('package-lock.json') }}
      - uses: Nuu-maan/reeldiff/packages/action@main
        with:
          head-url: \${{ github.event.deployment_status.environment_url }}
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK_URL }}
          OPENROUTER_API_KEY: \${{ secrets.OPENROUTER_API_KEY }}
`;

export const gitignoreEntries = [
  "**/.reeldiff/out/",
  "**/.reeldiff/auth/",
  "**/.reeldiff/published/",
];
