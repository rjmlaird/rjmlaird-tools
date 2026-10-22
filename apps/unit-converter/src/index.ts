import { Hono } from "hono";
import { convertRoutes } from "./routes/convert";
import { pageRoute } from "./routes/index";

// strict:false makes /unit-converter and /unit-converter/ equivalent.
const app = new Hono({ strict: false }).basePath("/unit-converter");

app.route("/", pageRoute);
app.route("/", convertRoutes);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal error" }, 500);
});

export default app;
