import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { ReeldiffError } from "@reeldiff/core";

export function installBrowserCommand(flags: { withDeps?: boolean }): Promise<void> {
  const fromCore = createRequire(import.meta.resolve("@reeldiff/core"));
  const cli = join(dirname(fromCore.resolve("playwright/package.json")), "cli.js");
  const args = [cli, "install", ...(flags.withDeps ? ["--with-deps"] : []), "chromium"];
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, args, { stdio: "inherit" });
    child.on("error", fail);
    child.on("close", (code) =>
      code === 0 ? done() : fail(new ReeldiffError(`Installing Chromium failed (exit ${code}).`)),
    );
  });
}
