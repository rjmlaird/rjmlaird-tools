# home-energy-baseline

Household energy baseline: electricity (kWh, monthly spend or meter readings) and heating (gas, oil, LPG, heat pump
or direct electric) give annual emissions, an illustrative bill and a comparison with Ofgem typical domestic
consumption values. Tabs for inputs, benchmark, energy-flow diagram and a retrofit table whose combined scenario
accounts for overlap between measures. JSON export/import, print layout, and `localStorage`
(`rjmlaird-home-energy-v1`; the earlier prototype's `uk_home_energy_state` is read once if present).
Vanilla JS + Vite, served at `tools.rjmlaird.co.uk/home-energy-baseline`. Charts are inline SVG (no Chart.js).

All constants live in the `M` object and `MEASURES` array at the top of `src/main.js`. They were carried over from
the original prototype (which attributed them to DESNZ 2025/26 and Ofgem) and **have not been verified against the
published tables**; tariffs are illustrative. Check them before the tool is used for reporting.

```sh
pnpm --filter @rjmlaird/home-energy-baseline dev      # Vite dev server
pnpm --filter @rjmlaird/home-energy-baseline preview  # build, then wrangler dev on :8802
```
