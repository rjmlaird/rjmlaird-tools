# meta-tag-checker

Meta tag checker and generator: length checks for the title and description, canonical, social image and
robots checks, search-result and social-card previews, and copyable `<head>` tags. Vanilla JS + Vite, served at
`tools.rjmlaird.co.uk/meta-tag-checker` by an assets-only Worker. Nothing is sent anywhere; the only network
request is the browser loading the social image URL you type, for the preview.

```sh
pnpm --filter @rjmlaird/meta-tag-checker dev      # Vite dev server
pnpm --filter @rjmlaird/meta-tag-checker preview  # build, then wrangler dev on :8798
```
