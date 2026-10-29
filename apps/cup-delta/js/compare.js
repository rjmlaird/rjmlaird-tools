// Cup Delta comparison: what changed between two cups, how the ratings moved,
// and a short plain-English reading of the result. Pure functions, no storage.

import { methodById } from './rules.js';
import { SCALES, scaleLabel } from './scales.js';
import { labelOf } from './taxonomy.js';
import { parseNum, formatDuration, signed, round2, list } from './util.js';

const GRIND_ORDER = { coarse: 0, medium: 1, fine: 2 };
const text = (v) => String(v ?? '').trim();

/** Brew variables that differ, flagged `lever: true` when they count as a deliberate change. */
export function diffBrew(a, b, settings = {}) {
  const hc = settings.higherCoarser !== false;
  const A = a.brew || {};
  const B = b.brew || {};
  const out = [];
  const push = (key, label, from, to, extra = {}) => out.push({ key, label, from, to, delta: null, lever: false, phrase: '', dir: 0, ...extra });

  if (A.method !== B.method) {
    push('method', 'Method', methodById(A.method).label, methodById(B.method).label, { lever: true, phrase: 'A different method' });
  }

  // grind: numeric setting first, then free text, then the relative feel
  const ga = parseNum(A.grind);
  const gb = parseNum(B.grind);
  let grindLever = false;
  if (ga !== null && gb !== null) {
    if (ga !== gb) {
      const coarser = (gb - ga) * (hc ? 1 : -1) > 0;
      push('grind', 'Grind setting', text(A.grind), text(B.grind), {
        delta: signed(gb - ga), lever: true, phrase: coarser ? 'A coarser grind' : 'A finer grind', dir: coarser ? -1 : 1,
      });
      grindLever = true;
    }
  } else if (text(A.grind) !== text(B.grind)) {
    push('grind', 'Grind setting', text(A.grind) || '—', text(B.grind) || '—', { lever: true, phrase: 'A different grind' });
    grindLever = true;
  }
  if (text(A.grindFeel) !== text(B.grindFeel) && (A.grindFeel || B.grindFeel)) {
    const fa = GRIND_ORDER[A.grindFeel];
    const fb = GRIND_ORDER[B.grindFeel];
    const known = fa !== undefined && fb !== undefined;
    push('grindFeel', 'Grind feel', text(A.grindFeel) || '—', text(B.grindFeel) || '—', {
      lever: !grindLever,
      phrase: known ? (fb > fa ? 'A finer grind' : 'A coarser grind') : 'A different grind',
      dir: known ? (fb > fa ? 1 : -1) : 0,
    });
  }

  const ta = parseNum(A.temp);
  const tb = parseNum(B.temp);
  if (ta !== null && tb !== null && ta !== tb) {
    push('temp', 'Water temperature', `${ta} °C`, `${tb} °C`, {
      delta: signed(tb - ta, ' °C'), lever: true, phrase: tb > ta ? 'Hotter water' : 'Cooler water', dir: tb > ta ? 1 : -1,
    });
  }

  if (typeof A.time === 'number' && typeof B.time === 'number' && A.time !== B.time) {
    push('time', 'Brew time', formatDuration(A.time), formatDuration(B.time), {
      delta: signed(B.time - A.time, ' s'), lever: true, phrase: B.time > A.time ? 'A longer brew' : 'A shorter brew', dir: B.time > A.time ? 1 : -1,
    });
  }

  const da = parseNum(A.dose);
  const wa = parseNum(A.water);
  const db = parseNum(B.dose);
  const wb = parseNum(B.water);
  const ra = da > 0 && wa > 0 ? wa / da : null;
  const rb = db > 0 && wb > 0 ? wb / db : null;
  if (ra !== null && rb !== null) {
    if (Math.abs(ra - rb) >= 0.05) {
      push('ratio', 'Ratio', `1:${round2(ra)}`, `1:${round2(rb)}`, {
        lever: true, phrase: rb > ra ? 'A wider ratio (more water per gram)' : 'A tighter ratio (less water per gram)',
      });
    }
    if (da !== db) push('dose', 'Dose', `${da} g`, `${db} g`, { delta: signed(db - da, ' g') });
    if (wa !== wb) push('water', 'Water', `${wa} g`, `${wb} g`, { delta: signed(wb - wa, ' g') });
  } else {
    if (da !== db && (da !== null || db !== null)) {
      push('dose', 'Dose', da === null ? '—' : `${da} g`, db === null ? '—' : `${db} g`, { lever: true, phrase: 'A different dose' });
    }
    if (wa !== wb && (wa !== null || wb !== null)) {
      push('water', 'Water', wa === null ? '—' : `${wa} g`, wb === null ? '—' : `${wb} g`, { lever: true, phrase: 'A different amount of water' });
    }
  }

  const aa = parseNum(A.beanAge);
  const ab = parseNum(B.beanAge);
  if (aa !== null && ab !== null && aa !== ab) {
    push('beanAge', 'Days after roast', String(aa), String(ab), {
      delta: signed(ab - aa, ' d'), lever: Math.abs(ab - aa) >= 3, phrase: ab > aa ? 'Older beans' : 'Fresher beans',
    });
  }

  for (const [key, label, phrase] of [
    ['grinder', 'Grinder', 'A different grinder'],
    ['filter', 'Filter', 'A different filter'],
    ['waterProfile', 'Water profile', 'A different water profile'],
  ]) {
    if (text(A[key]).toLowerCase() !== text(B[key]).toLowerCase()) {
      push(key, label, text(A[key]) || '—', text(B[key]) || '—', { lever: true, phrase });
    }
  }
  return out;
}

/** How each rating moved, as before / after / delta rows. */
export function diffSensory(a, b) {
  const rows = SCALES.map((s) => {
    const from = a.ratings?.[s.key] ?? null;
    const to = b.ratings?.[s.key] ?? null;
    const delta = from !== null && to !== null ? to - from : null;
    return {
      key: s.key, label: s.label,
      from: scaleLabel(s.key, from), to: scaleLabel(s.key, to),
      delta,
      words: delta === null ? 'Not rated on both' : delta === 0 ? 'No change' : delta > 0 ? s.up : s.down,
    };
  });
  const pa = a.preference ?? null;
  const pb = b.preference ?? null;
  const pd = pa !== null && pb !== null ? pb - pa : null;
  rows.push({
    key: 'preference', label: 'Overall (1–5)',
    from: pa === null ? '—' : `${pa}/5`, to: pb === null ? '—' : `${pb}/5`,
    delta: pd,
    words: pd === null ? 'Not rated on both' : pd === 0 ? 'No change' : pd > 0 ? 'Higher' : 'Lower',
  });
  return rows;
}

export function diffNotes(a, b) {
  const A = new Set(a.descriptors || []);
  const B = new Set(b.descriptors || []);
  return {
    added: [...B].filter((x) => !A.has(x)).map(labelOf),
    removed: [...A].filter((x) => !B.has(x)).map(labelOf),
    kept: [...B].filter((x) => A.has(x)).map(labelOf),
  };
}

function overallDelta(a, b) {
  if (a.preference != null && b.preference != null) return b.preference - a.preference;
  const la = a.ratings?.love ?? null;
  const lb = b.ratings?.love ?? null;
  return la !== null && lb !== null ? lb - la : null;
}

function interpret(levers, sens, o, notes) {
  const verdict = o === null ? 'unknown' : o >= 1 ? 'better' : o <= -1 ? 'worse' : 'same';
  const dsb = sens.find((r) => r.key === 'sourBitter')?.delta ?? null;
  const dbody = sens.find((r) => r.key === 'body')?.delta ?? null;
  const rated = verdict === 'better' ? 'You rated it higher.'
    : verdict === 'worse' ? 'You rated it lower.'
      : verdict === 'same' ? 'Your overall rating stayed the same.' : '';

  if (levers.length === 0) {
    return 'No brew variable changed between these cups, so any difference is probably noise. Brew it once more before drawing a conclusion.';
  }

  const effect = [];
  if (dsb !== null) {
    effect.push(dsb > 0 ? 'pushed the cup toward bitter' : dsb < 0 ? 'moved the cup toward sour' : 'left the sour–bitter balance where it was');
  }
  const bodyPart = dbody === null || dbody === 0 ? '' : dbody > 0 ? 'added body' : 'thinned the body';
  const effectText = [...effect, bodyPart].filter(Boolean);

  if (levers.length > 1) {
    const names = list(levers.map((l) => l.label.toLowerCase()));
    const result = effectText.length ? `The cup ${list(effectText)}.` : '';
    return `Several things changed (${names}), so the result cannot be pinned on one of them. ${result} ${rated} Next time change one thing and keep the rest the same.`
      .replace(/\s+/g, ' ').trim();
  }

  const L = levers[0];
  const lead = effectText.length
    ? `${L.phrase} ${list(effectText)}.`
    : `${L.phrase} was the only change, but the ratings do not show a clear effect.`;

  let advice;
  if (verdict === 'better') advice = 'Keep it and treat this cup as your new baseline.';
  else if (verdict === 'worse') {
    if (L.dir > 0 && dsb !== null && dsb > 0) advice = 'Revert, or reduce extraction slightly.';
    else if (L.dir < 0 && dsb !== null && dsb < 0) advice = 'Revert, or increase extraction slightly.';
    else advice = 'Revert to the earlier recipe.';
  } else if (verdict === 'same') advice = 'No clear gain. Revert, or try a different variable.';
  else advice = 'Rate both cups overall to see whether the change helped.';

  const gained = notes.added.length ? ` New notes: ${list(notes.added.map((n) => n.toLowerCase()))}.` : '';
  return `${lead} ${rated}${gained} ${advice}`.replace(/\s+/g, ' ').trim();
}

/**
 * Compare two tastings. `a` is the earlier cup, `b` the later one.
 */
export function compareTastings(a, b, settings = {}) {
  const changes = diffBrew(a, b, settings);
  const sensory = diffSensory(a, b);
  const notes = diffNotes(a, b);
  const levers = changes.filter((c) => c.lever);
  const o = overallDelta(a, b);
  return {
    changes,
    levers,
    sensory,
    notes,
    overall: o,
    best: b.best ? 'b' : a.best ? 'a' : null,
    interpretation: interpret(levers, sensory, o, notes),
  };
}
