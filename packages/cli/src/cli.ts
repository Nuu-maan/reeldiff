#!/usr/bin/env node
import { ReeldiffError, version } from "@reeldiff/core";
import { Command } from "commander";
import { exploreCommand } from "./commands/explore.ts";
import { healCommand } from "./commands/heal.ts";
import { recordCommand } from "./commands/record.ts";
import { replayCommand } from "./commands/replay.ts";

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

try {
  await program.parseAsync();
} catch (error) {
  if (!(error instanceof ReeldiffError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
}
