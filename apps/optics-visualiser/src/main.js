// Entry for Vite: the shared brand layer, this tool's styles, then its logic.
import "@rjmlaird/ui/brand.css";
import "./tool.css";

const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
const num = (n, d = 0) => Number(n).toLocaleString("en-GB", { maximumFractionDigits: d, minimumFractionDigits: d });
const v = (id) => Number($(id).value);

function draw(D, F, fe) {
  const svg = $("svg"); svg.replaceChildren();
  const W = 800, H = 320, ay = H / 2, px = 70, endX = W - 40;
  const ap = Math.min(H - 90, Math.max(60, (D / 1000) * (H - 100)));
  const fd = Math.min(endX - px - 140, Math.max(120, (F / 4000) * (endX - px - 160)));
  const fx = px + fd, ex = fx + Math.min(60, Math.max(18, (fe / 60) * 60));
  const eh = Math.max(24, ap / 3);
  svg.append(mk("line", { x1: 20, y1: ay, x2: endX, y2: ay, class: "axis" }));
  svg.append(mk("ellipse", { cx: px, cy: ay, rx: 7, ry: ap / 2, fill: "#00c2a8", opacity: 0.85 }));
  svg.append(mk("ellipse", { cx: ex, cy: ay, rx: 5, ry: eh / 2, fill: "#f5a623", opacity: 0.9 }));
  const n = 7;
  for (let i = 0; i < n; i++) {
    const y = ay - ap / 2 + (i * ap) / (n - 1), exitY = ay + (y - ay) * (eh / ap);
    svg.append(mk("line", { x1: 0, y1: y, x2: px, y2: y, class: "in" }), mk("line", { x1: px, y1: y, x2: fx, y2: ay, class: "conv" }),
      mk("line", { x1: fx, y1: ay, x2: ex, y2: exitY, class: "div" }), mk("line", { x1: ex, y1: exitY, x2: endX, y2: exitY, class: "out" }));
  }
  svg.append(mk("circle", { cx: fx, cy: ay, r: 4, fill: "#ff6b6b" }));
  const lab = (x, y, t, a = "middle") => { const e = mk("text", { x, y, "text-anchor": a }); e.textContent = t; svg.append(e); };
  lab(px, Math.max(16, ay - ap / 2 - 12), "Primary (D)"); lab(fx, ay + 28, "Focal point"); lab(ex, Math.max(16, ay - eh / 2 - 12), "Eyepiece");
  svg.setAttribute("aria-label", "Ray diagram: parallel light enters a " + D + " mm aperture, focuses " + F + " mm away and leaves a " + fe + " mm eyepiece as a parallel beam");
}

function update() {
  const D = v("D"), F = v("F"), fe = v("fe"), af = v("af");
  $("D-o").textContent = D + " mm"; $("F-o").textContent = F + " mm"; $("fe-o").textContent = fe + " mm"; $("af-o").textContent = af + "°";
  const mag = F / fe, ep = D / mag, tf = af / mag;
  $("r-fr").textContent = "f/" + num(F / D, 1); $("r-mag").textContent = num(mag, 1) + "×"; $("r-ep").textContent = num(ep, 2) + " mm";
  $("r-tfov").textContent = num(tf, 2) + "° (" + num(tf * 60, 0) + "′)"; $("r-dawes").textContent = num(116 / D, 2) + "″"; $("r-lg").textContent = num(Math.pow(D / 7, 2)) + "×";
  $("r-range").textContent = num(D / 7) + "× to " + num(D * 2) + "×";
  $("advice").textContent = ep > 7 ? "The exit pupil is wider than a dark-adapted eye (about 7 mm), so some light is wasted."
    : ep < 0.5 ? "The exit pupil is very small, so the image will look dim and soft. Try a longer eyepiece."
    : mag > D * 2 ? "This magnification is above the usual limit of about 2× the aperture in mm, so the view will probably look soft."
    : mag < D / 7 ? "This magnification is below the usual minimum for the aperture, so the exit pupil is larger than the eye can use."
    : "This is within the usual useful range for this aperture.";
  draw(D, F, fe);
}
for (const id of ["D", "F", "fe", "af"]) $(id).addEventListener("input", update);
update();
