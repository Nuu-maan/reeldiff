import { join } from "node:path";
import type { Manifest, ManifestFlow } from "../manifest.ts";
import { diffRatio } from "./diff.ts";

export async function compareFlow(
  runDir: string,
  head: ManifestFlow,
  before: ManifestFlow,
  threshold: number,
): Promise<ManifestFlow> {
  if (head.status === "broken") return head;
  if (before.status === "broken")
    return { ...head, status: "new", reason: "Couldn't replay on the compare URL" };

  const beforeShots = new Map(before.steps.map((step) => [step.index, step.screenshot]));
  const steps = await Promise.all(
    head.steps.map(async (step) => {
      const beforeShot = beforeShots.get(step.index);
      if (!step.screenshot || !beforeShot) return step;
      const diff = await diffRatio(join(runDir, beforeShot), join(runDir, step.screenshot));
      return { ...step, before: beforeShot, diff, changed: diff > threshold };
    }),
  );

  let finalChanged = false;
  if (head.poster && before.poster) {
    finalChanged =
      (await diffRatio(join(runDir, before.poster), join(runDir, head.poster))) > threshold;
  }
  const changed = finalChanged || steps.some((step) => step.changed);
  return { ...head, steps, status: changed ? "changed" : "unchanged" };
}

export function shouldNotify(manifest: Pick<Manifest, "flows">): {
  notify: boolean;
  reason: string;
} {
  const by = (status: string) => manifest.flows.filter((flow) => flow.status === status).length;
  if (manifest.flows.length === 0) return { notify: false, reason: "No flows were affected." };
  if (by("broken")) return { notify: true, reason: `${by("broken")} flow(s) broke.` };
  if (by("changed") || by("new")) {
    return { notify: true, reason: `${by("changed") + by("new")} flow(s) show UI changes.` };
  }
  return {
    notify: false,
    reason: "Affected flows look the same as before, so there's nothing to show.",
  };
}
