import { defineConfig } from "vite";

// Served at tools.rjmlaird.co.uk/dopamine-menu/. The output folder carries the prefix so
// Workers Static Assets finds /dopamine-menu/... paths without a Worker script.
export default defineConfig({
  base: "/dopamine-menu/",
  build: { outDir: "dist/dopamine-menu", emptyOutDir: true },
});
