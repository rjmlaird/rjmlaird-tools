/**
 * WGS84 <-> British National Grid (OSGB36) and Web Mercator.
 *
 * WGS84 -> OSGB36 uses the standard 7-parameter Helmert transformation, then the OS Transverse
 * Mercator projection on the Airy 1830 ellipsoid. This is accurate to roughly 5 m across Great
 * Britain; the official OSTN15 grid-shift model (about 0.1 m) is not included.
 */

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

interface Ellipsoid {
  a: number;
  b: number;
}
const WGS84: Ellipsoid = { a: 6378137, b: 6356752.314245 };
const AIRY1830: Ellipsoid = { a: 6377563.396, b: 6356256.909 };

/** Helmert parameters for WGS84 -> OSGB36: translations (m), scale (ppm), rotations (arcseconds). */
const WGS84_TO_OSGB36 = { tx: -446.448, ty: 125.157, tz: -542.06, s: 20.4894, rx: -0.1502, ry: -0.247, rz: -0.8421 };

function toCartesian(latDeg: number, lonDeg: number, e: Ellipsoid): [number, number, number] {
  const phi = rad(latDeg);
  const lam = rad(lonDeg);
  const e2 = 1 - (e.b * e.b) / (e.a * e.a);
  const nu = e.a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  return [nu * Math.cos(phi) * Math.cos(lam), nu * Math.cos(phi) * Math.sin(lam), nu * (1 - e2) * Math.sin(phi)];
}

function toGeodetic(x: number, y: number, z: number, e: Ellipsoid): { lat: number; lon: number } {
  const e2 = 1 - (e.b * e.b) / (e.a * e.a);
  const p = Math.hypot(x, y);
  let phi = Math.atan2(z, p * (1 - e2));
  for (let i = 0; i < 10; i++) {
    const nu = e.a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
    const next = Math.atan2(z + e2 * nu * Math.sin(phi), p);
    if (Math.abs(next - phi) < 1e-14) {
      phi = next;
      break;
    }
    phi = next;
  }
  return { lat: deg(phi), lon: deg(Math.atan2(y, x)) };
}

function helmert(v: [number, number, number], inverse: boolean): [number, number, number] {
  const k = inverse ? -1 : 1;
  const p = WGS84_TO_OSGB36;
  const s1 = (k * p.s) / 1e6 + 1;
  const arc = Math.PI / (180 * 3600);
  const rx = k * p.rx * arc;
  const ry = k * p.ry * arc;
  const rz = k * p.rz * arc;
  const [x, y, z] = v;
  return [
    k * p.tx + x * s1 - y * rz + z * ry,
    k * p.ty + x * rz + y * s1 - z * rx,
    k * p.tz - x * ry + y * rx + z * s1,
  ];
}

export function wgs84ToOsgb36(lat: number, lon: number): { lat: number; lon: number } {
  const [x, y, z] = helmert(toCartesian(lat, lon, WGS84), false);
  return toGeodetic(x, y, z, AIRY1830);
}

export function osgb36ToWgs84(lat: number, lon: number): { lat: number; lon: number } {
  const [x, y, z] = helmert(toCartesian(lat, lon, AIRY1830), true);
  return toGeodetic(x, y, z, WGS84);
}

// National Grid Transverse Mercator constants.
const F0 = 0.9996012717;
const PHI0 = rad(49);
const LAM0 = rad(-2);
const N0 = -100000;
const E0 = 400000;

function meridionalArc(phi: number): number {
  const { a, b } = AIRY1830;
  const n = (a - b) / (a + b);
  const n2 = n * n;
  const n3 = n2 * n;
  const dp = phi - PHI0;
  const sp = phi + PHI0;
  const Ma = (1 + n + (5 / 4) * n2 + (5 / 4) * n3) * dp;
  const Mb = (3 * n + 3 * n2 + (21 / 8) * n3) * Math.sin(dp) * Math.cos(sp);
  const Mc = ((15 / 8) * n2 + (15 / 8) * n3) * Math.sin(2 * dp) * Math.cos(2 * sp);
  const Md = (35 / 24) * n3 * Math.sin(3 * dp) * Math.cos(3 * sp);
  return b * F0 * (Ma - Mb + Mc - Md);
}

/** Project OSGB36 (Airy 1830) latitude/longitude in degrees to National Grid easting/northing in metres. */
export function osgb36ToGrid(latDeg: number, lonDeg: number): { easting: number; northing: number } {
  const { a, b } = AIRY1830;
  const e2 = 1 - (b * b) / (a * a);
  const phi = rad(latDeg);
  const sin = Math.sin(phi);
  const cos = Math.cos(phi);
  const tan = Math.tan(phi);
  const nu = (a * F0) / Math.sqrt(1 - e2 * sin * sin);
  const rho = (a * F0 * (1 - e2)) / Math.pow(1 - e2 * sin * sin, 1.5);
  const eta2 = nu / rho - 1;
  const t2 = tan * tan;
  const t4 = t2 * t2;
  const I = meridionalArc(phi) + N0;
  const II = (nu / 2) * sin * cos;
  const III = (nu / 24) * sin * cos ** 3 * (5 - t2 + 9 * eta2);
  const IIIA = (nu / 720) * sin * cos ** 5 * (61 - 58 * t2 + t4);
  const IV = nu * cos;
  const V = (nu / 6) * cos ** 3 * (nu / rho - t2);
  const VI = (nu / 120) * cos ** 5 * (5 - 18 * t2 + t4 + 14 * eta2 - 58 * t2 * eta2);
  const dl = rad(lonDeg) - LAM0;
  return {
    northing: I + II * dl ** 2 + III * dl ** 4 + IIIA * dl ** 6,
    easting: E0 + IV * dl + V * dl ** 3 + VI * dl ** 5,
  };
}

/** Inverse of osgb36ToGrid. */
export function gridToOsgb36(easting: number, northing: number): { lat: number; lon: number } {
  const { a, b } = AIRY1830;
  const e2 = 1 - (b * b) / (a * a);
  let phi = PHI0 + (northing - N0) / (a * F0);
  let M = 0;
  for (let i = 0; i < 100; i++) {
    phi += (northing - N0 - M) / (a * F0);
    M = meridionalArc(phi);
    if (Math.abs(northing - N0 - M) < 1e-5) break;
  }
  const sin = Math.sin(phi);
  const cos = Math.cos(phi);
  const tan = Math.tan(phi);
  const sec = 1 / cos;
  const nu = (a * F0) / Math.sqrt(1 - e2 * sin * sin);
  const rho = (a * F0 * (1 - e2)) / Math.pow(1 - e2 * sin * sin, 1.5);
  const eta2 = nu / rho - 1;
  const t2 = tan * tan;
  const t4 = t2 * t2;
  const t6 = t4 * t2;
  const VII = tan / (2 * rho * nu);
  const VIII = (tan / (24 * rho * nu ** 3)) * (5 + 3 * t2 + eta2 - 9 * t2 * eta2);
  const IX = (tan / (720 * rho * nu ** 5)) * (61 + 90 * t2 + 45 * t4);
  const X = sec / nu;
  const XI = (sec / (6 * nu ** 3)) * (nu / rho + 2 * t2);
  const XII = (sec / (120 * nu ** 5)) * (5 + 28 * t2 + 24 * t4);
  const XIIA = (sec / (5040 * nu ** 7)) * (61 + 662 * t2 + 1320 * t4 + 720 * t6);
  const dE = easting - E0;
  return {
    lat: deg(phi - VII * dE ** 2 + VIII * dE ** 4 - IX * dE ** 6),
    lon: deg(LAM0 + X * dE - XI * dE ** 3 + XII * dE ** 5 - XIIA * dE ** 7),
  };
}

export const BNG_LIMITS = { minE: 0, maxE: 700000, minN: 0, maxN: 1300000 };

export function inBngArea(easting: number, northing: number): boolean {
  return easting >= 0 && easting < 700000 && northing >= 0 && northing < 1300000;
}

export function wgs84ToBng(lat: number, lon: number): { easting: number; northing: number } {
  const o = wgs84ToOsgb36(lat, lon);
  return osgb36ToGrid(o.lat, o.lon);
}

export function bngToWgs84(easting: number, northing: number): { lat: number; lon: number } {
  const o = gridToOsgb36(easting, northing);
  return osgb36ToWgs84(o.lat, o.lon);
}


/** Format as a grid reference such as "TQ 30 80" (digits = total digits, even, 0 to 16), truncated not rounded. */
export function toGridRef(easting: number, northing: number, digits = 10): string {
  if (!inBngArea(easting, northing)) throw new RangeError("Outside the British National Grid area");
  if (digits % 2 !== 0 || digits < 0 || digits > 16) throw new RangeError("digits must be even, 0 to 16");
  const e100 = Math.floor(easting / 100000);
  const n100 = Math.floor(northing / 100000);
  let l1 = 19 - n100 - ((19 - n100) % 5) + Math.floor((e100 + 10) / 5);
  let l2 = ((19 - n100) * 5) % 25 + (e100 % 5);
  if (l1 > 7) l1++;
  if (l2 > 7) l2++;
  const letters = String.fromCharCode(l1 + 65, l2 + 65);
  const half = digits / 2;
  const pad = (v: number) => String(Math.floor(v % 100000)).padStart(5, "0").slice(0, half);
  return half === 0 ? letters : `${letters} ${pad(easting)} ${pad(northing)}`;
}

/** Parse "TQ 30 80", "TQ3080", "TQ 12345 67890" into the south-west corner easting/northing. */
export function fromGridRef(ref: string): { easting: number; northing: number; precisionM: number } {
  const m = /^([A-Za-z]{2})\s*((?:\d\s*){0,16})$/.exec(ref.trim());
  if (!m) throw new RangeError("Not a valid grid reference");
  const letters = m[1]!.toUpperCase();
  const digits = m[2]!.replace(/\s+/g, "");
  if (digits.length % 2 !== 0) {
    // Allow "TQ 30 80" or "TQ3080" but not an odd number of digits.
    const parts = m[2]!.trim().split(/\s+/);
    if (!(parts.length === 2 && parts[0]!.length === parts[1]!.length)) {
      throw new RangeError("Grid reference needs the same number of digits for easting and northing");
    }
  }
  let l1 = letters.charCodeAt(0) - 65;
  let l2 = letters.charCodeAt(1) - 65;
  if (letters.includes("I")) throw new RangeError("Grid squares never use the letter I");
  if (l1 > 7) l1--;
  if (l2 > 7) l2--;
  const e100 = ((l1 - 2) % 5) * 5 + (l2 % 5);
  const n100 = 19 - Math.floor(l1 / 5) * 5 - Math.floor(l2 / 5);
  if (e100 < 0 || e100 > 6 || n100 < 0 || n100 > 12) throw new RangeError("Grid square is outside Great Britain");
  const half = digits.length / 2;
  const e = half === 0 ? "" : digits.slice(0, half);
  const n = half === 0 ? "" : digits.slice(half);
  return {
    easting: e100 * 100000 + Number(e.padEnd(5, "0")),
    northing: n100 * 100000 + Number(n.padEnd(5, "0")),
    precisionM: 10 ** (5 - half),
  };
}

const MERC_R = 6378137;
const MERC_MAX_LAT = 85.0511287798;

export function wgs84ToWebMercator(lat: number, lon: number): { x: number; y: number } {
  if (Math.abs(lat) > MERC_MAX_LAT) throw new RangeError(`Web Mercator is defined only for latitudes within ±${MERC_MAX_LAT.toFixed(2)}°`);
  return { x: MERC_R * rad(lon), y: MERC_R * Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2)) };
}

export function webMercatorToWgs84(x: number, y: number): { lat: number; lon: number } {
  return { lat: deg(2 * Math.atan(Math.exp(y / MERC_R)) - Math.PI / 2), lon: deg(x / MERC_R) };
}
