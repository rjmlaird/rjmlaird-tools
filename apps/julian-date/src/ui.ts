// Client script for the tool, served as /julian-date/app.js so the CSP can stay at 'self'
// (no inline script). Styling comes from the shared brand layer in @rjmlaird/ui.

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
  api.textContent = location.origin + '/julian-date/api/convert?' + p;
  out.replaceChildren();
  err.hidden = true;
  try {
    const res = await fetch('/julian-date/api/convert?' + p);
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
    err.focus();
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
