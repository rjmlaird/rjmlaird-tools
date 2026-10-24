# physical-limits-visualiser

Visual companion to `physical-limits`: presets (Earth, Jupiter, Sun, Sagittarius A*, a stellar black hole) or custom
mass, radius, parent mass, orbital distance and satellite density; the four limits; a logarithmic nested-radii
diagram; and an energy diagram showing where a radial launch at a chosen speed turns back or escapes. Vanilla JS +
Vite, served at `tools.rjmlaird.co.uk/physical-limits-visualiser`.

Changes from the earlier prototype: the "launcher" is now an exact energy calculation (turning point or speed at
infinity) rather than an arbitrary animation, and the Sun preset's parent mass is the approximate Milky Way mass
inside the Sun's orbit rather than the mass of Sgr A* alone. **The preset values are approximate; check them before
quoting any result.**

```sh
pnpm --filter @rjmlaird/physical-limits-visualiser dev      # Vite dev server
pnpm --filter @rjmlaird/physical-limits-visualiser preview  # build, then wrangler dev on :8805
```
