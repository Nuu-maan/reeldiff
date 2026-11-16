import { expect, test } from "vitest";
import { routeFlows } from "./run.ts";

test("routes that slug the same get distinct flow ids", () => {
  expect(
    routeFlows(["/", "/settings/billing", "/settings-billing", "/settings/billing/"]).map(
      (flow) => flow.id,
    ),
  ).toEqual([
    "route-home",
    "route-settings-billing",
    "route-settings-billing-2",
    "route-settings-billing-3",
  ]);
});
