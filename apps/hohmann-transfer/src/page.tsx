import { Layout } from "@rjmlaird/ui";
import { BODIES } from "./data/bodies";

const BASE = "/hohmann-transfer";

const script = `
const BASE = ${JSON.stringify(BASE)};
const $ = (id) => document.getElementById(id);
const f = $("f"), out = $("out"), body = $("body"), mu = $("mu");
const n = (v, d) => Number(v).toLocaleString("en-GB", { maximumFractionDigits: d });
function sync() { mu.disabled = body.value !== "custom"; mu.required = body.value === "custom"; }
body.addEventListener("change", sync); sync();
f.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const payload = { initialRadius: Number($("r1").value), finalRadius: Number($("r2").value) };
  if (body.value === "custom") payload.mu = Number(mu.value); else payload.body = body.value;
  out.className = "result"; out.replaceChildren();
  let res, j;
  try {
    res = await fetch(BASE + "/api/v1/hohmann", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    j = await res.json();
  } catch { out.className = "result error"; out.textContent = "Could not reach the calculator."; return; }
  if (!res.ok) {
    out.className = "result error";
    const fields = (j.error.fields || []).map((x) => x.message).join(" ");
    out.textContent = (fields || j.error.message);
    return;
  }
  const dl = document.createElement("dl"); dl.className = "kv";
  const add = (l, t, c) => { const dt = document.createElement("dt"); dt.textContent = l; const dd = document.createElement("dd"); dd.textContent = t; if (c) dd.className = c; dl.append(dt, dd); };
  add("Total delta-v", n(j.totalDeltaV, 4) + " km/s", "lead");
  add("Burn 1", n(j.burns.first.signedDeltaV, 4) + " km/s");
  add("Burn 2", n(j.burns.second.signedDeltaV, 4) + " km/s");
  add("Transfer time", n(j.transferTime.hours, 3) + " h (" + n(j.transferTime.days, 4) + " d)");
  add("Transfer type", j.transferType);
  out.replaceChildren(dl);
});
`;

export const Page = () => (
  <Layout
    title="Hohmann Transfer Calculator"
    lede="Delta-v and transfer time for an ideal two-impulse Hohmann transfer between two circular, coplanar orbits around one body."
    script={script}
  >
    <section class="panel" aria-labelledby="in-h">
      <h2 id="in-h">Transfer</h2>
      <form id="f" novalidate>
        <label for="body">Central body</label>
        <select id="body">
          {BODIES.map((b) => (
            <option value={b.id} selected={b.id === "earth"}>
              {b.name}
            </option>
          ))}
          <option value="custom">Custom (enter μ)</option>
        </select>
        <label for="mu">μ, gravitational parameter (km³/s²)</label>
        <input id="mu" type="number" step="any" min="0" disabled />
        <label for="r1">Initial orbit radius (km, from centre)</label>
        <input id="r1" type="number" step="any" min="0" value="6678.137" required />
        <label for="r2">Final orbit radius (km, from centre)</label>
        <input id="r2" type="number" step="any" min="0" value="42164.169" required />
        <button class="btn-primary" type="submit">Calculate</button>
      </form>
      <div id="out" class="result" aria-live="polite">
        <span class="muted">Defaults are low Earth orbit to geostationary.</span>
      </div>
    </section>
    <details>
      <summary>Assumptions and API</summary>
      <p class="muted">
        Idealised: circular coplanar orbits, instantaneous tangential burns. Launch windows, phasing,
        perturbations, finite burns and inclination changes are not modelled. Positive burns are prograde.
      </p>
      <p class="muted small">
        API: <code>POST /hohmann-transfer/api/v1/hohmann</code> with JSON{" "}
        <code>{"{"}"body":"earth","initialRadius":…,"finalRadius":…{"}"}</code>;{" "}
        <a href="/hohmann-transfer/api/v1/bodies">bodies</a>.
      </p>
    </details>
  </Layout>
);
