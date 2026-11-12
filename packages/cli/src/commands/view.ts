import { access, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ReeldiffError } from "@reeldiff/core";
import { serveDir } from "../serve.ts";
import { loadProject } from "./shared.ts";

type ViewFlags = { config?: string; port?: string };

export async function viewCommand(runId: string | undefined, flags: ViewFlags) {
  const { rootDir } = await loadProject(flags);
  const outDir = resolve(rootDir, ".reeldiff", "out");
  const runs = (await readdir(outDir).catch(() => [])).sort();
  const id = runId ?? runs.at(-1);
  if (!id)
    throw new ReeldiffError(`No runs in ${outDir}. Record one with reeldiff record <flowId>.`);
  const runDir = join(outDir, id);
  try {
    await access(join(runDir, "manifest.json"));
    await access(join(runDir, "index.html"));
  } catch {
    throw new ReeldiffError(
      `${runDir} isn't a complete run. Known runs: ${runs.join(", ") || "none"}`,
    );
  }
  const server = await serveDir(runDir, Number(flags.port ?? 4321));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : flags.port;
  console.log(`Serving run ${id} at http://127.0.0.1:${port}/ (Ctrl+C to stop)`);
}
