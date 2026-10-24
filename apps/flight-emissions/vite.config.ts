import { defineConfig } from "vite";

// Served at tools.rjmlaird.co.uk/flight-emissions/. The output folder carries the prefix so
// Workers Static Assets finds /flight-emissions/... paths without a Worker script.
export default defineConfig({
  base: "/flight-emissions/",
  build: { outDir: "dist/flight-emissions", emptyOutDir: true },
});
