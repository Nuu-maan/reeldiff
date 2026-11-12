import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  publicDir: process.env.REELDIFF_RUN_DIR ?? false,
  build: { outDir: "dist", emptyOutDir: true, assetsInlineLimit: 0 },
});
