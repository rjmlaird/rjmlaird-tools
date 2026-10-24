# flight-emissions

Modelled flight emissions: great-circle distance (+8% routing uplift) x a haul-band factor x cabin multiplier x
passengers, with optional non-CO2 (radiative forcing) uplift and a sustainable-aviation-fuel (SAF) reduction.
Includes an airport combobox (23 built-in airports or custom coordinates), a great-circle route diagram (SVG),
equivalences and mitigation notes. State is kept in the URL (`?o=LHR&d=JFK&trip=round&cabin=business&pax=2&rf=1&saf=20`)
so results are bookmarkable. Vanilla JS + Vite, served at `tools.rjmlaird.co.uk/flight-emissions`.

All model constants live in the `MODEL` object at the top of `src/main.js`. They were carried over from the original
prototype, which attributed them to DEFRA/DESNZ and ICAO 2024 factors; **they have not been verified against the
published tables**. Check them before the tool is used for reporting.

```sh
pnpm --filter @rjmlaird/flight-emissions dev      # Vite dev server
pnpm --filter @rjmlaird/flight-emissions preview  # build, then wrangler dev on :8801
```
