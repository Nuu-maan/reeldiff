# Status

## M1: Monorepo scaffold + example app (done)

- pnpm + Turborepo workspace, shared tsconfig, Biome.
- `@reeldiff/core` and the CLI build with tsdown and have Vitest tests.
- `examples/next-app` ("Plot") with three screens: `/dashboard` (projects + new project dialog), `/projects/[id]` (overview and tasks tabs), `/settings/billing` (plans + billing form with a masked card field).
- Playwright smoke tests cover all three screens. `pnpm --filter @reeldiff/example-next-app test:browsers` runs them in Chromium, Firefox, WebKit, iPhone and Pixel profiles.
- Reviewed in real browsers: no console errors, keyboard-only flows work, no overflow at 320px, motion is skipped under reduced motion so replays are stable.

Deferred: Changesets (M8), CI workflow (M8), a login page for auth profiles (M2/M3).

## M2: Flow schema, config loader, replay (done)

- Flow schema in Zod (`packages/core/src/flow/schema.ts`), exported as JSON Schema at `packages/core/schema/flow.schema.json`. `pnpm --filter @reeldiff/core schema` regenerates it, and a test fails when it is stale.
- `reeldiff.config.ts` loads with Node's built-in TypeScript support and is validated against every field in PRD 7.2.
- Flows load from `.reeldiff/flows/*.yaml` with line and column errors. The id must match the file name.
- `reeldiff replay <flowId> [--headed] [--url] [--config]` replays deterministically: user-facing locators with exact names, network idle plus `stepDelay` after each step, reduced motion. `select` works on native selects and ARIA listboxes. Fill values are never printed.
- The CLI package is now `reeldiff` (still private) and re-exports `defineConfig`.
- The example app has three flows (`create-project`, `complete-task`, `upgrade-plan`). They replay headless and headed, and e2e runs them through the CLI.

Deferred: login-flow auth profiles and the `reeldiff auth` command (#5).

## Next: M3

`reeldiff record`: MP4, screenshots, DOM snapshots and a cursor overlay.
