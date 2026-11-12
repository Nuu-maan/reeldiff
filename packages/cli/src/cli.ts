#!/usr/bin/env node
import { parseArgs } from "node:util";
import { version } from "@reeldiff/core";

const usage = `Usage: reeldiff [options]

Options:
  -v, --version  Print the version
  -h, --help     Show this help`;

const { values } = parseArgs({
  options: {
    version: { type: "boolean", short: "v" },
    help: { type: "boolean", short: "h" },
  },
});

console.log(values.version ? version : usage);
