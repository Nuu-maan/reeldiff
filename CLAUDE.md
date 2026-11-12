# Reeldiff

Records demos of UI changes on every PR and posts them to Slack and the PR. Spec: `docs/prd.md`. Progress: `docs/STATUS.md`. Agent rules: `AGENTS.md`.

## Stack

- pnpm workspaces + Turborepo. Node >= 22.20.
- TypeScript 6 everywhere (TS 7 has no compiler API yet, so dts tools can't use it). Shared configs in `packages/typescript-config`.
- tsdown builds libraries (tsup is unmaintained). Vitest for unit tests, Playwright Test for e2e.
- Biome lints and formats everything except Markdown.

## Layout

- `packages/core`: the engine: flows, replay, record, diff, AI, storage, Slack. No CLI or GitHub-specific code here.
- `packages/cli`: published as `reeldiff`. The bin, plus `defineConfig` re-exported for config files. Thin over core.
- `examples/next-app`: "Plot", the demo app flows run against. Next.js 16 App Router, `src/` with `app/` for routes only, `features/<name>/` for feature code, `components/ui` for primitives, `lib/` for shared helpers.
- `packages/adapters`: framework route mappers (`nextjs-app`, `nextjs-pages`).
- `packages/viewer`: the static replay page (Vite + React). The CLI build copies it into `dist/viewer`.
- `packages/action`: the GitHub Action. `dist/index.mjs` is committed; rebuild it with `pnpm build` and commit the result (CI checks it).
- `.github/workflows`: CI, plus `reeldiff.yml`, which runs Reeldiff on PRs that touch the example app.

## Commands

- `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format`
- `pnpm --filter @reeldiff/example-next-app dev` runs Plot on http://localhost:3100

## Constraints

- v1 has no server, no database, no widget, no hosted service.
- AI only in explore, heal and summarize. Model keys from env only, never logged.
- Example app state lives in localStorage seeded from fixtures, so a fresh browser context always starts identical. Keep it deterministic: no `Date.now()` or random in render.
- The example app honors reduced motion; replays should run with `reducedMotion: "reduce"`.
- Every interactive element needs a role and accessible name or a label, because flows target them with Playwright user-facing locators.
