import type { RouteAdapter } from "@reeldiff/core";

const pagesDir = /^(?:src\/)?pages\//;

export const nextjsPages: RouteAdapter = {
  name: "nextjs-pages",
  routeFor(file) {
    if (!pagesDir.test(file)) return null;
    const path = file.replace(pagesDir, "").replace(/\.[cm]?[jt]sx?$|\.mdx?$/, "");
    const parts = path.split("/");
    if (parts[0] === "api" || parts.some((part) => part.startsWith("_") || part.startsWith("["))) {
      return null;
    }
    if (parts.at(-1) === "index") parts.pop();
    return `/${parts.join("/")}`;
  },
};
