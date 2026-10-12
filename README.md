# rjmlaird-tools

Stable, bookmarkable production tools for **tools.rjmlaird.co.uk** — calculators, converters, small data/EO utilities. Built on Cloudflare Workers, Hono and pnpm workspaces (TypeScript).

## Layout
- `apps/` — one Worker per tool (`orbital-calc`, `unit-converter`)
- `packages/utils` — shared maths/formatting helpers
- `packages/ui` — shared Hono JSX components (`Layout`)
- `packages/config/*` — shared tsconfig, ESLint and Prettier config

## Commands
```sh
pnpm install
pnpm dev         # all apps in dev mode (wrangler dev)
pnpm build       # dry-run bundle of all apps
pnpm typecheck
pnpm lint
pnpm format
```

## Add a new tool
1. Copy `apps/orbital-calc` to `apps/<name>`.
2. Rename the package and the `name` in `wrangler.toml`.
3. Change `basePath` in `src/index.ts` and the route pattern to `/<name>`.
4. `pnpm install`.

## Routing
Each app is its own Worker bound to `tools.rjmlaird.co.uk/<name>*`. Alternatively, add a router Worker with service bindings.

## Local ports
Each app has its own `[dev]` ports in `wrangler.toml` so `pnpm dev` can run them together: orbital-calc `8787`, unit-converter `8788`. Give new apps the next free pair (e.g. `8789` / `9231`). To run one app: `pnpm --filter @rjmlaird/unit-converter dev`.

## Index page
`apps/index` serves `tools.rjmlaird.co.uk/` (port `8789`). Add a tool to `apps/index/src/tools.ts` and it appears on the index with filters. Route: `tools.rjmlaird.co.uk/*`; the more specific app routes still win.
