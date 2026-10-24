# orbit-simulator

Animated two-body (Keplerian) orbit: central-body presets or custom gravitational parameter, semi-major axis and
eccentricity, solved with Kepler's equation each frame, plus the closed-form orbital quantities. Companion to
`orbital-calc` (numbers and a JSON API). Respects `prefers-reduced-motion` (starts paused). Vanilla JS + Vite, served at
`tools.rjmlaird.co.uk/orbit-simulator`.

The animation runs at a rate that completes one orbit in about 20 seconds regardless of the real period; the
telemetry shows true values.

```sh
pnpm --filter @rjmlaird/orbit-simulator dev      # Vite dev server
pnpm --filter @rjmlaird/orbit-simulator preview  # build, then wrangler dev on :8804
```
