import { defineConfig } from "reeldiff";

export default defineConfig({
  baseUrl: process.env.REELDIFF_HEAD_URL ?? "http://localhost:3100",
  framework: "nextjs-app",
  uiPaths: ["src/**/*.tsx"],
  mask: ["[data-reeldiff-mask]"],
});
