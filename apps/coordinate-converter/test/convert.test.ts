import { describe, expect, it } from "vitest";
import app from "../src/index";
import { convert, detectFormat, InputError, parseLatLon } from "../src/lib/convert";

describe("parseLatLon", () => {
  const near = (v: { lat: number; lon: number }, lat: number, lon: number) => {
    expect(v.lat).toBeCloseTo(lat, 6);
    expect(v.lon).toBeCloseTo(lon, 6);
  };
  it("reads decimals, with commas or spaces", () => {
    near(parseLatLon("51.5074, -0.1278"), 51.5074, -0.1278);
    near(parseLatLon("51.5074 -0.1278"), 51.5074, -0.1278);
  });
  it("reads hemisphere letters in suffix and prefix style", () => {
    near(parseLatLon("51.5074 N 0.1278 W"), 51.5074, -0.1278);
    near(parseLatLon("N 51.5074 W 0.1278"), 51.5074, -0.1278);
    near(parseLatLon("0.1278W 51.5074N"), 51.5074, -0.1278);
  });
  it("reads degrees-minutes-seconds and degrees-decimal-minutes", () => {
    near(parseLatLon("51°30′26.6″N 0°07′40.1″W"), 51 + 30 / 60 + 26.6 / 3600, -(7 / 60 + 40.1 / 3600));
    near(parseLatLon("51 30.443 N, 0 7.668 W"), 51 + 30.443 / 60, -(7.668 / 60));
    near(parseLatLon("51 30 26.6 -0 7 40.1"), 51 + 30 / 60 + 26.6 / 3600, -(7 / 60 + 40.1 / 3600));
  });
  it("rejects nonsense", () => {
    for (const bad of ["", "abc", "91, 0", "0, 181", "51 N 0 N", "51 61 N 0 W", "1,2,3", "banana"]) {
      expect(() => parseLatLon(bad), bad).toThrow(InputError);
    }
  });
});

describe("error messages", () => {
  it("quotes the whole input when it is not a coordinate", () => {
    expect(() => parseLatLon("banana")).toThrow('Cannot read "banana"');
  });
});

describe("detectFormat", () => {
  it("recognises each format", () => {
    expect(detectFormat("TQ 30 80")).toBe("gridref");
    expect(detectFormat("51.5, -0.12")).toBe("latlon");
    expect(detectFormat("51°30′N 0°7′W")).toBe("latlon");
    expect(detectFormat("530047 180417")).toBe("bng");
    expect(detectFormat("-13358, 6710219")).toBe("webmercator");
  });
});

describe("convert", () => {
  it("converts lat/lon to all formats", () => {
    const r = convert("51.508, -0.128");
    expect(r.wgs84.decimal).toBe("51.508000, -0.128000");
    expect(r.wgs84.dms).toBe("51°30′28.8″N 000°07′40.8″W");
    expect(r.wgs84.ddm).toBe("51°30.480′N 000°07.680′W");
    expect(r.bng?.gridRef6).toMatch(/^TQ 29\d 80\d$|^TQ 300 804$/);
    expect(r.bng?.gridRef).toMatch(/^TQ \d{5} \d{5}$/);
    expect(r.webMercator?.x).toBeCloseTo(-14248.89, 1);
  });

  it("round-trips BNG, grid reference and Web Mercator input", () => {
    const base = convert("51.508, -0.128");
    const fromBng = convert(`${base.bng!.easting} ${base.bng!.northing}`);
    expect(fromBng.detectedFormat).toBe("bng");
    expect(fromBng.wgs84.lat).toBeCloseTo(51.508, 6);
    const fromRef = convert(base.bng!.gridRef);
    expect(fromRef.wgs84.lat).toBeCloseTo(51.508, 4);
    const wm = convert(`${base.webMercator!.x}, ${base.webMercator!.y}`, "webmercator");
    expect(wm.wgs84.lat).toBeCloseTo(51.508, 6);
  });

  it("handles places outside the grid and at the poles", () => {
    const paris = convert("48.8566, 2.3522");
    expect(paris.bng).toBeNull();
    expect(paris.notes.join(" ")).toMatch(/outside/);
    const pole = convert("89.5, 0");
    expect(pole.webMercator).toBeNull();
  });

  it("rounds DMS without producing 60 seconds", () => {
    expect(convert("10.99999999, 20").wgs84.dms).toMatch(/^11°00′00\.0″N/);
  });

  it("rejects out-of-range BNG and bad grid references", () => {
    expect(() => convert("800000 100000", "bng")).toThrow(InputError);
    expect(() => convert("II 12 34", "gridref")).toThrow(InputError);
  });
});

describe("worker", () => {
  it("serves the page with and without a trailing slash", async () => {
    for (const p of ["/coordinate-converter", "/coordinate-converter/"]) {
      expect((await app.request(p)).status).toBe(200);
    }
  });
  it("serves the API", async () => {
    const res = await app.request("/coordinate-converter/api/convert?input=" + encodeURIComponent("TQ 30 80"));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { detectedFormat: string }).detectedFormat).toBe("gridref");
    expect((await app.request("/coordinate-converter/api/convert?input=zzz")).status).toBe(400);
    expect((await app.request("/coordinate-converter/api/convert")).status).toBe(400);
  });
});
