// Three-level flavour picker: family -> sub-family -> descriptor.
// Families and sub-families are ARIA tabs (arrow keys), descriptors are toggle
// buttons (aria-pressed), and every state has a text cue, not just a colour.

import { h, roving } from './dom.js';
import { FAMILIES, labelOf, pathOf, searchDescriptors } from '../taxonomy.js';

export function createFlavourPicker({ selected = [], onChange = () => {} } = {}) {
  const sel = new Set(selected);
  let famId = FAMILIES[0].id;
  let subId = FAMILIES[0].subs[0].id;
  const family = () => FAMILIES.find((f) => f.id === famId);

  const search = h('input', {
    id: 'flavour-search', type: 'search', autocomplete: 'off', placeholder: 'Find a note, for example jasmine',
    oninput: onSearch,
  });
  const famBar = h('div', { class: 'fam', role: 'tablist', 'aria-label': 'Flavour families' });
  const subBar = h('div', { class: 'subs', role: 'tablist', 'aria-label': 'Sub-families' });
  const panel = h('div', { class: 'descs', role: 'tabpanel', id: 'flavour-panel' });
  const found = h('div', { class: 'descs', hidden: true, 'aria-live': 'polite' });
  const chips = h('ul', { class: 'chips' });
  const count = h('p', { class: 'hint', id: 'profile-count' });
  const heading = h('h3', { class: 'label', id: 'profile-h', tabindex: '-1' }, 'Tasting profile');
  const profile = h('aside', { class: 'profile', 'aria-labelledby': 'profile-h' }, heading, count, chips);

  const famBtns = FAMILIES.map((f) =>
    h('button', {
      type: 'button', role: 'tab', id: `fam-${f.id}`, 'aria-controls': 'flavour-panel', onclick: () => chooseFamily(f.id),
    }, h('span', { class: 'fam-name' }, f.label), h('span', { class: 'fam-count' })));
  famBar.append(...famBtns);
  roving(famBar, '[role=tab]', { cols: 3 });
  roving(subBar, '[role=tab]');

  function descButton(d, withPath) {
    return h('button', {
      type: 'button', class: 'desc', 'data-id': d.id, 'aria-pressed': String(sel.has(d.id)), onclick: () => toggle(d.id),
    }, d.label, withPath ? h('span', { class: 'desc-path' }, pathOf(d.id)) : null);
  }

  function paintFamilies() {
    FAMILIES.forEach((f, i) => {
      const b = famBtns[i];
      const on = f.id === famId;
      const n = f.subs.reduce((acc, s) => acc + s.items.filter((d) => sel.has(d.id)).length, 0);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      b.classList.toggle('on', on);
      b.querySelector('.fam-count').textContent = n ? `${n} picked` : '';
    });
  }

  function renderSubs() {
    subBar.replaceChildren(...family().subs.map((s) =>
      h('button', { type: 'button', role: 'tab', id: `sub-${s.id}`, 'aria-controls': 'flavour-panel', onclick: () => chooseSub(s.id) }, s.label)));
    paintSubs();
  }

  function paintSubs() {
    for (const b of subBar.querySelectorAll('[role=tab]')) {
      const on = b.id === `sub-${subId}`;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      b.classList.toggle('on', on);
    }
  }

  function renderPanel() {
    const s = family().subs.find((x) => x.id === subId);
    panel.setAttribute('aria-labelledby', `sub-${subId}`);
    panel.replaceChildren(...s.items.map((d) => descButton(d, false)));
  }

  function chooseFamily(id) {
    famId = id;
    subId = family().subs[0].id;
    renderSubs();
    renderPanel();
    paintFamilies();
  }

  function chooseSub(id) {
    subId = id;
    paintSubs();
    renderPanel();
  }

  function renderChips() {
    const ids = [...sel];
    chips.replaceChildren(...ids.map((id, i) =>
      h('li', null, h('button', {
        type: 'button', class: 'chip', 'aria-label': `Remove ${labelOf(id)}`, onclick: () => remove(id, i),
      }, labelOf(id), h('span', { class: 'x', 'aria-hidden': 'true' }, '×')))));
    count.textContent = ids.length
      ? `${ids.length} ${ids.length === 1 ? 'note' : 'notes'} picked. Select one to remove it.`
      : 'Nothing picked yet. Two or three notes is plenty.';
  }

  function sync() {
    for (const b of [...panel.querySelectorAll('.desc'), ...found.querySelectorAll('.desc')]) {
      b.setAttribute('aria-pressed', String(sel.has(b.dataset.id)));
    }
    paintFamilies();
    renderChips();
  }

  function toggle(id) {
    if (sel.has(id)) sel.delete(id);
    else sel.add(id);
    sync();
    onChange([...sel]);
  }

  function remove(id, index) {
    sel.delete(id);
    sync();
    onChange([...sel]);
    const btns = chips.querySelectorAll('button');
    if (btns.length) btns[Math.min(index, btns.length - 1)].focus();
    else heading.focus();
  }

  function onSearch() {
    const q = search.value;
    if (!q.trim()) {
      found.hidden = true;
      panel.hidden = false;
      subBar.hidden = false;
      return;
    }
    const hits = searchDescriptors(q);
    found.replaceChildren(...(hits.length
      ? hits.map((d) => descButton(d, true))
      : [h('p', { class: 'hint' }, 'No match. Try the families above.')]));
    found.hidden = false;
    panel.hidden = true;
    subBar.hidden = true;
  }

  renderSubs();
  renderPanel();
  paintFamilies();
  renderChips();

  const el = h('div', { class: 'picker' },
    h('div', { class: 'picker-main' },
      h('div', { class: 'field' },
        h('label', { for: 'flavour-search', class: 'label' }, 'Search notes'),
        search),
      famBar, subBar, panel, found),
    profile);

  return {
    el,
    get: () => [...sel],
    set(ids) {
      sel.clear();
      ids.forEach((i) => sel.add(i));
      sync();
    },
  };
}
