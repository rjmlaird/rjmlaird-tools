// "Cups" screen: every logged cup, grouped by coffee.

import * as store from '../store.js';
import { h } from './dom.js';
import { methodById } from '../rules.js';
import { labelOf } from '../taxonomy.js';
import { fmtDate } from '../util.js';

export function renderCups(ctx) {
  const groups = store.state.coffees
    .map((c) => ({ coffee: c, cups: store.tastingsFor(c.id).reverse() }))
    .filter((g) => g.cups.length)
    .sort((a, b) => b.cups[0].createdAt.localeCompare(a.cups[0].createdAt));

  if (!groups.length) {
    return {
      el: h('div', { class: 'view' },
        h('h1', { tabindex: '-1' }, 'Your cups'),
        h('section', { class: 'card empty', 'aria-labelledby': 'loop-h' },
          h('h2', { id: 'loop-h' }, 'Nothing logged yet'),
          h('p', null, 'Cup Delta works in a loop. Each pass takes a minute.'),
          h('ol', { class: 'loop' },
            h('li', null, h('strong', null, 'Taste. '), 'Pick the notes you notice and rate the cup.'),
            h('li', null, h('strong', null, 'Diagnose. '), 'Read what the evidence points to.'),
            h('li', null, h('strong', null, 'Change one thing. '), 'Brew again with the suggested change only.'),
            h('li', null, h('strong', null, 'Compare. '), 'See what moved and keep the best cup.')),
          h('div', { class: 'actions' }, h('a', { class: 'btn primary', href: '#taste' }, 'Log your first cup')))),
    };
  }

  return {
    el: h('div', { class: 'view' },
      h('h1', { tabindex: '-1' }, 'Your cups'),
      groups.map(({ coffee, cups }, gi) => h('section', { class: 'group', 'aria-labelledby': `g-${gi}` },
        h('div', { class: 'group-head' },
          h('h2', { id: `g-${gi}` }, store.coffeeName(coffee)),
          h('p', { class: 'hint' }, [coffee.roaster, `${cups.length} ${cups.length === 1 ? 'cup' : 'cups'}`].filter(Boolean).join(' · '))),
        h('ul', { class: 'rows' }, cups.map((t) => h('li', null,
          h('a', { class: 'row', href: `#cup-${t.id}` },
            h('span', { class: 'row-main' },
              h('span', { class: 'row-title' }, fmtDate(t.createdAt, true), ' · ', methodById(t.brew.method).label),
              h('span', { class: 'row-notes' }, t.descriptors.length ? t.descriptors.slice(0, 4).map(labelOf).join(', ') : 'No notes picked')),
            h('span', { class: 'row-side' },
              t.best ? h('span', { class: 'badge' }, '★ Best so far') : null,
              h('span', { class: 'row-score' }, t.preference ? `${t.preference}/5` : 'Unrated')))))),
        cups.length >= 2
          ? h('div', { class: 'actions' }, h('button', {
            type: 'button', class: 'btn ghost',
            onclick: () => { ctx.compareSel = { coffeeId: coffee.id, a: cups[1].id, b: cups[0].id }; ctx.navigate('compare'); },
          }, 'Compare the last two'))
          : null))),
  };
}
