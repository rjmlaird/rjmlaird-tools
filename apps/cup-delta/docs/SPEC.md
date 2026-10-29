# Cup Delta: MVP spec

A private, offline-first coffee tasting and brew-experiment tool. Core loop:
**Taste → select descriptors → add brew context → diagnosis → one controlled change → compare the next cup.**

This repository is the working MVP. This document records what was built, the assumptions made, and what is left out.

## Assumptions

- **No build step.** Plain HTML, CSS and ES modules. It runs from any static host and from `npx serve`. No framework, no dependencies at runtime.
- **System fonts only.** Offline-first means no font downloads.
- **Rules, not ML.** Every diagnosis is a sum of named evidence. Thresholds live in `js/rules.js`.
- **One coffee = name + roaster** (case-insensitive). Cups with the same pair are grouped and can be compared.
- **Grind setting is free text** because grinders differ. If it parses as a number, Cup Delta can suggest a specific next setting. A setting in Data flips whether a higher number is coarser or finer.
- **"Changes" and "comparisons" are derived, not stored.** They are recomputed from the stored cups, so they cannot go stale. A cup keeps `basedOn` (the cup it was brewed after).
- **Only brew method is required** to save a cup.

## User stories and acceptance criteria

| # | Story | Acceptance |
|---|---|---|
| 1 | Log a quick cup in under a minute | Method, a few tapped notes and four ratings are enough. Brew details are collapsed by default. Saving without a method shows an inline error and focuses the control. |
| 2 | Pick flavours by family, sub-family and note | 9 families, 28 sub-families, 81 notes. Works by mouse, touch and keyboard (arrows move through tabs; Tab then Space/Enter toggles a note). Picked notes appear as removable chips with a count. Selected state shows a tick as well as colour. Search finds a note from anywhere. |
| 3 | Record brew context | Coffee, roaster, origin, variety, process, roast level, roast date, days after roast (auto from roast date), method, dose, water, live ratio, grind, grind feel, temperature, time (m:ss or seconds), grinder, filter, water profile, note. All optional but method. |
| 4 | Rate the cup | Four five-step scales (clearable) and a 1–5 preference. |
| 5 | Get a diagnosis | Title, confidence (low/medium/high, in words and pips), evidence list, one next change, expected trade-off. Covers under-extraction, over-extraction, stale, roast-driven, process/fermentation, mixed signals and insufficient data. |
| 6 | Try one change | "Brew the next cup" opens the form with only the suggested field changed and highlighted; everything else is copied. |
| 7 | Compare two cups | Pick coffee, Cup A, Cup B. Shows changed variables with deltas, rating movement, notes added or removed, and a plain-English reading. Several simultaneous changes are reported as such, not blamed on one. |
| 8 | Mark best so far | One per coffee. Toggle on the cup page and the compare page. |
| 9 | Own my data | JSON export (download plus copy fallback), import with merge or replace and a preview, delete all with confirmation. Imports are sanitised. |
| 10 | Install and use offline | Web manifest, icons (including maskable), cache-first service worker with full precache. |

## Data model (`js/schema.js`)

```
Coffee   { id, name, roaster, origin, variety, process, roastLevel, roastDate, createdAt }
Tasting  { id, coffeeId, createdAt, basedOn|null, best,
           brew: { method, dose, water, grind, grindFeel, temp, time(s), beanAge(days),
                   grinder, filter, waterProfile },
           descriptors: [descriptorId],
           ratings: { sourBitter, body, clean, love }   // each -2..+2 or null
           preference: 1..5 | null, note }
Settings { higherCoarser, lastMethod }
Change   (derived)  diffBrew(a, b) → [{ key, label, from, to, delta, lever, phrase }]
Compare  (derived)  { changes, levers, sensory, notes, overall, interpretation }
Export   { app: "cup-delta", schema: 1, exportedAt, coffees, tastings, settings }
```

Storage: IndexedDB (`coffees`, `tastings`, `settings`), falling back to localStorage, then memory with a visible warning.

## Components and pages

```
index.html                 shell: skip link, header, tab nav, main, live region
js/app.js                  hash router, focus management, service worker registration
js/ui/taste.js             quick-log form, brew details disclosure, "next cup" prefill
js/ui/flavour.js           three-level picker + search + chips
js/ui/controls.js          segmented radios, fields, confidence meter, scale readout
js/ui/cup.js               diagnosis, evidence, next change, cup record, delete
js/ui/cups.js              list grouped by coffee, empty state that teaches the loop
js/ui/compare.js           pickers, changes table, ratings table, interpretation
js/ui/data.js              privacy statement, settings, export/import, delete all
js/ui/dom.js               h() builder (text nodes only), roving keyboard focus
```

## Diagnosis logic

`js/rules.js` holds the data; `js/diagnosis.js` applies it. Summary:

```
score(rule) = Σ evidence points
  sensory:  Sour↔Bitter ±2 → 2.5, ±1 → 1.5 · body ±2 → 1.5, ±1 → 1 · each matching note 0.75–1.5 (capped)
  brew:     time outside the method's usual range → 1.5 · grind feel → 1 · temperature outside range → 1
  age:      ≥ 42 days with stale notes or a low rating → 2.5 · ≥ 28 days with stale notes → 1.2
  roast:    dark → 2, medium-dark → 1.2 · smoky/ashy notes in a light roast → −1.5
  process:  natural/honey/anaerobic → 2 · fermented notes 1.5 each · 2+ fruit notes → +1

report a rule only if score ≥ 3
under AND over both ≥ 3 → "mixed signals" (low confidence), advise technique not recipe
confidence: high = score ≥ 6.5 and 2+ kinds of evidence; medium = ≥ 4 and 2+ kinds, or ≥ 5 alone; else low
nothing reaches 3 → "not enough to name a cause", ask for a repeat brew
```

Next-change choice: under-extraction and over-extraction pick the lever that the evidence points at (temperature if only the water is off, time for immersion methods if only time is off, otherwise grind). The suggestion is always **one** change of a fixed size (one grind step, 2 °C, 30 s, 3 °C for roast-driven notes).

Example output: *Likely under-extracted. Your cup reads sour and thin, with a short brew time and a relatively coarse grind. Next change: grind one step finer (setting 20 → 19), keeping every other variable the same. Expected result: more sweetness and body; watch for increased bitterness and drying.*

## File structure

```
cup-delta/
  index.html  manifest.webmanifest  sw.js
  css/styles.css
  icons/            icon.svg, icon-192.png, icon-512.png, icon-maskable-512.png
  js/               app, util, taxonomy, scales, rules, diagnosis, compare, schema, store
  js/ui/            dom, controls, flavour, taste, cup, cups, compare, data
  tests/engine.test.mjs
  docs/SPEC.md
```

## Milestones (as built)

1. Taxonomy, scales, rules config, util
2. Diagnosis engine + tests
3. Compare engine + tests
4. Storage, schema, export/import sanitising
5. Taste screen with flavour picker and brew details
6. Cup, Cups, Compare and Data screens
7. PWA (manifest, icons, service worker) and accessibility pass

## Testing checklist

Automated (`node --test tests/engine.test.mjs`, 18 tests): taxonomy size and ids, rule ids exist, duration parsing, each diagnosis case, grind direction flip, insufficient data, mixed signals, compare cases, service-worker precache list matches the files.

Browser run (Playwright, 400 px wide): required method, keyboard tab navigation, chips add/remove, ratio, diagnosis text, next-cup prefill, inline comparison, best-so-far, compare tables, no horizontal scroll, JSON export, delete all, bad import rejected, merge import, HTML in imported text stays text, unknown descriptors dropped, **reload while offline**, zero external requests, zero console errors.

Still to check by hand on real devices:
- [ ] Install from Chrome (Android/desktop) and Safari (Add to Home Screen); launch from the icon in airplane mode
- [ ] Screen reader pass (VoiceOver, TalkBack, NVDA): flavour tabs, radio groups, chips, live region on screen change
- [ ] 200% browser zoom and 320 px width
- [ ] Windows High Contrast / forced colours
- [ ] Import a file exported from another device; very large export (hundreds of cups)
- [ ] Private browsing (memory fallback banner shows)

## Not in MVP

Palate fingerprinting across many cups · blind A/B tasting · roaster embeds and shareable cards · shared class mode · timer and pour guide · bean inventory · per-method custom ranges · multi-step experiment plans · sync across devices (would need an opt-in backend) · charts over time · localisation and imperial units.

## Flavour list attribution

The vocabulary and picker are original to Cup Delta. They are inspired by the general idea of public coffee-tasting frameworks but do not copy or adapt the SCA/WCR Coffee Taster's Flavor Wheel artwork or its exact taxonomy. The same notice appears in the app.
