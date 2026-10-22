import { Hono } from "hono";
import { calculate, inputFromQuery, InputError } from "./lib/optics";
import { Page } from "./page";

// strict:false makes /astro-calc and /astro-calc/ equivalent.
const app = new Hono({ strict: false }).basePath("/astro-calc");

app.get("/", (c) => c.html(<Page />));
app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/optics", (c) => {
  try {
    return c.json(calculate(inputFromQuery(c.req.query())));
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
