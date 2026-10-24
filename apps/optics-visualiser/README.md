# optics-visualiser

Telescope optics explorer: sliders for aperture, focal length, eyepiece focal length and apparent field of view, a
metrics list and a schematic SVG ray diagram. Companion to `astro-calc` (which has the fuller set of outputs and
a JSON API). Vanilla JS + Vite, served at `tools.rjmlaird.co.uk/optics-visualiser`.

```sh
pnpm --filter @rjmlaird/optics-visualiser dev      # Vite dev server
pnpm --filter @rjmlaird/optics-visualiser preview  # build, then wrangler dev on :8803
```
