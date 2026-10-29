import { defineConfig } from "vite";

// Served at tools.rjmlaird.co.uk/home-energy-baseline/. The output folder carries the prefix so
// Workers Static Assets finds /home-energy-baseline/... paths without a Worker script.
export default defineConfig({
  base: "/cup-delta/",
  build: { outDir: "dist/cup-delta", emptyOutDir: true },
});
