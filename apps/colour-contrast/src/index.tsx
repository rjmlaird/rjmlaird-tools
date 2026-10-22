import { Hono } from "hono";
import { check, InputError } from "./lib/contrast";
import { Page } from "./page";

// strict:false makes /colour-contrast and /colour-contrast/ equivalent.
const app = new Hono({ strict: false }).basePath("/colour-contrast");

app.get("/", (c) => c.html(<Page />));
app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/check", (c) => {
  const fg = c.req.query("fg");
  const bg = c.req.query("bg");
  if (!fg || !bg) return c.json({ error: "Missing required parameters: fg and bg" }, 400);
  if (fg.length > 60 || bg.length > 60) return c.json({ error: "Colour value is too long" }, 400);
  try {
    return c.json(check(fg, bg));
  } catch (err) {
    if (err instanceof InputError) return c.json({ error: err.message }, 400);
    throw err;
  }
});

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal error" }, 500);
});

export default app;
