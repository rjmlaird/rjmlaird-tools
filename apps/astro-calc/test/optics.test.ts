import { describe, expect, it } from "vitest";
import app from "../src/index";
import { calculate, inputFromQuery, InputError, limitingMagnitude } from "../src/lib/optics";

describe("optics", () => {
  const scope = { aperture: 200, focalLength: 1200 };

  it("computes magnification, exit pupil and focal ratio", () => {
    const r = calculate({ ...scope, eyepiece: 25 });
    expect(r.focalRatio).toBeCloseTo(6, 10);
    expect(r.eyepieceResults?.magnification).toBeCloseTo(48, 10);
    expect(r.eyepieceResults?.exitPupilMm).toBeCloseTo(200 / 48, 10);
    expect(r.eyepieceResults?.exitPupilMm).toBeCloseTo(25 / 6, 10); // eyepiece FL / focal ratio
  });

  it("computes true field of view", () => {
    const r = calculate({ ...scope, eyepiece: 25, apparentFov: 52 });
    expect(r.eyepieceResults?.trueFovDeg).toBeCloseTo(52 / 48, 10);
    expect(r.eyepieceResults?.trueFovArcmin).toBeCloseTo((52 / 48) * 60, 8);
  });

  it("gives telescope limits", () => {
    const { limits } = calculate(scope);
    expect(limits.minMagnification).toBeCloseTo(200 / 7, 10);
    expect(limits.maxUsefulMagnification).toBe(400);
    expect(limits.lightGrasp).toBeCloseTo((200 / 7) ** 2, 8);
    expect(limits.dawesLimitArcsec).toBeCloseTo(0.58, 10);
    expect(limits.rayleighLimitArcsec).toBeCloseTo(0.69, 10);
  });

  it("limiting magnitude equals NELM at 7 mm and gains 5 mag per 10x aperture", () => {
    expect(limitingMagnitude(7, 6)).toBeCloseTo(6, 10);
    expect(limitingMagnitude(70, 6)).toBeCloseTo(11, 10);
  });

  it("rejects bad input", () => {
    expect(() => calculate({ aperture: 0, focalLength: 1000 })).toThrow(InputError);
    expect(() => calculate({ aperture: 100, focalLength: -1 })).toThrow(InputError);
    expect(() => calculate({ ...scope, eyepiece: 0 })).toThrow(InputError);
    expect(() => calculate({ ...scope, nelm: 12 })).toThrow(InputError);
    expect(() => calculate({ ...scope, apparentFov: 52 })).toThrow(/eyepiece/);
    expect(() => calculate({ ...scope, eyepiece: 10, apparentFov: 180 })).toThrow(InputError);
  });

  it("parses query records, treating blanks as absent", () => {
    const q = inputFromQuery({ aperture: "200", focalLength: "1200", eyepiece: "", nelm: "5.5" });
    expect(q).toMatchObject({ aperture: 200, focalLength: 1200, nelm: 5.5 });
    expect(q.eyepiece).toBeUndefined();
    expect(() => inputFromQuery({ focalLength: "1" })).toThrow(/aperture/);
    expect(() => inputFromQuery({ aperture: "x", focalLength: "1" })).toThrow(/number/);
  });
});

describe("worker", () => {
  it("serves the page at /astro-calc and /astro-calc/", async () => {
    for (const p of ["/astro-calc", "/astro-calc/"]) {
      const res = await app.request(p);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
    }
  });

  it("serves the API and returns 400 for bad input", async () => {
    const ok = await app.request("/astro-calc/api/optics?aperture=200&focalLength=1200&eyepiece=25&apparentFov=52");
    expect(ok.status).toBe(200);
    const j = (await ok.json()) as { eyepieceResults: { magnification: number } };
    expect(j.eyepieceResults.magnification).toBeCloseTo(48, 8);
    const bad = await app.request("/astro-calc/api/optics?aperture=-5&focalLength=1200");
    expect(bad.status).toBe(400);
  });
});
