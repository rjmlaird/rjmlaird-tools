import { describe, expect, it } from "vitest";
import app from "../src/index";
import { check, contrastRatio, displayRatio, InputError, parseColour, relativeLuminance, suggest, toHex } from "../src/lib/contrast";

const W = { r: 255, g: 255, b: 255 };
const K = { r: 0, g: 0, b: 0 };

describe("colour parsing", () => {
  it("reads hex, rgb, hsl and names", () => {
    expect(parseColour("#fff")).toEqual(W);
    expect(parseColour("1a2b3c")).toEqual({ r: 26, g: 43, b: 60 });
    expect(parseColour("rgb(26, 43, 60)")).toEqual({ r: 26, g: 43, b: 60 });
    expect(parseColour("26 43 60")).toEqual({ r: 26, g: 43, b: 60 });
    expect(parseColour("rgb(100%, 0%, 0%)")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColour("hsl(0, 100%, 50%)")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColour("hsl(210, 40%, 17%)")).toEqual({ r: 26, g: 43, b: 61 });
    expect(parseColour("Teal")).toEqual({ r: 0, g: 128, b: 128 });
  });
  it("rejects bad or transparent colours with helpful messages", () => {
    for (const bad of ["", "#12", "#gggggg", "rgb(300,0,0)", "rgb(1,2)", "hsl(0, 100, 50)", "banana"]) {
      expect(() => parseColour(bad), bad).toThrow(InputError);
    }
    expect(() => parseColour("#ffffff80")).toThrow(/transparency/);
  });
});

describe("WCAG maths", () => {
  it("matches reference values", () => {
    expect(relativeLuminance(W)).toBeCloseTo(1, 10);
    expect(relativeLuminance(K)).toBe(0);
    expect(contrastRatio(K, W)).toBeCloseTo(21, 10);
    expect(contrastRatio(W, W)).toBeCloseTo(1, 10);
    expect(contrastRatio(parseColour("#767676"), W)).toBeCloseTo(4.54, 2); // the lightest grey passing AA on white
    expect(contrastRatio(parseColour("#777777"), W)).toBeCloseTo(4.48, 2);
    expect(contrastRatio(parseColour("#0000ff"), W)).toBeCloseTo(8.59, 2);
  });
  it("is symmetric", () => {
    const a = parseColour("#336699");
    expect(contrastRatio(a, W)).toBeCloseTo(contrastRatio(W, a), 12);
  });
  it("never rounds a failing ratio up to the threshold", () => {
    expect(displayRatio(4.499)).toBe("4.49");
    expect(displayRatio(4.5)).toBe("4.50");
    expect(displayRatio(21)).toBe("21.00");
  });
});

describe("check", () => {
  it("grades each criterion", () => {
    const r = check("#777777", "#ffffff");
    expect(r.ratioDisplay).toBe("4.47");
    expect(r.results).toEqual({ aaNormal: false, aaLarge: true, aaaNormal: false, aaaLarge: false, uiComponents: true });
    const ok = check("#000", "#fff");
    expect(ok.results).toEqual({ aaNormal: true, aaLarge: true, aaaNormal: true, aaaLarge: true, uiComponents: true });
    expect(ok.suggestions).toEqual([]);
  });
  it("labels which colour was invalid", () => {
    expect(() => check("nope", "#fff")).toThrow(/^Foreground/);
    expect(() => check("#fff", "nope")).toThrow(/^Background/);
  });
  it("suggests fixes that really meet each unmet target", () => {
    const r = check("#999999", "#ffffff");
    expect(r.suggestions.map((s) => s.target)).toEqual([3, 4.5, 7].filter((t) => r.ratio < t));
    for (const s of r.suggestions) {
      for (const side of [s.foreground, s.background]) {
        expect(side).not.toBeNull();
        expect(side!.ratio).toBeGreaterThanOrEqual(s.target);
      }
      // verify independently from the hex value, not the reported ratio
      expect(contrastRatio(parseColour(s.foreground!.hex), W)).toBeGreaterThanOrEqual(s.target);
      expect(contrastRatio(parseColour("#999999"), parseColour(s.background!.hex))).toBeGreaterThanOrEqual(s.target);
    }
  });
  it("keeps the hue and prefers the smallest change", () => {
    const fg = parseColour("#8899bb");
    const s = suggest(fg, W, 4.5)!;
    const c = parseColour(s.hex);
    expect(c.b).toBeGreaterThan(c.r); // still blue-ish
    // one step lighter than the answer would fail, i.e. the change is minimal in its direction
    expect(toHex(c)).toBe(s.hex);
    expect(s.ratio).toBeGreaterThanOrEqual(4.5);
  });
  it("returns null when nothing can reach the target", () => {
    expect(suggest({ r: 120, g: 120, b: 120 }, { r: 119, g: 119, b: 119 }, 21.5)).toBeNull();
  });
});

describe("worker", () => {
  it("serves page and API", async () => {
    for (const p of ["/colour-contrast", "/colour-contrast/"]) expect((await app.request(p)).status).toBe(200);
    const res = await app.request("/colour-contrast/api/check?fg=%23777&bg=%23fff");
    expect(res.status).toBe(200);
    expect(((await res.json()) as { ratioDisplay: string }).ratioDisplay).toBe("4.47");
    expect((await app.request("/colour-contrast/api/check?fg=zzz&bg=%23fff")).status).toBe(400);
    expect((await app.request("/colour-contrast/api/check?fg=%23fff")).status).toBe(400);
  });
});
