import { expect, test } from "vitest";
import { runArgs } from "./args.ts";

test("maps inputs to reeldiff run flags and skips empty ones", () => {
  expect(
    runArgs({
      headUrl: "https://pr-1.example.com",
      baseUrl: "",
      model: "m",
      config: "app/reeldiff.config.ts",
    }),
  ).toEqual([
    "run",
    "--url",
    "https://pr-1.example.com",
    "--config",
    "app/reeldiff.config.ts",
    "--model",
    "m",
  ]);
});
