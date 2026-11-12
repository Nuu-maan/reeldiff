# Agent rules

Project context, stack and constraints are in `CLAUDE.md`. Requirements are in `docs/PRD.md`, current state in
`docs/STATUS.md`. The rules below apply to every project, not just this repo.

## Git

- **Never push directly to `main`/`master`.** Always work on a branch and open a PR. More than one PR is fine.
- **Commit granularly** — the number of commits should be proportional to the work done. Many small atomic commits, never one big dump. A large feature should expect 15+.
- Each commit should touch one logical thing. Don't sweep unrelated files in with `git add -u`.
- Use `gh` for pushing and opening PRs.
- **Raise GitHub issues** for any problem, gap, or follow-up found along the way, rather than leaving it undocumented.
- Close issues when the work that resolves them lands, referencing the PR.

## Commit messages

- **No `Co-Authored-By` trailer.** Do not add Claude, Codex, or any AI attribution, as a co-author.
- No AI attribution footers in commit messages or PR descriptions generally.
- Write the message as a normal engineer would: a concise subject line, and a body only when the *why* isn't obvious from the diff.

## Identity

Use whatever identity is already configured in `git` and logged in to `gh`. Do not change `user.name`,
`user.email` or the `gh` account.

## Code style

- **Do not write code comments** unless genuinely necessary — i.e. omitting one would let someone silently break something (a non-obvious constraint, a subtle invariant, a footgun).
- Exception: a one-line `shortcut: <the limit>, <when to upgrade>` comment is allowed where a known shortcut was taken.
- No section-divider banners, no restating what the line does, no rationale prose. Prefer clear naming and small functions over explanation.
