# chilli-heat-scale

Chilli Heat Scale Explorer: a Scoville slider with a logarithmic mapping, 14 peppers, a compare mode, a three-question
"find my heat level" quiz, a recipe dose calculator and a copyable summary. Vanilla JavaScript + Vite, served at
`tools.rjmlaird.co.uk/chilli-heat-scale`. No network requests, storage, cookies or third-party scripts.

```sh
pnpm --filter @rjmlaird/chilli-heat-scale dev      # Vite dev server
pnpm --filter @rjmlaird/chilli-heat-scale preview  # build, then wrangler dev on :8827
```

## Files

- `index.html`: markup for the four tabs and the shared summary panel (brand bar copied from `optics-visualiser`).
- `src/main.js`: data, maths and behaviour. The top of the file holds the pepper data and the commented
  logarithmic mapping, quiz scoring and dose calculation.
- `src/tool.css`: tool-specific styles on top of `@rjmlaird/ui/brand.css`.

## Editing pepper data

Add or edit an object in the `PEPPERS` array in `src/main.js`. `lo` and `hi` are the published range in SHU;
the representative value is the rounded midpoint unless you set `median` explicitly. `podG` is a typical fresh pod
weight in grams, used only for the "about N pods" hint in the calculator (omit it to hide the hint).
Heat categories, filters, markers, the list, search, compare and calculator all derive from this array.

## Embedding

Embed the page in an article with an iframe. It is responsive from 320 px and sets its own height, so give the
iframe a generous minimum height:

```html
<iframe src="https://tools.rjmlaird.co.uk/chilli-heat-scale/" title="Chilli Heat Scale Explorer"
        width="100%" height="1100" loading="lazy" style="border:0;max-width:100%"></iframe>
```

Open a specific tab with a hash: `#explore`, `#compare`, `#quiz` or `#calculator`.

## Caveats the tool states on the page

SHU measures capsaicinoid concentration, not perceived spiciness; ranges vary by cultivar, growing conditions and
sample. The quiz is a self-reported guide, not a physiological measure. The calculator is an approximation that
assumes the pepper's representative value is evenly distributed through the finished sauce.
