import { appendFile, readFile } from "node:fs/promises";
import { Octokit } from "@octokit/rest";
import {
  counts,
  formatSeconds,
  type Notifier,
  ReeldiffError,
  type RunReport,
} from "@reeldiff/core";

export type PullRequest = {
  number: number;
  title: string;
  body?: string;
  url?: string;
  sha?: string;
};
export type RunContext = { repo?: string; pr?: PullRequest; token?: string };

type ContextFlags = { repo?: string; pr?: string; title?: string };

type Event = {
  pull_request?: {
    number: number;
    title: string;
    body?: string | null;
    html_url: string;
    head: { sha: string };
  };
  deployment?: { sha: string };
};

const marker = "<!-- reeldiff -->";

async function readEvent(): Promise<Event | undefined> {
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path) return undefined;
  return JSON.parse(await readFile(path, "utf8")) as Event;
}

const split = (repo: string) => {
  const [owner, name] = repo.split("/");
  if (!owner || !name) throw new ReeldiffError(`"${repo}" isn't an owner/repo name.`);
  return { owner, repo: name };
};

export async function githubContext(flags: ContextFlags): Promise<RunContext> {
  const repo = flags.repo ?? process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const event = await readEvent();
  let pr: PullRequest | undefined;

  if (event?.pull_request) {
    const p = event.pull_request;
    pr = {
      number: p.number,
      title: p.title,
      body: p.body ?? undefined,
      url: p.html_url,
      sha: p.head.sha,
    };
  } else if (event?.deployment && repo && token) {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.repos.listPullRequestsAssociatedWithCommit({
      ...split(repo),
      commit_sha: event.deployment.sha,
    });
    const open = data.find((candidate) => candidate.state === "open") ?? data[0];
    if (open) {
      pr = {
        number: open.number,
        title: open.title,
        body: open.body ?? undefined,
        url: open.html_url,
        sha: event.deployment.sha,
      };
    }
  }

  if (flags.pr) {
    const number = Number(flags.pr);
    if (!Number.isInteger(number) || number <= 0)
      throw new ReeldiffError(`--pr must be a PR number, got "${flags.pr}".`);
    pr = {
      ...pr,
      number,
      title: flags.title ?? pr?.title ?? `PR #${number}`,
      url: pr?.url ?? (repo ? `https://github.com/${repo}/pull/${number}` : undefined),
    };
  } else if (flags.title && pr) {
    pr = { ...pr, title: flags.title };
  }
  return { repo, pr, token };
}

export function commentMarkdown(report: RunReport, usageLine?: string): string {
  const { manifest } = report;
  const n = counts(manifest);
  const lines: string[] = [marker, `### 🎬 ${manifest.summary?.headline ?? "UI changes"}`, ""];
  for (const bullet of manifest.summary?.bullets ?? []) lines.push(`- ${bullet}`);
  if (manifest.summary?.bullets.length) lines.push("");

  if (report.runUrl) lines.push(`**[Watch the demo](${report.runUrl})**`, "");

  lines.push("| Flow | Status | Note |", "| --- | --- | --- |");
  for (const flow of manifest.flows) {
    const link = report.runUrl
      ? `[${flow.title}](${report.runUrl}?flow=${encodeURIComponent(flow.id)})`
      : flow.title;
    const note =
      (flow.status === "broken" ? flow.reason : manifest.summary?.perFlow[flow.id]) ?? "";
    lines.push(
      `| ${link} | ${flow.status} | ${note.replaceAll("|", "\\|").replaceAll("\n", " ")} |`,
    );
  }
  lines.push("");

  const posters = manifest.flows
    .filter((flow) => flow.status !== "unchanged")
    .map((flow) => ({ flow, url: report.assetUrl(flow.poster) }))
    .filter((entry) => entry.url?.startsWith("https://"))
    .slice(0, 4);
  for (const { flow, url } of posters)
    lines.push(`<img src="${url}" alt="${flow.title}" width="360">`);
  if (posters.length) lines.push("");

  for (const flow of manifest.flows.filter((f) => f.healed)) {
    lines.push(
      "<details>",
      `<summary>Suggested fix for <code>${flow.id}</code>: a step's target changed and Reeldiff healed it</summary>`,
      "",
      "```yaml",
      flow.healed ?? "",
      "```",
      "</details>",
      "",
    );
  }

  const parts = [
    `${n.total} flow${n.total === 1 ? "" : "s"}`,
    n.changed ? `${n.changed} changed` : "",
    n.new ? `${n.new} new` : "",
    n.broken ? `${n.broken} broken` : "",
    `ran in ${formatSeconds(manifest.durationMs)}`,
    usageLine ?? "",
  ].filter(Boolean);
  lines.push(`<sub>Recorded by Reeldiff · ${parts.join(" · ")}</sub>`);
  return lines.join("\n");
}

export function githubCommentNotifier(options: {
  token: string;
  repo: string;
  prNumber: number;
  usageLine?: string;
}): Notifier {
  const octokit = new Octokit({ auth: options.token });
  const target = { ...split(options.repo), issue_number: options.prNumber };
  return {
    name: "github-comment",
    async send(report) {
      const body = commentMarkdown(report, options.usageLine);
      for await (const page of octokit.paginate.iterator(octokit.issues.listComments, {
        ...target,
        per_page: 100,
      })) {
        const existing = page.data.find((comment) => comment.body?.startsWith(marker));
        if (existing) {
          await octokit.issues.updateComment({
            ...split(options.repo),
            comment_id: existing.id,
            body,
          });
          return;
        }
      }
      await octokit.issues.createComment({ ...target, body });
    },
  };
}

export async function writeJobSummary(markdown: string) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) await appendFile(file, `${markdown.replace(marker, "").trim()}\n`);
}
