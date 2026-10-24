import { defineConfig } from "vite";

// Served at tools.rjmlaird.co.uk/orbit-simulator/. The output folder carries the prefix so
// Workers Static Assets finds /orbit-simulator/... paths without a Worker script.
export default defineConfig({
  base: "/orbit-simulator/",
  build: { outDir: "dist/light-pollution", emptyOutDir: true },
});
