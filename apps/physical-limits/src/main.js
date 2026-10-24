// Entry for Vite: the shared brand layer, this tool's styles, then its logic.
import "@rjmlaird/ui/brand.css";
import "./tool.css";

const G = 6.6743e-11, C = 299792458, AU = 149597870700;
const PRE = {
  earth: { M: 5.972e24, R: 6.371e6, P: 1.989e30, a: 1, rho: 3000 },
  jupiter: { M: 1.898e27, R: 6.9911e7, P: 1.989e30, a: 5.2, rho: 1500 },
  sun: { M: 1.989e30, R: 6.9634e8, P: 2e41, a: 1.7e9, rho: 1400 },   // parent: ~1e11 solar masses of Milky Way inside the Sun's orbit (approximate)
  sagA: { M: 8.25e36, R: 1.2e10, P: 2e42, a: 100, rho: 1000 },
  bh: { M: 1.989e31, R: 30000, P: 1.989e30, a: 0.5, rho: 2000 },
};
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg", mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
const sci = (n) => Number(n).toExponential(3).replace("e+", "e");
const nf = (n, d = 2) => Number(n).toLocaleString("en-GB", { maximumFractionDigits: d });
const dist = (m) => m < 0.01 ? nf(m * 1000) + " mm" : m < 1 ? nf(m * 100) + " cm" : m < 1e4 ? nf(m, 1) + " m" : m < 1e9 ? nf(m / 1000, 1) + " km" : m < 1e12 ? nf(m / 1e9) + " million km" : nf(m / AU, 3) + " AU";
const speed = (v) => (v < 1000 ? nf(v, 1) + " m/s" : nf(v / 1000) + " km/s");
const read = (id) => { const t = $(id).value.trim(); const n = Number(t); return t !== "" && Number.isFinite(n) && n > 0 ? n : NaN; };
let L = null;

function setPreset(k) { const p = PRE[k]; $("M").value = sci(p.M); $("R").value = sci(p.R); $("P").value = sci(p.P); $("aau").value = String(p.a); $("rho").value = String(p.rho); $("M-s").value = Math.log10(p.M).toFixed(2); $("R-s").value = Math.log10(p.R).toFixed(2); calc(); $("live").textContent = "Preset loaded."; }
document.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => setPreset(b.dataset.p)));
$("M-s").addEventListener("input", () => { $("M").value = sci(Math.pow(10, Number($("M-s").value))); calc(); });
$("R-s").addEventListener("input", () => { $("R").value = sci(Math.pow(10, Number($("R-s").value))); calc(); });
for (const id of ["M", "R", "P", "aau", "rho"]) $(id).addEventListener("input", () => { if (id === "M" && read("M")) $("M-s").value = Math.log10(read("M")).toFixed(2); if (id === "R" && read("R")) $("R-s").value = Math.log10(read("R")).toFixed(2); calc(); });
document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener("change", calc));
$("v0").addEventListener("input", () => renderWell());

function calc() {
  const M = read("M"), R = read("R"), P = read("P"), a = read("aau") * AU, rho = read("rho");
  const bad = [["M", M, "mass"], ["R", R, "radius"], ["P", P, "parent mass"], ["aau", a, "orbital distance"], ["rho", rho, "satellite density"]].filter((x) => !Number.isFinite(x[1]));
  const err = $("err"); err.hidden = !bad.length;
  for (const id of ["M", "R", "P", "aau", "rho"]) { if (bad.some((b) => b[0] === id)) $(id).setAttribute("aria-invalid", "true"); else $(id).removeAttribute("aria-invalid"); }
  if (bad.length) { err.textContent = "Enter a positive number for the " + bad.map((b) => b[2]).join(", ") + " (for example 5.972e24)."; return; }
  const vesc = Math.sqrt((2 * G * M) / R), rs = (2 * G * M) / (C * C), rh = a * Math.cbrt(M / (3 * P));
  const rhoM = M / ((4 / 3) * Math.PI * R ** 3), k = document.querySelector('input[name="mode"]:checked').value === "fluid" ? 2.44 : 1.26, rl = k * R * Math.cbrt(rhoM / rho);
  L = { M, R, vesc, rs, rh, rl };
  $("o-vesc").textContent = speed(vesc); $("o-vescc").textContent = (vesc / C).toExponential(2) + " × the speed of light" + (vesc / C > 0.1 ? ". Newtonian estimate; relativity matters here" : "");
  $("o-rs").textContent = dist(rs); $("o-rsn").textContent = rs >= R ? "The body is inside its own horizon" : "Event horizon if it collapsed";
  $("o-rh").textContent = dist(rh); $("o-rhau").textContent = nf(rh / AU, 4) + " AU";
  $("o-rl").textContent = dist(rl); $("o-rlr").textContent = nf(rl / R) + " × the body’s radius";
  renderScale(); renderWell();
}

function renderScale() {
  const svg = $("scale"); svg.replaceChildren();
  const { R, rs, rh, rl } = L, items = [
    { n: "Hill sphere", v: rh, c: "#00c2a8", fill: "rgba(0,194,168,0.07)", dash: "6 5" },
    { n: "Roche limit", v: rl, c: "#8b7cf6", fill: "rgba(139,124,246,0.12)" },
    { n: "Body surface (R)", v: R, c: "#4ea3ff", fill: "#14507f" },
    { n: "Schwarzschild radius", v: rs, c: "#ff6b6b", fill: "#000" },
  ];
  const vals = items.map((i) => i.v), lo = Math.log10(Math.min(...vals)), hi = Math.log10(Math.max(...vals)), span = Math.max(1, hi - lo);
  const px = (v) => 16 + ((Math.log10(v) - lo) / span) * (235 - 16);
  [...items].sort((x, y) => y.v - x.v).forEach((i) => { const c = mk("circle", { cx: 250, cy: 250, r: Math.max(3, px(i.v)), fill: i.fill, stroke: i.c, "stroke-width": 2 }); if (i.dash) c.setAttribute("stroke-dasharray", i.dash); svg.append(c); });
  svg.setAttribute("aria-label", "Nested boundaries on a logarithmic scale: " + items.map((i) => i.n + " " + dist(i.v)).join(", "));
  $("leg").replaceChildren(...items.map((i) => { const li = document.createElement("li"); const dot = document.createElement("i"); dot.style.background = i.c; const n = document.createElement("span"); n.textContent = i.n; const b = document.createElement("b"); b.textContent = dist(i.v); li.append(dot, n, b); return li; }));
}

function renderWell() {
  if (!L) return;
  const x = Number($("v0").value) / 100, v0 = x * L.vesc; $("v0-o").textContent = speed(v0) + " (" + Math.round(x * 100) + "% of escape)";
  const svg = $("well"); svg.replaceChildren();
  const X0 = 50, X1 = 570, Y0 = 50, Y1 = 260, rx = (u) => X0 + ((u - 1) / 9) * (X1 - X0), uy = (u) => Y0 + (1 / u) * (Y1 - Y0);
  let d = ""; for (let i = 0; i <= 120; i++) { const u = 1 + (i / 120) * 9; d += (i ? "L" : "M") + rx(u).toFixed(1) + " " + uy(u).toFixed(1) + " "; }
  const eps = x * x - 1, ey = eps < 0 ? Y0 + -eps * (Y1 - Y0) : Y0 - Math.min(eps, 1) * 28;
  svg.append(mk("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "rgba(238,242,246,0.3)", "stroke-dasharray": "5 5" }));
  const t0 = mk("text", { x: X1, y: Y0 - 8, "text-anchor": "end" }); t0.textContent = "Zero energy: escape"; svg.append(t0);
  svg.append(mk("path", { d, fill: "none", stroke: "#4ea3ff", "stroke-width": 2.5 }));
  svg.append(mk("line", { x1: X0, y1: ey, x2: X1, y2: ey, stroke: eps >= 0 ? "#00c2a8" : "#f5a623", "stroke-width": 2 }));
  svg.append(mk("circle", { cx: X0, cy: uy(1), r: 6, fill: "#eef2f6" }));
  const tl = mk("text", { x: X0 + 12, y: Y1 + 28 }); tl.textContent = "Surface (r = R)"; svg.append(tl);
  const tr = mk("text", { x: X1, y: Y1 + 28, "text-anchor": "end" }); tr.textContent = "r = 10 R"; svg.append(tr);
  let msg;
  if (x < 1) {
    const rmax = L.R / (1 - x * x);
    if (rmax / L.R <= 10) { svg.append(mk("circle", { cx: rx(rmax / L.R), cy: ey, r: 6, fill: "#f5a623" })); }
    msg = "It rises to r = " + nf(rmax / L.R, 2) + " R, which is " + dist(rmax - L.R) + " above the surface, then falls back. Total energy is negative, so it is bound.";
  } else if (x === 1) msg = "Exactly escape velocity: it reaches infinity with no speed left.";
  else msg = "It escapes, and is still moving at " + speed(Math.sqrt(v0 * v0 - L.vesc * L.vesc)) + " a long way out. Total energy is positive.";
  $("well-t").textContent = msg;
  svg.setAttribute("aria-label", "Potential well from the surface to ten radii with a horizontal line for the launch energy. " + msg);
}
setPreset("earth");
