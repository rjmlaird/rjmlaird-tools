/** WCAG 2.x contrast maths (relative luminance and contrast ratio) plus fix suggestions. */

export class InputError extends Error {}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const NAMED: Record<string, string> = {
  black: "000000", white: "ffffff", red: "ff0000", lime: "00ff00", green: "008000", blue: "0000ff",
  yellow: "ffff00", cyan: "00ffff", aqua: "00ffff", magenta: "ff00ff", fuchsia: "ff00ff", gray: "808080",
  grey: "808080", silver: "c0c0c0", maroon: "800000", olive: "808000", purple: "800080", teal: "008080",
  navy: "000080", orange: "ffa500", pink: "ffc0cb", brown: "a52a2a", rebeccapurple: "663399",
};

export const toHex = ({ r, g, b }: Rgb): string =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function channel(token: string, name: string): number {
  const t = token.trim();
  const v = t.endsWith("%") ? (parseFloat(t) / 100) * 255 : parseFloat(t);
  if (!Number.isFinite(v) || !/^[+-]?\d*\.?\d+%?$/.test(t)) throw new InputError(`Invalid ${name} value "${t}"`);
  if (v < 0 || v > 255.0001) throw new InputError(`${name} must be between 0 and 255`);
  return Math.round(v);
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const hh = (((h % 360) + 360) % 360) / 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hh * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

/** Parse #rgb, #rrggbb, rgb(...), hsl(...), a bare "r, g, b" triple, or a common colour name. */
export function parseColour(input: string): Rgb {
  const s = input.trim().toLowerCase();
  if (!s) throw new InputError("Enter a colour");
  const named = NAMED[s];
  const hexText = named ?? (s.startsWith("#") ? s.slice(1) : /^[0-9a-f]{3}$|^[0-9a-f]{6}$/.test(s) ? s : "");
  if (hexText) {
    if (/^[0-9a-f]{4}$|^[0-9a-f]{8}$/.test(hexText)) {
      throw new InputError("Colours with transparency cannot be checked: use a solid colour");
    }
    if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/.test(hexText)) throw new InputError(`"${input.trim()}" is not a valid hex colour`);
    const full = hexText.length === 3 ? hexText.replace(/./g, (c) => c + c) : hexText;
    return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
  }
  const fn = /^(rgb|hsl)a?\(\s*([^)]*)\)$/.exec(s);
  const parts = (fn ? fn[2]! : s).split(/[\s,/]+/).filter(Boolean);
  if ((fn && fn[1] === "hsl") ) {
    if (parts.length !== 3) throw new InputError("hsl() needs three values, and transparency is not supported");
    const h = parseFloat(parts[0]!);
    const sat = parseFloat(parts[1]!) / 100;
    const lig = parseFloat(parts[2]!) / 100;
    if (![h, sat, lig].every(Number.isFinite) || !parts[1]!.endsWith("%") || !parts[2]!.endsWith("%")) {
      throw new InputError("hsl() needs hue in degrees, then saturation and lightness as percentages");
    }
    if (sat < 0 || sat > 1 || lig < 0 || lig > 1) throw new InputError("Saturation and lightness must be 0% to 100%");
    return hslToRgb(h, sat, lig);
  }
  if (parts.length === 3 && (fn || parts.every((p) => /^[+-]?\d*\.?\d+%?$/.test(p)))) {
    return { r: channel(parts[0]!, "red"), g: channel(parts[1]!, "green"), b: channel(parts[2]!, "blue") };
  }
  throw new InputError(`Cannot read "${input.trim()}" as a colour. Try #1a2b3c, rgb(26, 43, 60) or hsl(210, 40%, 17%)`);
}

function lin(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Round DOWN to 2 decimals: WCAG has no rounding, so 4.499 must not display as 4.5. */
export const displayRatio = (r: number): string => (Math.floor(r * 100 + 1e-9) / 100).toFixed(2);

export const LEVELS = [
  { target: 3, key: "aaLarge", label: "AA large text (3:1)" },
  { target: 4.5, key: "aaNormal", label: "AA normal text (4.5:1)" },
  { target: 7, key: "aaaNormal", label: "AAA normal text (7:1)" },
] as const;

export interface Suggestion {
  hex: string;
  ratio: number;
}

/**
 * Closest colour with the same hue and saturation, changing only HSL lightness, that reaches `target`
 * against the other colour. Returns null if no lightness works (rare at 7:1 on mid-tone colours).
 */
export function suggest(change: Rgb, keep: Rgb, target: number): Suggestion | null {
  const { h, s, l } = rgbToHsl(change);
  let best: { dist: number; sug: Suggestion } | null = null;
  for (const dir of [-1, 1]) {
    for (let step = 1; step <= 500; step++) {
      const nl = l + (dir * step) / 500;
      if (nl < 0 || nl > 1) break;
      const cand = hslToRgb(h, s, nl);
      const ratio = contrastRatio(cand, keep);
      if (ratio >= target) {
        const dist = step / 500;
        if (!best || dist < best.dist) best = { dist, sug: { hex: toHex(cand), ratio } };
        break;
      }
    }
  }
  return best?.sug ?? null;
}

export interface CheckResult {
  foreground: { hex: string; rgb: Rgb };
  background: { hex: string; rgb: Rgb };
  ratio: number;
  ratioDisplay: string;
  results: {
    aaNormal: boolean;
    aaLarge: boolean;
    aaaNormal: boolean;
    aaaLarge: boolean;
    uiComponents: boolean;
  };
  suggestions: { target: number; label: string; foreground: Suggestion | null; background: Suggestion | null }[];
}

export function check(fgText: string, bgText: string): CheckResult {
  let fg: Rgb;
  let bg: Rgb;
  try {
    fg = parseColour(fgText);
  } catch (e) {
    if (e instanceof InputError) throw new InputError(`Foreground: ${e.message}`);
    throw e;
  }
  try {
    bg = parseColour(bgText);
  } catch (e) {
    if (e instanceof InputError) throw new InputError(`Background: ${e.message}`);
    throw e;
  }
  const ratio = contrastRatio(fg, bg);
  return {
    foreground: { hex: toHex(fg), rgb: fg },
    background: { hex: toHex(bg), rgb: bg },
    ratio,
    ratioDisplay: displayRatio(ratio),
    results: {
      aaNormal: ratio >= 4.5,
      aaLarge: ratio >= 3,
      aaaNormal: ratio >= 7,
      aaaLarge: ratio >= 4.5,
      uiComponents: ratio >= 3,
    },
    suggestions: LEVELS.filter((lv) => ratio < lv.target).map((lv) => ({
      target: lv.target,
      label: lv.label,
      foreground: suggest(fg, bg, lv.target),
      background: suggest(bg, fg, lv.target),
    })),
  };
}
