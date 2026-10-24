import { defineConfig } from "vite";

// Served at tools.rjmlaird.co.uk/meta-tag-checker/. The output folder carries the prefix so
// Workers Static Assets finds /meta-tag-checker/... paths without a Worker script.
export default defineConfig({
  base: "/meta-tag-checker/",
  build: { outDir: "dist/meta-tag-checker", emptyOutDir: true },
});
