import { Layout } from "@rjmlaird/ui";
import { Hono } from "hono";

// Posts to the absolute path so it works with or without a trailing slash.
const script = `
const form = document.getElementById("f");
const out = document.getElementById("out");
const raw = document.getElementById("raw");
const fmtDur = (s) => {
  const t = Math.round(s), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return [h && h + "h", (h || m) && m + "m", sec + "s"].filter(Boolean).join(" ");
};
const n = (v, d) => Number(v).toLocaleString("en-GB", { maximumFractionDigits: d });
function row(label, text, cls) {
  const dt = document.createElement("dt"); dt.textContent = label;
  const dd = document.createElement("dd"); dd.textContent = text; if (cls) dd.className = cls;
  out.append(dt, dd);
}
form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const body = Object.fromEntries(new FormData(form));
  out.replaceChildren();
  out.className = "result";
  const res = await fetch("/orbital-calc/calculate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  raw.textContent = JSON.stringify(j, null, 2);
  if (!res.ok) { out.className = "result error"; out.textContent = j.error || "Request failed."; return; }
  const dl = document.createElement("dl"); dl.className = "kv"; out.replaceChildren(dl);
  const add = (l, t, c) => { const dt = document.createElement("dt"); dt.textContent = l; const dd = document.createElement("dd"); dd.textContent = t; if (c) dd.className = c; dl.append(dt, dd); };
  add("Period", fmtDur(j.periodSeconds) + " (" + n(j.periodSeconds, 1) + " s)", "lead");
  add("Periapsis radius", n(j.periapsisKm, 3) + " km");
  add("Apoapsis radius", n(j.apoapsisKm, 3) + " km");
  add("Speed at periapsis", n(j.periapsisVelocityKmS, 4) + " km/s");
  add("Speed at apoapsis", n(j.apoapsisVelocityKmS, 4) + " km/s");
  add("Circular speed at a", n(j.meanVelocityKmS, 4) + " km/s");
});
`;

export const pageRoute = new Hono();

pageRoute.get("/", (c) =>
  c.html(
    <Layout
      title="Orbital Calculator"
      lede="Two-body orbit parameters from a semi-major axis and eccentricity, using the vis-viva equation. Defaults to Earth’s gravitational parameter."
      script={script}
    >
      <section class="panel" aria-labelledby="in-h">
        <h2 id="in-h">Orbit</h2>
        <form id="f">
          <label for="a">Semi-major axis a (km)</label>
          <input id="a" name="a" type="number" step="any" min="0" value="6778" required />
          <label for="e">Eccentricity e (0 ≤ e &lt; 1)</label>
          <input id="e" name="e" type="number" step="any" value="0" min="0" max="0.999999" required />
          <button class="btn-primary" type="submit">Calculate</button>
        </form>
        <div id="out" class="result" aria-live="polite">
          <span class="muted">Enter an orbit and choose Calculate.</span>
        </div>
        <details>
          <summary>JSON response</summary>
          <pre id="raw" aria-live="polite"></pre>
          <p class="muted small">
            API: <code>GET /orbital-calc/calculate?a=6778&amp;e=0.001</code>, optional <code>mu</code> (km³/s²).
          </p>
        </details>
      </section>
    </Layout>,
  ),
);
