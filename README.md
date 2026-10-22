# rjmlaird-tools

Stable, bookmarkable production tools for **tools.rjmlaird.co.uk** — calculators, converters, small data/EO utilities. Built on Cloudflare Workers, Hono and pnpm workspaces (TypeScript).

## Layout
- `apps/<tool>` — one deployable per tool, always served at `tools.rjmlaird.co.uk/<tool>`
  - Hono Workers: `orbital-calc`, `unit-converter`, `julian-date`, `physical-limits`, `hohmann-transfer`
  - Vite static apps (assets-only Workers): `dopamine-menu`, `carbon-reduction-plan`
  - `index` serves `tools.rjmlaird.co.uk/` (the catalogue) and `/favicon.svg` for every tool
- `packages/ui` — **brand layer**: `brand.css` (source of truth), `Layout`, brand bar/footer
- `packages/utils` — shared maths/units; `packages/config/*` — tsconfig, ESLint, Prettier

## Commands
```sh
pnpm install
pnpm dev         # every app on its own port (see below)
pnpm build       # regenerates brand CSS, then builds/dry-run bundles every app
pnpm typecheck && pnpm lint && pnpm test
```

## Routing contract (enforced by `apps/index/src/apps.test.ts`)
- Each app's wrangler config has two routes: `tools.rjmlaird.co.uk/<id>` and `tools.rjmlaird.co.uk/<id>/*`
  (never `<id>*`, never a custom domain), `workers_dev = false`, Worker name `rjmlaird-tools-<id>`.
- Hono apps use `new Hono({ strict: false }).basePath("/<id>")`; page JS calls `/<id>/...` absolute paths.
- Vite apps set `base: "/<id>/"` and `build.outDir: "dist/<id>"`, with `assets.directory = "./dist"`.
- The index Worker owns `tools.rjmlaird.co.uk/*`; more specific tool routes win.
- DNS: `tools.rjmlaird.co.uk` must be a proxied record in the `rjmlaird.co.uk` zone.

## Branding
All pages use `@rjmlaird/ui`: Hono apps render `<Layout title lede>`; Vite apps `import "@rjmlaird/ui/brand.css"`
and copy the brand bar markup from `apps/carbon-reduction-plan/index.html`. Edit
`packages/ui/src/brand.css`, then `pnpm gen` (the test fails if the generated file is stale).

## Add a new tool
1. Copy `apps/orbital-calc` (Hono) or `apps/dopamine-menu` (static/Vite) to `apps/<id>`.
2. Rename the package, Worker name, `basePath`/`base`, both routes and fetch URLs to `<id>`.
3. Give it the next free `[dev]` ports, add it to `apps/index/src/tools.ts`, run `pnpm install`.

## Local ports (port / inspector)
orbital-calc 8787/9229 · unit-converter 8788/9230 · index 8789/9231 · julian-date 8790/9232 ·
physical-limits 8791/9233 · hohmann-transfer 8792/9234 · dopamine-menu 8793/9235 · carbon-reduction-plan 8794/9236
