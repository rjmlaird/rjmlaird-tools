// Static UI assets, served as separate files so the CSP can stay at 'self' (no inline script/style).

export const PAGE_HTML = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Julian date and sidereal time converter</title>
<meta name="description" content="Convert between UTC, Julian date, modified Julian date and Unix time, and calculate Greenwich and local mean sidereal time.">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<main>
  <p class="back"><a href="https://rjmlaird.co.uk/tools/">All tools</a></p>
  <h1>Julian date and sidereal time</h1>
  <p class="lede">Convert between UTC, Julian date, modified Julian date and Unix time, and get mean sidereal time at Greenwich or at a longitude of your choice.</p>

  <form id="f" novalidate>
    <label for="kind">Convert from</label>
    <select id="kind">
      <option value="now">The current time</option>
      <option value="utc">UTC date and time (ISO 8601)</option>
      <option value="jd">Julian date</option>
      <option value="mjd">Modified Julian date</option>
      <option value="unix">Unix time (seconds)</option>
    </select>

    <label for="value">Value</label>
    <input id="value" autocomplete="off" autocapitalize="off" spellcheck="false">

    <label for="lon">Longitude in degrees east <span class="opt">(optional, west is negative)</span></label>
    <input id="lon" inputmode="decimal" autocomplete="off" placeholder="-1.13">

    <button type="submit">Convert</button>
  </form>

  <p id="err" role="alert" hidden></p>
  <dl id="out" aria-live="polite"></dl>

  <details>
    <summary>Use this as an API</summary>
    <pre id="api"></pre>
    <p>Send exactly one of <code>utc</code>, <code>jd</code>, <code>mjd</code>, <code>unix</code> or <code>now</code>, plus an optional <code>lon</code>. Encode <code>+</code> as <code>%2B</code> in UTC offsets.</p>
  </details>

  <details>
    <summary>Assumptions and limits</summary>
    <ul>
      <li>UTC is treated as 86,400 seconds per day, so leap seconds are ignored. Results are JD(UTC), not JD(TT).</li>
      <li>Sidereal time is mean sidereal time (no nutation), with UT1 approximated by UTC; the two differ by under 0.9 s.</li>
      <li>Dates before 1582-10-15 use the Julian calendar. Years run from -4712 to 9999, with 1 BC as year 0.</li>
      <li>Algorithms are from Meeus, Astronomical Algorithms, 2nd edition, chapters 7 and 12.</li>
    </ul>
  </details>
</main>
<script src="/app.js" defer></script>
</body>
</html>`;

export const PAGE_CSS = `
:root {
  color-scheme: light dark;
  --bg: #f5f7fa; --surface: #ffffff; --text: #1b2430; --muted: #53606f;
  --accent: #00606e; --border: #cfd6df; --focus: #0b57d0;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1620; --surface: #17212d; --text: #e6ebf1; --muted: #a3afbd;
    --accent: #5cc8d7; --border: #2c3a4a; --focus: #8ab4f8;
  }
}
* { box-sizing: border-box; }
html { background: var(--bg); }
body {
  margin: 0; color: var(--text); background: var(--bg);
  font: 1rem/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
main { max-width: 40rem; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
h1 { font-size: 1.75rem; line-height: 1.2; margin: 0.5rem 0 0.75rem; letter-spacing: -0.01em; }
.lede { color: var(--muted); margin: 0 0 1.5rem; max-width: 34rem; }
.back { margin: 0; }
a { color: var(--accent); }
a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible {
  outline: 3px solid var(--focus); outline-offset: 2px;
}
form { display: grid; gap: 0.35rem; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 1rem; }
label { font-weight: 600; margin-top: 0.6rem; }
label:first-child { margin-top: 0; }
.opt { font-weight: 400; color: var(--muted); }
input, select {
  font: inherit; color: inherit; background: var(--bg); border: 1px solid var(--border);
  border-radius: 4px; padding: 0.55rem 0.65rem; width: 100%; min-height: 2.75rem;
}
input:disabled { opacity: 0.55; }
button {
  font: inherit; font-weight: 600; margin-top: 1rem; min-height: 2.75rem; border: 0; border-radius: 4px;
  background: var(--accent); color: var(--bg); cursor: pointer;
}
#err { color: var(--text); border-left: 4px solid #b3261e; background: var(--surface); padding: 0.6rem 0.8rem; margin: 1rem 0 0; }
#out { margin: 1.5rem 0 0; display: grid; grid-template-columns: minmax(7rem, 11rem) 1fr; gap: 0.35rem 1rem; }
#out dt { color: var(--muted); }
#out dd { margin: 0; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
#out dd.lead { font-size: 1.5rem; line-height: 1.3; color: var(--accent); }
details { margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 0.75rem; }
summary { cursor: pointer; font-weight: 600; }
pre { overflow-x: auto; background: var(--surface); border: 1px solid var(--border); padding: 0.6rem; border-radius: 4px; }
code, pre { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 0.9em; }
@media (max-width: 30rem) { #out { grid-template-columns: 1fr; gap: 0; } #out dd { margin-bottom: 0.6rem; } }
`;

export const PAGE_JS = `
const $ = (id) => document.getElementById(id);
const kind = $('kind'), value = $('value'), lon = $('lon'), err = $('err'), out = $('out'), api = $('api');
const HINT = { now: '', utc: '2026-10-11T21:00:00Z', jd: '2461325.375', mjd: '61324.875', unix: '1791752400' };

function sync() {
  value.disabled = kind.value === 'now';
  value.placeholder = HINT[kind.value];
}

function row(label, text, cls) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = text;
  if (cls) dd.className = cls;
  out.append(dt, dd);
}

async function run() {
  const p = new URLSearchParams();
  if (kind.value === 'now') p.set('now', '1');
  else p.set(kind.value, value.value.trim());
  if (lon.value.trim()) p.set('lon', lon.value.trim());
  history.replaceState(null, '', '?' + p);
  api.textContent = location.origin + '/api/convert?' + p;
  out.replaceChildren();
  err.hidden = true;
  try {
    const res = await fetch('/api/convert?' + p);
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'The request failed.');
    row('Julian date', d.jd.toFixed(8), 'lead');
    row('Modified JD', d.mjd.toFixed(8));
    row('UTC', d.utc + (d.calendar === 'julian' ? ' (Julian calendar)' : ''));
    row('Unix time', String(d.unixSeconds) + ' s');
    row('GMST', d.gmst.hms + ' (' + d.gmst.degrees.toFixed(6) + '°)');
    if (d.lst) row('LMST at ' + d.lst.longitudeEastDegrees + '°E', d.lst.hms + ' (' + d.lst.degrees.toFixed(6) + '°)');
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}

$('f').addEventListener('submit', (e) => { e.preventDefault(); run(); });
kind.addEventListener('change', () => { sync(); if (kind.value === 'now') run(); });

const q = new URLSearchParams(location.search);
for (const k of ['utc', 'jd', 'mjd', 'unix', 'now']) {
  if (q.has(k)) { kind.value = k; value.value = q.get(k); break; }
}
if (q.has('lon')) lon.value = q.get('lon');
sync();
run();
`;
