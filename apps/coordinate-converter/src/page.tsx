import { Layout } from "@rjmlaird/ui";

const css = `
.copy-row { display: grid; grid-template-columns: 1fr auto; gap: .25rem .75rem; align-items: center; padding: .55rem 0; border-bottom: 1px solid var(--border); }
.copy-row:last-child { border-bottom: 0; }
.copy-row .lab { grid-column: 1 / -1; }
.copy-row code { font-size: 1rem; overflow-wrap: anywhere; }
.copy-row button { min-height: 36px; padding: .25rem .75rem; font-size: .85rem; }
.chips { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .75rem; }
.chips button { min-height: 36px; padding: .25rem .75rem; font-size: .85rem; border-radius: 999px; }
`;

const script = `
const BASE = "/coordinate-converter";
const $ = (id) => document.getElementById(id);
const out = $("out"), err = $("err"), input = $("input"), format = $("format");
const NAMES = { latlon: "latitude and longitude", bng: "British National Grid easting and northing", gridref: "grid reference", webmercator: "Web Mercator" };

function addRow(parent, label, value) {
  const row = document.createElement("div"); row.className = "copy-row";
  const lab = document.createElement("div"); lab.className = "lab"; lab.textContent = label;
  const code = document.createElement("code"); code.textContent = value;
  const btn = document.createElement("button"); btn.type = "button"; btn.textContent = "Copy";
  btn.setAttribute("aria-label", "Copy " + label);
  btn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(value); btn.textContent = "Copied"; } catch { btn.textContent = "Select and copy"; }
    setTimeout(() => (btn.textContent = "Copy"), 1500);
  });
  row.append(lab, code, btn); parent.append(row);
}
function show(j) {
  out.replaceChildren();
  const d = document.createElement("p"); d.className = "muted small";
  d.textContent = "Read as " + NAMES[j.detectedFormat] + ".";
  out.append(d);
  addRow(out, "Decimal degrees (WGS84)", j.wgs84.decimal);
  addRow(out, "Degrees, minutes, seconds", j.wgs84.dms);
  addRow(out, "Degrees, decimal minutes", j.wgs84.ddm);
  if (j.bng) {
    addRow(out, "British National Grid (easting, northing, metres)", j.bng.easting.toFixed(0) + ", " + j.bng.northing.toFixed(0));
    addRow(out, "Grid reference, 10 digits (1 m)", j.bng.gridRef);
    addRow(out, "Grid reference, 8 digits (10 m)", j.bng.gridRef8);
    addRow(out, "Grid reference, 6 digits (100 m)", j.bng.gridRef6);
  }
  if (j.webMercator) addRow(out, "Web Mercator EPSG:3857 (x, y, metres)", j.webMercator.x.toFixed(0) + ", " + j.webMercator.y.toFixed(0));
  for (const n of j.notes) { const p = document.createElement("p"); p.className = "muted small"; p.textContent = n; out.append(p); }
}
async function run() {
  const v = input.value.trim();
  if (!v) { out.replaceChildren(); err.hidden = true; return; }
  const p = new URLSearchParams({ input: v, format: format.value });
  $("api").textContent = location.origin + BASE + "/api/convert?" + p;
  try {
    const res = await fetch(BASE + "/api/convert?" + p);
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "Request failed");
    err.hidden = true; input.removeAttribute("aria-invalid"); show(j);
  } catch (e) { out.replaceChildren(); err.textContent = e.message; err.hidden = false; input.setAttribute("aria-invalid", "true"); }
}
$("f").addEventListener("submit", (ev) => { ev.preventDefault(); run(); });
format.addEventListener("change", run);
for (const b of document.querySelectorAll("[data-ex]")) b.addEventListener("click", () => { input.value = b.dataset.ex; format.value = "auto"; run(); input.focus(); });
`;

export const Page = () => (
  <Layout
    title="Coordinate Converter"
    lede="Convert between latitude and longitude (decimal, degrees-minutes-seconds), British National Grid references and eastings and northings, and Web Mercator."
    css={css}
    script={script}
  >
    <section class="panel" aria-labelledby="in-h">
      <h2 id="in-h">Coordinate</h2>
      <form id="f" novalidate>
        <label for="input">Enter a coordinate</label>
        <input id="input" type="text" autocomplete="off" autocapitalize="off" spellcheck={false} aria-describedby="hint" placeholder="51.508, -0.128" />
        <p id="hint" class="muted small" style="margin:.4rem 0 0">
          Latitude and longitude (WGS84, as in GPS and web maps), a grid reference such as TQ 30 80, a National Grid
          easting and northing, or Web Mercator x and y.
        </p>
        <label for="format">Input format</label>
        <select id="format">
          <option value="auto">Detect automatically</option>
          <option value="latlon">Latitude and longitude</option>
          <option value="gridref">Grid reference</option>
          <option value="bng">National Grid easting and northing</option>
          <option value="webmercator">Web Mercator x and y</option>
        </select>
        <button class="btn-primary" type="submit">Convert</button>
      </form>
      <div class="chips" role="group" aria-label="Examples">
        <button type="button" data-ex="51.508, -0.128">Trafalgar Square</button>
        <button type="button" data-ex="51°30′28.8″N 0°07′40.8″W">DMS</button>
        <button type="button" data-ex="NN 166 712">Ben Nevis grid ref</button>
        <button type="button" data-ex="530047 180417">Easting and northing</button>
      </div>
      <p id="err" class="error" role="alert" hidden></p>
      <div id="out" class="result" aria-live="polite"></div>
    </section>

    <details>
      <summary>Accuracy and assumptions</summary>
      <ul>
        <li>Latitude and longitude are treated as WGS84, the datum used by GPS, web maps and most phones.</li>
        <li>
          National Grid conversion uses a 7-parameter Helmert datum shift and the OS Transverse Mercator projection on
          the Airy 1830 ellipsoid. That is typically within about 5 m. For survey work use the Ordnance Survey OSTN15
          transformation.
        </li>
        <li>Grid references are truncated, not rounded, and name the south-west corner of their square.</li>
        <li>Valid National Grid range: easting 0 to 700,000 m and northing 0 to 1,300,000 m (Great Britain, not Northern Ireland).</li>
        <li>Accepted lat/lon styles: <code>51.508, -0.128</code>, <code>51.508 N 0.128 W</code>, <code>51°30′28.8″N 0°07′40.8″W</code>, <code>51 30.48 N 0 7.68 W</code>.</li>
      </ul>
    </details>
    <details>
      <summary>Use this as an API</summary>
      <pre id="api"></pre>
      <p class="muted small">
        <code>GET /coordinate-converter/api/convert?input=…&amp;format=auto</code>. <code>format</code> is optional:
        auto, latlon, gridref, bng or webmercator.
      </p>
    </details>
  </Layout>
);
