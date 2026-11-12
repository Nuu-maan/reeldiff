import { describe, expect, test } from "vitest";
import { loadFlows } from "../flow/load.ts";
import { findAffected } from "./affected.ts";
import type { RouteAdapter } from "./route-adapter.ts";

const flows = await loadFlows(
  new URL("../../../../examples/next-app/.reeldiff/flows", import.meta.url).pathname.replace(
    /^\/([A-Z]:)/,
    "$1",
  ),
);

const appRoutes: RouteAdapter = {
  name: "test",
  routeFor: (file) => (file.includes("/app/(app)/settings/") ? "/settings/billing" : null),
};

const affected = (files: string[]) =>
  findAffected({ files, flows, uiPaths: ["src/**/*.tsx"], adapter: appRoutes });

const ids = (files: string[]) => affected(files).flows.map((entry) => entry.flow.id);

describe("findAffected on the example app flows", () => {
  test("a projects change selects both project flows", () => {
    expect(ids(["src/features/projects/new-project-dialog.tsx"])).toEqual([
      "complete-task",
      "create-project",
    ]);
  });

  test("a billing change selects only upgrade-plan and explains why", () => {
    const result = affected(["src/features/billing/plan-picker.tsx", "README.md"]);
    expect(result.flows).toEqual([
      expect.objectContaining({ files: ["src/features/billing/plan-picker.tsx"] }),
    ]);
    expect(result.flows[0]?.flow.id).toBe("upgrade-plan");
  });

  test("a task list change selects complete-task", () => {
    expect(ids(["src/features/projects/task-list.tsx"])).toEqual(["complete-task"]);
  });

  test("UI files no flow covers become route snapshots or stay unmatched", () => {
    const result = affected([
      "src/features/team/invite-form.tsx",
      "src/app/(app)/settings/team/page.tsx",
    ]);
    expect(result.flows).toEqual([]);
    expect(result.routes).toEqual([
      { route: "/settings/billing", files: ["src/app/(app)/settings/team/page.tsx"] },
    ]);
    expect(result.unmatched).toEqual(["src/features/team/invite-form.tsx"]);
  });

  test("non-UI changes affect nothing", () => {
    const result = affected(["README.md", "package.json", "src/lib/cn.ts"]);
    expect(result).toEqual({ flows: [], routes: [], unmatched: [] });
  });

  test("windows paths are normalized", () => {
    expect(ids(["src\\features\\billing\\billing-form.tsx"])).toEqual(["upgrade-plan"]);
  });
});
