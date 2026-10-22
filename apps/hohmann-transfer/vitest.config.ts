import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

// Tests run inside the Workers runtime (workerd), using the settings in wrangler.toml.
export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
      },
    },
  },
});
