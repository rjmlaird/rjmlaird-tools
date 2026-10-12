import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeVelocity, hillSphere, rocheLimit, schwarzschildRadius } from "./physics.ts";

const near = (actual: number, expected: number, tol: number) =>
  assert.ok(Math.abs(actual - expected) / expected < tol, `${actual} not within ${tol * 100}% of ${expected}`);

test("Earth escape velocity is about 11.19 km/s", () => {
  near(escapeVelocity(5.972e24, 6.371e6).velocityKmS, 11.186, 0.005);
});
test("Sun Schwarzschild radius is about 2.95 km", () => {
  near(schwarzschildRadius(1.989e30).radiusKm, 2.953, 0.005);
});
test("Earth Hill sphere is about 1.5 million km", () => {
  near(hillSphere(1.989e30, 5.972e24, 1.496e11).radiusKm, 1.4710e6, 0.02);
});
test("Eccentricity shrinks the Hill sphere", () => {
  assert.ok(hillSphere(1.989e30, 5.972e24, 1.496e11, 0.3).radiusM < hillSphere(1.989e30, 5.972e24, 1.496e11).radiusM);
});
test("Earth fluid Roche limit for Moon-density satellite is about 18,000 km", () => {
  near(rocheLimit(5.972e24, 6.371e6, 3344).fluidKm, 18400, 0.03);
});
test("Escape velocity reaches c at the Schwarzschild radius", () => {
  const m = 1.989e30;
  const rs = schwarzschildRadius(m).radiusM;
  near(escapeVelocity(m, rs).fractionOfLightSpeed, 1, 1e-9);
  assert.equal(escapeVelocity(m, rs * 0.999).exceedsLightSpeed, true);
  assert.equal(escapeVelocity(m, rs * 1.001).exceedsLightSpeed, false);
});
