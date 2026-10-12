/**
 * Pure time-scale maths: calendar <-> Julian date <-> MJD <-> Unix, plus mean sidereal time.
 *
 * Algorithms: Meeus, "Astronomical Algorithms" (2nd ed.), ch. 7 (JD) and ch. 12 (GMST, IAU 1982).
 *
 * Conventions and limits
 * - Input "UTC" is treated as a uniform 86 400 s/day scale (leap seconds ignored), as is
 *   standard for JD conversions. Output is JD(UTC), not JD(TT).
 * - Calendar: Gregorian from 1582-10-15, Julian before 1582-10-04 (astronomical year
 *   numbering: 1 BC = 0, 2 BC = -1). 1582-10-05..14 do not exist.
 * - Range: JD 0 (-4712-01-01 12:00, Julian) to year 9999.
 * - Sidereal time is MEAN sidereal time, and UT1 is approximated by UTC (|UT1-UTC| < 0.9 s).
 * - A double resolves JD to ~40 microseconds at current epochs.
 */

export const JD_UNIX_EPOCH = 2440587.5;
export const JD_MJD_OFFSET = 2400000.5;
export const JD_J2000 = 2451545.0;
export const MAX_JD = 5373484.5; // 10000-01-01T00:00Z (exclusive)
const MS_PER_DAY = 86_400_000;

export class ConversionError extends Error {}

export type CalendarKind = 'gregorian' | 'julian';

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  calendar: CalendarKind;
}

const mod = (x: number, n: number) => ((x % n) + n) % n;
const pad = (n: number, w: number) => String(n).padStart(w, '0');

function isLeap(year: number, calendar: CalendarKind): boolean {
  if (calendar === 'julian') return mod(year, 4) === 0;
  return (mod(year, 4) === 0 && mod(year, 100) !== 0) || mod(year, 400) === 0;
}

function daysInMonth(year: number, month: number, calendar: CalendarKind): number {
  if (month === 2) return isLeap(year, calendar) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** JD of a calendar date; `day` may carry a fraction. Meeus ch. 7. */
export function calendarToJd(year: number, month: number, day: number, calendar: CalendarKind): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  let b = 0;
  if (calendar === 'gregorian') {
    const a = Math.floor(y / 100);
    b = 2 - a + Math.floor(a / 4);
  }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

/** Calendar date (UTC) of a JD, rounded to the nearest millisecond. Meeus ch. 7. */
export function jdToCalendar(jd: number): CalendarDate {
  const shifted = jd + 0.5;
  let z = Math.floor(shifted);
  let ms = Math.round((shifted - z) * MS_PER_DAY);
  if (ms >= MS_PER_DAY) {
    z += 1;
    ms -= MS_PER_DAY;
  }
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;

  const hour = Math.floor(ms / 3_600_000);
  const minute = Math.floor((ms % 3_600_000) / 60_000);
  const second = Math.floor((ms % 60_000) / 1000);
  return {
    year, month, day, hour, minute, second,
    millisecond: ms % 1000,
    calendar: z >= 2299161 ? 'gregorian' : 'julian',
  };
}

export function formatUtc(c: CalendarDate): string {
  const y = c.year < 0 ? `-${pad(-c.year, 6)}` : pad(c.year, 4);
  return `${y}-${pad(c.month, 2)}-${pad(c.day, 2)}T${pad(c.hour, 2)}:${pad(c.minute, 2)}:${pad(c.second, 2)}.${pad(c.millisecond, 3)}Z`;
}

// Date, optional time, optional offset. Offset needs a time. A space before an offset is read
// as "+", because "+" in an unescaped query string decodes to a space.
const ISO =
  /^([+-]?\d{4,6})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+\- ]\d{2}:?\d{2})?)?$/i;

/** Parse an ISO 8601 date or date-time into a JD (UTC). */
export function parseUtc(input: string): number {
  const m = ISO.exec(input.trim());
  if (!m) throw new ConversionError('utc must be ISO 8601, e.g. 2026-10-11T21:00:00Z (encode "+" as %2B in URLs).');
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = m[4] ? Number(m[4]) : 0;
  const minute = m[5] ? Number(m[5]) : 0;
  const second = m[6] ? Number(m[6]) : 0;
  const frac = m[7] ? Number(`0.${m[7]}`) : 0;

  if (year < -4712 || year > 9999) throw new ConversionError('Year must be between -4712 and 9999.');
  if (month < 1 || month > 12) throw new ConversionError(`Month ${month} is out of range.`);
  if (hour > 23 || minute > 59 || second > 59) {
    throw new ConversionError('Time out of range (leap-second 23:59:60 is not supported).');
  }

  const gregorian = year > 1582 || (year === 1582 && (month > 10 || (month === 10 && day >= 15)));
  if (year === 1582 && month === 10 && day > 4 && day < 15) {
    throw new ConversionError('1582-10-05 to 1582-10-14 do not exist (Gregorian reform).');
  }
  const calendar: CalendarKind = gregorian ? 'gregorian' : 'julian';
  if (day < 1 || day > daysInMonth(year, month, calendar)) {
    throw new ConversionError(`Day ${day} is out of range for ${year}-${pad(month, 2)} (${calendar} calendar).`);
  }

  let jd = calendarToJd(year, month, day, calendar) + (hour * 3600 + minute * 60 + second + frac) / 86400;

  const off = m[8];
  if (off && off.toUpperCase() !== 'Z') {
    const sign = off[0] === '-' ? -1 : 1;
    const digits = off.slice(1).replace(':', '');
    const oh = Number(digits.slice(0, 2));
    const om = Number(digits.slice(2));
    if (oh > 23 || om > 59) throw new ConversionError('UTC offset out of range.');
    jd -= (sign * (oh * 60 + om)) / 1440;
  }
  return jd;
}

/** Greenwich mean sidereal time in degrees [0, 360), IAU 1982 (Meeus 12.4). `jdUt` ≈ JD(UTC). */
export function gmstDegrees(jdUt: number): number {
  const d = jdUt - JD_J2000;
  const t = d / 36525;
  const theta = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38_710_000;
  return mod(theta, 360);
}

/** Format hours as HH:MM:SS.sss, wrapping into [0, 24). */
export function formatHms(hours: number, decimals = 3): string {
  const scale = 10 ** decimals;
  const perDay = 86_400 * scale;
  let total = Math.round(mod(hours, 24) * 3600 * scale) % perDay;
  const h = Math.floor(total / (3600 * scale));
  total -= h * 3600 * scale;
  const min = Math.floor(total / (60 * scale));
  total -= min * 60 * scale;
  const s = (total / scale).toFixed(decimals).padStart(decimals ? 3 + decimals : 2, '0');
  return `${pad(h, 2)}:${pad(min, 2)}:${s}`;
}

export interface SiderealTime {
  degrees: number;
  hours: number;
  hms: string;
}

export interface Conversion {
  jd: number;
  mjd: number;
  unixSeconds: number;
  utc: string;
  calendar: CalendarKind;
  gmst: SiderealTime;
  lst?: SiderealTime & { longitudeEastDegrees: number };
}

const sidereal = (deg: number): SiderealTime => ({
  degrees: deg,
  hours: deg / 15,
  hms: formatHms(deg / 15),
});

/** Full conversion from a JD, with local mean sidereal time if a longitude (° east) is given. */
export function describe(jd: number, longitudeEastDeg?: number): Conversion {
  if (!(jd >= 0 && jd < MAX_JD)) {
    throw new ConversionError('Julian date out of range (0 to 5373484.5, i.e. year -4712 to 9999).');
  }
  if (longitudeEastDeg !== undefined && Math.abs(longitudeEastDeg) > 360) {
    throw new ConversionError('lon must be within ±360 degrees (east positive).');
  }
  const cal = jdToCalendar(jd);
  const gmst = gmstDegrees(jd);
  const out: Conversion = {
    jd,
    mjd: jd - JD_MJD_OFFSET,
    unixSeconds: Math.round((jd - JD_UNIX_EPOCH) * 86400 * 1000) / 1000,
    utc: formatUtc(cal),
    calendar: cal.calendar,
    gmst: sidereal(gmst),
  };
  if (longitudeEastDeg !== undefined) {
    out.lst = { longitudeEastDegrees: longitudeEastDeg, ...sidereal(mod(gmst + longitudeEastDeg, 360)) };
  }
  return out;
}

const KEYS = ['utc', 'jd', 'mjd', 'unix', 'now'] as const;

function num(name: string, raw: string): number {
  const t = raw.trim();
  const n = t === '' ? NaN : Number(t);
  if (!Number.isFinite(n)) throw new ConversionError(`${name} must be a finite number.`);
  return n;
}

/** Entry point for query-string style input: exactly one of utc, jd, mjd, unix, now; optional lon. */
export function convertFromParams(
  p: Record<string, string | undefined>,
  nowMs: number = Date.now(),
): Conversion {
  const given = KEYS.filter((k) => p[k] !== undefined);
  if (given.length !== 1) {
    throw new ConversionError(
      given.length === 0
        ? 'Provide one of: utc, jd, mjd, unix, now.'
        : `Provide only one of utc, jd, mjd, unix, now (got ${given.join(', ')}).`,
    );
  }
  let jd: number;
  switch (given[0]) {
    case 'utc': jd = parseUtc(p.utc as string); break;
    case 'jd': jd = num('jd', p.jd as string); break;
    case 'mjd': jd = num('mjd', p.mjd as string) + JD_MJD_OFFSET; break;
    case 'unix': jd = num('unix', p.unix as string) / 86400 + JD_UNIX_EPOCH; break;
    default: jd = nowMs / MS_PER_DAY + JD_UNIX_EPOCH;
  }
  const lon = p.lon === undefined ? undefined : num('lon', p.lon);
  return describe(jd, lon);
}
