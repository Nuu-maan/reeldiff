# Reeldiff

Every PR gets a demo of what changed.

Reeldiff learns your web app's key flows, notices when a pull request changes the UI, and posts a short video and a clickable demo of the change to Slack and the PR. Open source, bring your own model key.

> Early development. Nothing is published yet. See [docs/prd.md](docs/prd.md) for the plan and [docs/STATUS.md](docs/STATUS.md) for progress.

## Develop

Requires Node 22.18+ and pnpm.

```sh
pnpm install
pnpm --filter @reeldiff/example-next-app exec playwright install chromium
pnpm build
pnpm test
pnpm --filter @reeldiff/example-next-app dev   # http://localhost:3100
```

## License

MIT
