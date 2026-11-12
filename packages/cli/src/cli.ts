#!/usr/bin/env node
import { ReeldiffError, version } from "@reeldiff/core";
import { Command } from "commander";
import { affectedCommand } from "./commands/affected.ts";
import { exploreCommand } from "./commands/explore.ts";
import { healCommand } from "./commands/heal.ts";
import { recordCommand } from "./commands/record.ts";
import { replayCommand } from "./commands/replay.ts";
import { runCommand } from "./commands/run.ts";
import { viewCommand } from "./commands/view.ts";

const program = new Command()
  .name("reeldiff")
  .description("Every PR gets a demo of what changed.")
  .version(version, "-v, --version");

program
  .command("replay")
  .description("Replay a flow deterministically. Exits 1 on the first failing step.")
  .argument("<flowId>", "flow id, the file name in .reeldiff/flows without .yaml")
  .option("--headed", "show the browser")
  .option("--url <url>", "base URL to replay against, overrides baseUrl in the config")
  .option("-c, --config <path>", "path to reeldiff.config.ts")
  .action(replayCommand);

program
  .command("record")
  .description("Replay a flow and record an MP4, per-step screenshots and DOM snapshots.")
  .argument("<flowId>", "flow id, the file name in .reeldiff/flows without .yaml")
  .option("--headed", "show the browser")
  .option("--url <url>", "base URL to record against, overrides baseUrl in the config")
  .option("-c, --config <path>", "path to reeldiff.config.ts")
  .action(recordCommand);

program
  .command("explore")
  .description("Let an AI agent reach a goal in the browser, then save it as a flow.")
  .argument("<goal>", "what to do, in plain words")
  .option("--url <url>", "page to start from, defaults to baseUrl in the config")
  .option("--headed", "show the browser")
  .option("-c, --config <path>", "path to reeldiff.config.ts")
  .action(exploreCommand);

program
  .command("heal")
  .description("Replay a flow and use AI to fix steps whose target changed. Writes the flow file.")
  .argument("<flowId>", "flow id, the file name in .reeldiff/flows without .yaml")
  .option("--headed", "show the browser")
  .option("--url <url>", "base URL, overrides baseUrl in the config")
  .option("-c, --config <path>", "path to reeldiff.config.ts")
  .action(healCommand);

program
  .command("affected")
  .description("List the flows a git range affects, and why.")
  .requiredOption("--base <ref>", "base git ref, e.g. origin/main")
  .requiredOption("--head <ref>", "head git ref, e.g. HEAD")
  .option("--json", "print JSON")
  .option("-c, --config <path>", "path to reeldiff.config.ts")
  .action(affectedCommand);

program
  .command("run")
  .description("The full pipeline: affected flows, record, compare, summarize, publish and notify.")
  .option("--base <ref>", "base git ref", "origin/main")
  .option("--head <ref>", "head git ref", "HEAD")
  .option("--url <url>", "deployment to record, overrides baseUrl in the config")
  .option("--compare-url <url>", "deployment to compare against, overrides compareUrl")
  .option("--repo <owner/name>", "GitHub repo, defaults to GITHUB_REPOSITORY")
  .option("--pr <number>", "PR number, defaults to the GitHub event")
  .option("--title <title>", "PR title, defaults to the GitHub event")
  .option("-c, --config <path>", "path to reeldiff.config.ts")
  .action(runCommand);

program
  .command("view")
  .description("Serve a run's replay page locally. Defaults to the latest run.")
  .argument("[runId]", "run folder name in .reeldiff/out")
  .option("-p, --port <port>", "port to listen on", "4321")
  .option("-c, --config <path>", "path to reeldiff.config.ts")
  .action(viewCommand);

try {
  await program.parseAsync();
} catch (error) {
  if (!(error instanceof ReeldiffError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
}
