import { Hono } from "hono";
import { convert, InputError, type InputFormat } from "./lib/convert";
import { Page } from "./page";

const FORMATS = ["auto", "latlon", "bng", "gridref", "webmercator"];

// strict:false makes /coordinate-converter and /coordinate-converter/ equivalent.
const app = new Hono({ strict: false }).basePath("/coordinate-converter");

app.get("/", (c) => c.html(<Page />));
app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/convert", (c) => {
  const input = c.req.query("input");
  const format = c.req.query("format") ?? "auto";
  if (input === undefined || input.trim() === "") return c.json({ error: "Missing required parameter: input" }, 400);
  if (input.length > 200) return c.json({ error: "input is too long" }, 400);
  if (!FORMATS.includes(format)) return c.json({ error: `format must be one of ${FORMATS.join(", ")}` }, 400);
  try {
    return c.json(convert(input, format as InputFormat));
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
