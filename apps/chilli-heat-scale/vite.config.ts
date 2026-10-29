import { defineConfig } from "vite";

// Served at tools.rjmlaird.co.uk/chilli-heat-scale/. The output folder carries the prefix so
// Workers Static Assets finds /chilli-heat-scale/... paths without a Worker script.
export default defineConfig({
  base: "/chilli-heat-scale/",
  build: { outDir: "dist/chilli-heat-scale", emptyOutDir: true },
});
