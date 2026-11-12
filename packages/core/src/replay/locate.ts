import type { Locator, Page } from "playwright";
import type { Target } from "../flow/schema.ts";

type Role = Parameters<Page["getByRole"]>[0];

export function locate(page: Page, target: Target): Locator {
  if ("role" in target) {
    return page.getByRole(target.role as Role, { name: target.name, exact: true });
  }
  if ("label" in target) return page.getByLabel(target.label, { exact: true });
  if ("placeholder" in target) return page.getByPlaceholder(target.placeholder, { exact: true });
  if ("text" in target) return page.getByText(target.text, { exact: true });
  if ("testId" in target) return page.getByTestId(target.testId);
  return page.locator(target.css);
}

export function describeTarget(target: Target): string {
  if ("role" in target) return target.name ? `${target.role} "${target.name}"` : target.role;
  const [kind, value] = Object.entries(target)[0] as [string, string];
  return `${kind} "${value}"`;
}
