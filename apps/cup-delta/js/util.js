// Small pure helpers shared by the engine, the store and the UI.

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function parseNum(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** "2:30" or "150" -> seconds. Blank -> null. Invalid -> NaN. */
export function parseDuration(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? Math.round(v) : NaN;
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s));
  return NaN;
}

export function formatDuration(sec) {
  if (sec === null || sec === undefined || Number.isNaN(sec)) return '—';
  if (sec < 60) return `${sec} s`;
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** Text for an input box: seconds under a minute, otherwise m:ss. */
export function durationInputValue(sec) {
  if (sec === null || sec === undefined) return '';
  return sec < 60 ? String(sec) : formatDuration(sec);
}

export function formatTimeRange([lo, hi]) {
  if (hi < 60) return `${lo}–${hi} s`;
  return `${formatDuration(lo)}–${formatDuration(hi)}`;
}

export const round2 = (n) => Math.round(n * 100) / 100;

export function signed(n, unit = '') {
  const r = round2(n);
  if (r === 0) return `0${unit}`;
  return `${r > 0 ? '+' : '−'}${Math.abs(r)}${unit}`;
}

export function list(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function localDateISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function daysBetween(fromISO, toISO) {
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(fromISO || '');
  const b = /^(\d{4})-(\d{2})-(\d{2})/.exec(toISO || '');
  if (!a || !b) return null;
  const ms = Date.UTC(+b[1], +b[2] - 1, +b[3]) - Date.UTC(+a[1], +a[2] - 1, +a[3]);
  return Math.round(ms / 86400000);
}

export function fmtDate(iso, withTime = false) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const opts = withTime
    ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat(undefined, opts).format(d);
}
