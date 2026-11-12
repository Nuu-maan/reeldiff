import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: false,
  deps: { alwaysBundle: [/.*/] },
  platform: "node",
});
