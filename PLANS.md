# Plans

Where the tools site stands and what to do next. Order within each section is priority. There are no dates:
work is grouped as **Now**, **Next** and **Later**. Update this file when something ships or a decision is made.

Last reviewed: 25 October 2026.

## Where things stand

- 23 tools in the catalogue: 17 active, 3 in progress, 3 planned.
- Recently done: removed the duplicate Meta Tag Checker; added light-path and field-of-view diagrams to the Astronomy
  Calculator; rebuilt the Light Pollution Estimator as a working model; corrected four wrong tech tags on the index and
  added a test that checks tech tags against each app's code.
- Known weak spots: four tools sit outside the brand layer, several Vite configs are copy-paste leftovers, there is no CI,
  and the Vite apps have almost no automated tests.

## Now: correctness and housekeeping

Small, mostly mechanical, and each one removes a way for the site to break quietly.

1. **Fix the Vite base paths.** `moon-sun-calc` has `base: "/optics-visualiser/"`; `context-switcher` has
   `base: "/colour-palette/"`; `deep-sky-objects` and `seo-meta-tag` set no base at all and only work because of the
   single-page-app fallback. Set `base: "/<id>/"` and `outDir: "dist/<id>"` on each, and switch their Wrangler config to
   `404-page` like the other Vite apps so missing files return a real 404.
2. **Test the Vite contract.** `apps.test.ts` checks routes and ports but not Vite config. Add a check that each Vite app's
   `base` and `outDir` match its folder name, so item 1 cannot come back.
3. **Delete stray prototypes.** `apps/orbital-calc/index.html` and `apps/unit-converter/index.html` are unused Tailwind
   pages left over from before the Hono rewrite. Remove them (the same cleanup already done for `astro-calc`).
4. **Remove dead code in `tools.ts`.** `fetchTechBadgesMap`, `getBadgeUrl` and their types are unused. Either delete them or
   use them on the index cards, but do not leave them half-wired.
5. **Add CI.** A GitHub Actions workflow that runs install (frozen lockfile), typecheck, lint, test and
   `export-builds --check` on every push and pull request. There is no `.github/` folder today.
6. **Settle the README ports and `assign-dev-ports.js`.** The script renumbers every app alphabetically, so removing a tool
   changes everyone's ports. Decide whether to make ports permanent per tool (simpler to remember) or keep them generated.

## Next: consistency and quality

1. **Bring four tools onto the brand layer.** `seo-meta-tag` (Tailwind CDN), `moon-sun-calc` and `deep-sky-objects`
   (an older "AstroDash" palette and fonts) and `context-switcher` (its own light and dark palette) do not use
   `@rjmlaird/ui`. Move each to `brand.css` and the standard brand bar and footer, keeping their behaviour. Start with
   `seo-meta-tag`, since it loads Tailwind and Font Awesome from CDNs at runtime.
2. **Decide how `brand.css` relates to the main site and the planned shared UI package.** The tokens already match
   `global.css`, but they are maintained separately. Once the shared `rjmlaird-ui` package for the Astro sites exists, the
   tools should consume the same tokens rather than copy them. Until then, note any change to one in the other.
3. **Tests for the Vite apps.** Move the maths in each static app into plain modules (as `light-pollution` already does
   with `model.js`) and add Vitest. Priority: `light-pollution`, `flight-emissions`, `home-energy-baseline`,
   `moon-sun-calc`, `physical-limits`, `orbit-simulator`.
4. **Automated accessibility checks.** Run axe through Playwright on every tool page in CI, at desktop and phone width.
   The brand layer already aims for WCAG AA (44 px targets, 3:1 form borders, visible focus), so the check should
   hold the line.
5. **Light Pollution Estimator v2.** Check the model against measured sky-quality readings, not only recalled figures, and
   re-fit. Add settlements where it is weak (dark-sky areas are fine, but coastal and industrial glow is not captured),
   and add tests for the model. Consider a map view and a "darkest nearby site" suggestion.
6. **Settle the overlap between Astronomy Calculator and Optics Visualiser.** The calculator now has diagrams and an API,
   and the visualiser has sliders and the same ray diagram. Options: keep both (calculator for exact numbers and the API,
   visualiser for exploration), or fold the visualiser into the calculator as a slider mode and redirect the old path.
   Recommended: keep both, link each to the other, and share the drawing code in `packages/utils`.
7. **Promote or park the three in-progress tools** using the checklist below.

## Later: new tools and bigger ideas

1. **Postcode Lookup** (planned): coordinates, constituency and LSOA for a UK postcode. Hono Worker over postcodes.io,
   with a JSON API like the other Hono tools. It would also let Light Pollution and Moon & Sun accept postcodes through
   one shared helper.
2. **Page Weight Audit** and **Website Carbon Checker** (planned): need a server-side fetch, so both are Hono Workers.
   Build Page Weight first and reuse its fetch and byte accounting for the carbon estimate. Both must state that they are
   estimates, and must not fetch private or internal addresses.
3. **Use the catalogue export.** The export feeds the combined Builds API. Add a check that every active tool's `url`
   returns 200 after deploy.
4. **Space tools that fit the existing set:** satellite pass predictions, a rise and set planner for deep-sky objects
   that reuses `moon-sun-calc`, and an exposure and field-of-view planner for astrophotography.
5. **Shared accessibility and SEO checks across tools:** a common `<head>` helper so every tool has a title,
   description and canonical URL, validated by the SEO Meta Tag Checker itself.

## Definition of done: in progress to active

A tool is **active** when all of these are true.

- It has its own route and Worker, and the routing contract tests pass.
- It uses the brand layer and looks right at 375 px and at desktop width.
- Its calculations are covered by tests, or checked against a published reference (see `hohmann-transfer/test/reference`).
- Estimators say plainly that they are estimates, and give the assumptions in a "how this works" section.
- Labels, errors and results work with a keyboard and a screen reader (no information carried by colour alone).
- Its `tech` list in `tools.ts` is correct and its README says how to run it.

Current in-progress tools and what is missing:

| Tool | Missing |
| --- | --- |
| `home-energy-baseline` | Automated tests for the emissions and benchmark maths (the page already cites its sources; check they are current) |
| `habit-streak` | Automated tests for streak and weekly-summary logic, including month and clock-change boundaries |
| `context-switcher` | Brand layer migration, a correct Vite base path, and a decision on whether it belongs on a public tools site |

## Decisions needed

1. Brand: should the tools follow `brand.css` as it is, or be re-based on the main site's `global.css` and the future
   shared UI package? (Affects Next item 2.)
2. Ports: permanent per tool, or generated alphabetically? (Now item 6.)
3. Astronomy Calculator and Optics Visualiser: keep both or merge? (Next item 6.)
4. Light pollution data: is a bundled model good enough long term, or should it use measured data from a
   licensed source? That needs a licence check and possibly a small API Worker.
