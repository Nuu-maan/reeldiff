import { readFile } from "node:fs/promises";
import { adapterFor } from "@reeldiff/adapters";
import {
  changedFiles,
  compareFlow,
  createRunDir,
  diffText,
  type Flow,
  fallbackSummary,
  findAffected,
  findFlowFile,
  flowsDir,
  heal,
  languageModel,
  loadFlows,
  type Manifest,
  type ManifestFlow,
  type Notifier,
  publishRun,
  ReeldiffError,
  type RunReport,
  record,
  runPrefix,
  setStepTargets,
  shouldNotify,
  slackNotifier,
  slugify,
  storageFor,
  summarize,
  UsageMeter,
  writeManifest,
} from "@reeldiff/core";
import {
  commentMarkdown,
  githubCommentNotifier,
  githubContext,
  writeJobSummary,
} from "../github.ts";
import { copyViewer } from "../viewer.ts";
import { loadProject, parseBaseUrl, storageStateFor } from "./shared.ts";

type RunFlags = {
  base?: string;
  head?: string;
  url?: string;
  compareUrl?: string;
  config?: string;
  repo?: string;
  pr?: string;
  title?: string;
};

const routeFlow = (route: string): Flow => ({
  id: `route-${slugify(route) === "flow" ? "home" : slugify(route)}`,
  title: route,
  start: route,
  auth: "none",
  viewport: { width: 1440, height: 900 },
  covers: [],
  steps: [],
});

function usageLine(meter: UsageMeter) {
  const { calls, inputTokens, outputTokens, costUsd } = meter.total;
  if (!calls) return undefined;
  const cost = costUsd === undefined ? "" : ` · $${costUsd.toFixed(4)}`;
  return `model: ${calls} call${calls === 1 ? "" : "s"}, ${(inputTokens + outputTokens).toLocaleString("en")} tokens${cost}`;
}

export async function runCommand(flags: RunFlags) {
  const started = Date.now();
  const { config, rootDir } = await loadProject(flags);
  const baseUrl = parseBaseUrl(flags.url ?? config.baseUrl);
  const compareRaw = flags.compareUrl ?? config.compareUrl;
  const compareUrl = compareRaw ? parseBaseUrl(compareRaw) : undefined;
  const base = flags.base ?? "origin/main";
  const head = flags.head ?? "HEAD";
  const context = await githubContext(flags);
  const meter = new UsageMeter();
  const model = config.model;

  const files = await changedFiles(rootDir, base, head);
  const flows = await loadFlows(flowsDir(rootDir));
  const affected = findAffected({
    files,
    flows,
    uiPaths: config.uiPaths,
    adapter: adapterFor(config.framework),
  });
  console.log(
    `${files.length} changed file(s), ${affected.flows.length} affected flow(s), ${affected.routes.length} route snapshot(s)`,
  );
  if (!affected.flows.length && !affected.routes.length) {
    console.log("No flows affected. Nothing to record.");
    await writeJobSummary("Reeldiff: no flows affected by this change.");
    return;
  }

  const { runId, dir } = await createRunDir(rootDir);
  const recorded: ManifestFlow[] = [];
  const recordOptions = { runDir: dir, stepDelay: config.stepDelay, mask: config.mask };

  const capture = async (flow: Flow, kind: "flow" | "route", healed?: string) => {
    const storageState = await storageStateFor(flow, config, rootDir);
    let head = await record(flow, { ...recordOptions, baseUrl: baseUrl.href, storageState });
    head = { ...head, kind, ...(healed ? { healed } : {}) };
    if (compareUrl) {
      const before = await record(flow, {
        ...recordOptions,
        baseUrl: compareUrl.href,
        storageState,
        before: true,
      });
      head = await compareFlow(dir, head, before, config.diffThreshold);
    }
    console.log(`  ${flow.id}: ${head.status}${head.reason ? ` (${head.reason})` : ""}`);
    return head;
  };

  for (const { flow } of affected.flows) {
    let result = await capture(flow, "flow");
    if (result.status === "broken" && model) {
      console.log(`  ${flow.id}: trying to heal`);
      const healing = await heal(flow, {
        baseUrl: baseUrl.href,
        model: languageModel(model, "heal"),
        meter,
        stepDelay: config.stepDelay,
      }).catch((error: Error) => {
        console.log(`  ${flow.id}: heal failed: ${error.message}`);
        return undefined;
      });
      if (healing?.status === "healed") {
        const targets = new Map(healing.changes.map((change) => [change.stepIndex, change.to]));
        const fixed: Flow = {
          ...flow,
          steps: flow.steps.map((step, index) =>
            targets.has(index) ? ({ ...step, target: targets.get(index) } as typeof step) : step,
          ),
        };
        const source = await readFile(await findFlowFile(flowsDir(rootDir), flow.id), "utf8");
        result = await capture(fixed, "flow", setStepTargets(source, targets));
      }
    }
    recorded.push(result);
  }
  for (const { route } of affected.routes) recorded.push(await capture(routeFlow(route), "route"));

  const decision = shouldNotify({ flows: recorded });
  const summary = model
    ? await summarize(
        {
          flows: recorded,
          runDir: dir,
          diff: await diffText(rootDir, base, head, config.uiPaths),
          pr: context.pr,
        },
        languageModel(model, "summarize"),
        meter,
      ).catch((error: Error) => {
        console.log(`Summary failed, using a plain one: ${error.message}`);
        return fallbackSummary({ flows: recorded, runDir: dir, pr: context.pr });
      })
    : fallbackSummary({ flows: recorded, runDir: dir, pr: context.pr });

  const manifest: Manifest = await writeManifest(dir, {
    version: 1,
    runId,
    createdAt: new Date(started).toISOString(),
    baseUrl: baseUrl.origin,
    compareUrl: compareUrl?.origin,
    repo: context.repo,
    pr: context.pr,
    summary,
    usage: meter.total.calls
      ? {
          inputTokens: meter.total.inputTokens,
          outputTokens: meter.total.outputTokens,
          costUsd: meter.total.costUsd,
        }
      : undefined,
    durationMs: Date.now() - started,
    flows: recorded,
  });
  await copyViewer(dir);

  const storage = storageFor(config.storage, rootDir);
  const prefix = runPrefix({ repo: context.repo, pr: context.pr?.number, runId });
  const published = await publishRun(storage, dir, prefix);
  const report: RunReport = {
    manifest,
    runUrl: published.url,
    assetUrl: (path) => (path ? storage.url(`${prefix}/${path}`) : undefined),
  };
  console.log(
    `Published ${published.files} files to ${storage.name}${published.url ? `: ${published.url}` : ""}`,
  );

  const usage = usageLine(meter);
  const markdown = commentMarkdown(report, usage);
  await writeJobSummary(markdown);
  if (usage) console.log(`Model ${usage.replace("model: ", "")}`);

  if (!decision.notify) {
    console.log(`Not notifying: ${decision.reason}`);
    return;
  }
  const notifiers: Notifier[] = [];
  const webhook = config.notify.slack?.webhookUrl;
  if (webhook) notifiers.push(slackNotifier(webhook));
  else console.log("Slack: skipped, no webhook URL configured.");
  if (config.notify.githubComment && context.token && context.repo && context.pr) {
    notifiers.push(
      githubCommentNotifier({
        token: context.token,
        repo: context.repo,
        prNumber: context.pr.number,
        usageLine: usage,
      }),
    );
  } else if (config.notify.githubComment) {
    console.log("PR comment: skipped, needs GITHUB_TOKEN, a repo and a PR number.");
  }

  const failures: string[] = [];
  for (const notifier of notifiers) {
    try {
      await notifier.send(report);
      console.log(`${notifier.name}: sent`);
    } catch (error) {
      failures.push(`${notifier.name}: ${(error as Error).message}`);
    }
  }
  if (failures.length)
    throw new ReeldiffError(`Some notifications failed:\n${failures.join("\n")}`);
}
