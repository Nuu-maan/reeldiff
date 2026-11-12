import type { RouteAdapter } from "@reeldiff/core";
import { nextjsApp } from "./nextjs-app.ts";
import { nextjsPages } from "./nextjs-pages.ts";

export { nextjsApp, nextjsPages };

export function adapterFor(
  framework: "nextjs-app" | "nextjs-pages" | "none",
): RouteAdapter | undefined {
  if (framework === "nextjs-app") return nextjsApp;
  if (framework === "nextjs-pages") return nextjsPages;
  return undefined;
}
