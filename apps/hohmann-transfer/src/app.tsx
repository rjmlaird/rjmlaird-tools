import { Hono } from "hono";
import type { Env } from "./env";
import { Page } from "./page";
import { errorBody } from "./routes/errors";
import { hohmannRoutes } from "./routes/hohmann";

export function createApp() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/", (c) => c.html(<Page />));

  app.get("/api/v1", (c) =>
    c.json({
      name: "Hohmann transfer calculator",
      description:
        "Delta-v and transfer time for an ideal two-impulse Hohmann transfer between two circular, coplanar orbits around one body.",
      endpoints: {
        health: "GET /health",
        bodies: "GET /api/v1/bodies",
        calculate: "POST /api/v1/hohmann",
      },
    }),
  );

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.route("/api/v1", hohmannRoutes);

  // Any other method on the calculator endpoint.
  app.all("/api/v1/hohmann", (c) => {
    c.header("Allow", "POST");
    return c.json(errorBody("method_not_allowed", "Use POST for this endpoint."), 405);
  });

  app.notFound((c) => c.json(errorBody("not_found", "No such endpoint."), 404));

  app.onError((error, c) => {
    console.error(error);
    return c.json(errorBody("internal_error", "Unexpected error."), 500);
  });

  return app;
}
