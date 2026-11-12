import { access, mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { explore, flowsDir, languageModel, stringifyFlow, UsageMeter } from "@reeldiff/core";
import { loadProject, parseBaseUrl, printUsage } from "./shared.ts";

type ExploreFlags = { url?: string; headed?: boolean; config?: string };

async function freePath(dir: string, id: string) {
  for (let n = 1; ; n++) {
    const path = join(dir, `${n === 1 ? id : `${id}-${n}`}.yaml`);
    try {
      await access(path);
    } catch {
      return path;
    }
  }
}

export async function exploreCommand(goal: string, flags: ExploreFlags) {
  const { config, rootDir } = await loadProject(flags);
  const url = parseBaseUrl(flags.url ?? config.baseUrl);
  const meter = new UsageMeter();
  const model = languageModel(config.model, "explore");

  console.log(
    `Exploring "${goal}" from ${url.origin}${url.pathname}${flags.headed ? " (headed)" : ""}`,
  );
  try {
    const result = await explore({
      goal,
      url,
      model,
      meter,
      headed: flags.headed,
      onStep: (event) =>
        console.log(
          `${event.status === "passed" ? "✓" : "✗"} ${event.label}${event.error ? `: ${event.error}` : ""}`,
        ),
    });
    const yaml = stringifyFlow(result.flow);
    console.log(`\n${yaml}`);

    if (result.replay.status !== "passed") {
      const failed = result.replay.steps.find((step) => step.status === "failed");
      console.error(
        `The flow didn't replay cleanly (step ${failed?.index}: ${failed?.error}). Not saved.`,
      );
      process.exitCode = 1;
      return;
    }
    const dir = flowsDir(rootDir);
    await mkdir(dir, { recursive: true });
    const path = await freePath(dir, result.flow.id);
    await writeFile(path, yaml);
    console.log(
      `Saved ${relative(process.cwd(), path).replaceAll("\\", "/")}. It replays cleanly; review it and add covers globs.`,
    );
  } finally {
    printUsage(meter);
  }
}
