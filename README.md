# rjmlaird-tools

Small, stable, bookmarkable tools for **[tools.rjmlaird.co.uk](https://tools.rjmlaird.co.uk)**: calculators, converters,
estimators and checkers for space, physics, places, the web and everyday routines. Each tool is a separate Cloudflare
Worker served under its own path, and the index at the root lists them all.

Plans and open decisions are in [PLANS.md](./PLANS.md).

## The tools

25 tools in the catalogue: 19 active, 3 in progress, 3 planned. The catalogue itself is `apps/index/src/tools.ts`, the single source of truth for titles, descriptions, groups, status, tech and update dates.

| Group | Tool (`apps/<id>`) | Stack | Status |
| --- | --- | --- | --- |
| Space & Astronomy | `julian-date` Julian Date & Sidereal Time (with JSON API) | Hono | Active |
| | `orbital-calc` Orbital Calculator (with JSON API) | Hono | Active |
| | `hohmann-transfer` Hohmann Transfer Calculator (with JSON API) | Hono | Active |
| | `astro-calc` Astronomy Calculator, with light-path and field-of-view diagrams (with JSON API) | Hono | Active |
| | `deep-sky-objects` Deep-Sky Objects | Vite | Active |
| | `light-pollution` Light Pollution Estimator | Vite | Active |
| | `optics-visualiser` Optics Visualiser | Vite | Active |
| | `orbit-simulator` Orbit Simulator | Vite | Active |
| | `moon-sun-calc` Moon & Sun Calculator | Vite | Active |
| Maths & Physics | `unit-converter` Unit Converter (with JSON API) | Hono | Active |
| | `physical-limits` Physical Limits | Vite | Active |
| | `chilli-heat-scale` Chilli Heat Scale Explorer | Vite | Active |
| Places & Infrastructure | `coordinate-converter` Coordinate Converter | Hono | Active |
| | `postcode-lookup` Postcode Lookup | none yet | Planned |
| Sustainability & Climate | `carbon-reduction-plan` Carbon Reduction Plan Builder | React + Vite | Active |
| | `flight-emissions` Flight Emissions Estimator | Vite | Active |
| | `home-energy-baseline` Home Energy Baseline | Vite | In progress |
| Focus & Wellbeing | `dopamine-menu` Dopamine Menu | TypeScript + Vite | Active |
| | `waiting-on-tracker` Waiting-On Tracker | Vite | Active |
| | `habit-streak` Habit Streak Tracker | Vite | In progress |
| | `context-switcher` Context Switcher | Vite | In progress |
| Web & Development | `colour-contrast` Colour Contrast Checker | Hono | Active |
| | `seo-meta-tag` SEO Meta Tag Checker | Vite | Active |
| | `page-weight` Page Weight Audit | none yet | Planned |
| | `web-carbon` Website Carbon Checker | none yet | Planned |

Hono apps are TypeScript Workers that render pages on the server and often expose a small JSON API
(for example `/astro-calc/api/optics`). Vite apps are static pages in vanilla JavaScript (React for
`carbon-reduction-plan`, TypeScript for `dopamine-menu`) served by an assets-only Worker. Everything
else about them is the same.

## Repository layout

```
apps/<id>/            one deployable per tool, served at tools.rjmlaird.co.uk/<id>
apps/index/           the catalogue page, tools.ts registry, /favicon.svg for every tool
packages/ui/          brand layer: brand.css (source of truth), Layout, brand bar and footer
packages/utils/       shared maths and units
packages/config/*     shared tsconfig, ESLint and Prettier config
scripts/              export-builds.ts (catalogue export), assign-dev-ports.js
generated/            tools-builds.json, the committed catalogue export
```

## Commands

```sh
pnpm install
pnpm dev                 # every app on its own port
pnpm typecheck           # Hono apps and packages
pnpm lint
pnpm test                # unit tests (Hono apps) and the repo contract tests in apps/index
pnpm build               # regenerates brand CSS and the catalogue export (see below), then builds every app
pnpm gen                 # regenerate packages/ui/src/brand-css.generated.ts after editing brand.css
```

To work on one tool: `pnpm --filter @rjmlaird/<package-name> dev`. Hono packages are named
`@rjmlaird/tool-<id>` or `@rjmlaird/<id>` (check the app's `package.json`). For a Vite app,
`preview` builds it and serves it through Wrangler, which is the closest thing to production.

Uses pnpm 9 (pinned in `package.json`); developed and tested on Node 22.

## Contracts the tests enforce

These live in `apps/index/src/*.test.ts` and fail the build if broken.

**Routing** (`apps.test.ts`)
- Each app's Wrangler config has two routes, `tools.rjmlaird.co.uk/<id>` and `tools.rjmlaird.co.uk/<id>/*`
  (never `<id>*`, never a custom domain), `workers_dev = false`, and the Worker name `rjmlaird-tools-<id>`.
- Every app has unique `[dev]` ports.
- `brand-css.generated.ts` matches `brand.css`.

**Catalogue** (`tools.test.ts`)
- Every `apps/` folder has an entry in `tools.ts`, and every active or in-progress entry has a folder.
- `path` is `/<id>` and `source` is `apps/<id>`; only live tools (active or in progress) have a `path`.
- Dates are valid ISO dates, and groups and statuses are known.
- **Tech tags are checked against the code.** Hono apps must list `TypeScript, Hono, Cloudflare Workers`;
  React apps `React, Vite, Cloudflare Workers`; other Vite apps `JavaScript` or `TypeScript` (TypeScript if
  `src/` has `.ts` files) then `Vite, Cloudflare Workers`. Planned tools have no code and are skipped.

**By convention** (not yet tested; see PLANS.md)
- Hono apps use `new Hono({ strict: false }).basePath("/<id>")`, and page scripts call `/<id>/...` absolute paths.
- Vite apps set `base: "/<id>/"` and `build.outDir: "dist/<id>"`, with `assets.directory = "./dist"`.
- The index Worker owns `tools.rjmlaird.co.uk/*`; the more specific tool routes win.
- DNS: `tools.rjmlaird.co.uk` is a proxied record in the `rjmlaird.co.uk` zone.

## Branding

All pages share `@rjmlaird/ui`. Hono apps render `<Layout title lede>`. Vite apps
`import "@rjmlaird/ui/brand.css"` and copy the brand bar markup from `apps/optics-visualiser/index.html`
(or `apps/carbon-reduction-plan/index.html`). Tool-specific styles go in the app's own `src/tool.css`.
Edit `packages/ui/src/brand.css`, then run `pnpm gen`.

The palette (navy surfaces, teal and amber accents, Space Grotesk and Inter) matches the main site's
`global.css`. A few tools predate the brand layer and still carry their own styling; see PLANS.md.

## Add a new tool

1. Copy `apps/orbital-calc` (Hono, with an API) or `apps/optics-visualiser` (static Vite) to `apps/<id>`.
2. Rename the package, Worker name, `basePath` or `base`, `outDir`, both routes and any fetch URLs to `<id>`.
3. Give it the next free `[dev]` ports. `node scripts/assign-dev-ports.js` reassigns ports for every app
   alphabetically, so only run it when you are happy for all ports to change.
4. Add it to `apps/index/src/tools.ts` with the right `tech` list, then run `pnpm install`.
5. Run `pnpm typecheck && pnpm lint && pnpm test`, then `pnpm build`.
6. Open the page in a browser at `/<id>` and check it at phone width.

Move a tool from `in-progress` to `active` only when it meets the checklist in PLANS.md.

## Catalogue export

`pnpm export:builds` writes the catalogue as JSON for the combined Builds API. By default the file goes
to `../rjmlaird-api/src/data/tools-builds.json`, so a sibling `rjmlaird-api` checkout is expected.
`generated/tools-builds.json` is a committed copy, refreshed with:

```sh
pnpm exec tsx scripts/export-builds.ts --output generated/tools-builds.json
pnpm exec tsx scripts/export-builds.ts --check --output generated/tools-builds.json   # fails if stale
```

## Notes on specific tools

- **Light Pollution Estimator** is a model, not a measurement. `src/model.js` sums glow from the settlements in
  `src/places.js` (population and distance, in the shape of Walker's law) and converts it to sky brightness and Bortle
  class. It was fitted to about twenty approximate UK figures, so expect to be within roughly one class. The only
  network request is a postcode lookup to postcodes.io.
- **Astronomy Calculator** has a JSON API at `/astro-calc/api/optics` (`aperture` and `focalLength` required; `eyepiece`,
  `apparentFov` and `nelm` optional). The diagrams are drawn in the browser from the API response.
- **Estimators** (flight emissions, home energy, website carbon, light pollution) are modelled estimates. Their pages
  say so, and new ones should too.

## Local ports

Ports are set in each app's Wrangler config (`[dev] port` and `inspector_port`), assigned alphabetically
by `scripts/assign-dev-ports.js`. For example, `astro-calc` is on 8802 and `index` on 8814. Check the app's
`wrangler.toml` rather than a list here, since the list changes whenever a tool is added or removed.
