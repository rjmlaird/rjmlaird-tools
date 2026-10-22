import { Hono } from "hono";
import { calculateRoute } from "./routes/calculate";
import { pageRoute } from "./routes/index";

// Mounted under /orbital-calc so it matches the production route path.
// strict:false makes /orbital-calc and /orbital-calc/ equivalent.
const app = new Hono({ strict: false }).basePath("/orbital-calc");

app.route("/", pageRoute);
app.route("/calculate", calculateRoute);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal error" }, 500);
});

export default app;
