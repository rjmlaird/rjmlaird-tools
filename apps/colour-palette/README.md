# colour-palette

Accessible palette builder and checker: editable swatches, a pairwise WCAG 2.1 contrast matrix (AAA 7:1, AA 4.5:1,
large text and UI components 3:1), approximate colour-vision-deficiency simulation, a UI preview with contrast
readouts and CSS-variable export. Vanilla JS + Vite, served at `tools.rjmlaird.co.uk/colour-palette`. Runs entirely
in the browser. The default palette is the rjmlaird brand palette.

```sh
pnpm --filter @rjmlaird/colour-palette dev      # Vite dev server
pnpm --filter @rjmlaird/colour-palette preview  # build, then wrangler dev on :8799
```

Related: `colour-contrast` checks a single pair with fix suggestions.
