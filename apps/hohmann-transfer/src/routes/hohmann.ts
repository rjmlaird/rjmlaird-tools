import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { BODIES, MU_UNIT } from "../data/bodies";
import type { Env } from "../env";
import { computeHohmann, HohmannRangeError, type HohmannResult } from "../orbital/hohmann";
import { errorBody } from "./errors";
import { parseHohmannRequest, type ParsedHohmannRequest } from "./validation";

const MAX_BODY_BYTES = 4 * 1024;

export const UNITS = {
  mu: MU_UNIT,
  radius: "km",
  speed: "km/s",
  time: { seconds: "s", hours: "h", days: "d" },
} as const;

export interface HohmannResponse extends HohmannResult {
  input: ParsedHohmannRequest;
  units: typeof UNITS;
}

export const hohmannRoutes = new Hono<{ Bindings: Env }>();

hohmannRoutes.get("/bodies", (c) =>
  c.json({
    unit: MU_UNIT,
    bodies: BODIES.map(({ id, name, mu, source }) => ({ id, name, mu, source })),
  }),
);

hohmannRoutes.post(
  "/hohmann",
  bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) =>
      c.json(errorBody("payload_too_large", `Request body must be at most ${MAX_BODY_BYTES} bytes.`), 413),
  }),
  async (c) => {
    const contentType = c.req.header("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return c.json(errorBody("unsupported_media_type", "Content-Type must be application/json."), 415);
    }

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json(errorBody("invalid_json", "Request body is not valid JSON."), 400);
    }

    const parsed = parseHohmannRequest(raw);
    if (!parsed.ok) {
      return c.json(errorBody("validation_error", "Request validation failed.", parsed.errors), 422);
    }

    try {
      const result = computeHohmann(parsed.value);
      const response: HohmannResponse = { input: parsed.value, units: UNITS, ...result };
      return c.json(response);
    } catch (error) {
      if (error instanceof HohmannRangeError) {
        return c.json(
          errorBody("result_not_representable", "These inputs give results too large to represent."),
          422,
        );
      }
      throw error;
    }
  },
);
