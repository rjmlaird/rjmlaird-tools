import { defineConfig } from "vite";

// Served at tools.rjmlaird.co.uk/habit-streak/. The output folder carries the prefix so
// Workers Static Assets finds /habit-streak/... paths without a Worker script.
export default defineConfig({
  base: "/habit-streak/",
  build: { outDir: "dist/habit-streak", emptyOutDir: true },
});
