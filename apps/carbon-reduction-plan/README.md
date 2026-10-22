# carbon-reduction-plan

PPN 006 aligned Carbon Reduction Plan builder (Scope 1, 2 and 3), React + Vite, served at
`tools.rjmlaird.co.uk/carbon-reduction-plan` by an assets-only Worker.

```sh
pnpm --filter @rjmlaird/carbon-reduction-plan dev      # Vite dev server
pnpm --filter @rjmlaird/carbon-reduction-plan preview  # build, then wrangler dev on :8794
```
The page chrome (brand bar, footer) uses `@rjmlaird/ui/brand.css`; the plan itself is a light,
printable document, so the app body keeps its own colours.
