import { adapterFor } from "@reeldiff/adapters";
import { changedFiles, findAffected, flowsDir, loadFlows } from "@reeldiff/core";
import { loadProject } from "./shared.ts";

type AffectedFlags = { base: string; head: string; config?: string; json?: boolean };

export async function affectedCommand(flags: AffectedFlags) {
  const { config, rootDir } = await loadProject(flags);
  const files = await changedFiles(rootDir, flags.base, flags.head);
  const flows = await loadFlows(flowsDir(rootDir));
  const result = findAffected({
    files,
    flows,
    uiPaths: config.uiPaths,
    adapter: adapterFor(config.framework),
  });

  if (flags.json) {
    console.log(
      JSON.stringify(
        {
          files,
          flows: result.flows.map((entry) => ({ id: entry.flow.id, files: entry.files })),
          routes: result.routes,
          unmatched: result.unmatched,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`${files.length} changed file(s) in ${flags.base}...${flags.head}`);
  if (!result.flows.length && !result.routes.length) {
    console.log("\nNo flows affected.");
  }
  if (result.flows.length) {
    console.log("\nFlows:");
    for (const entry of result.flows) {
      console.log(`  ${entry.flow.id}`);
      for (const file of entry.files) console.log(`    ← ${file}`);
    }
  }
  if (result.routes.length) {
    console.log("\nRoute snapshots:");
    for (const route of result.routes) {
      console.log(`  ${route.route}`);
      for (const file of route.files) console.log(`    ← ${file}`);
    }
  }
  if (result.unmatched.length) {
    console.log("\nUI files no flow covers:");
    for (const file of result.unmatched) console.log(`  ${file}`);
  }
}
