import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { getInput, info, setFailed, setSecret } from "@actions/core";
import { runArgs, secretEnv } from "./args.ts";

for (const name of secretEnv) {
  const value = process.env[name];
  if (value) setSecret(value);
}

const cwd = resolve(getInput("working-directory") || ".");
const local = join(cwd, "node_modules", ".bin", "reeldiff");
const [bin = "reeldiff", ...prefix] = (
  getInput("cli") || (existsSync(local) ? local : "reeldiff")
).split(" ");

const exec = (args: string[]) =>
  new Promise<number>((done, fail) => {
    info(`$ ${[bin, ...prefix, ...args].join(" ")}`);
    const child = spawn(bin, [...prefix, ...args], { cwd, stdio: "inherit" });
    child.on("error", fail);
    child.on("close", (code) => done(code ?? 1));
  });

try {
  if ((await exec(["install-browser", "--with-deps"])) !== 0)
    throw new Error("Installing Chromium failed.");
  const code = await exec(
    runArgs({
      headUrl: getInput("head-url", { required: true }),
      baseUrl: getInput("base-url"),
      config: getInput("config"),
      modelProvider: getInput("model-provider"),
      model: getInput("model"),
      baseRef: getInput("base-ref"),
      headRef: getInput("head-ref"),
    }),
  );
  if (code !== 0) setFailed(`reeldiff run exited with ${code}.`);
} catch (error) {
  setFailed((error as Error).message);
}
