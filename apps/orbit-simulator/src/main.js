// Entry for Vite: the shared brand layer, this tool's styles, then its logic.
import "@rjmlaird/ui/brand.css";
import "./tool.css";

const BODIES = {
  earth: { name: "Earth", mu: 398600.4418, R: 6371, color: "#4ea3ff", range: [6500, 1e6] },
  sun: { name: "Sun", mu: 132712440018, R: 696340, color: "#f5a623", range: [5e7, 6e9] },
  moon: { name: "Moon", mu: 4902.8, R: 1737, color: "#aab4c0", range: [1800, 6e4] },
  mars: { name: "Mars", mu: 42828.3, R: 3389.5, color: "#ff7a6b", range: [3500, 2e5] },
  jupiter: { name: "Jupiter", mu: 126686534, R: 69911, color: "#ffa45c", range: [7e4, 3e7] },
  custom: { name: "Custom body", mu: 398600.4418, R: 0, color: "#8b7cf6", range: [100, 1e10] },
};

const PRESETS = {
  ISS: ["earth", 6771, 0.0006],
  GEO: ["earth", 42164, 0.0001],
  Molniya: ["earth", 26600, 0.74],
  EarthSun: ["sun", 149597870, 0.0167],
  MarsSun: ["sun", 227939200, 0.0934],
};

const $ = (id) => document.getElementById(id);
const nf = (n, d = 1) => Number(n).toLocaleString("en-GB", { maximumFractionDigits: d });

let body = "earth";
let M = 0;
let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
let last = performance.now();

// Populate body select options
$("body").replaceChildren(
  ...Object.entries(BODIES).map(([k, b]) =>
    Object.assign(document.createElement("option"), {
      value: k,
      textContent: b.name + (k === "custom" ? "" : " (μ = " + nf(b.mu, 1) + " km³/s²)"),
    })
  )
);

const mu = () => (body === "custom" ? Math.max(1e-6, Number($("mu").value) || 398600.4418) : BODIES[body].mu);
const A = () => Math.max(1, Number($("a").value) || 7000);
const E = () => Math.min(0.99, Math.max(0, Number($("e").value) || 0));

const sToA = (s) => {
  const [lo, hi] = BODIES[body].range;
  return Math.exp(Math.log(lo) + (s / 1000) * (Math.log(hi) - Math.log(lo)));
};

const aToS = (a) => {
  const [lo, hi] = BODIES[body].range;
  return Math.min(1000, Math.max(0, ((Math.log(a) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * 1000));
};

function period(s) {
  if (s < 120) return nf(s, 1) + " s";
  const d = Math.floor(s / 86400);
  const h = Math.floor(s / 3600) % 24;
  const m = Math.floor(s / 60) % 60;
  const sec = Math.floor(s % 60);

  if (d > 730) return nf(d / 365.25, 2) + " years";
  if (d >= 2) return d + " d " + h + " h " + m + " min";
  return (Math.floor(s / 3600) ? Math.floor(s / 3600) + " h " : "") + m + " min " + sec + " s";
}

function solveKepler(Mm, e) {
  let x = e > 0.8 ? Math.PI : Mm;
  for (let i = 0; i < 40; i++) {
    const d = (x - e * Math.sin(x) - Mm) / (1 - e * Math.cos(x));
    x -= d;
    if (Math.abs(d) < 1e-9) break;
  }
  return x;
}

function results() {
  const a = A();
  const e = E();
  const m = mu();
  const R = BODIES[body].R;
  const rp = a * (1 - e);
  const ra = a * (1 + e);
  const vp = Math.sqrt(m * (2 / rp - 1 / a));
  const va = Math.sqrt(m * (2 / ra - 1 / a));
  const T = 2 * Math.PI * Math.sqrt(a ** 3 / m);

  $("r-rp").textContent = nf(rp) + " km";
  $("r-ra").textContent = nf(ra) + " km";
  $("r-hp").textContent = R ? "altitude " + nf(rp - R) + " km" : "";
  $("r-ha").textContent = R ? "altitude " + nf(ra - R) + " km" : "";
  $("r-vp").textContent = nf(vp, 3) + " km/s";
  $("r-va").textContent = nf(va, 3) + " km/s";
  $("r-T").textContent = period(T);
  $("r-Ts").textContent = nf(Math.round(T)) + " s (" + nf(T / 86400, 3) + " days)";
  $("r-n").textContent = Math.sqrt(m / a ** 3).toExponential(3) + " rad/s";
  $("r-E").textContent = nf(-m / (2 * a), 3) + " MJ/kg";

  const w = $("warn");
  w.hidden = !(R && rp <= R);
  w.textContent = "Periapsis is below the surface of " + BODIES[body].name + ", so this orbit would collide with it.";

  $("cv").setAttribute(
    "aria-label",
    "Animation of an orbit around " + BODIES[body].name.toLowerCase() + " with semi-major axis " + nf(a) + " km and eccentricity " + e + "; period " + period(T)
  );
}

function setBody(k) {
  body = k;
  $("body").value = k;
  $("mu-wrap").hidden = k !== "custom";

  const [lo, hi] = BODIES[k].range;
  const a = A();
  if (a < lo || a > hi) $("a").value = String(Math.round(Math.sqrt(lo * hi)));
  $("a-s").value = aToS(A());
  results();
}

$("body").addEventListener("change", () => setBody($("body").value));
$("mu").addEventListener("input", results);
$("a").addEventListener("input", () => {
  $("a-s").value = aToS(A());
  results();
});
$("a-s").addEventListener("input", () => {
  $("a").value = String(Number(sToA(Number($("a-s").value)).toPrecision(4)));
  results();
});
$("e").addEventListener("input", () => {
  $("e-s").value = E();
  results();
});
$("e-s").addEventListener("input", () => {
  $("e").value = $("e-s").value;
  results();
});

document.querySelectorAll("[data-preset]").forEach((b) =>
  b.addEventListener("click", () => {
    const [k, a, e] = PRESETS[b.dataset.preset];
    $("a").value = a;
    $("e").value = e;
    $("e-s").value = e;
    setBody(k);
    $("a").value = a;
    $("a-s").value = aToS(a);
    results();
    $("live").textContent = b.textContent + " preset loaded.";
  })
);

$("pause").addEventListener("click", () => {
  paused = !paused;
  $("pause").textContent = paused ? "Resume" : "Pause";
  $("pause").setAttribute("aria-pressed", String(paused));
});

// ---- Canvas Animation
const cv = $("cv");
const ctx = cv.getContext("2d");
let W = 0;
let H = 0;

function size() {
  const r = cv.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  W = r.width;
  H = r.height;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

new ResizeObserver(() => {
  size();
  frame(performance.now(), 0);
}).observe(cv);

function frame(now, dt) {
  const a = A();
  const e = E();
  const m = mu();

  if (!paused) {
    const n = Math.sqrt(m / a ** 3);
    const T = (2 * Math.PI) / n;
    M = (M + n * dt * (T / 20)) % (2 * Math.PI);
  }

  ctx.clearRect(0, 0, W, H);

  if ($("grid").checked) {
    ctx.strokeStyle = "rgba(238,242,246,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  const cx = W / 2;
  const cy = H / 2;
  const b = a * Math.sqrt(1 - e * e);
  const c = a * e;
  const k = Math.min((W / 2 - 40) / a, (H / 2 - 34) / b);
  const pa = a * k;
  const pb = b * k;
  const pc = c * k;
  const focusX = cx + pc;
  const focusY = cy;

  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(0,194,168,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, pa, pb, 0, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(238,242,246,0.15)";
  ctx.beginPath();
  ctx.moveTo(cx - pa, cy);
  ctx.lineTo(cx + pa, cy);
  ctx.stroke();

  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#00c2a8";
  ctx.beginPath();
  ctx.arc(cx + pa, cy, 5, 0, 7);
  ctx.fill();
  ctx.fillText("Periapsis", cx + pa - 14, cy - 14);

  ctx.fillStyle = "#f5a623";
  ctx.beginPath();
  ctx.arc(cx - pa, cy, 5, 0, 7);
  ctx.fill();
  ctx.fillText("Apoapsis", cx - pa + 14, cy - 14);

  const bd = BODIES[body];
  const br = Math.max(6, Math.min(26, (bd.R || 6371) * k));
  ctx.fillStyle = bd.color;
  ctx.shadowColor = bd.color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(focusX, focusY, br, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;

  const Ea = solveKepler(M, e);
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(Ea / 2), Math.sqrt(1 - e) * Math.cos(Ea / 2));
  const r = a * (1 - e * Math.cos(Ea));
  const sx = focusX + r * k * Math.cos(nu);
  const sy = focusY - r * k * Math.sin(nu);
  const v = Math.sqrt(m * (2 / r - 1 / a));

  ctx.strokeStyle = "rgba(238,242,246,0.25)";
  ctx.beginPath();
  ctx.moveTo(focusX, focusY);
  ctx.lineTo(sx, sy);
  ctx.stroke();

  if ($("vec").checked) {
    const g = Math.atan2(e * Math.sin(nu), 1 + e * Math.cos(nu));
    const ang = nu + Math.PI / 2 - g;
    const len = 18 + 42 * (v / Math.sqrt(m * (2 / (a * (1 - e)) - 1 / a)));
    const ex = sx + len * Math.cos(ang);
    const ey = sy - len * Math.sin(ang);

    ctx.strokeStyle = ctx.fillStyle = "#f5a623";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 7 * Math.cos(ang - 0.5), ey + 7 * Math.sin(ang - 0.5));
    ctx.lineTo(ex - 7 * Math.cos(ang + 0.5), ey + 7 * Math.sin(ang + 0.5));
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1;
  }

  ctx.fillStyle = "#eef2f6";
  ctx.strokeStyle = "#8b7cf6";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(sx, sy, 6, 0, 7);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1;

  let deg = ((nu * 180) / Math.PI) % 360;
  if (deg < 0) deg += 360;

  $("t-r").textContent = nf(r) + " km";
  $("t-v").textContent = nf(v, 2) + " km/s";
  $("t-nu").textContent = nf(deg, 1) + "°";
}

function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  frame(now, dt);
  requestAnimationFrame(loop);
}

setBody("earth");
$("a-s").value = aToS(A());
$("e-s").value = E();
size();
requestAnimationFrame(loop);