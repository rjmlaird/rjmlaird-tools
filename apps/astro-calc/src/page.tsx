import { Layout } from "@rjmlaird/ui";

const script = `
const BASE = "/astro-calc";
const $ = (id) => document.getElementById(id);
const ids = ["aperture", "focalLength", "eyepiece", "apparentFov", "nelm"];
const out = $("out"), err = $("err");
const n = (v, d) => Number(v).toLocaleString("en-GB", { maximumFractionDigits: d });
let timer, seq = 0;

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
}
async function run() {
  const my = ++seq;
  const p = new URLSearchParams();
  for (const id of ids) if ($(id).value.trim() !== "") p.set(id, $(id).value.trim());
  if (!p.get("aperture") || !p.get("focalLength")) { out.replaceChildren(); err.hidden = true; return; }
  $("api").textContent = location.origin + BASE + "/api/optics?" + p;
  try {
    const res = await fetch(BASE + "/api/optics?" + p);
    const j = await res.json();
    if (my !== seq) return;
    if (!res.ok) throw new Error(j.error || "Request failed");
    err.hidden = true; show(j);
  } catch (e) { if (my !== seq) return; out.replaceChildren(); err.textContent = e.message; err.hidden = false; }
}
for (const id of ids) $(id).addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 200); });
$("f").addEventListener("submit", (ev) => { ev.preventDefault(); run(); });
$("preset").addEventListener("change", (ev) => {
  const v = ev.target.value; if (!v) return;
  const [a, f] = v.split(","); $("aperture").value = a; $("focalLength").value = f; run();
});
run();
`;

export const Page = () => (
  <Layout
    title="Astronomy Calculator"
    lede="Magnification, exit pupil, true field of view, limiting magnitude and resolution for your telescope and eyepiece."
    script={script}
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
