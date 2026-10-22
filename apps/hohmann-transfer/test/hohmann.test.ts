import { describe, expect, it } from "vitest";
import { computeHohmann, HohmannRangeError } from "../src/orbital/hohmann";

/**
 * Reference values come from test/reference/hohmann_reference.py: Python 3 + mpmath at 50 digits,
 * using closed-form expressions (vt1 = v1*sqrt(2 r2/(r1+r2)), vt2 = v2*sqrt(2 r1/(r1+r2)),
 * T = pi*sqrt(a^3/mu)) rather than the vis-viva form used in production. Inputs:
 *  - Earth: GM = 398600.435507 km^3/s^2 (JPL DE440), r1 = 6678.137 km (300 km altitude above
 *    the 6378.137 km equatorial radius), r2 = 42164.169 km (geostationary radius).
 *  - Sun: GM = 132712440041.279419 km^3/s^2 (JPL DE440), r1 = 1 au = 149597870.7 km,
 *    r2 = 1.523679 au (approximate Mars semi-major axis).
 */
const EARTH_MU = 398600.435507;
const LEO = 6678.137;
const GEO = 42164.169;
const SUN_MU = 132712440041.279419;
const AU_KM = 149597870.7;
const MARS_R = 227939134.0303053; // 1.523679 au in km

function close(actual: number, expected: number, relative = 1e-12): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * relative);
}

describe("Earth orbit raising, LEO (300 km) to GEO", () => {
  const r = computeHohmann({ mu: EARTH_MU, initialRadius: LEO, finalRadius: GEO });

  it("matches the independent reference values", () => {
    expect(r.transferType).toBe("raise");
    close(r.transferSemiMajorAxis, 24421.153);
    close(r.circularSpeed.initial, 7.7257601710909904);
    close(r.circularSpeed.final, 3.0746600980001575);
    close(r.transferSpeed.atInitialRadius, 10.151492842547345);
    close(r.transferSpeed.atFinalRadius, 1.6078357896025557);
  });

  it("gives burn magnitudes and total delta-v", () => {
    close(r.burns.first.deltaV, 2.4257326714563545);
    close(r.burns.second.deltaV, 1.4668243083976018);
    close(r.totalDeltaV, 3.8925569798539565);
    expect(r.totalDeltaV).toBe(r.burns.first.deltaV + r.burns.second.deltaV);
  });

  it("signs both burns prograde when raising", () => {
    expect(r.burns.first.signedDeltaV).toBeGreaterThan(0);
    expect(r.burns.second.signedDeltaV).toBeGreaterThan(0);
    expect(r.burns.first.signedDeltaV).toBe(r.burns.first.deltaV);
  });

  it("gives the transfer time in seconds, hours and days", () => {
    close(r.transferTime.seconds, 18990.230450519593);
    close(r.transferTime.hours, 5.27506401403322);
    close(r.transferTime.days, 0.21979433391805084);
    expect(r.transferTime.hours).toBe(r.transferTime.seconds / 3600);
    expect(r.transferTime.days).toBe(r.transferTime.seconds / 86400);
  });
});

describe("Earth orbit lowering, GEO to LEO", () => {
  const r = computeHohmann({ mu: EARTH_MU, initialRadius: GEO, finalRadius: LEO });

  it("matches the independent reference values", () => {
    expect(r.transferType).toBe("lower");
    close(r.burns.first.deltaV, 1.4668243083976018);
    close(r.burns.second.deltaV, 2.4257326714563545);
    close(r.totalDeltaV, 3.8925569798539565);
    close(r.transferTime.seconds, 18990.230450519593);
  });

  it("signs both burns retrograde and keeps magnitudes positive", () => {
    expect(r.burns.first.signedDeltaV).toBeLessThan(0);
    expect(r.burns.second.signedDeltaV).toBeLessThan(0);
    expect(r.burns.first.deltaV).toBeGreaterThan(0);
    expect(r.burns.second.deltaV).toBeGreaterThan(0);
    close(r.burns.first.signedDeltaV, -1.4668243083976018);
  });

  it("mirrors the raising transfer: burns swap places, total and time are equal", () => {
    const up = computeHohmann({ mu: EARTH_MU, initialRadius: LEO, finalRadius: GEO });
    close(r.burns.first.deltaV, up.burns.second.deltaV);
    close(r.burns.second.deltaV, up.burns.first.deltaV);
    close(r.totalDeltaV, up.totalDeltaV);
    close(r.transferTime.seconds, up.transferTime.seconds);
  });
});

describe("heliocentric transfer, Earth to Mars", () => {
  it("matches the reference and the commonly quoted figures", () => {
    const r = computeHohmann({ mu: SUN_MU, initialRadius: AU_KM, finalRadius: MARS_R });
    close(r.burns.first.deltaV, 2.944689256382633);
    close(r.burns.second.deltaV, 2.6488952292183203);
    close(r.transferTime.days, 258.8657588951053);
    // Widely quoted textbook values for an idealised Earth-Mars transfer: about 259 days, with
    // heliocentric delta-v of roughly 2.9 and 2.6 km/s. These are loose sanity checks only.
    expect(r.transferTime.days).toBeGreaterThan(255);
    expect(r.transferTime.days).toBeLessThan(262);
    expect(r.burns.first.deltaV).toBeGreaterThan(2.8);
    expect(r.burns.first.deltaV).toBeLessThan(3.1);
  });
});

describe("units", () => {
  it("returns km/s for mu in km^3/s^2 and radii in km (first cosmic velocity ~7.905 km/s)", () => {
    const r = computeHohmann({ mu: EARTH_MU, initialRadius: 6378.137, finalRadius: 7000 });
    // Circular speed at Earth's equatorial radius is the well-known ~7.9 km/s.
    expect(r.circularSpeed.initial).toBeCloseTo(7.905, 2);
  });

  it("is consistent under a change of units (m^3/s^2 and m give m/s and seconds)", () => {
    const km = computeHohmann({ mu: EARTH_MU, initialRadius: LEO, finalRadius: GEO });
    const m = computeHohmann({ mu: EARTH_MU * 1e9, initialRadius: LEO * 1e3, finalRadius: GEO * 1e3 });
    close(m.totalDeltaV, km.totalDeltaV * 1e3, 1e-12);
    close(m.transferTime.seconds, km.transferTime.seconds, 1e-12);
  });
});

describe("equal radii policy", () => {
  const r = computeHohmann({ mu: EARTH_MU, initialRadius: GEO, finalRadius: GEO });

  it("returns zero delta-v and zero transfer time", () => {
    expect(r.transferType).toBe("none");
    expect(r.burns.first).toEqual({ deltaV: 0, signedDeltaV: 0 });
    expect(r.burns.second).toEqual({ deltaV: 0, signedDeltaV: 0 });
    expect(r.totalDeltaV).toBe(0);
    expect(r.transferTime).toEqual({ seconds: 0, hours: 0, days: 0 });
  });

  it("still reports the orbit's circular speed", () => {
    close(r.circularSpeed.initial, 3.0746600980001575);
    expect(r.transferSpeed.atInitialRadius).toBe(r.circularSpeed.initial);
    expect(r.transferSemiMajorAxis).toBe(GEO);
  });

  it("is continuous: radii differing by one part in 1e9 give a tiny but positive delta-v", () => {
    const near = computeHohmann({ mu: EARTH_MU, initialRadius: GEO, finalRadius: GEO * (1 + 1e-9) });
    expect(near.transferType).toBe("raise");
    expect(near.totalDeltaV).toBeGreaterThan(0);
    expect(near.totalDeltaV).toBeLessThan(1e-6);
  });
});

describe("invalid inputs", () => {
  const ok = { mu: EARTH_MU, initialRadius: LEO, finalRadius: GEO };
  const bad: [string, Partial<typeof ok>][] = [
    ["zero mu", { mu: 0 }],
    ["negative mu", { mu: -1 }],
    ["NaN mu", { mu: Number.NaN }],
    ["infinite mu", { mu: Number.POSITIVE_INFINITY }],
    ["zero initial radius", { initialRadius: 0 }],
    ["negative initial radius", { initialRadius: -5 }],
    ["NaN final radius", { finalRadius: Number.NaN }],
    ["infinite final radius", { finalRadius: Number.POSITIVE_INFINITY }],
    ["missing mu", { mu: undefined }],
    ["string radius", { finalRadius: "42164" as unknown as number }],
  ];

  it.each(bad)("throws HohmannRangeError for %s", (_label, override) => {
    expect(() => computeHohmann({ ...ok, ...override })).toThrow(HohmannRangeError);
  });

  it("throws when the result overflows a double", () => {
    expect(() => computeHohmann({ mu: 1e-300, initialRadius: 1e150, finalRadius: 2e150 })).toThrow(HohmannRangeError);
  });
});
