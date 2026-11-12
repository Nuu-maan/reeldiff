import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const cli = resolve("node_modules/reeldiff/dist/cli.mjs");

test.describe("replay page", () => {
  let server: ChildProcess | undefined;
  let url = "";

  test.beforeAll(async ({ baseURL }, info) => {
    if (info.project.name !== "chromium") return;
    info.setTimeout(120_000);
    const recorded = spawnSync(
      process.execPath,
      [cli, "record", "create-project", "--url", baseURL ?? ""],
      {
        encoding: "utf8",
      },
    );
    const runId = recorded.stdout.match(/reeldiff view (\S+)/)?.[1];
    expect(runId, recorded.stderr).toBeTruthy();
    server = spawn(process.execPath, [cli, "view", runId ?? "", "--port", "0"]);
    url = await new Promise<string>((done, fail) => {
      server?.stdout?.on("data", (chunk: Buffer) => {
        const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+\//);
        if (match) done(match[0]);
      });
      server?.on("exit", () => fail(new Error("view exited")));
    });
  });

  test.afterAll(() => {
    server?.kill();
  });

  test.beforeEach(() => {
    test.skip(test.info().project.name !== "chromium", "served once for chromium");
  });

  test("shows the run and walks through the clickable demo offline", async ({ page }) => {
    const outside: string[] = [];
    page.on("request", (request) => {
      if (!/^(blob|data):/.test(request.url()) && !request.url().startsWith(url))
        outside.push(request.url());
    });

    await page.goto(url);
    await expect(page.getByRole("tab", { name: /Create a new project/ })).toBeVisible();
    await expect(page.getByText("new", { exact: true })).toBeVisible();
    await expect(page.locator("video")).toHaveAttribute("src", /video\.mp4$/);
    await expect(page.getByRole("tab", { name: "Before and after" })).toHaveCount(0);

    await page.getByRole("tab", { name: "Try it" }).click();
    for (let step = 0; step < 6; step++) {
      await page.getByRole("button", { name: /^Next:/ }).click();
    }
    await expect(page.getByRole("button", { name: "Start over" })).toBeVisible();
    await page.getByRole("button", { name: "Start over" }).click();
    await expect(
      page.getByRole("button", { name: "Next: Open the new project dialog" }),
    ).toBeVisible();

    expect(outside).toEqual([]);
  });

  test("fits a phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    await expect(page.getByRole("tab", { name: /Create a new project/ })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
