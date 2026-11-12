# GitHub Action

The action installs Chromium and runs `reeldiff run` against a deployment of your PR. It reads the PR from the event, records the affected flows, publishes the run and posts to Slack and the PR.

## Preview deployments (Vercel, Netlify)

`reeldiff init` writes this to `.github/workflows/reeldiff.yml`:

```yaml
name: Reeldiff

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
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      - uses: Nuu-maan/reeldiff/packages/action@main
        with:
          head-url: ${{ github.event.deployment_status.environment_url }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
```

`fetch-depth: 0` is needed so Reeldiff can diff the PR against its base. For before/after, add `base-url` with your production URL.

## Without preview deployments

Build and start both versions on the runner, as this repo does in [`.github/workflows/reeldiff.yml`](../.github/workflows/reeldiff.yml): check out the PR base into a worktree, serve head on one port and base on another, then pass both URLs.

## Inputs

| Input | Required | What it does |
| --- | --- | --- |
| `head-url` | yes | Deployment to record. |
| `base-url` | | Deployment to compare against. |
| `config` | | Path to the config, relative to `working-directory`. |
| `model-provider`, `model` | | Override the config's model. |
| `base-ref`, `head-ref` | | Git refs to diff. Default to the PR's base and head commits. |
| `working-directory` | | Folder with the config, for monorepos. |
| `cli` | | Command that runs the CLI. Defaults to `node_modules/.bin/reeldiff`, then `reeldiff` on PATH. |

Outputs: `run-url` (when storage has a public URL), `run-dir` and `notified`.

## Secrets

| Secret | For |
| --- | --- |
| `GITHUB_TOKEN` | The PR comment. Provided by Actions, needs `pull-requests: write`. |
| `SLACK_WEBHOOK_URL` | Slack posts. Without it, Slack is skipped. |
| Model key, e.g. `OPENROUTER_API_KEY` | AI summaries and healing. Without it, runs use a plain summary. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | S3 or R2 storage. |

Every secret the action knows about is masked in logs. Pull requests from forks don't get secrets, so they run without Slack or a model.

## Exit codes

Broken flows never fail the job. They're reported in Slack, the PR comment and the job summary. The job fails only when the config is invalid, publishing fails or a notification is rejected.
