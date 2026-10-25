import { defineConfig } from "vite";

// Served at tools.rjmlaird.co.uk/light-pollution/. The output folder carries the prefix so
// Workers Static Assets finds /light-pollution/... paths without a Worker script.
export default defineConfig({
  base: "/light-pollution/",
  build: { outDir: "dist/light-pollution", emptyOutDir: true },
});
