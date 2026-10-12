import { Hono } from "hono";
import { IndexPage } from "./page";

const app = new Hono();

app.get("/", (c) => {
  c.header("cache-control", "public, max-age=300");
  return c.html(<IndexPage />);
});

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0b0f1a"/><circle cx="16" cy="16" r="9" fill="none" stroke="#00c2a8" stroke-width="2"/><circle cx="25" cy="16" r="2.5" fill="#f5a623"/></svg>`;
app.get("/favicon.svg", (c) =>
  c.body(favicon, 200, {
    "content-type": "image/svg+xml",
    "cache-control": "public, max-age=86400",
  }),
);

app.notFound((c) => c.text("Not found. See https://tools.rjmlaird.co.uk for available tools.", 404));

export default app;
