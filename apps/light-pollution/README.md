# light-pollution

Estimates sky brightness (SQM) and Bortle class for a UK postcode, place name, coordinates or device location,
with observing guidance and the towns contributing most of the glow. Vanilla JS + Vite, served at
`tools.rjmlaird.co.uk/light-pollution` by an assets-only Worker.

It is a **model, not a measurement**: `src/model.js` sums the glow from the settlements in `src/places.js`
(population and distance, in the shape of Walker's law) and converts it to SQM and Bortle. The fit was tuned
against about twenty approximate UK sky-brightness figures, so expect to be within about one Bortle class.
To improve it, add settlements to `places.js` or re-fit the constants at the top of `model.js`.

The only network request is a postcode lookup to postcodes.io; everything else runs in the browser.

```sh
pnpm --filter @rjmlaird/light-pollution dev      # Vite dev server
pnpm --filter @rjmlaird/light-pollution preview  # build, then wrangler dev on :8816
```
