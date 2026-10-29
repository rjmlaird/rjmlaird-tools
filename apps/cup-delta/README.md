# Cup Delta

A private, offline-first coffee tasting and brew-experiment tool. No account, no analytics, no tracking, no network calls.

**Run it**

```
npx serve .          # or any static file server; service workers need http(s), not file://
```

Open the printed address. Use the browser's Install option to add it to your home screen.

**Test it**

```
node --test tests/engine.test.mjs
```

**Deploy** by copying the folder to any static host. When you change a file, bump `VERSION` in `sw.js` so installed copies refresh.

See `docs/SPEC.md` for scope, data model, diagnosis rules and the testing checklist.
