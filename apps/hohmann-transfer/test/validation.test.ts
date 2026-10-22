import { describe, expect, it } from "vitest";
import { BODIES, findBody } from "../src/data/bodies";
import { parseHohmannRequest } from "../src/routes/validation";

const good = { mu: 398600.435507, initialRadius: 6678.137, finalRadius: 42164.169 };

function errorsFor(input: unknown) {
  const result = parseHohmannRequest(input);
  if (result.ok) throw new Error("expected validation to fail");
  return result.errors;
}

describe("parseHohmannRequest", () => {
  it("accepts a custom mu", () => {
    expect(parseHohmannRequest(good)).toEqual({ ok: true, value: { body: null, ...good } });
  });

  it("resolves a named body to its mu", () => {
    const earth = findBody("earth");
    const result = parseHohmannRequest({ body: "earth", initialRadius: 7000, finalRadius: 8000 });
    expect(result).toEqual({
      ok: true,
      value: { body: "earth", mu: earth?.mu, initialRadius: 7000, finalRadius: 8000 },
    });
  });

  it.each([null, [], "text", 42, true])("rejects a non-object body: %j", (input) => {
    expect(errorsFor(input)).toEqual([expect.objectContaining({ field: "$", code: "invalid_type" })]);
  });

  it("reports every missing field separately", () => {
    const fields = errorsFor({}).map((e) => [e.field, e.code]);
    expect(fields).toEqual([
      ["mu", "required"],
      ["initialRadius", "required"],
      ["finalRadius", "required"],
    ]);
  });

  it.each([
    ["zero", 0, "not_positive"],
    ["negative", -1, "not_positive"],
    ["infinite (1e999)", Number.POSITIVE_INFINITY, "not_finite"],
    ["a numeric string", "7000", "invalid_type"],
    ["null", null, "invalid_type"],
    ["an object", {}, "invalid_type"],
  ])("rejects %s as a radius", (_label, value, code) => {
    expect(errorsFor({ ...good, initialRadius: value })).toEqual([
      expect.objectContaining({ field: "initialRadius", code }),
    ]);
  });

  it("rejects NaN, which JSON cannot carry but a caller of this function could pass", () => {
    expect(errorsFor({ ...good, mu: Number.NaN })).toEqual([expect.objectContaining({ field: "mu", code: "not_finite" })]);
  });

  it("rejects mu and body together", () => {
    expect(errorsFor({ ...good, body: "earth" })).toEqual([expect.objectContaining({ field: "body", code: "conflict" })]);
  });

  it("rejects an unknown body and a non-string body", () => {
    expect(errorsFor({ body: "vulcan", initialRadius: 1, finalRadius: 2 })).toEqual([
      expect.objectContaining({ field: "body", code: "unknown_body" }),
    ]);
    expect(errorsFor({ body: 5, initialRadius: 1, finalRadius: 2 })).toEqual([
      expect.objectContaining({ field: "body", code: "invalid_type" }),
    ]);
  });

  it("rejects unknown fields", () => {
    expect(errorsFor({ ...good, initialRadious: 1 })).toEqual([
      expect.objectContaining({ field: "initialRadious", code: "unknown_field" }),
    ]);
  });
});

describe("bodies data", () => {
  it("has unique ids and positive, finite mu values", () => {
    const ids = BODIES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const body of BODIES) {
      expect(Number.isFinite(body.mu) && body.mu > 0).toBe(true);
      expect(body.source.length).toBeGreaterThan(0);
    }
  });
});
