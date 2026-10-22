import { describe, expect, it } from "vitest";
import {
  bngToWgs84, fromGridRef, gridToOsgb36, inBngArea, osgb36ToGrid, toGridRef, webMercatorToWgs84,
  wgs84ToBng, wgs84ToWebMercator,
} from "../src/lib/geo";

describe("OSGB36 Transverse Mercator", () => {
  // Worked example from the Ordnance Survey guide: 52°39'27.2531"N 1°43'4.5177"E (Airy 1830)
  const lat = 52 + 39 / 60 + 27.2531 / 3600;
  const lon = 1 + 43 / 60 + 4.5177 / 3600;

  it("matches the published forward result to a millimetre or so", () => {
    const g = osgb36ToGrid(lat, lon);
    expect(g.easting).toBeCloseTo(651409.903, 2);
    expect(g.northing).toBeCloseTo(313177.27, 2);
  });

  it("matches the published inverse result", () => {
    const p = gridToOsgb36(651409.903, 313177.27);
    expect(p.lat).toBeCloseTo(lat, 8);
    expect(p.lon).toBeCloseTo(lon, 8);
  });
});

describe("WGS84 <-> BNG", () => {
  it("places well-known sites in the right squares", () => {
    const ben = wgs84ToBng(56.79685, -5.00352);
    expect(toGridRef(ben.easting, ben.northing, 6)).toBe("NN 166 712");
    const tq = wgs84ToBng(51.508, -0.128); // Trafalgar Square, about TQ 300 804
    expect(Math.abs(tq.easting - 530000)).toBeLessThan(150);
    expect(Math.abs(tq.northing - 180400)).toBeLessThan(150);
    expect(toGridRef(tq.easting, tq.northing, 0)).toBe("TQ");
    const org = wgs84ToBng(49.9, -6.3); // Isles of Scilly, SV
    expect(toGridRef(org.easting, org.northing, 0)).toBe("SV");
  });

  it("round-trips to well under a metre of ground distance", () => {
    for (const [lat, lon] of [[51.5, -0.12], [53.48, -2.24], [57.15, -2.09], [50.07, -5.71], [55.95, -3.19], [52.65, 1.71]] as const) {
      const g = wgs84ToBng(lat, lon);
      const back = bngToWgs84(g.easting, g.northing);
      expect(Math.abs(back.lat - lat) * 111320).toBeLessThan(0.05);
      expect(Math.abs(back.lon - lon) * 111320 * Math.cos((lat * Math.PI) / 180)).toBeLessThan(0.05);
    }
  });
});

describe("grid references", () => {
  it("formats at several precisions, truncating", () => {
    expect(toGridRef(530047, 180417, 10)).toBe("TQ 30047 80417");
    expect(toGridRef(530047, 180417, 8)).toBe("TQ 3004 8041");
    expect(toGridRef(530047, 180417, 4)).toBe("TQ 30 80");
    expect(toGridRef(530047, 180417, 0)).toBe("TQ");
  });

  it("parses with and without spaces, and reports precision", () => {
    expect(fromGridRef("TQ 30 80")).toEqual({ easting: 530000, northing: 180000, precisionM: 1000 });
    expect(fromGridRef("tq3080")).toEqual({ easting: 530000, northing: 180000, precisionM: 1000 });
    expect(fromGridRef("TQ 30047 80417")).toEqual({ easting: 530047, northing: 180417, precisionM: 1 });
    expect(fromGridRef("NN 166 712")).toEqual({ easting: 216600, northing: 771200, precisionM: 100 });
  });

  it("round-trips every 100 km square in range", () => {
    for (let e = 0; e < 7; e++) {
      for (let n = 0; n < 13; n++) {
        const ref = toGridRef(e * 100000 + 12345, n * 100000 + 67890, 10);
        expect(fromGridRef(ref)).toMatchObject({ easting: e * 100000 + 12345, northing: n * 100000 + 67890 });
      }
    }
  });

  it("rejects invalid input", () => {
    expect(() => fromGridRef("TQ 123 45")).toThrow();
    expect(() => fromGridRef("II 12 34")).toThrow();
    expect(() => fromGridRef("12 34")).toThrow();
    expect(() => toGridRef(-1, 0)).toThrow();
    expect(inBngArea(700000, 0)).toBe(false);
  });
});

describe("Web Mercator", () => {
  it("matches known values and round-trips", () => {
    const m = wgs84ToWebMercator(51.5, -0.12);
    expect(m.x).toBeCloseTo(-13358.34, 1);
    expect(m.y).toBeCloseTo(6710219.08, 0);
    const b = webMercatorToWgs84(m.x, m.y);
    expect(b.lat).toBeCloseTo(51.5, 9);
    expect(b.lon).toBeCloseTo(-0.12, 9);
    expect(() => wgs84ToWebMercator(89, 0)).toThrow();
  });
});
