/**
 * Standard gravitational parameters (mu = GM) of common Solar System bodies, for the optional
 * `body` selector. Units: km^3/s^2.
 *
 * Sources (retrieved 2026-10-12):
 *  - [DE440]  JPL Solar System Dynamics, "Astrodynamic Parameters",
 *             https://ssd.jpl.nasa.gov/astro_par.html, from the JPL planetary ephemeris DE440
 *             (Park et al. 2021, AJ 161:105). Used for the Sun, Mercury, Venus, Earth, Moon, Mars.
 *             Sun: 1.32712440041279419e20 m^3/s^2 = 132712440041.279419 km^3/s^2.
 *             Mars is the "Mars system" value, which includes Phobos and Deimos.
 *  - [SATPAR] JPL SSD "Planetary Satellite Physical Parameters",
 *             https://ssd.jpl.nasa.gov/sats/phys_par/sep.html, planet GM excluding satellites
 *             (JUP365, SAT441, URA111, NEP097). Used for the four giant planets, so the value
 *             suits orbits close to the planet.
 *
 * These are best-estimate values as published by JPL, not authoritative constants: they are
 * revised from time to time, and published GM values are in TDB-compatible units (differences
 * from SI-second units are of order 1e-8 relative, immaterial here). Check the sources for
 * current values before relying on them. For any other body, pass `mu` directly.
 */

export const MU_UNIT = "km^3/s^2";

export interface Body {
  id: string;
  name: string;
  /** km^3/s^2 */
  mu: number;
  source: string;
}

const DE440 = "JPL DE440 (https://ssd.jpl.nasa.gov/astro_par.html)";
const SATPAR = "JPL SSD planetary satellite physical parameters (planet GM, https://ssd.jpl.nasa.gov/sats/phys_par/sep.html)";

export const BODIES: readonly Body[] = [
  { id: "sun", name: "Sun", mu: 132712440041.279419, source: DE440 },
  { id: "mercury", name: "Mercury", mu: 22031.868551, source: DE440 },
  { id: "venus", name: "Venus", mu: 324858.592, source: DE440 },
  { id: "earth", name: "Earth", mu: 398600.435507, source: DE440 },
  { id: "moon", name: "Moon", mu: 4902.800118, source: DE440 },
  { id: "mars", name: "Mars (system)", mu: 42828.375816, source: DE440 },
  { id: "jupiter", name: "Jupiter", mu: 126686531.9, source: SATPAR },
  { id: "saturn", name: "Saturn", mu: 37931206.23, source: SATPAR },
  { id: "uranus", name: "Uranus", mu: 5793951.3, source: SATPAR },
  { id: "neptune", name: "Neptune", mu: 6835099.97, source: SATPAR },
];

export function findBody(id: string): Body | undefined {
  return BODIES.find((body) => body.id === id);
}
