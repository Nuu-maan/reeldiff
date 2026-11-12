import { isMap, parseDocument } from "yaml";
import type { Target } from "./schema.ts";

export function setStepTargets(source: string, targets: Map<number, Target>): string {
  const doc = parseDocument(source);
  for (const [stepIndex, target] of targets) {
    const node = doc.createNode(target);
    if (isMap(node)) node.flow = true;
    doc.setIn(["steps", stepIndex, "target"], node);
  }
  return doc.toString({ lineWidth: 0 });
}
