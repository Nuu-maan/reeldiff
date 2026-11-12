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

## M5: Affected flows, route adapters, pixel diff (done)

- `reeldiff affected --base <ref> --head <ref> [--json]` reads `git diff --relative base...head` from the project folder. It lists flows whose `covers` match (with the files that matched), maps other files under `uiPaths` to route snapshots through the framework adapter, and lists UI files nothing covers.
- `packages/adapters`: `nextjs-app` (route groups, private folders, colocated files, parallel and intercepted routes, dynamic segments skipped) and `nextjs-pages`.
- Pixel diff: `record` has a before mode (screenshots only, `steps/<i>.before.png`) for the compare URL. Each step is diffed with pixelmatch, and flows become `changed`, `unchanged`, `new` (no compare URL) or `broken`. `shouldNotify` skips posts when nothing changed and always reports broken flows.
- `diffThreshold` now means the share of pixels that differ in the most-changed 64×64 area. A whole-screen fraction (the PRD's wording) treats a renamed button as 0.07% changed, under any useful threshold.
- Glob matching uses Node's `path.matchesGlob`, so Node 22.20+ is required.

## M6: Summarizer and replay viewer (done)

- `summarize()` makes one structured call per run. Inputs: the PR title and body, the affected flows and changed steps, the diff (UI files first, cut at about 80k characters), and up to 6 before/after pairs, picked round-robin across flows. It returns `headline`, `bullets` and `perFlow`. `fallbackSummary()` covers runs with no model.
- `packages/viewer`: a static Vite + React + Tailwind page that reads `manifest.json`.
  - Shows the PR header and summary, with one tab per flow and a status badge.
  - Video mode: native controls, a seekable step-marker timeline, and a caption track built from the steps.
  - Try it mode: rrweb snapshots rebuilt in a sandboxed iframe, with a hotspot on each step's target that advances; it falls back to the screenshot.
  - Before/after mode: a slider for changed steps.
  - Light and dark themes, a phone layout, Public Sans bundled. It never fetches anything outside the run folder.
- Snapshots no longer depend on the app being reachable: fonts and images their CSS points at are saved into `flows/<id>/assets/`.
- `record` copies the viewer into every run folder. `reeldiff view [runId]` serves a run with HTTP range support, for video seeking.
- Checked in Chromium, Firefox and WebKit, and at phone width.

## Next: M7

Storage (S3 or local), Slack, the PR comment and `reeldiff run`.
