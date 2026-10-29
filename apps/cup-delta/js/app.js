// App shell: hash router, navigation state, focus management, service worker.

import * as store from './store.js';
import { h } from './ui/dom.js';
import { renderTaste } from './ui/taste.js';
import { renderCups } from './ui/cups.js';
import { renderCup } from './ui/cup.js';
import { renderCompare } from './ui/compare.js';
import { renderData } from './ui/data.js';

const main = document.getElementById('main');
const nav = document.getElementById('nav');
const live = document.getElementById('live');

const ctx = {
  compareSel: null,
  draft: null,
  navigate(route) { location.hash = route; },
  rerender(focusSel) { render(false); if (focusSel) document.querySelector(focusSel)?.focus(); },
  startNext(id) { ctx.draft = { basedOn: id }; ctx.navigate('taste'); },
  updateNav,
};

const TABS = [
  ['taste', 'Taste'],
  ['cups', 'Cups'],
  ['compare', 'Compare'],
  ['data', 'Data'],
];

function route() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (!raw) return { name: store.state.tastings.length ? 'cups' : 'taste' };
  if (raw.startsWith('cup-')) return { name: 'cup', id: raw.slice(4) };
  return TABS.some(([id]) => id === raw) ? { name: raw } : { name: 'cups' };
}

function updateNav() {
  const r = route();
  const active = r.name === 'cup' ? 'cups' : r.name;
  nav.replaceChildren(...TABS.map(([id, label]) =>
    h('a', { href: `#${id}`, 'aria-current': id === active ? 'page' : null }, label)));
  const n = store.state.tastings.length;
  document.getElementById('count').textContent = n ? `${n} ${n === 1 ? 'cup' : 'cups'} on this device` : 'Private and offline';
}

function render(moveFocus = true) {
  const r = route();
  let view;
  if (r.name === 'taste') {
    view = renderTaste(ctx);
    ctx.draft = null;
  } else if (r.name === 'cup') view = renderCup(ctx, r.id);
  else if (r.name === 'compare') view = renderCompare(ctx);
  else if (r.name === 'data') view = renderData(ctx);
  else view = renderCups(ctx);
  main.replaceChildren(view.el);
  updateNav();
  if (moveFocus) {
    window.scrollTo(0, 0);
    const h1 = main.querySelector('h1');
    if (h1) {
      h1.focus({ preventScroll: true });
      live.textContent = h1.textContent;
    }
  }
}

window.addEventListener('hashchange', () => render(true));

async function start() {
  await store.init();
  render(true);
  if (store.state.mode === 'memory') {
    main.prepend(h('p', { class: 'warn banner', role: 'status' }, 'Your browser is blocking storage, so cups will be lost when you close this page. Use Data → Export to keep them.'));
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

start();
