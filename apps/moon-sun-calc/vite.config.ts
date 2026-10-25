import { defineConfig } from "vite";

// Served at tools.rjmlaird.co.uk/optics-visualiser/. The output folder carries the prefix so
// Workers Static Assets finds /optics-visualiser/... paths without a Worker script.
export default defineConfig({
  base: "/optics-visualiser/",
  build: { outDir: "dist/moon-sun-calc", emptyOutDir: true },
});
