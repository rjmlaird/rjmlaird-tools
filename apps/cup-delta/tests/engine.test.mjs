import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { diagnose } from '../js/diagnosis.js';
import { compareTastings } from '../js/compare.js';
import { DESCRIPTORS, FAMILIES, byId } from '../js/taxonomy.js';
import { GROUPS } from '../js/rules.js';
import { parseDuration, formatDuration } from '../js/util.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const cup = (over = {}) => ({
  id: 'x', coffeeId: 'c', createdAt: '2026-10-01T08:00:00Z', best: false, descriptors: [],
  ratings: { sourBitter: null, body: null, clean: null, love: null }, preference: null,
  ...over,
  brew: { method: 'pourover', dose: null, water: null, grind: '', grindFeel: '', temp: null, time: null, beanAge: null, ...(over.brew || {}) },
});

test('taxonomy is 60–90 original descriptors with unique ids and three levels', () => {
  assert.ok(DESCRIPTORS.length >= 60 && DESCRIPTORS.length <= 90, `got ${DESCRIPTORS.length}`);
  assert.equal(new Set(DESCRIPTORS.map((d) => d.id)).size, DESCRIPTORS.length);
  assert.ok(FAMILIES.length >= 8);
  for (const f of FAMILIES) for (const s of f.subs) assert.ok(s.items.length > 0);
});

test('every descriptor id used by a rule exists in the taxonomy', () => {
  for (const [name, ids] of Object.entries(GROUPS)) {
    if (!Array.isArray(ids)) continue;
    if (name === 'fruityProcesses') continue;
    for (const id of ids) assert.ok(byId[id], `${name}: unknown descriptor ${id}`);
  }
});

test('duration parsing', () => {
  assert.equal(parseDuration('2:30'), 150);
  assert.equal(parseDuration('150'), 150);
  assert.equal(parseDuration(''), null);
  assert.ok(Number.isNaN(parseDuration('abc')));
  assert.equal(formatDuration(150), '2:30');
  assert.equal(formatDuration(28), '28 s');
});

test('under-extraction: sour, thin, coarse grind, short time -> medium confidence, finer grind', () => {
  const d = diagnose(cup({
    ratings: { sourBitter: -2, body: -1, clean: null, love: null },
    brew: { grind: '20', grindFeel: 'coarse', time: 115 },
  }), {});
  assert.equal(d.id, 'under');
  assert.match(d.title, /under-extracted/);
  assert.match(d.summary, /sour and thin/);
  assert.match(d.summary, /short brew time/);
  assert.match(d.summary, /coarse grind/);
  assert.ok(['medium', 'high'].includes(d.confidence));
  assert.match(d.next.text, /one step finer \(setting 20 → 19\)/);
  assert.deepEqual(d.next.apply, { field: 'grind', value: '19' });
  assert.match(d.tradeoff, /sweetness and body/);
  assert.ok(d.evidence.length >= 3);
});

test('grind direction setting flips the suggested setting', () => {
  const d = diagnose(cup({
    ratings: { sourBitter: -2, body: -1, clean: null, love: null },
    brew: { grind: '20', grindFeel: 'coarse', time: 115 },
  }), {}, { higherCoarser: false });
  assert.deepEqual(d.next.apply, { field: 'grind', value: '21' });
});

test('over-extraction: bitter and drying, long time, hot water -> coarser or cooler', () => {
  const d = diagnose(cup({
    descriptors: ['drying', 'harsh'],
    ratings: { sourBitter: 2, body: null, clean: null, love: -1 },
    brew: { grind: '12', grindFeel: 'fine', time: 270, temp: 99 },
  }), {});
  assert.equal(d.id, 'over');
  assert.equal(d.confidence, 'high');
  assert.match(d.next.text, /coarser/);
});

test('over-extraction with hot water and no grind note suggests cooler water', () => {
  const d = diagnose(cup({
    ratings: { sourBitter: 2, body: null, clean: null, love: null },
    brew: { temp: 99, time: 180 },
  }), {});
  assert.equal(d.id, 'over');
  assert.equal(d.next.lever, 'temp');
  assert.deepEqual(d.next.apply, { field: 'temp', value: '97' });
});

test('stale: papery notes with an old roast date', () => {
  const d = diagnose(cup({
    descriptors: ['papery', 'flat'],
    ratings: { sourBitter: null, body: -1, clean: null, love: -1 },
    brew: { beanAge: 61 },
  }), {});
  assert.equal(d.id, 'stale');
  assert.equal(d.next.lever, 'beans');
  assert.ok(d.evidence.some((e) => /61 days/.test(e)));
});

test('roast-driven: smoky and ashy with a dark roast', () => {
  const d = diagnose(cup({
    descriptors: ['smoky', 'ashy'],
    ratings: { sourBitter: 1, body: null, clean: null, love: null },
    brew: { temp: 95 },
  }), { roastLevel: 'dark' });
  assert.equal(d.id, 'roast');
  assert.equal(d.next.lever, 'temp');
  assert.deepEqual(d.next.apply, { field: 'temp', value: '92' });
});

test('roast notes with a light roast are not blamed on the roast', () => {
  const d = diagnose(cup({ descriptors: ['smoky'], ratings: { sourBitter: null, body: null, clean: null, love: null } }), { roastLevel: 'light' });
  assert.notEqual(d.id, 'roast');
});

test('process: winey and fruity notes in a natural', () => {
  const d = diagnose(cup({
    descriptors: ['winey', 'blueberry', 'strawberry'],
    ratings: { sourBitter: null, body: null, clean: null, love: 2 },
    preference: 5,
  }), { process: 'natural' });
  assert.equal(d.id, 'process');
  assert.equal(d.next.lever, 'none');
  assert.ok(d.note);
});

test('fermented notes in a washed coffee are flagged, not praised', () => {
  const d = diagnose(cup({ descriptors: ['funky', 'boozy'] }), { process: 'washed' });
  assert.equal(d.id, 'process');
  assert.match(d.title, /washed/i);
  assert.equal(d.confidence, 'low');
});

test('insufficient data asks for another brew instead of guessing', () => {
  const d = diagnose(cup({ ratings: { sourBitter: -1, body: null, clean: null, love: null } }), {});
  assert.equal(d.id, 'insufficient');
  assert.equal(d.confidence, 'low');
  assert.match(d.next.text, /once more/);
  const empty = diagnose(cup(), {});
  assert.equal(empty.id, 'insufficient');
});

test('sour and astringent together is reported as mixed signals, low confidence', () => {
  const d = diagnose(cup({
    descriptors: ['sour', 'vinegary', 'astringent', 'drying'],
    ratings: { sourBitter: null, body: null, clean: null, love: null },
    brew: { time: 110, grindFeel: 'fine', temp: 98 },
  }), {});
  assert.equal(d.id, 'mixed');
  assert.equal(d.confidence, 'low');
});

test('compare: single finer-grind change that raised bitterness and lowered the rating', () => {
  const a = cup({ id: 'a', brew: { grind: '20', temp: 94, time: 180 }, ratings: { sourBitter: -1, body: -1, clean: null, love: 0 }, preference: 3 });
  const b = cup({ id: 'b', brew: { grind: '19', temp: 94, time: 180 }, ratings: { sourBitter: 1, body: 0, clean: null, love: -1 }, preference: 2 });
  const c = compareTastings(a, b, {});
  assert.equal(c.levers.length, 1);
  assert.equal(c.changes[0].phrase, 'A finer grind');
  assert.match(c.interpretation, /A finer grind pushed the cup toward bitter/);
  assert.match(c.interpretation, /Revert, or reduce extraction slightly/);
});

test('compare: several changes are not attributed to one cause', () => {
  const a = cup({ id: 'a', brew: { grind: '20', temp: 92 }, preference: 3 });
  const b = cup({ id: 'b', brew: { grind: '18', temp: 96 }, preference: 4 });
  const c = compareTastings(a, b, {});
  assert.equal(c.levers.length, 2);
  assert.match(c.interpretation, /Several things changed/);
});

test('compare: identical recipes say any difference is noise', () => {
  const a = cup({ id: 'a', brew: { grind: '20' } });
  const b = cup({ id: 'b', brew: { grind: '20' } });
  assert.match(compareTastings(a, b, {}).interpretation, /No brew variable changed/);
});

test('service worker precache list matches the files on disk', () => {
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  const listed = [...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]);
  for (const f of listed) {
    if (f === '') continue;
    assert.doesNotThrow(() => readFileSync(join(root, f)), `sw.js lists missing file ${f}`);
  }
  for (const f of readdirSync(join(root, 'js')).filter((n) => n.endsWith('.js'))) {
    assert.ok(listed.includes(`js/${f}`), `js/${f} missing from sw.js precache`);
  }
  for (const f of readdirSync(join(root, 'js/ui')).filter((n) => n.endsWith('.js'))) {
    assert.ok(listed.includes(`js/ui/${f}`), `js/ui/${f} missing from sw.js precache`);
  }
});
