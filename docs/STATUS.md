# Status

## M1: Monorepo scaffold + example app (done)

- pnpm + Turborepo workspace, shared tsconfig, Biome.
- `@reeldiff/core` and `@reeldiff/cli` build with tsdown and have Vitest tests. The CLI only prints its version for now.
- `examples/next-app` ("Plot") with three screens: `/dashboard` (projects + new project dialog), `/projects/[id]` (overview and tasks tabs), `/settings/billing` (plans + billing form with a masked card field).
- Playwright smoke tests cover all three screens.

Deferred: Changesets (M8), CI workflow (M8), a login page for auth profiles (M2/M3).

## Next: M2

Flow schema (Zod), config loader, deterministic `reeldiff replay`.
