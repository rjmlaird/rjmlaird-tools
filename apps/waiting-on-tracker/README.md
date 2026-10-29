# waiting-on-tracker

A private "what am I waiting on, and what needs a nudge today?" list. Add items with an optional person, category,
dates and priority; the page groups them into Needs a nudge today, Waiting, Recently resolved and Archive, with
nudge, snooze, resolve, reopen, edit, delete (with undo), search and filters. Calm mode shows only title, status and
the next action. Vanilla JavaScript + Vite, served at `tools.rjmlaird.co.uk/waiting-on-tracker`.

```sh
pnpm --filter @rjmlaird/waiting-on-tracker dev      # Vite dev server
pnpm --filter @rjmlaird/waiting-on-tracker preview  # build, then wrangler dev on :8828
```

## Data and privacy

Everything stays in the browser. Items are stored in `localStorage` under `waitingOnTracker.v1` (settings under
`waitingOnTracker.v1.settings`). There are no network requests. Export and import use a plain JSON file; imports are
validated strictly and nothing changes until the user confirms. If saved data cannot be read, a raw backup copy is
kept in the same browser before anything is overwritten.

Dates are plain `YYYY-MM-DD` strings in the local calendar and are never converted through time zones. The data
model and the pure date and status logic are documented at the top of `src/main.js`. Open the page with `#selftest`
to run a few console assertions, and use `window.WaitingOn.core` from the console to try the pure functions.

## Files

- `index.html`: brand bar, intro and markup.
- `src/main.js`: data model, logic and rendering (ported unchanged in behaviour from the standalone version).
- `src/tool.css`: tool styles on top of `@rjmlaird/ui/brand.css`, including Calm mode, which swaps the teal and amber
  accents for a neutral slate.
