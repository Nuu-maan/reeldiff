#!/usr/bin/env node
import { ReeldiffError, version } from "@reeldiff/core";
import { Command } from "commander";
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

try {
  await program.parseAsync();
} catch (error) {
  if (!(error instanceof ReeldiffError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
}
