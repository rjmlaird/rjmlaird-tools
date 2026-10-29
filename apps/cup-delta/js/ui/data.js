// "Data" screen: privacy statement, settings, JSON export / import, delete all.

import * as store from '../store.js';
import { h, copyText } from './dom.js';
import { localDateISO } from '../util.js';
import { ATTRIBUTION } from '../taxonomy.js';

function downloadFile(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function renderData(ctx) {
  const status = h('p', { class: 'status', role: 'status' });
  const say = (msg, bad = false) => { status.textContent = msg; status.classList.toggle('bad', bad); };

  const where = {
    indexeddb: 'This device’s browser database',
    localstorage: 'This device’s browser storage',
    memory: 'Temporary memory only. Your browser is blocking storage, so cups will be lost when you close this page. Export your data to keep it.',
  }[store.state.mode];

  // ---- export
  const exportBox = h('textarea', { id: 'export-text', rows: '6', readonly: true, hidden: true, 'aria-label': 'Export JSON' });
  const copyBtn = h('button', { type: 'button', class: 'btn ghost', hidden: true }, 'Copy JSON');
  const exportBtn = h('button', { type: 'button', class: 'btn primary', onclick: onExport }, 'Export to JSON file');
  function onExport() {
    const text = JSON.stringify(store.exportData(), null, 2);
    const name = `cup-delta-${localDateISO()}.json`;
    exportBox.value = text;
    exportBox.hidden = false;
    copyBtn.hidden = false;
    try {
      downloadFile(name, text);
      say(`Export started as ${name}. If nothing downloads, copy the text below and save it as a .json file.`);
    } catch {
      say('Your browser blocked the download. Copy the text below and save it as a .json file.', true);
    }
  }
  copyBtn.addEventListener('click', async () => {
    const ok = await copyText(exportBox.value, exportBox);
    say(ok ? 'Copied to the clipboard.' : 'Copy was blocked. The text is selected, so press your copy shortcut.');
  });

  // ---- import
  const fileInput = h('input', { id: 'import-file', type: 'file', accept: 'application/json,.json', onchange: onFile });
  const pasteBox = h('textarea', { id: 'import-text', rows: '4', placeholder: 'Or paste exported JSON here' });
  const importHost = h('div', { 'aria-live': 'polite' });
  const pasteBtn = h('button', { type: 'button', class: 'btn ghost', onclick: () => stage(pasteBox.value) }, 'Check pasted JSON');

  async function onFile() {
    const f = fileInput.files?.[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { say('That file is larger than 20 MB, so it is probably not a Cup Delta export.', true); return; }
    try {
      stage(await f.text());
    } catch {
      say('That file could not be read.', true);
    }
  }

  function stage(text) {
    importHost.replaceChildren();
    const res = store.previewImport(text);
    if (!res.ok) { say(res.error, true); return; }
    say('');
    const { counts } = res;
    importHost.append(h('div', { class: 'card callout' },
      h('p', null, `This file has ${counts.cups} ${counts.cups === 1 ? 'cup' : 'cups'} across ${counts.coffees} ${counts.coffees === 1 ? 'coffee' : 'coffees'}. ${counts.newCups} ${counts.newCups === 1 ? 'is' : 'are'} new to this device.`),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn primary', onclick: () => run('merge') }, 'Merge into my cups'),
        h('button', { type: 'button', class: 'btn danger-ghost', onclick: () => run('replace') }, 'Replace everything'),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => importHost.replaceChildren() }, 'Cancel'))));
    async function run(mode) {
      await store.applyImport(res.data, mode);
      importHost.replaceChildren();
      fileInput.value = '';
      pasteBox.value = '';
      say(mode === 'replace' ? 'Replaced your data with the file.' : 'Merged the file into your cups. Matching cups were updated.');
      ctx.updateNav();
    }
  }

  // ---- delete all
  const delHost = h('div');
  const delBtn = h('button', { type: 'button', class: 'btn danger-ghost', onclick: askDelete }, 'Delete all data');
  delHost.append(delBtn);
  function askDelete() {
    const n = store.state.tastings.length;
    delHost.replaceChildren(
      h('p', { class: 'warn', role: 'alert' }, `This permanently removes ${n} ${n === 1 ? 'cup' : 'cups'} and all settings from this device. Export first if you may want them back.`),
      h('div', { class: 'actions' },
        h('button', {
          type: 'button', class: 'btn danger',
          onclick: async () => { await store.clearAll(); delHost.replaceChildren(delBtn); say('All data deleted from this device.'); ctx.updateNav(); },
        }, 'Yes, delete everything'),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => { delHost.replaceChildren(delBtn); delBtn.focus(); } }, 'Keep my data')));
    delHost.querySelector('.danger').focus();
  }

  // ---- settings
  const hc = store.state.settings.higherCoarser !== false;
  const grindDir = h('select', {
    id: 'grind-dir',
    onchange: async (e) => { await store.setSetting('higherCoarser', e.target.value === 'coarser'); say('Saved.'); },
  },
  h('option', { value: 'coarser', selected: hc }, 'A higher number is coarser'),
  h('option', { value: 'finer', selected: !hc }, 'A higher number is finer'));

  return {
    el: h('div', { class: 'view' },
      h('h1', { tabindex: '-1' }, 'Your data'),
      h('section', { class: 'card privacy', 'aria-labelledby': 'priv-h' },
        h('h2', { id: 'priv-h' }, 'Private by design'),
        h('ul', { class: 'ticks' },
          h('li', null, h('strong', null, 'No account. '), 'You never sign in.'),
          h('li', null, h('strong', null, 'No analytics, no tracking. '), 'Nothing is sent anywhere.'),
          h('li', null, h('strong', null, 'Works offline. '), 'Once loaded, the whole app runs without a connection.'),
          h('li', null, h('strong', null, 'Stored here. '), where)),
        h('p', { class: 'hint' }, `${store.state.tastings.length} ${store.state.tastings.length === 1 ? 'cup' : 'cups'} stored.`)),
      h('section', { class: 'card', 'aria-labelledby': 'set-h' },
        h('h2', { id: 'set-h' }, 'Settings'),
        h('div', { class: 'field' }, h('label', { for: 'grind-dir', class: 'label' }, 'Grinder direction'), grindDir,
          h('p', { class: 'hint' }, 'Used when Cup Delta suggests a new grind setting. Most grinders go coarser as the number goes up.'))),
      h('section', { class: 'card', 'aria-labelledby': 'exp-h' },
        h('h2', { id: 'exp-h' }, 'Back up and restore'),
        h('p', null, 'Export everything to a JSON file. Import it on this or another device.'),
        h('div', { class: 'actions' }, exportBtn, copyBtn),
        exportBox,
        h('div', { class: 'field' }, h('label', { for: 'import-file', class: 'label' }, 'Import a Cup Delta file'), fileInput),
        pasteBox, h('div', { class: 'actions' }, pasteBtn),
        importHost),
      status,
      h('section', { class: 'card', 'aria-labelledby': 'del-h' },
        h('h2', { id: 'del-h' }, 'Delete'),
        h('p', null, 'Remove every cup, coffee and setting from this device.'),
        delHost),
      h('section', { class: 'card', 'aria-labelledby': 'about-h' },
        h('h2', { id: 'about-h' }, 'About the flavour list'),
        h('p', null, ATTRIBUTION),
        h('p', { class: 'hint' }, 'Diagnoses come from a short list of readable rules, not machine learning. They point at likely causes and are meant for trying one change at a time.'))),
  };
}
