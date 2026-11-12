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

const hasFfmpeg = () =>
  new Promise<boolean>((done) => {
    const child = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
    child.on("error", () => done(false));
    child.on("close", (code) => done(code === 0));
  });

const shell = (command: string) =>
  new Promise<number>((done, fail) => {
    info(`$ ${command}`);
    const child = spawn("bash", ["-c", command], { stdio: "inherit" });
    child.on("error", fail);
    child.on("close", (code) => done(code ?? 1));
  });

try {
  if (!(await hasFfmpeg())) {
    if (process.platform !== "linux") throw new Error("ffmpeg isn't installed on this runner.");
    const installed = await shell(
      "sudo apt-get update -q && sudo apt-get install -y -q --no-install-recommends ffmpeg",
    );
    if (installed !== 0) throw new Error("Installing ffmpeg failed.");
  }
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
