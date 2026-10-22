import { describe, expect, it } from 'vitest';
import app from '../src/index';
import {
  ConversionError, calendarToJd, convertFromParams, formatHms, gmstDegrees, jdToCalendar, parseUtc,
} from '../src/lib/astro-time';

const utc = (s: string) => convertFromParams({ utc: s });

describe('JD and MJD', () => {
  it('J2000.0 is JD 2451545.0 / MJD 51544.5', () => {
    const r = utc('2000-01-01T12:00:00Z');
    expect(r.jd).toBe(2451545.0);
    expect(r.mjd).toBe(51544.5);
  });
  it('Unix epoch is JD 2440587.5 / MJD 40587', () => {
    const r = utc('1970-01-01T00:00:00Z');
    expect(r.jd).toBe(2440587.5);
    expect(r.mjd).toBe(40587);
    expect(r.unixSeconds).toBe(0);
  });
  it('Meeus ex. 7.a: Sputnik 1, 1957 Oct 4.81', () => {
    expect(parseUtc('1957-10-04T19:26:24Z')).toBeCloseTo(2436116.31, 6);
  });
  it('Meeus ex. 7.b: Julian calendar, 333 Jan 27 12h', () => {
    const r = utc('0333-01-27T12:00:00Z');
    expect(r.jd).toBe(1842713.0);
    expect(r.calendar).toBe('julian');
  });
  it('handles the Gregorian reform boundary', () => {
    expect(parseUtc('1582-10-04')).toBe(2299159.5);
    expect(parseUtc('1582-10-15')).toBe(2299160.5);
    expect(() => parseUtc('1582-10-10')).toThrow(ConversionError);
  });
  it('JD 0 is -4712-01-01T12:00 (Julian)', () => {
    expect(jdToCalendar(0)).toMatchObject({ year: -4712, month: 1, day: 1, hour: 12, calendar: 'julian' });
  });
  it('round-trips millisecond timestamps', () => {
    for (const s of ['2026-10-11T21:00:00.000Z', '1999-12-31T23:59:59.999Z', '1600-02-29T00:00:00.000Z', '0001-03-01T06:30:15.250Z']) {
      expect(utc(s).utc).toBe(s);
    }
  });
  it('applies UTC offsets, including a space standing in for "+"', () => {
    const ref = parseUtc('2026-10-11T21:00:00Z');
    expect(parseUtc('2026-10-11T22:00:00+01:00')).toBeCloseTo(ref, 9);
    expect(parseUtc('2026-10-11T22:00:00 01:00')).toBeCloseTo(ref, 9);
    expect(parseUtc('2026-10-11T16:00:00-05:00')).toBeCloseTo(ref, 9);
  });
  it('rejects invalid dates', () => {
    for (const s of ['2026-13-01', '2026-02-29', '1900-02-29', '1500-02-30', '2026-10-11T24:00:00Z', 'tomorrow']) {
      expect(() => parseUtc(s)).toThrow(ConversionError);
    }
    expect(parseUtc('2000-02-29')).toBeGreaterThan(0);
    expect(calendarToJd(1500, 2, 29, 'julian')).toBeGreaterThan(0); // 1500 is a Julian leap year
  });
  it('accepts jd, mjd and unix inputs consistently', () => {
    const a = convertFromParams({ jd: '2461325.375' });
    expect(a.utc).toBe('2026-10-11T21:00:00.000Z');
    expect(convertFromParams({ mjd: '61324.875' }).utc).toBe(a.utc);
    expect(convertFromParams({ unix: '1791752400' }).utc).toBe(a.utc);
  });
  it('requires exactly one input and a sane range', () => {
    expect(() => convertFromParams({})).toThrow(ConversionError);
    expect(() => convertFromParams({ jd: '1', mjd: '1' })).toThrow(ConversionError);
    expect(() => convertFromParams({ jd: '' })).toThrow(ConversionError);
    expect(() => convertFromParams({ jd: '-1' })).toThrow(ConversionError);
    expect(() => convertFromParams({ jd: '9e9' })).toThrow(ConversionError);
  });
  it('"now" uses the supplied clock', () => {
    expect(convertFromParams({ now: '' }, Date.UTC(2000, 0, 1, 12)).jd).toBe(2451545.0);
  });
});

describe('sidereal time', () => {
  it('GMST at J2000.0 is 18h41m50.548s', () => {
    expect(gmstDegrees(2451545.0)).toBeCloseTo(280.46061837, 8);
    expect(utc('2000-01-01T12:00:00Z').gmst.hms).toBe('18:41:50.548');
  });
  it('Meeus ex. 12.a: 1987 Apr 10, 0h UT -> 197.693195°', () => {
    expect(gmstDegrees(2446895.5)).toBeCloseTo(197.693195, 4);
  });
  it('Meeus ex. 12.b: 1987 Apr 10, 19h21m UT -> 8h34m57.0896s', () => {
    const hours = gmstDegrees(parseUtc('1987-04-10T19:21:00Z')) / 15;
    expect(hours * 3600).toBeCloseTo(8 * 3600 + 34 * 60 + 57.0896, 3);
  });
  it('LMST adds longitude and wraps at 24h', () => {
    const base = utc('2000-01-01T12:00:00Z').gmst.hours;
    const east = convertFromParams({ utc: '2000-01-01T12:00:00Z', lon: '15' }).lst!;
    expect(east.hours).toBeCloseTo((base + 1) % 24, 9);
    const west = convertFromParams({ utc: '2000-01-01T12:00:00Z', lon: '-120' }).lst!;
    expect(west.degrees).toBeGreaterThanOrEqual(0);
    expect(west.degrees).toBeLessThan(360);
    expect(() => convertFromParams({ now: '1', lon: '400' })).toThrow(ConversionError);
  });
  it('formats HMS without rounding up to 60 or 24', () => {
    expect(formatHms(23.9999999999)).toBe('00:00:00.000');
    expect(formatHms(1.5)).toBe('01:30:00.000');
    expect(formatHms(-1)).toBe('23:00:00.000');
  });
});

describe('HTTP API', () => {
  it('returns JSON for a valid query', async () => {
    const res = await app.request('/julian-date/api/convert?jd=2451545&lon=0');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { utc: string; lst: { hms: string } };
    expect(body.utc).toBe('2000-01-01T12:00:00.000Z');
    expect(body.lst.hms).toBe('18:41:50.548');
  });
  it('returns 400 with a message for bad input', async () => {
    const res = await app.request('/julian-date/api/convert?utc=nonsense');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/ISO 8601/);
  });
  it('does not cache "now" and serves the UI with a strict CSP', async () => {
    expect((await app.request('/julian-date/api/convert?now=1')).headers.get('cache-control')).toBe('no-store');
    const page = await app.request('/julian-date/');
    expect(page.status).toBe(200);
    expect(page.headers.get('content-security-policy')).toContain("script-src 'self'");
  });
});
