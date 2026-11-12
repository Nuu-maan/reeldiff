# Reeldiff: Product Requirements Document

> **Every PR gets a demo of what changed.**
> Reeldiff is an open-source engine that learns your web app's key flows, notices when a pull request changes the UI, and posts a short video and a clickable demo of the change to Slack and the PR. The same recorded flows later power an embeddable demo agent for website visitors.

- **Status:** Draft v1
- **License:** MIT (core, CLI, Action, viewer)
- **Language:** TypeScript end to end

---

## 1. Problem

1. **Demos and screenshots go stale when the UI changes.** Re-recording them is manual, slow, and always last on the list.
2. **Reviewers and teammates can't easily see UI changes.** PMs, designers, sales and support learn about UI changes late, by reading the changelog or spotting it in production. A code diff doesn't show what the change looks like.
3. **Live AI demo agents (Hobbes, Supademo, Karumi, Supersonik) are paid, closed, and go stale.** Someone has to keep the agent's picture of the product current. When the UI changes, the agent demos the old flow or gets lost.

## 2. Solution in one paragraph

Reeldiff keeps a version-controlled map of your app's important **flows** (step files). In CI it reads the PR diff, works out which flows the change touches, replays them against the preview deployment, records an MP4 plus per-step DOM snapshots, writes a plain-English "what changed" summary with your own model key, and posts it all to Slack and the PR. AI is used to *create* and *repair* flows. Normal replays are deterministic and use no model, which keeps them fast, cheap and stable. Because every merge refreshes the flows, a later embeddable demo widget can always show the current UI.

## 3. Target users

| User | Need | Phase |
|---|---|---|
| **Frontend / design engineers** (primary) | See and share their UI change without recording a Loom | v1 |
| **PMs, designers, QA** in the Slack channel | Know what changed in the UI, and try it, without opening the app | v1 |
| **Dev-tool / OSS maintainers** | Fresh demo media in README and docs automatically | v1 |
| **Sales / marketing at small SaaS** | A live demo agent on the website that's never stale | Phase 2 |

## 4. Goals and non-goals

### Goals (v1)
- One GitHub Action + one config file and a team gets a Slack post on every UI-changing PR.
- Bring your own model key: OpenAI, Anthropic, Google, OpenRouter, Ollama or any OpenAI-compatible endpoint.
- A normal CI run with no flow repair needed makes **zero LLM calls** except one summary call.
- A good-looking replay page: video, step-by-step clickable demo, before/after, summary.
- Works fully self-hosted. No Reeldiff account required.
- An agent skill + MCP server so coding agents (e.g. Claude Code) can create flows and record demos.

### Non-goals (v1)
- Not a visual regression testing tool (no pass/fail gating on pixel diffs; Chromatic/Percy do this).
- No live website widget (Phase 2).
- No live agent driving a real app for visitors (Phase 3).
- No mobile or native apps. Web only, Chromium only.
- No hosted SaaS, user accounts, billing or database in v1.
- No AI voiceover or multilingual narration in v1.

## 5. Competitive landscape (as of Nov 2026)

| Product | Type | What it does | Our difference |
|---|---|---|---|
| aidemo | OSS (MIT) | Coding agent writes a storyboard; CI re-renders the demo when the product changes | We detect *what changed* from the diff and post a change-focused update; clickable demo, not only video |
| autodemo | OSS | GitHub Action regenerates demos on merge; "demo video on every PR" | Same as above, plus Slack-first workflow and the Phase 2 widget built on the same flows |
| DemoForge, demokit | OSS | Script → polished demo video | Script-first marketing video tools, not built around PRs |
| ScreenCI, Slideshot, Clueso, Tella | Paid | Product videos kept up to date, some in CI | Closed and paid; we're open source + BYOK |
| Hobbes, Supademo AI agent, Karumi, Supersonik, Skippr | Paid | Live AI demo agents for website visitors | Phase 2 target; our flows stay fresh through CI |

**Positioning:** *"Demos that update themselves. Open source, BYOK."* Lead with the dev workflow (v1). The website agent is the expansion story.

## 6. Product surfaces

1. **CLI**: `reeldiff`: create flows, replay, record, and run the full CI pipeline locally.
2. **GitHub Action**: `reeldiff/action`: runs the pipeline on PR preview deployments.
3. **Replay page**: a static, self-contained viewer (HTML + assets) uploaded to object storage. This is the link that goes in Slack.
4. **Notifiers**: Slack (v1), PR comment (v1), Discord/Teams webhooks (v1.1).
5. **Agent integration**: a `SKILL.md` and an MCP server exposing `explore`, `record`, `list_flows` (v1.1).
6. **Widget**: embeddable chat + demo player (Phase 2).

## 7. Core concepts

- **Flow:** a named user journey (e.g. "Create a project"), stored as YAML in the repo at `.reeldiff/flows/<id>.yaml`.
- **Step:** one action in a flow (`goto`, `click`, `fill`, `select`, `press`, `scroll`, `hover`, `wait`, `expect`). Each step has a deterministic target plus a natural-language `intent` used for self-healing.
- **Covers:** glob patterns linking a flow to source files. They're used to decide which flows a PR affects.
- **Run:** one execution of the pipeline for a PR. It produces **artifacts**: MP4, poster image, per-step screenshots, per-step DOM snapshots, summary, and `manifest.json`.
- **Heal:** when a deterministic step fails, the AI agent finds the new target using the step's `intent`, and the run proposes an updated flow file.

### 7.1 Flow file format

```yaml
# .reeldiff/flows/create-project.yaml
id: create-project
title: Create a new project
description: User creates a project from the dashboard.
start: /dashboard
auth: default            # name of an auth profile from config, or "none"
viewport: { width: 1440, height: 900 }
covers:
  - "app/projects/**"
  - "components/project-form.tsx"
steps:
  - action: click
    target: { role: button, name: "New project" }
    intent: Click the "New project" button
    caption: Start a new project from the dashboard
  - action: fill
    target: { label: "Project name" }
    value: "Acme launch"
    intent: Type a name into the project name field
  - action: click
    target: { role: button, name: "Create" }
    intent: Submit the form
  - action: expect
    target: { text: "Acme launch" }
    intent: The new project appears on the page
```

Rules:
- Targets prefer Playwright user-facing locators: `role`+`name`, `label`, `placeholder`, `text`, `testId`. `css` is allowed as a last resort.
- The schema is defined once with Zod in `packages/core` and exported as JSON Schema for editor autocompletion.
- `caption` is optional and is shown on the replay page and as an on-video caption.

### 7.2 Config file

```ts
// reeldiff.config.ts
import { defineConfig } from "reeldiff";

export default defineConfig({
  baseUrl: process.env.REELDIFF_HEAD_URL,          // preview deployment of the PR
  compareUrl: process.env.REELDIFF_BASE_URL,       // optional: production or base-branch preview, for "before"
  model: { provider: "anthropic", model: "<model-id>" }, // key read from env, e.g. ANTHROPIC_API_KEY
  auth: {
    default: { storageState: ".reeldiff/auth/default.json" }, // or a login flow id
  },
  framework: "nextjs-app",                          // route-mapping adapter: nextjs-app | nextjs-pages | none
  uiPaths: ["app/**", "components/**", "src/**/*.tsx"],
  storage: { type: "s3", bucket: "reeldiff", endpoint: process.env.S3_ENDPOINT, publicUrl: "https://demos.example.com" },
  notify: {
    slack: { webhookUrl: process.env.SLACK_WEBHOOK_URL },
    githubComment: true,
  },
  diffThreshold: 0.01,                              // fraction of pixels; below this a step counts as unchanged
  mask: ["input[type=password]", "[data-reeldiff-mask]"],
});
```

## 8. Functional requirements: v1

### 8.1 CLI

| Command | Behavior |
|---|---|
| `reeldiff init` | Creates `reeldiff.config.ts`, `.reeldiff/flows/`, a sample GitHub workflow, and `.gitignore` entries |
| `reeldiff explore "<goal>" --url <url>` | AI agent drives the browser to achieve the goal, then writes a flow file. Prints the file for review. |
| `reeldiff replay <flowId> [--headed]` | Deterministic replay. Exits non-zero on failure and prints the failing step. |
| `reeldiff record <flowId>` | Replay + capture MP4, screenshots, snapshots into `.reeldiff/out/<runId>/` |
| `reeldiff heal <flowId>` | Replay. On a failing step, use AI with `intent` to find the new target, then write the updated flow file. |
| `reeldiff affected --base <ref> --head <ref>` | Lists the flows affected by a git range and why |
| `reeldiff run` | The full CI pipeline (8.2). Works locally against any URL. |
| `reeldiff auth <profile>` | Opens a headed browser, the user logs in, and storageState is saved |
| `reeldiff view <runId>` | Serves the replay page locally |

### 8.2 CI pipeline (`reeldiff run`)

1. **Collect changes:** changed files between PR base and head (`git diff --name-only`).
2. **Find affected flows:**
   a. Flows whose `covers` globs match a changed file.
   b. If a changed file is under `uiPaths` but matches no flow, map it to a route with the framework adapter (e.g. `app/settings/billing/page.tsx` → `/settings/billing`) and record a **route snapshot**: a single-page capture with no steps.
   c. If nothing matches, exit 0 quietly. No notification.
3. **Replay:** run each affected flow against `baseUrl`. Replay is deterministic. If a step fails, heal once. If healing also fails, mark the flow `broken`, continue, and report it.
4. **Compare:** if `compareUrl` is set, replay the same flows there and take per-step screenshots. Compute a pixel diff per step (`pixelmatch`). Steps above `diffThreshold` are marked `changed`. If no step anywhere changed, skip the notification (and log the reason).
5. **Record:** for each affected flow on head: MP4 (1440×900, 30fps target), a poster frame, per-step PNG screenshots, and per-step DOM snapshots (`rrweb-snapshot`) with masking applied.
6. **Summarize:** one model call per run. Input: the truncated diff (max ~20k tokens, UI files first), PR title and body, the list of changed steps, and up to 6 before/after screenshot pairs. Output (structured, Zod-validated): `headline` (≤ 80 chars), `bullets` (1–4 short items), `per_flow` notes.
7. **Publish:** upload artifacts + the static viewer to storage under `runs/<repo>/<pr>/<runId>/`. Write `manifest.json`.
8. **Notify:** Slack message + PR comment (8.4). If a previous Reeldiff comment exists on the PR, update it instead of adding a new one.
9. **Report:** write the job summary to `$GITHUB_STEP_SUMMARY`. Exit code is 0 unless the config is invalid (broken flows never fail the build in v1).

### 8.3 Replay page (static viewer)

- A self-contained static app (Vite + React + Tailwind + shadcn/ui), built once and copied into each run folder. It reads `manifest.json`.
- Sections:
  - **Header:** repo, PR number + title (linked), commit SHA, time, the summary headline and bullets.
  - **Flow tabs:** one per affected flow, with a badge: `changed`, `unchanged`, `new`, `broken`.
  - **Video player:** MP4 with step markers on the timeline.
  - **Try it (clickable demo):** renders the step's DOM snapshot in a sandboxed iframe with a pulsing hotspot on the step's target. Clicking the hotspot advances to the next step. Falls back to the screenshot if the snapshot fails to render.
  - **Before/after:** a slider comparison for changed steps (when `compareUrl` was used).
- Works offline once loaded, has no tracking, supports light and dark mode, and works on mobile (video + steps stacked).
- Must look polished. This page is what gets shared on X.

### 8.4 Notifications

**Slack (incoming webhook, Block Kit):**
- Line 1: `🎬 <PR title> (#<n>)`, linked to the PR
- Summary bullets
- Poster image of the first changed flow (public URL)
- Buttons: **Watch demo** (replay page), **Open PR**
- Footer: flows affected, broken flows (if any), run duration

**PR comment (GitHub API via Octokit):**
- Same content in Markdown, with poster image(s) and a link per flow
- A hidden marker `<!-- reeldiff -->` so later runs can find and update the comment

### 8.5 GitHub Action

- A JavaScript action (`action.yml` + bundled `dist/`), published as `reeldiff/action@v1`.
- Inputs: `head-url`, `base-url` (optional), `config` (path), `model-provider`, `model`, plus env-based secrets.
- Recommended trigger: `deployment_status` (state `success`) for Vercel/Netlify preview URLs. A documented alternative is `pull_request` + a wait-for-URL step.
- Installs Playwright Chromium with caching, then runs `reeldiff run`.
- An example workflow lives in `examples/github/reeldiff.yml`.

### 8.6 Model layer (BYOK)

- Built on the Vercel AI SDK. Providers: OpenAI, Anthropic, Google, OpenRouter, Ollama, any OpenAI-compatible endpoint.
- Keys come only from env vars. They're never written to artifacts or logs, and never sent anywhere except the chosen provider.
- Model use: `explore` (agentic, vision), `heal` (single step), `summarize` (one call). Each is configurable with its own model; e.g. a cheap model for summaries.
- Every run logs token usage and estimated cost to the job summary.

### 8.7 Browser layer

- Playwright (Chromium) for deterministic replay and recording.
- Stagehand (latest v4.x, local browser, no Browserbase required) for `explore` and `heal`, connected to the same Playwright browser.
- Recording: Playwright `recordVideo` or a CDP screencast, transcoded with ffmpeg to H.264 MP4 (`-preset veryfast`). Draw a visible cursor overlay so viewers can follow the clicks.
- Deterministic timing: wait for network idle + target visibility, plus a short configurable pause per step so the video is watchable.

### 8.8 Agent integration (v1.1)

- `skills/reeldiff/SKILL.md`: teaches a coding agent to run `reeldiff init`, write flows (schema, good targets, `covers` globs), run `explore`/`record`, and review the output.
- MCP server (`packages/mcp`) with tools: `list_flows`, `explore_flow(goal, url)`, `record_flow(id)`, `affected(base, head)`.

## 9. Architecture

```
reeldiff/
├─ packages/
│  ├─ core/        # flow schema (zod), config loader, runner, recorder, differ,
│  │               # change detection, summarizer, storage + notifier interfaces
│  ├─ cli/         # `reeldiff` binary (commander or citty), thin over core
│  ├─ action/      # GitHub Action wrapper (bundled with ncc or tsup)
│  ├─ viewer/      # static replay page (Vite + React + Tailwind + shadcn/ui)
│  ├─ adapters/    # framework route mappers: nextjs-app, nextjs-pages
│  └─ mcp/         # MCP server (v1.1)
├─ skills/reeldiff/SKILL.md
├─ examples/
│  ├─ next-app/    # demo app used for dogfooding, e2e tests and the README demo
│  └─ github/reeldiff.yml
└─ docs/
   └─ prd.md
```

- **Tooling:** pnpm workspaces + Turborepo, tsup for builds, Vitest for unit tests, Playwright Test for e2e against `examples/next-app`, Changesets for releases, Biome or ESLint + Prettier.
- **Interfaces (in core):** `StorageProvider` (s3, local dir, GitHub artifact), `Notifier` (slack, github-comment, webhook), `RouteAdapter`. Each is a plain interface so contributors can add their own.
- **Storage:** any S3-compatible bucket via `@aws-sdk/client-s3` (Cloudflare R2, AWS S3, MinIO). `local` writes to disk for local runs.
- **No database and no server in v1.** Everything is files + object storage.

### 9.1 Artifact layout

```
runs/<owner>/<repo>/pr-<n>/<runId>/
├─ index.html, assets/        # static viewer
├─ manifest.json              # run metadata, summary, flows, steps, artifact paths
└─ flows/<flowId>/
   ├─ video.mp4, poster.png
   ├─ steps/<i>.png, steps/<i>.before.png
   └─ snapshots/<i>.json      # rrweb-snapshot
```

## 10. Non-functional requirements

| Area | Requirement |
|---|---|
| **Speed** | ≤ 5 min from preview-ready to Slack post for a PR touching ≤ 3 flows on a standard GitHub runner |
| **Cost** | A run with no healing makes 1 LLM call. Target < $0.05 per typical PR with a mid-tier model. |
| **Reliability** | Flake rate < 5% on the example app across 50 consecutive runs |
| **Security** | Mask password inputs and `mask` selectors in snapshots, screenshots and video (blur). Never log secrets. Document "use a test account on a staging/preview environment, never production data". |
| **Privacy** | No telemetry by default. Optional anonymous usage ping is off unless the user opts in. |
| **DX** | `npx reeldiff init` → first local recording in < 10 minutes on the example app |
| **Docs** | README with a GIF/video made by Reeldiff itself, quickstart, config reference, flow-writing guide |

## 11. Phases

### Phase 1: PR demos (v1, this PRD's main scope)
Everything in section 8 except 8.8.

### Phase 1.1
MCP server + skill, Discord/Teams webhooks, Remotion-based polish (smooth cursor paths, auto-zoom on the target element, captions burned in), GitLab CI template.

### Phase 2: Website demo widget
- `packages/widget`: a tiny embeddable script (Preact or vanilla web component, Shadow DOM) with a chat panel and a demo player.
- A visitor asks a question → the model picks the best flow(s) from the latest `main` manifest → the widget plays the clickable demo beside the chat, with narration from captions.
- Requires a small server (`apps/server`, Hono or Next.js route handlers) for the BYOK model proxy and for serving the "latest flows" manifest. Postgres + Drizzle only if conversation logs are needed.
- Possible hosted paid tier on top of the OSS engine.

### Phase 3: Live mode
The agent drives a sandboxed instance of the app live for the visitor, with guardrails (allow-listed routes, a seeded demo account, reset per session).

## 12. v1 milestones (≈ 2 weeks, solo)

| # | Milestone | Done when |
|---|---|---|
| M1 | Monorepo scaffold + `examples/next-app` | `pnpm build` and `pnpm test` pass; the example app runs locally with 3 realistic screens |
| M2 | Flow schema + config loader + deterministic `replay` | Hand-written flows replay against the example app in headless and headed mode |
| M3 | `record`: MP4 + screenshots + snapshots + cursor overlay | `reeldiff record` produces a watchable MP4 and per-step assets |
| M4 | `explore` + `heal` with Stagehand + AI SDK (BYOK) | An agent creates a working flow from a one-line goal; renaming a button gets healed |
| M5 | `affected` + framework adapter + pixel diff | The correct flows are selected for sample diffs; unchanged UI doesn't trigger a notification |
| M6 | Summarizer + static viewer | The replay page shows summary, video, clickable steps, before/after |
| M7 | Storage (S3/local) + Slack + PR comment + `run` | End-to-end `reeldiff run` locally posts to a test Slack channel |
| M8 | GitHub Action + docs + README demo | A real PR on the example repo gets a Slack post via the Action |

## 13. Success metrics

- **Dogfood:** Reeldiff runs on its own example app and on at least one of the author's projects for every UI PR.
- **First external user:** one design-partner team uses it on real PRs for 2+ weeks.
- **Launch:** 500 GitHub stars in the first month; the launch post on X shows a real PR → Slack → replay page in under 30 seconds.
- **Quality:** < 5% broken-flow rate per run after healing; median run < 3 min.

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Browser agents are flaky | Deterministic replay by default; AI only for explore/heal; healing proposes changes instead of silently rewriting |
| Login-protected apps | storageState profiles + optional login flow; documentation for preview-environment test accounts |
| DOM snapshots break on canvas, video, cross-origin iframes | Always produce MP4 + screenshots; the viewer falls back automatically |
| Wrong flows selected | `covers` globs are explicit and reviewable; `reeldiff affected` explains each match; route adapter as fallback |
| Model cost with BYOK | One summary call per run; per-task model choice; cost reported every run |
| Crowded space (aidemo, autodemo) | Differentiate on change detection, the Slack-first workflow, the clickable demo, and UI quality; Phase 2 widget as expansion |
| Scope creep | v1 has no server, no DB, no widget. Phase gates are strict. |

## 15. Open questions

1. License: MIT for everything, or MIT core + source-available hosted widget later?
2. Default "before" source when `compareUrl` is missing: production URL, or the last `main` run's artifacts from storage?
3. Should healed flows be auto-committed to the PR branch (via a bot commit) or only suggested in the comment? (v1 default: suggest only.)
4. Name check: confirm the GitHub org, the domain, and that the npm package `reeldiff` is free before publishing.
5. Which output would the first design-partner team value most: PR demos or the website widget? This may reorder Phase 2.
