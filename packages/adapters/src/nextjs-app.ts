import type { RouteAdapter } from "@reeldiff/core";

const appDir = /^(?:src\/)?app\//;

export const nextjsApp: RouteAdapter = {
  name: "nextjs-app",
  routeFor(file) {
    if (!appDir.test(file)) return null;
    const parts = file.replace(appDir, "").split("/");
    const name = parts.pop() ?? "";
    if (/^route\.[cm]?[jt]sx?$/.test(name)) return null;

    const segments: string[] = [];
    for (const part of parts) {
      if (part.startsWith("_")) break;
      if (/^\(\.{1,3}\)/.test(part)) return null;
      if (/^\(.*\)$/.test(part) || part.startsWith("@")) continue;
      if (part.startsWith("[")) return null;
      segments.push(part);
    }
    return `/${segments.join("/")}`;
  },
};
