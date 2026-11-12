import { describe, expect, test } from "vitest";
import { nextjsApp, nextjsPages } from "./index.ts";

describe("nextjs-app", () => {
  test.each([
    ["app/settings/billing/page.tsx", "/settings/billing"],
    ["src/app/(app)/settings/billing/page.tsx", "/settings/billing"],
    ["src/app/(app)/dashboard/page.tsx", "/dashboard"],
    ["app/page.tsx", "/"],
    ["app/layout.tsx", "/"],
    ["app/settings/billing/_components/plan-card.tsx", "/settings/billing"],
    ["app/settings/billing/loading.tsx", "/settings/billing"],
    ["app/dashboard/@stats/page.tsx", "/dashboard"],
    ["app/projects/[id]/page.tsx", null],
    ["app/photos/(.)[id]/page.tsx", null],
    ["app/api/health/route.ts", null],
    ["components/button.tsx", null],
    ["src/features/billing/plan-picker.tsx", null],
  ])("%s → %s", (file, route) => {
    expect(nextjsApp.routeFor(file)).toBe(route);
  });
});

describe("nextjs-pages", () => {
  test.each([
    ["pages/index.tsx", "/"],
    ["pages/settings/billing.tsx", "/settings/billing"],
    ["src/pages/blog/index.mdx", "/blog"],
    ["pages/_app.tsx", null],
    ["pages/api/users.ts", null],
    ["pages/posts/[slug].tsx", null],
    ["components/nav.tsx", null],
  ])("%s → %s", (file, route) => {
    expect(nextjsPages.routeFor(file)).toBe(route);
  });
});
