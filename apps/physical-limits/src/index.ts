import { Hono } from "hono";
import type { Context } from "hono";
import { escapeVelocity, hillSphere, rocheLimit, schwarzschildRadius } from "./physics";
import { page } from "./ui";

class InputError extends Error {}

/** Read a required numeric query parameter. Accepts plain or scientific notation (e.g. 5.972e24). */
function num(c: Context, name: string, opts: { allowZero?: boolean; max?: number } = {}): number {
  const raw = c.req.query(name);
  if (raw === undefined || raw.trim() === "") throw new InputError(`Missing required parameter: ${name}`);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new InputError(`${name} must be a number`);
  if (opts.allowZero ? value < 0 : value <= 0) {
    throw new InputError(`${name} must be ${opts.allowZero ? "zero or greater" : "greater than zero"}`);
  }
  if (opts.max !== undefined && value >= opts.max) throw new InputError(`${name} must be less than ${opts.max}`);
  return value;
}

const app = new Hono();

app.get("/", (c) => c.html(page));

app.get("/api", (c) =>
  c.json({
    units: "SI (kg, m, kg/m^3, seconds). Scientific notation such as 5.972e24 is accepted.",
    endpoints: {
      "GET /api/escape-velocity": ["mass", "radius"],
      "GET /api/hill-sphere": ["primary_mass", "secondary_mass", "semi_major_axis", "eccentricity (optional, 0 to <1)"],
      "GET /api/roche-limit": ["primary_mass", "primary_radius", "satellite_density"],
      "GET /api/schwarzschild-radius": ["mass"],
    },
  }),
);

app.get("/api/escape-velocity", (c) =>
  c.json(escapeVelocity(num(c, "mass"), num(c, "radius"))),
);

app.get("/api/hill-sphere", (c) => {
  const e = c.req.query("eccentricity") ? num(c, "eccentricity", { allowZero: true, max: 1 }) : 0;
  return c.json(hillSphere(num(c, "primary_mass"), num(c, "secondary_mass"), num(c, "semi_major_axis"), e));
});

app.get("/api/roche-limit", (c) =>
  c.json(rocheLimit(num(c, "primary_mass"), num(c, "primary_radius"), num(c, "satellite_density"))),
);

app.get("/api/schwarzschild-radius", (c) => c.json(schwarzschildRadius(num(c, "mass"))));

app.onError((err, c) => {
  if (err instanceof InputError) return c.json({ error: err.message }, 400);
  console.error(err);
  return c.json({ error: "Internal error" }, 500);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
