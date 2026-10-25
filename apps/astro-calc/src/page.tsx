import { Layout } from "@rjmlaird/ui";

const script = `
const BASE = "/astro-calc";
const $ = (id) => document.getElementById(id);
const ids = ["aperture", "focalLength", "eyepiece", "apparentFov", "nelm"];
const out = $("out"), err = $("err");
const n = (v, d) => Number(v).toLocaleString("en-GB", { maximumFractionDigits: d });
const n0 = (v) => n(v, 0);
let timer, seq = 0, last = null;
const NS = "http://www.w3.org/2000/svg";
const mk = (tag, attrs, text) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text) e.textContent = text;
  return e;
};
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
// Approximate apparent sizes in arcminutes (width x height) for the field-of-view comparison.
const TARGETS = {
  moon: { name: "Full Moon", w: 31, h: 31 },
  m42: { name: "Orion Nebula (M42)", w: 65, h: 60 },
  m45: { name: "Pleiades (M45)", w: 110, h: 110 },
  m31: { name: "Andromeda Galaxy (M31)", w: 190, h: 60 },
};

function drawRays(j) {
  const svg = $("rays"); svg.replaceChildren();
  const D = j.input.aperture, F = j.input.focalLength, e = j.eyepieceResults;
  const W = 640, H = 240, ay = 124, px = 80, endX = W - 24;
  const ap = 40 + ((clamp(D, 50, 1000) - 50) / 950) * 120;
  const fx = px + 150 + ((clamp(F, 200, 4000) - 200) / 3800) * 170;
  const ex = fx + 24 + (clamp(j.input.eyepiece, 2, 60) / 60) * 36;
  const eh = 14 + (ap * 0.55 - 14) * clamp(e.exitPupilMm / 7, 0, 1);
  svg.append(mk("line", { x1: 16, y1: ay, x2: endX, y2: ay, class: "axis" }));
  const rays = 7;
  for (let i = 0; i < rays; i++) {
    const f = (i / (rays - 1)) * 2 - 1, y = ay + f * (ap / 2), oy = ay - f * (eh / 2);
    svg.append(
      mk("line", { x1: 0, y1: y, x2: px, y2: y, class: "r-in" }),
      mk("line", { x1: px, y1: y, x2: fx, y2: ay, class: "r-conv" }),
      mk("line", { x1: fx, y1: ay, x2: ex, y2: oy, class: "r-div" }),
      mk("line", { x1: ex, y1: oy, x2: endX, y2: oy, class: "r-out" })
    );
  }
  svg.append(
    mk("ellipse", { cx: px, cy: ay, rx: 7, ry: ap / 2, class: "obj" }),
    mk("ellipse", { cx: ex, cy: ay, rx: 5, ry: Math.max(eh / 2 + 6, 14), class: "eye" }),
    mk("circle", { cx: fx, cy: ay, r: 4, class: "focus" })
  );
  const lab = (x, y, t, a) => svg.append(mk("text", { x, y, "text-anchor": a || "middle" }, t));
  lab(px, Math.max(16, ay - ap / 2 - 12), "Aperture " + n0(D) + " mm");
  lab(fx, ay + 26, "Focal point");
  lab(ex, Math.max(34, ay - eh / 2 - 22), "Eyepiece");
  lab(endX, ay + eh / 2 + 22, "Exit pupil " + n(e.exitPupilMm, 1) + " mm", "end");
  svg.setAttribute("aria-label", "Schematic ray diagram: light enters a " + n0(D) + " millimetre aperture, focuses " + n0(F) + " millimetres away and leaves the eyepiece as a beam " + n(e.exitPupilMm, 1) + " millimetres wide.");
}

function drawField(j) {
  const svg = $("field"), note = $("field-note"); svg.replaceChildren();
  const e = j.eyepieceResults, t = TARGETS[$("target").value];
  if (e.trueFovArcmin === undefined) { svg.toggleAttribute("hidden", true); note.textContent = "Add the eyepiece apparent field of view to compare the view with the sky."; return; }
  svg.toggleAttribute("hidden", false);
  const fov = e.trueFovArcmin, W = 360, H = 260, cx = W / 2, cy = H / 2;
  const scale = 220 / (Math.max(fov, t.w) * 1.1);
  const r = (fov / 2) * scale, rx = (t.w / 2) * scale, ry = (t.h / 2) * scale;
  const id = "fov-clip";
  const defs = mk("defs", {}), clip = mk("clipPath", { id });
  clip.append(mk("circle", { cx, cy, r }));
  defs.append(clip);
  const shape = (cls, extra) => mk("ellipse", Object.assign({ cx, cy, rx, ry, class: cls }, extra || {}));
  const g = mk("g", { "clip-path": "url(#" + id + ")" }); g.append(shape("tgt"));
  svg.append(defs, shape("tgt-out"), g, mk("circle", { cx, cy, r, class: "ring" }));
  svg.append(mk("text", { x: cx, y: H - 8, "text-anchor": "middle" }, "Field of view " + n(fov, 0) + "′ (" + n(e.trueFovDeg, 2) + "°)"));
  const share = (t.w / fov) * 100;
  const text = share <= 100
    ? t.name + " is about " + n(t.w, 0) + "′ across and fills roughly " + n(share, 0) + "% of the field."
    : t.name + " is about " + n(t.w, 0) + "′ across, wider than the " + n(fov, 0) + "′ field, so about " + n(100 / (t.w / fov), 0) + "% of its width fits in the view at once.";
  note.textContent = text;
  svg.setAttribute("aria-label", "Circle showing the " + n(fov, 0) + " arcminute field of view against " + t.name + ". " + text);
}

function draw(j) {
  last = j;
  const ok = !!j.eyepieceResults;
  $("viz-empty").hidden = ok; $("viz-body").hidden = !ok;
  if (ok) { drawRays(j); drawField(j); }
}

function row(dl, label, text, cls) {
  const dt = document.createElement("dt"); dt.textContent = label;
  const dd = document.createElement("dd"); dd.textContent = text; if (cls) dd.className = cls;
  dl.append(dt, dd);
}
function show(j) {
  const dl = document.createElement("dl"); dl.className = "kv";
  const e = j.eyepieceResults;
  if (e) {
    row(dl, "Magnification", n(e.magnification, 1) + "×", "lead");
    row(dl, "Exit pupil", n(e.exitPupilMm, 2) + " mm");
    if (e.trueFovDeg !== undefined) row(dl, "True field of view", n(e.trueFovDeg, 3) + "° (" + n(e.trueFovArcmin, 1) + "′)");
  }
  row(dl, "Focal ratio", "f/" + n(j.focalRatio, 2), e ? "" : "lead");
  row(dl, "Limiting magnitude", n(j.limits.limitingMagnitude, 1));
  row(dl, "Light grasp vs eye", n(j.limits.lightGrasp, 0) + "×");
  row(dl, "Magnification range", n(j.limits.minMagnification, 0) + "× to " + n(j.limits.maxUsefulMagnification, 0) + "×");
  row(dl, "Dawes limit", n(j.limits.dawesLimitArcsec, 2) + "″");
  row(dl, "Rayleigh limit", n(j.limits.rayleighLimitArcsec, 2) + "″");
  out.replaceChildren(dl);
  if (e) { const p = document.createElement("p"); p.className = "muted small"; p.textContent = e.exitPupilNote; out.append(p); }
  draw(j);
}
async function run() {
  const my = ++seq;
  const p = new URLSearchParams();
  for (const id of ids) if ($(id).value.trim() !== "") p.set(id, $(id).value.trim());
  if (!p.get("aperture") || !p.get("focalLength")) { out.replaceChildren(); err.hidden = true; $("viz-empty").hidden = false; $("viz-body").hidden = true; return; }
  $("api").textContent = location.origin + BASE + "/api/optics?" + p;
  try {
    const res = await fetch(BASE + "/api/optics?" + p);
    const j = await res.json();
    if (my !== seq) return;
    if (!res.ok) throw new Error(j.error || "Request failed");
    err.hidden = true; show(j);
  } catch (e) { if (my !== seq) return; out.replaceChildren(); err.textContent = e.message; err.hidden = false; $("viz-empty").hidden = false; $("viz-body").hidden = true; }
}
for (const id of ids) $(id).addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 200); });
$("f").addEventListener("submit", (ev) => { ev.preventDefault(); run(); });
$("target").addEventListener("change", () => { if (last && last.eyepieceResults) drawField(last); });
$("preset").addEventListener("change", (ev) => {
  const v = ev.target.value; if (!v) return;
  const [a, f] = v.split(","); $("aperture").value = a; $("focalLength").value = f; run();
});
run();
`;


const css = `
.viz svg{display:block;width:100%;height:auto;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--navy-sunken)}
.viz svg[hidden]{display:none}
.viz svg text{fill:var(--text-hi);font:500 13px var(--font-body)}
.viz .axis{stroke:rgba(238,242,246,.25);stroke-dasharray:5 5}
.viz line{stroke-width:1.6}
.viz .r-in{stroke:#7aa7ff}.viz .r-conv{stroke:var(--teal)}.viz .r-div{stroke:var(--amber)}.viz .r-out{stroke:#a99cf7}
.viz .obj{fill:var(--teal);opacity:.85}.viz .eye{fill:var(--amber);opacity:.9}.viz .focus{fill:var(--danger)}
.viz .tgt{fill:rgba(245,166,35,.55);stroke:var(--amber);stroke-width:1.5}
.viz .tgt-out{fill:rgba(245,166,35,.12);stroke:var(--amber);stroke-width:1;stroke-dasharray:3 3}
.viz .ring{fill:none;stroke:var(--teal);stroke-width:2.5}
.viz h3{margin:1.25rem 0 .5rem;font-size:1.05rem}
.viz-pick{max-width:22rem}
.viz #field{max-width:24rem;margin-inline:auto}
`;

export const Page = () => (
  <Layout
    title="Astronomy Calculator"
    lede="Magnification, exit pupil, true field of view, limiting magnitude and resolution for your telescope and eyepiece."
    script={script}
    css={css}
  >
    <section class="panel" aria-labelledby="in-h">
      <h2 id="in-h">Telescope and eyepiece</h2>
      <form id="f" novalidate>
        <label for="preset">
          Start from a common telescope <span class="opt">(optional)</span>
        </label>
        <select id="preset">
          <option value="">Choose…</option>
          <option value="80,400">80 mm f/5 refractor</option>
          <option value="130,650">130 mm f/5 Newtonian</option>
          <option value="200,1200">200 mm f/6 Dobsonian</option>
          <option value="254,1200">254 mm f/4.7 Dobsonian</option>
          <option value="203,2032">203 mm f/10 Schmidt-Cassegrain</option>
        </select>
        <label for="aperture">Aperture (mm)</label>
        <input id="aperture" type="number" step="any" min="0" inputmode="decimal" value="200" />
        <label for="focalLength">Telescope focal length (mm)</label>
        <input id="focalLength" type="number" step="any" min="0" inputmode="decimal" value="1200" />
        <label for="eyepiece">
          Eyepiece focal length (mm) <span class="opt">(optional)</span>
        </label>
        <input id="eyepiece" type="number" step="any" min="0" inputmode="decimal" value="25" />
        <label for="apparentFov">
          Eyepiece apparent field of view (°) <span class="opt">(optional; typically 50 to 82)</span>
        </label>
        <input id="apparentFov" type="number" step="any" min="0" max="179" inputmode="decimal" value="52" />
        <label for="nelm">
          Naked-eye limiting magnitude <span class="opt">(about 6 under a dark rural sky, 4.5 in a town)</span>
        </label>
        <input id="nelm" type="number" step="0.1" min="0" max="8" inputmode="decimal" value="6" />
        <button class="btn-primary" type="submit">Calculate</button>
      </form>
      <p id="err" class="error" role="alert" hidden></p>
      <div id="out" class="result" aria-live="polite"></div>
    </section>


    <section class="panel viz" aria-labelledby="viz-h">
      <h2 id="viz-h">Diagrams</h2>
      <p id="viz-empty" class="muted">Enter an eyepiece focal length above to see the light path and the field of view.</p>
      <div id="viz-body" hidden>
        <h3>Light path</h3>
        <p class="muted small">
          A schematic, not an optical design. Distances follow the aperture and focal length loosely, and the
          width of the exit beam follows the exit pupil, up to 7 mm.
        </p>
        <svg id="rays" viewBox="0 0 640 240" role="img" aria-label="Schematic ray diagram"></svg>
        <h3>Field of view</h3>
        <label for="target">Compare the view with</label>
        <select id="target" class="viz-pick">
          <option value="moon">Full Moon (31′)</option>
          <option value="m42">Orion Nebula, M42 (about 65′)</option>
          <option value="m45">Pleiades, M45 (about 110′)</option>
          <option value="m31">Andromeda Galaxy, M31 (about 190′ × 60′)</option>
        </select>
        <svg id="field" class="viz-field" viewBox="0 0 360 260" role="img" aria-label="Field of view comparison"></svg>
        <p id="field-note" class="muted small" aria-live="polite"></p>
        <p class="muted small">Faint outline: the whole object. Bright area: the part inside your field of view. Sizes are approximate.</p>
      </div>
    </section>

    <details>
      <summary>Formulas and assumptions</summary>
      <ul>
        <li>Magnification = telescope focal length ÷ eyepiece focal length.</li>
        <li>Exit pupil = aperture ÷ magnification. True field of view = apparent field ÷ magnification, a good approximation for fields under about 60°.</li>
        <li>Limiting magnitude = naked-eye limit + 5 log₁₀(aperture ÷ 7 mm). It assumes a dark-adapted 7 mm pupil and no light loss in the optics, so real telescopes reach somewhat less.</li>
        <li>Magnification range runs from aperture ÷ 7 (a 7 mm exit pupil) to 2 × aperture in mm, a rule of thumb. Steady air and good optics matter more than the number.</li>
        <li>Dawes limit 116 ÷ aperture and Rayleigh limit 138 ÷ aperture, in arcseconds, with aperture in mm.</li>
      </ul>
    </details>
    <details>
      <summary>Use this as an API</summary>
      <pre id="api"></pre>
      <p class="muted small">
        Required: <code>aperture</code>, <code>focalLength</code> (mm). Optional: <code>eyepiece</code>,{" "}
        <code>apparentFov</code>, <code>nelm</code>.
      </p>
    </details>
  </Layout>
);
