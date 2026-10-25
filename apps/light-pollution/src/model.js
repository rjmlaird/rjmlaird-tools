// Sky-glow model. A modelled estimate from settlement size and distance, not a measurement.
//
// Each settlement adds artificial light in proportion to population^A, falling off as distance^-2.5
// (the exponent in Walker's law, the classic empirical fit for city skyglow). Distance is softened by a
// length that grows with the settlement's size, so standing inside a town does not give an infinite value.
// Contributions are summed and compared with the natural night sky.
//
// A, and the softening length, were fitted to about twenty approximate UK sky-brightness figures (city
// centres, suburbs, and dark-sky sites such as Kielder and Galloway). Typical error is a few tenths of a
// magnitude, which is one Bortle class, and larger in places the settlement list does not capture.
import { PLACES } from "./places.js";

export const NATURAL_SQM = 21.9; // mag/arcsec² at the zenith under a natural, moonless sky
const BASELINE = 1.05; // diffuse glow that reaches even the remotest UK site
const A = 0.883; // population exponent (damps the largest conurbations)
const K = 0.01; // Walker's constant, with population in persons
const SOFTEN_BASE_KM = 1.12; // softening length: base, plus a term that grows with (population / 10,000)^0.3
const SOFTEN_SCALE_KM = 1.04;
const MAX_KM = 250;

const toRad = (d) => (d * Math.PI) / 180;

export function distanceKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function bearingDeg(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

const POINTS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
export const compass = (deg) => POINTS[Math.round(deg / 45) % 8];

/** Inside the UK and its near neighbours; the model has nothing useful to say beyond this box. */
export function inRange(lat, lon) {
  return lat >= 49.8 && lat <= 61 && lon >= -8.8 && lon <= 2.0;
}

// Upper edge of each Bortle class in SQM (brighter sky = lower number). Class 1 is above the last edge.
const EDGES = [
  [9, 17.8], [8, 18.38], [7, 18.94], [6, 19.5], [5, 20.49], [4, 21.25], [3, 21.69], [2, 21.89],
];

export function bortleFromSqm(sqm) {
  for (const [cls, edge] of EDGES) if (sqm < edge) return cls;
  return 1;
}

/** Naked-eye limiting magnitude from sky brightness (Schaefer's relation used with SQM readings). */
export function nelmFromSqm(sqm) {
  return 7.93 - 5 * Math.log10(10 ** (4.316 - sqm / 5) + 1);
}

export function estimate(lat, lon, places = PLACES) {
  const parts = [];
  let glow = 0;
  for (const p of places) {
    const d = distanceKm(lat, lon, p.lat, p.lon);
    if (d > MAX_KM) continue;
    const soften = SOFTEN_BASE_KM + SOFTEN_SCALE_KM * (p.pop / 10000) ** 0.3;
    const dEff = Math.sqrt(d * d + soften * soften);
    const c = K * p.pop ** A * dEff ** -2.5;
    glow += c;
    parts.push({ name: p.name, km: d, bearing: bearingDeg(lat, lon, p.lat, p.lon), c });
  }
  const total = BASELINE + glow;
  const sqm = NATURAL_SQM - 2.5 * Math.log10(total);
  parts.sort((a, b) => b.c - a.c);
  const top = parts.slice(0, 3).map((p) => ({ ...p, share: (p.c / glow) * 100 }));
  return { sqm, bortle: bortleFromSqm(sqm), nelm: nelmFromSqm(sqm), ratio: total, top, glow };
}
