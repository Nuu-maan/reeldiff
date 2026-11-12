import { Document, isMap, visit } from "yaml";
import type { Flow } from "./schema.ts";

export function stringifyFlow(flow: Flow): string {
  const { viewport, auth, covers, ...rest } = flow;
  const doc = new Document({
    ...rest,
    ...(auth !== "none" ? { auth } : {}),
    ...(viewport.width !== 1440 || viewport.height !== 900 ? { viewport } : {}),
    covers,
  });
  visit(doc, {
    Pair(_, pair) {
      const key = (pair.key as { value?: unknown } | null)?.value;
      if ((key === "target" || key === "viewport") && isMap(pair.value)) pair.value.flow = true;
    },
  });
  return doc.toString({ lineWidth: 0 });
}
