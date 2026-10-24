import { defineConfig } from "vite";

// Served at tools.rjmlaird.co.uk/colour-palette/. The output folder carries the prefix so
// Workers Static Assets finds /colour-palette/... paths without a Worker script.
export default defineConfig({
  base: "/colour-palette/",
  build: { outDir: "dist/context-switcher", emptyOutDir: true },
});
