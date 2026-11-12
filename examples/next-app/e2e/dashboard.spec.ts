import { expect, test } from "@playwright/test";

test("creates a project from the dashboard and keeps it after reload", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
  await expect(page.getByText("3 projects")).toBeVisible();

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("Acme launch");
  await page.getByLabel("Template").click();
  await page.getByRole("option", { name: "Product launch" }).click();
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Acme launch")).toBeVisible();
  await expect(page.getByText("4 projects")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Acme launch")).toBeVisible();
});

test("create stays disabled until the project has a name", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New project" }).click();
  await expect(page.getByRole("button", { name: "Create" })).toBeDisabled();
});

test("skips motion when the user prefers reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("Still project");
  await page.getByRole("button", { name: "Create" }).click();

  const card = page.getByRole("listitem").filter({ hasText: "Still project" });
  await expect(card).toBeVisible();
  expect(await card.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
});

test("titles a project created in the browser", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("Fresh idea");
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("link", { name: "Fresh idea", exact: true }).click();
  await expect(page).toHaveTitle("Fresh idea · Plot");
});
