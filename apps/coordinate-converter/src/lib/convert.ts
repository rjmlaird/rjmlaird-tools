import {
  bngToWgs84, fromGridRef, inBngArea, toGridRef, webMercatorToWgs84, wgs84ToBng, wgs84ToWebMercator,
} from "./geo";

export class InputError extends Error {}

export type InputFormat = "auto" | "latlon" | "bng" | "gridref" | "webmercator";

/** Parse one coordinate (decimal, degrees-minutes or degrees-minutes-seconds, with optional hemisphere). */
function parseAngle(text: string, axis: "lat" | "lon"): number {
  const hemi = /[NSEW]/i.exec(text)?.[0]?.toUpperCase();
  if (hemi && (axis === "lat" ? !"NS".includes(hemi) : !"EW".includes(hemi))) {
    throw new InputError(`${hemi} cannot be used for a ${axis === "lat" ? "latitude" : "longitude"}`);
  }
  const nums = text.match(/\d+(?:\.\d+)?|\.\d+/g);
  if (!nums || nums.length > 3) throw new InputError(`Cannot read "${text.trim()}" as a coordinate`);
  const [d, m = "0", s = "0"] = nums;
  if (nums.length > 1 && !Number.isInteger(Number(d))) throw new InputError("Only the last unit may have decimals");
  if (nums.length > 2 && !Number.isInteger(Number(m))) throw new InputError("Only the last unit may have decimals");
  if (Number(m) >= 60 || Number(s) >= 60) throw new InputError("Minutes and seconds must be less than 60");
  let v = Number(d) + Number(m) / 60 + Number(s) / 3600;
  if (/^\s*[-−–]/.test(text) || hemi === "S" || hemi === "W") v = -v;
  const max = axis === "lat" ? 90 : 180;
  if (Math.abs(v) > max) throw new InputError(`${axis === "lat" ? "Latitude" : "Longitude"} must be within ±${max}°`);
  return v;
}

/** Parse "51.5, -0.12", "51°30′26″N 0°07′39″W", "N 51 30.4 W 0 7.6", "51 30 26 N 0 7 39 W". */
export function parseLatLon(input: string): { lat: number; lon: number } {
  const s = input.replace(/[°º′″'"’”]/g, " ").replace(/\s+/g, " ").trim();
  if (!s) throw new InputError("Enter a coordinate");
  if (/[^0-9NSEWnsew\s.,;+\-−–]/.test(s)) throw new InputError(`Cannot read "${input.trim()}" as a latitude and longitude`);
  let a: string;
  let b: string;
  const comma = s.split(/[,;]/);
  if (comma.length === 2) {
    [a, b] = comma as [string, string];
  } else if (comma.length > 2) {
    throw new InputError("Use one comma between latitude and longitude");
  } else {
    const hems = [...s.matchAll(/[NSEW]/gi)];
    if (hems.length === 2) {
      const first = hems[0]!;
      const cut = first.index === 0 || /^\s*$/.test(s.slice(0, first.index)) ? hems[1]!.index! : first.index! + 1;
      a = s.slice(0, cut);
      b = s.slice(cut);
    } else if (hems.length === 0) {
      const nums = s.match(/-?\d+(?:\.\d+)?|-?\.\d+/g) ?? [];
      const per = nums.length / 2;
      if (![1, 2, 3].includes(per) || !Number.isInteger(per)) {
        throw new InputError("Give latitude and longitude, separated by a comma or a space");
      }
      a = nums.slice(0, per).join(" ");
      b = nums.slice(per).join(" ");
    } else {
      throw new InputError("Use one hemisphere letter (N, S, E or W) per coordinate, or none");
    }
  }
  const aHemi = /[NSEW]/i.exec(a)?.[0]?.toUpperCase();
  const swapped = aHemi === "E" || aHemi === "W";
  const lat = parseAngle(swapped ? b : a, "lat");
  const lon = parseAngle(swapped ? a : b, "lon");
  return { lat, lon };
}

function twoNumbers(input: string): [number, number] {
  const nums = input.replace(/[,;]/g, " ").trim().split(/\s+/).map(Number);
  if (nums.length !== 2 || nums.some((n) => !Number.isFinite(n))) {
    throw new InputError("Enter two numbers separated by a comma or a space");
  }
  return [nums[0]!, nums[1]!];
}

export function detectFormat(input: string): Exclude<InputFormat, "auto"> {
  const s = input.trim();
  if (/^[A-Za-z]{2}\s*\d/.test(s) || /^[A-Za-z]{2}$/.test(s)) return "gridref";
  if (/[°NSEWnsew]/.test(s)) return "latlon";
  const nums = s.replace(/[,;]/g, " ").trim().split(/\s+/).map(Number);
  if (nums.length === 2 && nums.every(Number.isFinite)) {
    if (Math.abs(nums[0]!) <= 90 && Math.abs(nums[1]!) <= 180) return "latlon";
    if (nums[0]! >= 0 && nums[0]! < 700000 && nums[1]! >= 0 && nums[1]! < 1300000) return "bng";
    return "webmercator";
  }
  return "latlon";
}

export interface ConvertResult {
  detectedFormat: Exclude<InputFormat, "auto">;
  /** Datum note: latitude/longitude are WGS84 (as used by GPS and web maps). */
  wgs84: { lat: number; lon: number; decimal: string; dms: string; ddm: string };
  bng: null | { easting: number; northing: number; gridRef: string; gridRef8: string; gridRef6: string };
  webMercator: null | { x: number; y: number };
  notes: string[];
}

function pad(n: number, w: number): string {
  return String(n).padStart(w, "0");
}

function formatAxis(v: number, axis: "lat" | "lon", mode: "dms" | "ddm"): string {
  const hemi = axis === "lat" ? (v < 0 ? "S" : "N") : v < 0 ? "W" : "E";
  const abs = Math.abs(v);
  const degW = axis === "lat" ? 2 : 3;
  if (mode === "ddm") {
    let d = Math.floor(abs);
    let m = Math.round((abs - d) * 60 * 1000) / 1000;
    if (m >= 60) { d += 1; m = 0; }
    return `${pad(d, degW)}°${m.toFixed(3).padStart(6, "0")}′${hemi}`;
  }
  const totalTenths = Math.round(abs * 3600 * 10);
  const d = Math.floor(totalTenths / 36000);
  const m = Math.floor((totalTenths % 36000) / 600);
  const s = (totalTenths % 600) / 10;
  return `${pad(d, degW)}°${pad(m, 2)}′${s.toFixed(1).padStart(4, "0")}″${hemi}`;
}

export function convert(input: string, format: InputFormat = "auto"): ConvertResult {
  const notes: string[] = [];
  const fmt = format === "auto" ? detectFormat(input) : format;
  let lat: number;
  let lon: number;

  try {
    if (fmt === "latlon") {
      ({ lat, lon } = parseLatLon(input));
    } else if (fmt === "bng") {
      const [e, n] = twoNumbers(input);
      if (!inBngArea(e, n)) throw new InputError("Easting must be 0 to 700,000 and northing 0 to 1,300,000");
      ({ lat, lon } = bngToWgs84(e, n));
    } else if (fmt === "gridref") {
      const g = fromGridRef(input);
      ({ lat, lon } = bngToWgs84(g.easting, g.northing));
      if (g.precisionM > 1) notes.push(`A grid reference names the south-west corner of a ${g.precisionM} m square.`);
    } else {
      const [x, y] = twoNumbers(input);
      ({ lat, lon } = webMercatorToWgs84(x, y));
      if (Math.abs(lon) > 180 || Math.abs(lat) > 85.06) throw new InputError("Web Mercator coordinates are out of range");
    }
  } catch (e) {
    if (e instanceof RangeError) throw new InputError(e.message);
    throw e;
  }

  const result: ConvertResult = {
    detectedFormat: fmt,
    wgs84: {
      lat,
      lon,
      decimal: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
      dms: `${formatAxis(lat, "lat", "dms")} ${formatAxis(lon, "lon", "dms")}`,
      ddm: `${formatAxis(lat, "lat", "ddm")} ${formatAxis(lon, "lon", "ddm")}`,
    },
    bng: null,
    webMercator: null,
    notes,
  };

  const g = wgs84ToBng(lat, lon);
  if (inBngArea(g.easting, g.northing) && lat > 49 && lat < 62 && lon > -9 && lon < 3) {
    const e = Math.round(g.easting * 100) / 100;
    const n = Math.round(g.northing * 100) / 100;
    result.bng = {
      easting: e,
      northing: n,
      gridRef: toGridRef(e, n, 10),
      gridRef8: toGridRef(e, n, 8),
      gridRef6: toGridRef(e, n, 6),
    };
    notes.push("British National Grid values use a Helmert datum shift: accurate to about 5 m, not survey grade.");
  } else {
    notes.push("This location is outside the British National Grid area.");
  }
  try {
    const m = wgs84ToWebMercator(lat, lon);
    result.webMercator = { x: Math.round(m.x * 100) / 100, y: Math.round(m.y * 100) / 100 };
  } catch {
    notes.push("Web Mercator is not defined this close to the poles.");
  }
  return result;
}
