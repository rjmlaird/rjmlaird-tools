import type { Env } from "./src/env";

declare module "cloudflare:test" {
  // Gives SELF/env the Worker's bindings type in tests.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ProvidedEnv extends Env {}
}
