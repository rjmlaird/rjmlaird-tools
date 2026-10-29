import { defineConfig } from "vite";

// Served at tools.rjmlaird.co.uk/waiting-on-tracker/. The output folder carries the prefix so
// Workers Static Assets finds /waiting-on-tracker/... paths without a Worker script.
export default defineConfig({
  base: "/waiting-on-tracker/",
  build: { outDir: "dist/waiting-on-tracker", emptyOutDir: true },
});
