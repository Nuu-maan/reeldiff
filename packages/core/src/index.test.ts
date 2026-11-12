import { expect, test } from "vitest";
import pkg from "../package.json" with { type: "json" };
import { version } from "./index.ts";

test("exposes the package version", () => {
  expect(version).toBe(pkg.version);
});
