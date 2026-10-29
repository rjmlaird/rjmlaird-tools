// "Compare" screen: pick two cups of the same coffee, see what changed and how it tasted.

import * as store from '../store.js';
import { h } from './dom.js';
import { compareTastings } from '../compare.js';
import { methodById } from '../rules.js';
import { fmtDate, list } from '../util.js';

const cupLabel = (t) => `${fmtDate(t.createdAt, true)} · ${methodById(t.brew.method).label}${t.best ? ' · best so far' : ''}`;

export function renderCompare(ctx) {
  const withTwo = store.state.coffees.filter((c) => store.tastingsFor(c.id).length >= 2);

  if (!withTwo.length) {
    return {
      el: h('div', { class: 'view' },
        h('h1', { tabindex: '-1' }, 'Compare two cups'),
        h('section', { class: 'card empty' },
          h('h2', null, 'You need two cups of the same coffee'),
          h('p', null, 'Log a cup, then brew it again with one change. Cup Delta lines the two up and says what the change did.'),
          h('div', { class: 'actions' },
            h('a', { class: 'btn primary', href: store.state.tastings.length ? '#cups' : '#taste' }, store.state.tastings.length ? 'Open your cups' : 'Log a cup')))),
    };
  }

  let sel = ctx.compareSel;
  if (!sel || !withTwo.some((c) => c.id === sel.coffeeId)) {
    const c = withTwo[0];
    const cups = store.tastingsFor(c.id);
    sel = { coffeeId: c.id, a: cups[cups.length - 2].id, b: cups[cups.length - 1].id };
  }
  ctx.compareSel = sel;

  const result = h('div', { class: 'cmp-result', 'aria-live': 'polite' });
  const coffeeSel = h('select', { id: 'cmp-coffee' }, withTwo.map((c) => h('option', { value: c.id, selected: c.id === sel.coffeeId }, store.coffeeName(c))));
  const aSel = h('select', { id: 'cmp-a' });
  const bSel = h('select', { id: 'cmp-b' });

  function fillCups() {
    const cups = store.tastingsFor(sel.coffeeId);
    for (const [s, key] of [[aSel, 'a'], [bSel, 'b']]) {
      s.replaceChildren(...cups.map((t) => h('option', { value: t.id }, cupLabel(t))));
      s.value = cups.some((t) => t.id === sel[key]) ? sel[key] : cups[0].id;
      sel[key] = s.value;
    }
  }

  function paint() {
    const a = store.getTasting(sel.a);
    const b = store.getTasting(sel.b);
    if (!a || !b) return;
    if (a.id === b.id) {
      result.replaceChildren(h('p', { class: 'hint' }, 'Choose two different cups.'));
      return;
    }
    const c = compareTastings(a, b, store.state.settings);
    const bestOf = c.best === 'a' ? a : c.best === 'b' ? b : null;

    result.replaceChildren(
      h('section', { class: 'card callout', 'aria-labelledby': 'int-h' },
        h('p', { class: 'label', id: 'int-h' }, 'What the change did'),
        h('p', { class: 'int' }, c.interpretation)),

      h('section', { class: 'card', 'aria-labelledby': 'chg-h' },
        h('p', { class: 'label', id: 'chg-h' }, 'What changed'),
        c.changes.length
          ? h('div', { class: 'tablewrap' }, h('table', null,
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Variable'), h('th', { scope: 'col' }, 'Cup A'), h('th', { scope: 'col' }, 'Cup B'), h('th', { scope: 'col' }, 'Change'))),
            h('tbody', null, c.changes.map((x) => h('tr', null,
              h('th', { scope: 'row' }, x.label), h('td', null, x.from), h('td', null, x.to), h('td', null, x.delta || 'Changed'))))))
          : h('p', null, 'No recipe variable changed.')),

      h('section', { class: 'card', 'aria-labelledby': 'sen-h' },
        h('p', { class: 'label', id: 'sen-h' }, 'How it tasted'),
        h('div', { class: 'tablewrap' }, h('table', null,
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Rating'), h('th', { scope: 'col' }, 'Cup A'), h('th', { scope: 'col' }, 'Cup B'), h('th', { scope: 'col' }, 'Movement'))),
          h('tbody', null, c.sensory.map((r) => h('tr', null,
            h('th', { scope: 'row' }, r.label), h('td', null, r.from), h('td', null, r.to),
            h('td', null, r.delta ? h('span', { class: r.delta > 0 ? 'up' : 'down' }, r.delta > 0 ? '▲ ' : '▼ ') : null, r.words))))),
        ),
        c.notes.added.length || c.notes.removed.length
          ? h('p', { class: 'hint' },
            c.notes.added.length ? `New in Cup B: ${list(c.notes.added)}. ` : '',
            c.notes.removed.length ? `Gone from Cup B: ${list(c.notes.removed)}.` : '')
          : null),

      h('div', { class: 'actions' },
        h('button', {
          type: 'button', class: 'btn ghost', 'data-focus': 'best-b', 'aria-pressed': String(!!b.best),
          onclick: async () => { await store.toggleBest(b.id); paint(); document.querySelector('[data-focus=best-b]')?.focus(); },
        }, b.best ? '★ Cup B is best so far' : '☆ Mark Cup B as best so far'),
        h('button', {
          type: 'button', class: 'btn ghost', 'data-focus': 'best-a', 'aria-pressed': String(!!a.best),
          onclick: async () => { await store.toggleBest(a.id); paint(); document.querySelector('[data-focus=best-a]')?.focus(); },
        }, a.best ? '★ Cup A is best so far' : '☆ Mark Cup A as best so far')),
      bestOf ? h('p', { class: 'hint' }, `Best so far for this coffee: the cup from ${fmtDate(bestOf.createdAt, true)}.`) : null);
  }

  coffeeSel.addEventListener('change', () => {
    const cups = store.tastingsFor(coffeeSel.value);
    sel = { coffeeId: coffeeSel.value, a: cups[cups.length - 2].id, b: cups[cups.length - 1].id };
    ctx.compareSel = sel;
    fillCups();
    paint();
  });
  aSel.addEventListener('change', () => { sel.a = aSel.value; paint(); });
  bSel.addEventListener('change', () => { sel.b = bSel.value; paint(); });

  fillCups();
  paint();

  return {
    el: h('div', { class: 'view' },
      h('h1', { tabindex: '-1' }, 'Compare two cups'),
      h('div', { class: 'pickers' },
        h('div', { class: 'field' }, h('label', { for: 'cmp-coffee', class: 'label' }, 'Coffee'), coffeeSel),
        h('div', { class: 'field' }, h('label', { for: 'cmp-a', class: 'label' }, 'Cup A (before)'), aSel),
        h('div', { class: 'field' }, h('label', { for: 'cmp-b', class: 'label' }, 'Cup B (after)'), bSel)),
      result),
  };
}
