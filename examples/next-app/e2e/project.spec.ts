import { expect, test } from "@playwright/test";

test("adds and completes a task on a project", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: /Mobile onboarding/ }).click();
  await expect(page.getByRole("heading", { name: "Mobile onboarding", level: 1 })).toBeVisible();

  await page.getByRole("tab", { name: "Tasks" }).click();
  await page.getByLabel("New task").fill("Write release notes");
  await page.getByRole("button", { name: "Add task" }).click();

  const task = page.getByRole("checkbox", { name: "Write release notes" });
  await expect(task).not.toBeChecked();
  await task.check();
  await expect(task).toBeChecked();

  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByText("2 of 4 done")).toBeVisible();
});

test("shows a way back for an unknown project", async ({ page }) => {
  await page.goto("/projects/does-not-exist");
  await expect(page.getByRole("heading", { name: "I can't find that project" })).toBeVisible();
  await page.getByRole("link", { name: "Back to projects" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
