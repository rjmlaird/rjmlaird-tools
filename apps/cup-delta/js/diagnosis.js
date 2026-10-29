// Rule-based diagnosis. No machine learning, no hidden state: each rule adds points
// for evidence it can name, and the result lists that evidence back to the person.
// Thresholds and weights live in rules.js.

import {
  methodById, GROUPS, STALE_DAYS, WEIGHTS as W, MIN_REPORT, CONFIDENCE, SLIGHT_BELOW,
  STEPS, ROAST_LEVELS, PROCESSES,
} from './rules.js';
import { labelOf } from './taxonomy.js';
import { scaleLabel } from './scales.js';
import { parseNum, formatDuration, formatTimeRange, list, round2 } from './util.js';

// ---------------------------------------------------------------- context

export function buildContext(t, coffee, settings = {}) {
  const b = t.brew || {};
  const r = t.ratings || {};
  const method = methodById(b.method);
  return {
    method,
    base: method.baseline,
    time: typeof b.time === 'number' ? b.time : null,
    temp: parseNum(b.temp),
    grind: parseNum(b.grind),
    grindFeel: b.grindFeel || null,
    age: parseNum(b.beanAge),
    sb: r.sourBitter ?? null,
    body: r.body ?? null,
    clean: r.clean ?? null,
    love: r.love ?? null,
    pref: t.preference ?? null,
    desc: new Set(t.descriptors || []),
    higherCoarser: settings.higherCoarser !== false,
    roast: coffee?.roastLevel || null,
    process: coffee?.process || null,
  };
}

const notes = (c, ids) => ids.filter((id) => c.desc.has(id));
const lower = (ids) => ids.map((id) => labelOf(id).toLowerCase());
const roastLabel = (v) => ROAST_LEVELS.find(([id]) => id === v)?.[1] || v;
const processLabel = (v) => PROCESSES.find(([id]) => id === v)?.[1] || v;

// ---------------------------------------------------------------- rule scoring

function newRule(id) {
  return { id, score: 0, kinds: new Set(), evidence: [], reads: [], bits: [] };
}

function add(r, { pts = 0, kind, ev, read, bit }) {
  r.score += pts;
  if (pts > 0 && kind) r.kinds.add(kind);
  if (ev) r.evidence.push(ev);
  if (read) r.reads.push(...[].concat(read));
  if (bit) r.bits.push(bit);
}

function ruleUnder(c) {
  const r = newRule('under');
  if (c.sb !== null && c.sb < 0) {
    add(r, {
      pts: c.sb <= -2 ? W.ratingStrong : W.ratingMild, kind: 'sensory', read: 'sour',
      ev: `You rated the cup “${scaleLabel('sourBitter', c.sb).toLowerCase()}” on Sour ↔ Bitter.`,
    });
  }
  if (c.body !== null && c.body < 0) {
    add(r, {
      pts: c.body <= -2 ? W.bodyStrong : W.bodyMild, kind: 'sensory', read: 'thin',
      ev: `You rated the body “${scaleLabel('body', c.body).toLowerCase()}”.`,
    });
  }
  const n = notes(c, GROUPS.underNotes);
  if (n.length) {
    add(r, {
      pts: Math.min(W.noteCap, n.length * W.notePerItem), kind: 'sensory',
      ev: `Notes you picked: ${list(lower(n))}.`,
    });
  }
  const b = c.base;
  if (b && c.time !== null && c.time < b.time[0]) {
    add(r, {
      pts: W.timeOff, kind: 'brew', bit: 'a short brew time',
      ev: `Brew time ${formatDuration(c.time)} is shorter than the usual ${formatTimeRange(b.time)} for ${c.method.label.toLowerCase()}.`,
    });
  }
  if (c.grindFeel === 'coarse') {
    add(r, { pts: W.grindFeel, kind: 'brew', bit: 'a relatively coarse grind', ev: 'You noted the grind as coarse for this method.' });
  }
  if (b && c.temp !== null && c.temp < b.temp[0]) {
    add(r, {
      pts: W.tempOff, kind: 'brew', bit: 'cool water',
      ev: `Water at ${c.temp} °C is cooler than the usual ${b.temp[0]}–${b.temp[1]} °C.`,
    });
  }
  return r;
}

function ruleOver(c) {
  const r = newRule('over');
  if (c.sb !== null && c.sb > 0) {
    add(r, {
      pts: c.sb >= 2 ? W.ratingStrong : W.ratingMild, kind: 'sensory', read: 'bitter',
      ev: `You rated the cup “${scaleLabel('sourBitter', c.sb).toLowerCase()}” on Sour ↔ Bitter.`,
    });
  }
  const n = notes(c, GROUPS.overNotes);
  if (n.length) {
    add(r, {
      pts: Math.min(W.noteCap, n.length * W.notePerItem), kind: 'sensory', read: lower(n),
      ev: `Notes you picked: ${list(lower(n))}.`,
    });
  }
  const b = c.base;
  if (b && c.time !== null && c.time > b.time[1]) {
    add(r, {
      pts: W.timeOff, kind: 'brew', bit: 'a long brew time',
      ev: `Brew time ${formatDuration(c.time)} is longer than the usual ${formatTimeRange(b.time)} for ${c.method.label.toLowerCase()}.`,
    });
  }
  if (c.grindFeel === 'fine') {
    add(r, { pts: W.grindFeel, kind: 'brew', bit: 'a relatively fine grind', ev: 'You noted the grind as fine for this method.' });
  }
  if (b && c.temp !== null && c.temp > b.temp[1]) {
    add(r, {
      pts: W.tempOff, kind: 'brew', bit: 'hot water',
      ev: `Water at ${c.temp} °C is hotter than the usual ${b.temp[0]}–${b.temp[1]} °C.`,
    });
  }
  return r;
}

function ruleStale(c) {
  const r = newRule('stale');
  const n = notes(c, GROUPS.staleNotes);
  if (n.length) {
    add(r, {
      pts: Math.min(W.noteGroupCap, n.length * W.staleNotePerItem), kind: 'sensory', read: lower(n),
      ev: `Notes you picked: ${list(lower(n))}.`,
    });
  }
  const lowCup = (c.body !== null && c.body < 0) || (c.love !== null && c.love < 0);
  if (c.age !== null) {
    if (c.age >= STALE_DAYS.stale && (n.length || lowCup)) {
      add(r, {
        pts: W.ageStale, kind: 'age', bit: `beans ${c.age} days after roast`,
        ev: `The coffee is ${c.age} days past roast, beyond the usual 4–6 week window.`,
      });
    } else if (c.age >= STALE_DAYS.warn && n.length) {
      add(r, {
        pts: W.ageWarn, kind: 'age', bit: `beans ${c.age} days after roast`,
        ev: `The coffee is ${c.age} days past roast, and aroma fades as beans age.`,
      });
    }
  }
  return r;
}

function ruleRoast(c) {
  const r = newRule('roast');
  const n = notes(c, GROUPS.roastNotes);
  if (!n.length) return r;
  add(r, {
    pts: Math.min(W.noteGroupCap, n.length * W.roastNotePerItem), kind: 'sensory', read: lower(n),
    ev: `Notes you picked: ${list(lower(n))}.`,
  });
  const dark = GROUPS.darkRoasts[c.roast];
  if (dark) {
    add(r, {
      pts: dark, kind: 'roast', bit: `a ${roastLabel(c.roast).toLowerCase()} roast`,
      ev: `The roast level is ${roastLabel(c.roast).toLowerCase()}.`,
    });
  } else if (c.roast === 'light' || c.roast === 'medium-light') {
    add(r, {
      pts: -1.5,
      ev: `Smoky or ashy notes are unusual in a ${roastLabel(c.roast).toLowerCase()} roast, so check the brew and the equipment too.`,
    });
  }
  return r;
}

function ruleProcess(c) {
  const f = notes(c, GROUPS.fermentNotes);
  const fruit = notes(c, GROUPS.processFruit);
  const fruity = GROUPS.fruityProcesses.includes(c.process);
  if (!f.length && !fruity) return newRule('process');
  const r = newRule('process');
  if (f.length) {
    add(r, {
      pts: Math.min(W.noteGroupCap, f.length * W.fermentNotePerItem), kind: 'sensory', read: lower(f),
      ev: `Notes you picked: ${list(lower(f))}.`,
    });
  }
  if (fruity) {
    add(r, {
      pts: W.processMatch, kind: 'process', bit: `a ${processLabel(c.process).toLowerCase()} process`,
      ev: `The process is ${processLabel(c.process).toLowerCase()}, which often brings ferment-style fruit.`,
    });
    if (fruit.length >= 2) {
      add(r, {
        pts: W.processFruit, kind: 'sensory', read: lower(fruit.slice(0, 3)),
        ev: `Fruit notes you picked: ${list(lower(fruit))}.`,
      });
    }
  }
  return r;
}

// ---------------------------------------------------------------- next-change helpers

function summarise(reads, bits, lead = 'Your cup reads') {
  const rs = [...new Set(reads)];
  const bs = [...new Set(bits)];
  if (rs.length && bs.length) return `${lead} ${list(rs)}, with ${list(bs)}.`;
  if (rs.length) return `${lead} ${list(rs)}.`;
  if (bs.length) return `The brew shows ${list(bs)}.`;
  return '';
}

const SAME = 'keeping every other variable the same';

function grindNext(c, finer) {
  const word = finer ? 'finer' : 'coarser';
  const tradeoff = finer
    ? 'More sweetness and body; watch for increased bitterness and drying.'
    : 'Less bitterness and drying; sweetness and body may lift, but go too far and the cup turns sour and thin.';
  if (c.grind !== null) {
    const to = round2(c.grind + (finer ? -1 : 1) * (c.higherCoarser ? 1 : -1) * STEPS.grind);
    return {
      text: `Grind one step ${word} (setting ${c.grind} → ${to}), ${SAME}.`,
      lever: 'grind', apply: { field: 'grind', value: String(to) }, tradeoff,
    };
  }
  return { text: `Grind one step ${word}, ${SAME}.`, lever: 'grind', apply: null, tradeoff };
}

function tempNext(c, delta, tradeoff) {
  const to = c.temp !== null ? round2(c.temp + delta) : null;
  return {
    text: `Brew with water ${Math.abs(delta)} °C ${delta > 0 ? 'hotter' : 'cooler'}${to !== null ? ` (${c.temp} → ${to} °C)` : ''}, ${SAME}.`,
    lever: 'temp', apply: to !== null ? { field: 'temp', value: String(to) } : null,
    tradeoff: tradeoff || (delta > 0
      ? 'A rounder, sweeter cup; watch for more bitterness if you are already near the top of the usual range.'
      : 'Less bitterness and roast edge; the cup can taste a little thinner and more acidic.'),
  };
}

function timeNext(c, delta) {
  const to = c.time !== null ? c.time + delta : null;
  return {
    text: `${delta > 0 ? 'Extend' : 'Shorten'} the brew by ${Math.abs(delta)} seconds${to !== null ? ` (${formatDuration(c.time)} → ${formatDuration(to)})` : ''}, ${SAME}.`,
    lever: 'time', apply: to !== null ? { field: 'time', value: to } : null,
    tradeoff: delta > 0
      ? 'More sweetness and body; watch for increased bitterness.'
      : 'Less bitterness and drying; the cup may turn thinner and more sour.',
  };
}

// ---------------------------------------------------------------- describers

function describeUnder(r, c) {
  const slight = r.score < SLIGHT_BELOW;
  const b = c.base;
  const timeShort = b && c.time !== null && c.time < b.time[0];
  const tempLow = b && c.temp !== null && c.temp < b.temp[0];
  let next;
  if (tempLow && c.grindFeel !== 'coarse' && !timeShort) next = tempNext(c, STEPS.tempC);
  else if (timeShort && c.method.immersion && c.grindFeel !== 'coarse') next = timeNext(c, STEPS.timeSec);
  else next = grindNext(c, true);
  return {
    title: `Likely ${slight ? 'slightly ' : ''}under-extracted`,
    summary: summarise(r.reads, r.bits),
    next,
  };
}

function describeOver(r, c) {
  const slight = r.score < SLIGHT_BELOW;
  const b = c.base;
  const timeLong = b && c.time !== null && c.time > b.time[1];
  const tempHigh = b && c.temp !== null && c.temp > b.temp[1];
  let next;
  if (tempHigh && c.grindFeel !== 'fine' && !timeLong) next = tempNext(c, -STEPS.tempC);
  else if (timeLong && c.method.immersion && c.grindFeel !== 'fine') next = timeNext(c, -STEPS.timeSec);
  else next = grindNext(c, false);
  return {
    title: `Likely ${slight ? 'slightly ' : ''}over-extracted`,
    summary: summarise(r.reads, r.bits),
    next,
  };
}

function describeMixed(r) {
  return {
    title: 'Mixed signals: possibly uneven extraction',
    summary: 'Your cup shows signs of both under- and over-extraction. That often points to uneven extraction, for example from an uneven grind or water finding channels through the coffee.',
    next: {
      text: `Stir or swirl gently at the same point in every brew, ${SAME}.`,
      lever: 'technique', apply: null,
    },
    tradeoff: 'More even extraction, so sour and bitter notes stop showing up together. It adds a step you need to repeat every time.',
  };
}

function describeStale(r) {
  return {
    title: 'Likely stale coffee',
    summary: summarise(r.reads, r.bits),
    next: { text: `Brew a fresher bag (roasted in the last 2–4 weeks) with the same recipe.`, lever: 'beans', apply: null },
    tradeoff: 'More aroma and sweetness. Very fresh coffee can taste sharper and bloom more, so you may need a slightly coarser grind.',
  };
}

function describeRoast(r, c) {
  const next = tempNext(c, -STEPS.roastTempC,
    'Less smoky bitterness; body and sweetness may thin a little and acidity can stand out more.');
  return {
    title: 'Likely roast-driven profile',
    summary: `${summarise(r.reads, r.bits)} Notes like these usually come from the roast itself rather than the brew.`,
    next,
  };
}

function describeProcess(r, c) {
  const fruity = GROUPS.fruityProcesses.includes(c.process);
  const liked = (c.pref !== null && c.pref >= 4) || (c.love !== null && c.love >= 1);
  if (!fruity && c.process === 'washed') {
    return {
      title: 'Fermented notes in a washed coffee',
      summary: `${summarise(r.reads, r.bits)} Washed coffees are normally cleaner, so these notes may come from a processing fault or from old beans.`,
      next: { text: 'Brew the same recipe once more, ideally from a fresher bag, to check whether the notes repeat.', lever: 'repeat', apply: null },
      tradeoff: 'You find out whether the notes belong to the coffee or to this bag before you change the recipe.',
    };
  }
  const summary = `${summarise(r.reads, r.bits)} These notes usually come from how the coffee was processed, not from the brew.`;
  if (liked) {
    return {
      title: 'Likely process-driven fermentation character',
      summary,
      next: { text: 'Keep this recipe and mark the cup as best so far.', lever: 'none', apply: null },
      tradeoff: 'Nothing changes, so you keep the character you enjoy. Use later cups to test one variable at a time.',
    };
  }
  return {
    title: 'Likely process-driven fermentation character',
    summary,
    next: tempNext(c, -STEPS.tempC, 'Softer fermented, boozy notes and less intensity; the cup may lose some sweetness.'),
  };
}

const DESCRIBERS = {
  under: describeUnder, over: describeOver, mixed: describeMixed,
  stale: describeStale, roast: describeRoast, process: describeProcess,
};

// ---------------------------------------------------------------- confidence & gaps

export function confidenceOf(score, kindCount) {
  if (score >= CONFIDENCE.high.score && kindCount >= CONFIDENCE.high.kinds) return 'high';
  if (score >= CONFIDENCE.medium.score && kindCount >= CONFIDENCE.medium.kinds) return 'medium';
  if (score >= CONFIDENCE.mediumSingleKind.score) return 'medium';
  return 'low';
}

function missingFor(id, c) {
  const out = [];
  if (id === 'under' || id === 'over' || id === 'mixed') {
    if (c.time === null) out.push('brew time');
    if (c.grind === null && !c.grindFeel) out.push('grind');
    if (c.temp === null) out.push('water temperature');
  } else if (id === 'stale') {
    if (c.age === null) out.push('days after roast');
  } else if (id === 'roast') {
    if (!c.roast) out.push('roast level');
  } else if (id === 'process') {
    if (!c.process) out.push('process');
  }
  return out;
}

// ---------------------------------------------------------------- public API

/**
 * @returns {{ id:string, title:string, summary:string, confidence:'low'|'medium'|'high',
 *   evidence:string[], next:{text:string, lever:string, apply:object|null},
 *   tradeoff:string, others:{id:string,title:string}[], missing:string[],
 *   note:string|null, score:number }}
 */
export function diagnose(t, coffee, settings = {}) {
  const c = buildContext(t, coffee, settings);
  const under = ruleUnder(c);
  const over = ruleOver(c);
  const all = [under, over, ruleStale(c), ruleRoast(c), ruleProcess(c)];
  let found = all.filter((r) => r.score >= MIN_REPORT);

  if (under.score >= MIN_REPORT && over.score >= MIN_REPORT) {
    const mixed = newRule('mixed');
    mixed.score = Math.max(under.score, over.score);
    mixed.kinds = new Set([...under.kinds, ...over.kinds]);
    mixed.evidence = [...under.evidence, ...over.evidence];
    found = found.filter((r) => r.id !== 'under' && r.id !== 'over');
    found.push(mixed);
  }
  found.sort((a, b) => b.score - a.score);

  const praise = (c.pref !== null && c.pref >= 4) || (c.love !== null && c.love >= 2)
    ? 'You rated this cup highly. If it is what you wanted, mark it as best so far and change nothing.'
    : null;

  if (!found.length) {
    const seen = [...new Set(all.filter((r) => r.score > 0).flatMap((r) => r.evidence))];
    const missing = [];
    if (c.time === null) missing.push('brew time');
    if (c.grind === null && !c.grindFeel) missing.push('grind');
    if (!c.desc.size) missing.push('a few flavour notes');
    return {
      id: 'insufficient',
      title: 'Not enough to name a cause yet',
      summary: 'There is not enough here to say why the cup tasted this way. Guessing would send you in the wrong direction.',
      confidence: 'low',
      evidence: seen,
      next: {
        text: `Brew the same recipe once more${missing.length ? ` and add ${list(missing.slice(0, 2))} to both cups` : ''}.`,
        lever: 'repeat', apply: null,
      },
      tradeoff: 'A repeat shows how much of the difference is just noise, which makes your next single change easier to read.',
      others: [], missing, note: praise, score: 0,
    };
  }

  const primary = found[0];
  const d = DESCRIBERS[primary.id](primary, c);
  const { next, tradeoff } = d.next.tradeoff
    ? { next: d.next, tradeoff: d.next.tradeoff }
    : { next: d.next, tradeoff: d.tradeoff };
  const confidence = confidenceOf(primary.score, primary.kinds.size);
  return {
    id: primary.id,
    title: d.title,
    summary: d.summary,
    confidence: primary.id === 'mixed' ? 'low' : confidence,
    evidence: primary.evidence,
    next: { text: next.text, lever: next.lever, apply: next.apply },
    tradeoff,
    others: found.slice(1).map((r) => ({ id: r.id, title: DESCRIBERS[r.id](r, c).title })),
    missing: confidence === 'high' ? [] : missingFor(primary.id, c),
    note: praise,
    score: round2(primary.score),
  };
}
