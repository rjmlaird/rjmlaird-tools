/* eslint-disable @typescript-eslint/no-explicit-any */
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { normaliseBasePath, stripBasePath } from "../src/index";

const ORIGIN = "https://tools.example";

function post(body: unknown, init: { path?: string; contentType?: string; raw?: string } = {}) {
  return SELF.fetch(`${ORIGIN}${init.path ?? "/api/v1/hohmann"}`, {
    method: "POST",
    headers: { "content-type": init.contentType ?? "application/json" },
    body: init.raw ?? JSON.stringify(body),
  });
}

const good = { mu: 398600.435507, initialRadius: 6678.137, finalRadius: 42164.169 };

describe("GET endpoints", () => {
  it("GET /health", async () => {
    const res = await SELF.fetch(`${ORIGIN}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("GET /api/v1 describes the service", async () => {
    const res = await SELF.fetch(`${ORIGIN}/api/v1`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ endpoints: { calculate: "POST /api/v1/hohmann" } });
  });

  it("GET /api/v1/bodies lists bodies with mu and a source", async () => {
    const res = await SELF.fetch(`${ORIGIN}/api/v1/bodies`);
    const data = (await res.json()) as { unit: string; bodies: { id: string; mu: number; source: string }[] };
    expect(res.status).toBe(200);
    expect(data.unit).toBe("km^3/s^2");
    expect(data.bodies.find((b) => b.id === "earth")?.mu).toBe(398600.435507);
    expect(data.bodies.every((b) => b.source.length > 0)).toBe(true);
  });

  it("GET / serves the HTML page", async () => {
    const res = await SELF.fetch(`${ORIGIN}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("returns a JSON 404 for unknown paths", async () => {
    const res = await SELF.fetch(`${ORIGIN}/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not_found", message: "No such endpoint." } });
  });

  it("returns 405 with Allow: POST for GET /api/v1/hohmann", async () => {
    const res = await SELF.fetch(`${ORIGIN}/api/v1/hohmann`);
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("method_not_allowed");
  });
});

describe("POST /api/v1/hohmann success", () => {
  it("returns inputs, units and results with the documented shape", async () => {
    const res = await post(good);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const data = (await res.json()) as Record<string, any>;

    expect(data.input).toEqual({ body: null, ...good });
    expect(data.units).toEqual({
      mu: "km^3/s^2",
      radius: "km",
      speed: "km/s",
      time: { seconds: "s", hours: "h", days: "d" },
    });
    expect(data.transferType).toBe("raise");
    expect(data.transferSemiMajorAxis).toBeCloseTo(24421.153, 9);
    expect(Object.keys(data.circularSpeed).sort()).toEqual(["final", "initial"]);
    expect(Object.keys(data.transferSpeed).sort()).toEqual(["atFinalRadius", "atInitialRadius"]);
    expect(Object.keys(data.burns.first).sort()).toEqual(["deltaV", "signedDeltaV"]);
    expect(Object.keys(data.transferTime).sort()).toEqual(["days", "hours", "seconds"]);
    // Full precision on the wire: compare to the mpmath reference (test/reference).
    expect(Math.abs(data.totalDeltaV - 3.8925569798539565)).toBeLessThan(1e-11);
    expect(Math.abs(data.transferTime.hours - 5.27506401403322)).toBeLessThan(1e-11);
  });

  it("accepts a named body in place of mu", async () => {
    const res = await post({ body: "earth", initialRadius: 6678.137, finalRadius: 42164.169 });
    const data = (await res.json()) as Record<string, any>;
    expect(res.status).toBe(200);
    expect(data.input).toEqual({ body: "earth", ...good });
  });

  it("handles a lowering transfer", async () => {
    const res = await post({ ...good, initialRadius: good.finalRadius, finalRadius: good.initialRadius });
    const data = (await res.json()) as Record<string, any>;
    expect(data.transferType).toBe("lower");
    expect(data.burns.first.signedDeltaV).toBeLessThan(0);
    expect(data.burns.first.deltaV).toBeGreaterThan(0);
  });

  it("applies the equal-radii policy", async () => {
    const res = await post({ ...good, finalRadius: good.initialRadius });
    const data = (await res.json()) as Record<string, any>;
    expect(res.status).toBe(200);
    expect(data.transferType).toBe("none");
    expect(data.totalDeltaV).toBe(0);
    expect(data.transferTime).toEqual({ seconds: 0, hours: 0, days: 0 });
  });
});

describe("POST /api/v1/hohmann errors", () => {
  it("422 with field-specific errors for bad values", async () => {
    const res = await post({ mu: -5, initialRadius: 0, finalRadius: "far" });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      error: {
        code: "validation_error",
        message: "Request validation failed.",
        fields: [
          { field: "mu", code: "not_positive", message: "'mu' must be greater than zero." },
          { field: "initialRadius", code: "not_positive", message: "'initialRadius' must be greater than zero." },
          { field: "finalRadius", code: "invalid_type", message: "'finalRadius' must be a number." },
        ],
      },
    });
  });

  it("422 for missing fields", async () => {
    const res = await post({});
    const data = (await res.json()) as { error: { fields: { field: string; code: string }[] } };
    expect(res.status).toBe(422);
    expect(data.error.fields.map((f) => `${f.field}:${f.code}`)).toEqual([
      "mu:required",
      "initialRadius:required",
      "finalRadius:required",
    ]);
  });

  it("422 for a non-finite number (1e999 parses to Infinity)", async () => {
    const res = await post(null, { raw: '{"mu":1e999,"initialRadius":1,"finalRadius":2}' });
    const data = (await res.json()) as { error: { fields: { field: string; code: string }[] } };
    expect(res.status).toBe(422);
    expect(data.error.fields).toEqual([expect.objectContaining({ field: "mu", code: "not_finite" })]);
  });

  it("422 when the result overflows", async () => {
    const res = await post({ mu: 1e-300, initialRadius: 1e150, finalRadius: 2e150 });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("result_not_representable");
  });

  it("400 for malformed JSON", async () => {
    const res = await post(null, { raw: '{"mu": 398600,' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("invalid_json");
  });

  it("400 for a bare NaN token, which is not JSON", async () => {
    const res = await post(null, { raw: '{"mu":NaN,"initialRadius":1,"finalRadius":2}' });
    expect(res.status).toBe(400);
  });

  it("415 for a non-JSON content type", async () => {
    const res = await post(null, { raw: "mu=1", contentType: "text/plain" });
    expect(res.status).toBe(415);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("unsupported_media_type");
  });

  it("413 for an oversized body", async () => {
    const res = await post(null, { raw: JSON.stringify({ ...good, pad: "x".repeat(5000) }) });
    expect(res.status).toBe(413);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("payload_too_large");
  });
});

describe("base path", () => {
  it("serves the API with and without the BASE_PATH prefix", async () => {
    for (const prefix of ["", "/hohmann-transfer"]) {
      const health = await SELF.fetch(`${ORIGIN}${prefix}/health`);
      expect(health.status).toBe(200);
      const res = await post(good, { path: `${prefix}/api/v1/hohmann` });
      expect(res.status).toBe(200);
    }
    const root = await SELF.fetch(`${ORIGIN}/hohmann-transfer`);
    expect(root.status).toBe(200);
  });

  it("does not strip look-alike prefixes", async () => {
    const res = await SELF.fetch(`${ORIGIN}/hohmann-transferX/health`);
    expect(res.status).toBe(404);
  });

  it("normalises and strips prefixes", () => {
    expect(normaliseBasePath(undefined)).toBe("");
    expect(normaliseBasePath("/")).toBe("");
    expect(normaliseBasePath("tools/x/")).toBe("/tools/x");
    const stripped = stripBasePath(new Request("https://a.example/x/health?y=1"), "/x");
    expect(new URL(stripped.url).pathname).toBe("/health");
    expect(new URL(stripped.url).search).toBe("?y=1");
  });
});
