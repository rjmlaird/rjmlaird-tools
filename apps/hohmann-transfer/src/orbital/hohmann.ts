/**
 * Ideal two-impulse Hohmann transfer between two circular, coplanar orbits around one body.
 *
 * Pure and framework-independent: no I/O, no rounding. Units are whatever the caller uses
 * consistently; the HTTP layer uses mu in km^3/s^2, radii in km, speeds in km/s, time in s.
 *
 * Model assumptions (and nothing more):
 *  - one central body, described only by its gravitational parameter mu;
 *  - circular initial and final orbits in the same plane;
 *  - instantaneous, tangential impulses;
 *  - a half-ellipse transfer orbit.
 * It does not model launch windows, phasing, ephemerides, finite burns, perturbations,
 * atmospheres or plane changes.
 */

export interface HohmannInput {
  /** Standard gravitational parameter of the central body. */
  mu: number;
  /** Radius of the initial circular orbit, measured from the body's centre. */
  initialRadius: number;
  /** Radius of the final circular orbit, measured from the body's centre. */
  finalRadius: number;
}

export type TransferType = "raise" | "lower" | "none";

export interface Burn {
  /** Magnitude of the velocity change; always >= 0. */
  deltaV: number;
  /**
   * Signed velocity change along the direction of motion: speed after the burn minus speed
   * before it. Positive means prograde (speeding up), negative means retrograde.
   */
  signedDeltaV: number;
}

export interface HohmannResult {
  /** "raise" if finalRadius > initialRadius, "lower" if smaller, "none" if equal. */
  transferType: TransferType;
  /** a = (r1 + r2) / 2 */
  transferSemiMajorAxis: number;
  /** Circular speed sqrt(mu / r) at each orbit. */
  circularSpeed: { initial: number; final: number };
  /** Speed on the transfer ellipse at each burn point. */
  transferSpeed: { atInitialRadius: number; atFinalRadius: number };
  burns: { first: Burn; second: Burn };
  /** Sum of the two burn magnitudes. */
  totalDeltaV: number;
  /** Half the transfer ellipse's period, in seconds, hours and days. */
  transferTime: { seconds: number; hours: number; days: number };
}

/** Thrown for non-positive or non-finite inputs, or when a result overflows a double. */
export class HohmannRangeError extends RangeError {}

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

function assertPositiveFinite(name: string, value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new HohmannRangeError(`${name} must be a positive, finite number`);
  }
}

function timeFromSeconds(seconds: number): HohmannResult["transferTime"] {
  return { seconds, hours: seconds / SECONDS_PER_HOUR, days: seconds / SECONDS_PER_DAY };
}

/**
 * Compute the Hohmann transfer.
 *
 * Equal radii policy: no transfer is needed, so every delta-v and the transfer time are
 * exactly 0 and transferType is "none". (The half-period formula would otherwise return half
 * of the orbit's period, which is not a transfer time.) The transfer "orbit" is the orbit
 * itself, so the transfer speeds equal the circular speed.
 */
export function computeHohmann(input: HohmannInput): HohmannResult {
  const { mu, initialRadius: r1, finalRadius: r2 } = input;
  assertPositiveFinite("mu", mu);
  assertPositiveFinite("initialRadius", r1);
  assertPositiveFinite("finalRadius", r2);

  const circular = { initial: Math.sqrt(mu / r1), final: Math.sqrt(mu / r2) };
  const a = (r1 + r2) / 2;

  let result: HohmannResult;
  if (r1 === r2) {
    result = {
      transferType: "none",
      transferSemiMajorAxis: a,
      circularSpeed: circular,
      transferSpeed: { atInitialRadius: circular.initial, atFinalRadius: circular.final },
      burns: {
        first: { deltaV: 0, signedDeltaV: 0 },
        second: { deltaV: 0, signedDeltaV: 0 },
      },
      totalDeltaV: 0,
      transferTime: timeFromSeconds(0),
    };
  } else {
    // Vis-viva speed on the transfer ellipse at radius r: sqrt(mu * (2/r - 1/a)).
    const transfer = {
      atInitialRadius: Math.sqrt(mu * (2 / r1 - 1 / a)),
      atFinalRadius: Math.sqrt(mu * (2 / r2 - 1 / a)),
    };
    const first = transfer.atInitialRadius - circular.initial; // speed after - speed before
    const second = circular.final - transfer.atFinalRadius;
    result = {
      transferType: r2 > r1 ? "raise" : "lower",
      transferSemiMajorAxis: a,
      circularSpeed: circular,
      transferSpeed: transfer,
      burns: {
        first: { deltaV: Math.abs(first), signedDeltaV: first },
        second: { deltaV: Math.abs(second), signedDeltaV: second },
      },
      totalDeltaV: Math.abs(first) + Math.abs(second),
      transferTime: timeFromSeconds(Math.PI * Math.sqrt((a * a * a) / mu)),
    };
  }

  assertAllFinite(result);
  return result;
}

function assertAllFinite(result: HohmannResult): void {
  const values = [
    result.transferSemiMajorAxis,
    result.circularSpeed.initial,
    result.circularSpeed.final,
    result.transferSpeed.atInitialRadius,
    result.transferSpeed.atFinalRadius,
    result.burns.first.deltaV,
    result.burns.second.deltaV,
    result.totalDeltaV,
    result.transferTime.seconds,
  ];
  if (!values.every(Number.isFinite)) {
    throw new HohmannRangeError("Result is not representable in double precision");
  }
}
