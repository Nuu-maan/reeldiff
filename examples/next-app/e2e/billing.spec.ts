import { expect, test } from "@playwright/test";

test("upgrades the plan and saves billing details", async ({ page }) => {
  await page.goto("/settings/billing");
  await expect(page.getByText("You're on Starter.")).toBeVisible();

  await page.getByRole("button", { name: "Upgrade to Team" }).click();
  await expect(page.getByText("You're on Team.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Current plan" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Switch to Starter" })).toBeEnabled();

  await page.getByLabel("Billing email").fill("billing@example.com");
  await page.getByLabel("Card number").fill("4242 4242 4242 4242");
  await page.getByLabel("Country").click();
  await page.getByRole("option", { name: "Germany" }).click();
  await page.getByRole("button", { name: "Save billing details" }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Billing email")).toHaveValue("billing@example.com");
  await expect(page.getByLabel("Card number")).toHaveAttribute("data-reeldiff-mask");
});
