# Reeldiff

Records demos of UI changes on every PR and posts them to Slack and the PR. Spec: `docs/prd.md`. Progress: `docs/STATUS.md`. Agent rules: `AGENTS.md`.

## Stack

- pnpm workspaces + Turborepo. Node >= 22.18 to build.
- TypeScript 6 everywhere (TS 7 has no compiler API yet, so dts tools can't use it). Shared configs in `packages/typescript-config`.
- tsdown builds libraries (tsup is unmaintained). Vitest for unit tests, Playwright Test for e2e.
- Biome lints and formats everything except Markdown.

## Layout

- `packages/core`: deterministic engine. No CLI, GitHub or Slack code here.
- `packages/cli`: the `reeldiff` bin, thin over core.
- `examples/next-app`: "Plot", the demo app flows run against. Next.js 16 App Router, `src/` with `app/` for routes only, `features/<name>/` for feature code, `components/ui` for primitives, `lib/` for shared helpers.
- Later milestones add `packages/viewer`, `packages/action`, `packages/adapters`.

## Commands

- `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format`
- `pnpm --filter @reeldiff/example-next-app dev` runs Plot on http://localhost:3100

## Constraints

- v1 has no server, no database, no widget, no hosted service.
- AI only in explore, heal and summarize. Model keys from env only, never logged.
- Example app state lives in localStorage seeded from fixtures, so a fresh browser context always starts identical. Keep it deterministic: no `Date.now()` or random in render.
- The example app honors reduced motion; replays should run with `reducedMotion: "reduce"`.
- Every interactive element needs a role and accessible name or a label, because flows target them with Playwright user-facing locators.
