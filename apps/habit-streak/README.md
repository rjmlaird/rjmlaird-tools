# habit-streak

Habit tracker: daily check-ins for the last seven days, current and best streaks (with a one-day grace window
for today), 30-day rate, progress against a weekly target, an eight-week heatmap, JSON export/import and demo
data. All data lives in `localStorage` (`rjmlaird-habit-streak-v1`; data from the earlier prototype's
`habit_tracker_data_v1` key is read once if present). Vanilla JS + Vite, served at
`tools.rjmlaird.co.uk/habit-streak`.

```sh
pnpm --filter @rjmlaird/habit-streak dev      # Vite dev server
pnpm --filter @rjmlaird/habit-streak preview  # build, then wrangler dev on :8800
```
