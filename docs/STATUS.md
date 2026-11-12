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

## M3: Record (done)

- `reeldiff record <flowId>` writes `.reeldiff/out/<runId>/` with `manifest.json` and `flows/<id>/video.mp4`, `poster.png`, `steps/<i>.png`, `snapshots/<i>.json`.
- Video: Playwright at the flow viewport and 30fps, converted by system ffmpeg to H.264 (`-preset veryfast`), lead-in trimmed. App motion stays on; the cursor glides to each target with a press ripple, text is typed visibly, captions show as an overlay.
- Captures are taken before each step and after the last: screenshots with animations frozen, rrweb snapshots, and the target's box for the viewer hotspot. Overlays are removed before every capture.
- Masking: `input[type=password]` plus config `mask` selectors are blurred in video and screenshots, and their values and text are masked in snapshots.
- `manifest.json` is a Zod schema in core (`src/manifest.ts`), shared by the viewer, notifiers and the Action.

## M4: Explore and heal (done)

- Model layer (BYOK): `model: { provider, model, baseUrl?, apiKeyEnv?, explore?, heal?, summarize? }` for openai, anthropic, google, openrouter, ollama and openai-compatible, all through the AI SDK. Keys only come from env (provider default name or `apiKeyEnv`); the nearest `.env` is loaded without overriding the shell. Token usage is metered per task, plus cost when the provider reports it (OpenRouter).
- Stagehand 4 runs on Playwright's Chromium. Its model calls go through our AI SDK model (`src/ai/stagehand.ts`), and Playwright attaches to the same browser over CDP.
- `reeldiff heal <flowId>` replays in the AI browser. On a failing step it asks Stagehand to find the element for the step's intent, converts it to a verified user-facing target, retries, and rewrites only that target in the YAML (comments kept).
- `reeldiff explore "<goal>" --url <page>`: an AI SDK planner sees the accessibility tree and a screenshot, Stagehand grounds each plain-words step, our engine runs it, and the flow is saved only if a fresh deterministic replay passes.
- Live checks with Claude Haiku 5.5 via OpenRouter: a renamed button healed for $0.0002, and a 6-step flow explored from one sentence for $0.0034.

## Next: M5

`affected`, the Next.js route adapter and pixel diff.
