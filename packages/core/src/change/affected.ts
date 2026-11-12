import { posix } from "node:path";
import type { Flow } from "../flow/schema.ts";
import type { RouteAdapter } from "./route-adapter.ts";

export type AffectedFlow = { flow: Flow; files: string[] };
export type AffectedRoute = { route: string; files: string[] };
export type Affected = {
  flows: AffectedFlow[];
  routes: AffectedRoute[];
  unmatched: string[];
};

const matches = (file: string, globs: string[]) =>
  globs.some((glob) => posix.matchesGlob(file, glob));

export function findAffected(input: {
  files: string[];
  flows: Flow[];
  uiPaths: string[];
  adapter?: RouteAdapter;
}): Affected {
  const files = input.files.map((file) => file.replaceAll("\\", "/"));
  const flows = input.flows
    .map((flow) => ({ flow, files: files.filter((file) => matches(file, flow.covers)) }))
    .filter((entry) => entry.files.length > 0);

  const covered = new Set(flows.flatMap((entry) => entry.files));
  const routes = new Map<string, string[]>();
  const unmatched: string[] = [];
  for (const file of files) {
    if (covered.has(file) || !matches(file, input.uiPaths)) continue;
    const route = input.adapter?.routeFor(file) ?? null;
    if (route) routes.set(route, [...(routes.get(route) ?? []), file]);
    else unmatched.push(file);
  }

  return {
    flows,
    routes: [...routes].map(([route, routeFiles]) => ({ route, files: routeFiles })),
    unmatched,
  };
}
