// One cup: the diagnosis, the next change, how it compares with the cup it came from.

import * as store from '../store.js';
import { h } from './dom.js';
import { confidenceMeter, scaleReadout } from './controls.js';
import { diagnose } from '../diagnosis.js';
import { compareTastings } from '../compare.js';
import { methodById, ROAST_LEVELS, PROCESSES, GRIND_FEELS } from '../rules.js';
import { SCALES } from '../scales.js';
import { labelOf } from '../taxonomy.js';
import { fmtDate, formatDuration, list, round2 } from '../util.js';

const pick = (pairs, v) => pairs.find(([id]) => id === v)?.[1] || '';

function facts(rows) {
  const used = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!used.length) return null;
  return h('dl', { class: 'facts' }, used.map(([k, v]) => [h('dt', null, k), h('dd', null, String(v))]));
}

export function renderCup(ctx, id) {
  const t = store.getTasting(id);
  if (!t) {
    return {
      el: h('div', { class: 'view' },
        h('h1', { tabindex: '-1' }, 'Cup not found'),
        h('p', null, 'It may have been deleted or imported from a different file.'),
        h('a', { class: 'btn primary', href: '#cups' }, 'See all cups')),
    };
  }
  const settings = store.state.settings;
  const coffee = store.getCoffee(t.coffeeId);
  const d = diagnose(t, coffee, settings);
  const method = methodById(t.brew.method);
  const prev = t.basedOn ? store.getTasting(t.basedOn) : null;

  const bestBtn = h('button', {
    type: 'button', class: 'btn ghost', 'data-focus': 'best', 'aria-pressed': String(t.best),
    onclick: async () => { await store.toggleBest(t.id); ctx.rerender('[data-focus=best]'); },
  }, t.best ? '★ Best so far' : '☆ Mark as best so far');

  const nextLabel = d.next.lever === 'none' ? 'Brew another cup' : 'Brew the next cup with this change';
  const diag = h('section', { class: 'card diag', 'aria-labelledby': 'diag-h' },
    h('p', { class: 'label', id: 'diag-h' }, 'Diagnosis'),
    h('h2', { class: 'diag-title' }, d.title),
    h('p', null, d.summary),
    confidenceMeter(d.confidence),
    d.missing.length ? h('p', { class: 'hint' }, `To firm this up, add ${list(d.missing)} next time.`) : null,
    d.evidence.length ? h('div', null, h('p', { class: 'label' }, 'Evidence'), h('ul', { class: 'plain' }, d.evidence.map((e) => h('li', null, e)))) : null,
    h('div', { class: 'next' },
      h('p', { class: 'label' }, 'Next change'),
      h('p', { class: 'next-text' }, d.next.text),
      h('p', { class: 'label' }, 'Expected result'),
      h('p', null, d.tradeoff)),
    d.note ? h('p', { class: 'hint' }, d.note) : null,
    d.others.length ? h('p', { class: 'hint' }, `Also possible: ${list(d.others.map((o) => o.title.toLowerCase()))}.`) : null,
    h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => ctx.startNext(t.id) }, nextLabel)));

  let versus = null;
  if (prev) {
    const cmp = compareTastings(prev, t, settings);
    versus = h('section', { class: 'card', 'aria-labelledby': 'vs-h' },
      h('p', { class: 'label', id: 'vs-h' }, `Compared with the cup from ${fmtDate(prev.createdAt)}`),
      cmp.levers.length
        ? h('ul', { class: 'plain' }, cmp.levers.map((c) => h('li', null, `${c.label}: ${c.from} → ${c.to}${c.delta ? ` (${c.delta})` : ''}`)))
        : null,
      h('p', null, cmp.interpretation),
      h('div', { class: 'actions' },
        h('button', {
          type: 'button', class: 'btn ghost',
          onclick: () => { ctx.compareSel = { coffeeId: t.coffeeId, a: prev.id, b: t.id }; ctx.navigate('compare'); },
        }, 'Open full comparison')));
  }

  const ratio = t.brew.dose > 0 && t.brew.water > 0 ? `1:${round2(t.brew.water / t.brew.dose)}` : '';
  const brewFacts = facts([
    ['Method', method.label],
    ['Dose', t.brew.dose ? `${t.brew.dose} g` : ''],
    ['Water', t.brew.water ? `${t.brew.water} g` : ''],
    ['Ratio', ratio],
    ['Grind', [t.brew.grind, pick(GRIND_FEELS, t.brew.grindFeel)].filter(Boolean).join(' · ')],
    ['Temperature', t.brew.temp !== null ? `${t.brew.temp} °C` : ''],
    ['Brew time', t.brew.time !== null ? formatDuration(t.brew.time) : ''],
    ['Days after roast', t.brew.beanAge],
    ['Grinder', t.brew.grinder],
    ['Filter', t.brew.filter],
    ['Water profile', t.brew.waterProfile],
  ]);
  const coffeeFacts = coffee ? facts([
    ['Roaster', coffee.roaster], ['Origin', coffee.origin], ['Variety', coffee.variety],
    ['Process', pick(PROCESSES, coffee.process)], ['Roast', pick(ROAST_LEVELS, coffee.roastLevel)], ['Roast date', coffee.roastDate],
  ]) : null;

  const record = h('section', { class: 'card', 'aria-labelledby': 'rec-h' },
    h('p', { class: 'label', id: 'rec-h' }, 'The cup'),
    t.descriptors.length
      ? h('ul', { class: 'chips static' }, t.descriptors.map((x) => h('li', { class: 'chip' }, labelOf(x))))
      : h('p', { class: 'hint' }, 'No notes picked.'),
    h('div', { class: 'readouts' },
      SCALES.map((s) => scaleReadout(s, t.ratings[s.key])),
      h('div', { class: 'readout' },
        h('span', { class: 'label' }, 'Overall (1–5)'),
        h('span', { class: 'readout-val' }, t.preference ? `${t.preference} of 5` : 'Not rated'))),
    t.note ? h('p', { class: 'note-text' }, t.note) : null);

  const delHost = h('div', { class: 'actions' });
  const delBtn = h('button', { type: 'button', class: 'btn danger-ghost', onclick: askDelete }, 'Delete this cup');
  delHost.append(delBtn);
  function askDelete() {
    delHost.replaceChildren(
      h('p', { class: 'warn', role: 'alert' }, 'Delete this cup from this device? This cannot be undone.'),
      h('button', {
        type: 'button', class: 'btn danger',
        onclick: async () => { await store.deleteTasting(t.id); ctx.navigate('cups'); },
      }, 'Delete cup'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { delHost.replaceChildren(delBtn); delBtn.focus(); } }, 'Keep it'));
    delHost.querySelector('.danger').focus();
  }

  return {
    el: h('div', { class: 'view' },
      h('header', { class: 'cup-head' },
        h('div', null,
          h('p', { class: 'label' }, `${method.label} · ${fmtDate(t.createdAt, true)}`),
          h('h1', { tabindex: '-1' }, store.coffeeName(coffee)),
          coffee?.roaster ? h('p', { class: 'hint' }, coffee.roaster) : null),
        bestBtn),
      diag, versus, record,
      brewFacts || coffeeFacts
        ? h('section', { class: 'card', 'aria-labelledby': 'brew-h' },
          h('p', { class: 'label', id: 'brew-h' }, 'Brew and coffee'), brewFacts, coffeeFacts)
        : null,
      delHost),
  };
}
