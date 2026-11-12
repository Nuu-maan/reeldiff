# Writing flows

A flow is one user journey, saved as `.reeldiff/flows/<id>.yaml`. The file name must match `id`.

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/Nuu-maan/reeldiff/main/packages/core/schema/flow.schema.json
id: create-project
title: Create a new project
description: Someone starts a project from a template on the dashboard.
start: /dashboard
covers:
  - "src/features/projects/**"
  - "src/app/(app)/dashboard/**"
steps:
  - action: click
    target: { role: button, name: "New project" }
    intent: Open the new project dialog
    caption: Start a new project from the dashboard
  - action: fill
    target: { label: "Project name" }
    value: "Acme launch"
    intent: Type a name into the project name field
  - action: select
    target: { label: "Template" }
    value: "Product launch"
    intent: Pick the product launch template
  - action: click
    target: { role: button, name: "Create" }
    intent: Submit the form
  - action: expect
    target: { role: heading, name: "Acme launch" }
    intent: The new project appears on the dashboard
```

The schema comment gives you autocomplete in editors with the YAML language server.

## Fields

| Field | Default | Notes |
| --- | --- | --- |
| `id` | | Lowercase letters, numbers and dashes. Must match the file name. |
| `title` | | Shown in Slack, the PR comment and the replay page. |
| `description` | | Optional, one sentence. |
| `start` | `/` | Path (or URL) the flow starts from. |
| `auth` | `none` | Name of an auth profile from the config. |
| `viewport` | `{ width: 1440, height: 900 }` | Also the video size. |
| `covers` | `[]` | Globs of source files this flow exercises, relative to the config folder. |
| `steps` | | At least one. |

## Steps

Every step can have a `caption`, shown on the video and the replay page. Every step with a target needs an `intent`: what the step does, in plain words. `heal` uses it to find the element again when the target changes.

| Action | Fields | What it does |
| --- | --- | --- |
| `goto` | `url` | Opens a path or URL. |
| `click` | `target` | Clicks the element. |
| `fill` | `target`, `value` | Replaces the field's text. Values are never printed in logs. |
| `select` | `target`, `value` | Picks an option by its label, in a native `<select>` or an ARIA listbox (Radix, Base UI and similar). |
| `press` | `key`, optional `target` | Presses a key, e.g. `Enter` or `Control+A`. |
| `scroll` | `target` or `y` | Scrolls an element into view, or by `y` pixels. |
| `hover` | `target` | Moves the pointer over the element. |
| `wait` | `target` or `ms` | Waits for an element to show up, or for a fixed time. |
| `expect` | `target`, optional `state` | Fails unless the element is `visible` (default) or `hidden`. |

## Targets

Prefer what a person sees. Each target has to match exactly one element, with exact text.

| Target | Example | Matches |
| --- | --- | --- |
| `role` + `name` | `{ role: button, name: "Save" }` | Accessible role and name. Best choice. |
| `label` | `{ label: "Billing email" }` | Form field by its label. |
| `placeholder` | `{ placeholder: "Search" }` | Input by placeholder. |
| `text` | `{ text: "Saved" }` | Element whose text is exactly this. |
| `testId` | `{ testId: "plan-card-team" }` | `data-testid`. |
| `css` | `{ css: "#main > div:nth-of-type(2)" }` | Last resort, breaks easily. |

If a target is hard to write, the element probably needs an accessible name. That fix helps your users too.

## Covers

`covers` decides which flows a PR affects. Keep it specific: a flow that covers `src/**` records on every PR. A good set is the feature folder, the route folder, and shared UI primitives the flow relies on.

```sh
npx reeldiff affected --base origin/main --head HEAD
```

lists the flows a range affects and the files that matched. UI files under `uiPaths` that no flow covers are mapped to a page with the framework adapter and recorded as a single-page snapshot.

## Making flows stable

- Expect something after each important action, so a slow page fails clearly instead of recording the wrong thing.
- Avoid data that changes on every run, like dates or random IDs. Seed your preview environment with fixtures.
- Replays run with `prefers-reduced-motion: reduce`. Recordings keep motion, and every screenshot waits until animations finish.
- Mark sensitive elements with `data-reeldiff-mask` or add selectors to `mask` in the config.
