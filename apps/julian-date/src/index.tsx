import { brandCss } from "@rjmlaird/ui";
import { Hono } from "hono";
import { ConversionError, convertFromParams } from "./lib/astro-time";
import { BASE, Page } from "./page";
import { PAGE_JS } from "./ui";

// Strict CSP: no inline script or style. Fonts come from Google Fonts (the brand typefaces).
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// strict:false makes /julian-date and /julian-date/ equivalent.
const app = new Hono({ strict: false }).basePath(BASE);

app.use("*", async (c, next) => {
  await next();
  c.header("Content-Security-Policy", CSP);
  c.header("X-Content-Type-Options", "nosniff");
});

app.get("/", (c) => c.html(<Page />));

app.get("/style.css", (c) =>
  c.body(brandCss, 200, { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=3600" }),
);
app.get("/app.js", (c) =>
  c.body(PAGE_JS, 200, {
    "content-type": "text/javascript; charset=utf-8",
    "cache-control": "public, max-age=3600",
  }),
);

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/convert", (c) => {
  const params = c.req.query();
  try {
    const result = convertFromParams(params);
    // "now" changes every call; explicit inputs are deterministic and safe to cache.
    c.header("cache-control", params.now !== undefined ? "no-store" : "public, max-age=3600");
    return c.json(result);
  } catch (err) {
    if (err instanceof ConversionError) return c.json({ error: err.message }, 400);
    throw err;
  }
});

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal error" }, 500);
});

export default app;
