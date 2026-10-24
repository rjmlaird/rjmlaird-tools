// Entry for Vite: the shared brand layer, this tool's styles, then its logic.
import "@rjmlaird/ui/brand.css";
import "./tool.css";

const $ = (id) => document.getElementById(id);
const BRAND = [
  { name: "Background", hex: "#0b0f1a" }, { name: "Surface", hex: "#121826" },
  { name: "Accent", hex: "#00c2a8" }, { name: "Text", hex: "#eef2f6" }, { name: "Muted text", hex: "#9aa5b1" },
];
let palette = BRAND.map((c) => ({ ...c }));
const MAX = 8, MIN = 2;

const normHex = (v) => {
  let h = String(v).trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(h)) h = h.split("").map((c) => c + c).join("");
  return /^[0-9a-f]{6}$/.test(h) ? "#" + h : null;
};
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0")).join("");
const lum = (hex) => { const [r, g, b] = rgb(hex).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const trunc = (r) => (Math.floor(r * 100) / 100).toFixed(2);
const level = (r) => (r >= 7 ? ["ok", "AAA"] : r >= 4.5 ? ["ok", "AA"] : r >= 3 ? ["warn", "Large/UI"] : ["bad", "Fail"]);
const chip = (r) => { const [c, t] = level(r); const s = document.createElement("span"); s.className = "chip " + c; s.textContent = t; return s; };
const say = (t) => { $("live").textContent = t; };

function hsl(h, s, l) {
  s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
}
function meet(h, s, l, against, target, dir) {
  let hex = hsl(h, s, l);
  for (let i = 0; i < 60 && ratio(hex, against) < target; i++) { l = Math.min(98, Math.max(2, l + dir)); hex = hsl(h, s, l); }
  return hex;
}
function generate() {
  const h = Math.floor(Math.random() * 360), h2 = (h + 150) % 360;
  const bg = hsl(h, 38, 7), surface = hsl(h, 32, 11);
  palette = [
    { name: "Background", hex: bg }, { name: "Surface", hex: surface },
    { name: "Accent", hex: meet(h2, 78, 52, surface, 4.5, 2) },
    { name: "Text", hex: meet(h, 18, 94, surface, 7, 1) },
    { name: "Muted text", hex: meet(h, 12, 62, surface, 4.5, 1) },
  ];
}

function buildSwatches() {
  const ul = $("swatches"); ul.replaceChildren();
  palette.forEach((c, i) => {
    const li = document.createElement("li"); li.className = "cp-sw";
    const nl = document.createElement("label"); nl.htmlFor = "n" + i; nl.textContent = "Name";
    const name = document.createElement("input"); name.id = "n" + i; name.type = "text"; name.value = c.name; name.maxLength = 24; name.autocomplete = "off";
    const hl = document.createElement("label"); hl.htmlFor = "h" + i; hl.textContent = "Colour";
    const row = document.createElement("div"); row.className = "cp-hexrow";
    const pick = document.createElement("input"); pick.type = "color"; pick.value = c.hex; pick.setAttribute("aria-label", (c.name || "Colour") + " picker");
    const hex = document.createElement("input"); hex.id = "h" + i; hex.type = "text"; hex.value = c.hex; hex.maxLength = 7; hex.autocomplete = "off"; hex.spellcheck = false;
    row.append(pick, hex);
    name.addEventListener("input", () => { c.name = name.value.trim() || "Colour " + (i + 1); pick.setAttribute("aria-label", c.name + " picker"); renderDerived(); });
    pick.addEventListener("input", () => { c.hex = pick.value; hex.value = pick.value; hex.removeAttribute("aria-invalid"); renderDerived(); });
    hex.addEventListener("input", () => { const v = normHex(hex.value); if (v) { c.hex = v; pick.value = v; hex.removeAttribute("aria-invalid"); renderDerived(); } else hex.setAttribute("aria-invalid", "true"); });
    li.append(nl, name, hl, row);
    if (palette.length > MIN) {
      const rm = document.createElement("button"); rm.type = "button"; rm.className = "btn-secondary"; rm.textContent = "Remove"; rm.style.marginTop = "0.6rem";
      rm.setAttribute("aria-label", "Remove " + c.name);
      rm.addEventListener("click", () => { palette.splice(i, 1); buildSwatches(); renderDerived(); say(c.name + " removed."); $("add").focus(); });
      li.append(rm);
    }
    ul.append(li);
  });
  $("add").disabled = palette.length >= MAX;
}

function renderMatrix() {
  const t = $("matrix"); t.replaceChildren();
  const cap = document.createElement("caption"); cap.textContent = "Text colour (rows) on background colour (columns)"; t.append(cap);
  const head = document.createElement("tr"); const corner = document.createElement("th"); corner.scope = "col"; corner.textContent = "Text on"; head.append(corner);
  palette.forEach((c) => { const th = document.createElement("th"); th.scope = "col"; th.textContent = c.name; head.append(th); });
  const thead = document.createElement("thead"); thead.append(head); t.append(thead);
  const tb = document.createElement("tbody");
  palette.forEach((fg, i) => {
    const tr = document.createElement("tr"); const th = document.createElement("th"); th.scope = "row"; th.textContent = fg.name; tr.append(th);
    palette.forEach((bg, j) => {
      const td = document.createElement("td");
      if (i === j) { td.textContent = "n/a"; td.className = "muted"; }
      else { const r = ratio(fg.hex, bg.hex); const d = document.createElement("div"); d.className = "cp-cell"; const b = document.createElement("b"); b.textContent = trunc(r) + ":1"; d.append(b, chip(r)); td.append(d); }
      tr.append(td);
    });
    tb.append(tr);
  });
  t.append(tb);
}

const SIM = {
  protanopia: [[0.56667, 0.43333, 0], [0.55833, 0.44167, 0], [0, 0.24286, 0.75714]],
  deuteranopia: [[0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7]],
  tritanopia: [[0.95, 0.05, 0], [0, 0.433, 0.567], [0, 0.475, 0.525]],
};
function simulate(hex, mode) {
  if (mode === "normal") return hex;
  const [r, g, b] = rgb(hex);
  if (mode === "achromatopsia") { const y = 0.299 * r + 0.587 * g + 0.114 * b; return toHex(y, y, y); }
  const m = SIM[mode]; return toHex(...m.map((row) => row[0] * r + row[1] * g + row[2] * b));
}
function renderSim() {
  const mode = $("vision").value, ul = $("sim"); ul.replaceChildren();
  palette.forEach((c) => {
    const li = document.createElement("li"); const a = document.createElement("span"), b = document.createElement("span"), t = document.createElement("span");
    a.className = b.className = "cp-chipbox"; a.style.background = c.hex; const s = simulate(c.hex, mode); b.style.background = s;
    a.title = "Original"; b.title = "Simulated";
    t.textContent = c.name + ": " + c.hex + (mode === "normal" ? "" : " → " + s);
    li.append(a, b, t); ul.append(li);
  });
}

function fillSelects() {
  const defs = { "ui-bg": 0, "ui-fg": 3, "ui-ac": 2 };
  for (const id in defs) {
    const sel = $(id); const keep = sel.options.length ? Number(sel.value) : Math.min(defs[id], palette.length - 1);
    sel.replaceChildren(...palette.map((c, i) => { const o = document.createElement("option"); o.value = i; o.textContent = c.name; return o; }));
    sel.value = String(Math.min(keep, palette.length - 1));
  }
}
function renderUI() {
  const bg = palette[$("ui-bg").value].hex, fg = palette[$("ui-fg").value].hex, ac = palette[$("ui-ac").value].hex;
  const box = $("ui-box"); box.style.background = bg; box.style.color = fg;
  $("ui-tag").style.background = ac; $("ui-tag").style.color = bg;
  const p = $("ui-primary"); p.style.background = ac; p.style.color = bg; p.style.borderColor = ac;
  const s = $("ui-secondary"); s.style.color = fg; s.style.borderColor = ac;
  const rows = [
    ["Text on background", ratio(fg, bg), "needs 4.5:1 for normal text"],
    ["Accent on background", ratio(ac, bg), "needs 3:1 for borders and icons"],
    ["Button label on accent", ratio(bg, ac), "needs 4.5:1 for normal text"],
  ];
  $("reads").replaceChildren(...rows.map(([l, r, n]) => {
    const li = document.createElement("li"); const ch = chip(r); const t = document.createElement("span");
    t.textContent = l + ": " + trunc(r) + ":1, " + n + "."; li.append(ch, t); return li;
  }));
}
function renderCss() {
  const used = new Set();
  $("css-code").textContent = ":root {\n" + palette.map((c, i) => {
    let k = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "colour-" + (i + 1);
    while (used.has(k)) k += "-" + (i + 1); used.add(k); return "  --" + k + ": " + c.hex + ";";
  }).join("\n") + "\n}";
}
function renderDerived() { renderMatrix(); renderSim(); fillSelects(); renderUI(); renderCss(); }
function renderAll() { buildSwatches(); renderDerived(); }

$("gen").addEventListener("click", () => { generate(); renderAll(); say("New palette generated. Text colours meet AA contrast on the surface colour."); });
$("add").addEventListener("click", () => { if (palette.length < MAX) { palette.push({ name: "Colour " + (palette.length + 1), hex: "#888888" }); renderAll(); say("Colour added."); document.getElementById("n" + (palette.length - 1)).focus(); } });
$("reset").addEventListener("click", () => { palette = BRAND.map((c) => ({ ...c })); renderAll(); say("Palette reset to the brand palette."); });
for (const id of ["ui-bg", "ui-fg", "ui-ac"]) $(id).addEventListener("change", renderUI);
$("vision").addEventListener("change", renderSim);
$("copy").addEventListener("click", async () => {
  const text = $("css-code").textContent, btn = $("copy");
  try { await navigator.clipboard.writeText(text); say("CSS copied to the clipboard."); btn.textContent = "Copied"; }
  catch { const r = document.createRange(); r.selectNodeContents($("css-code")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); say("Could not copy automatically. The CSS is selected; press Ctrl+C or ⌘C."); }
  setTimeout(() => { btn.textContent = "Copy CSS"; }, 2000);
});
renderAll();
