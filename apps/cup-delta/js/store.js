// Local storage. IndexedDB first, then localStorage, then memory (private windows,
// locked-down frames). Everything is also kept in `state` so the UI reads synchronously.
// Nothing here talks to a network.

import { uid } from './util.js';
import { SCHEMA_VERSION, parseImport } from './schema.js';

const DB_NAME = 'cup-delta';
const DB_VERSION = 1;
const LS_KEY = 'cup-delta:v1';
const STORES = ['coffees', 'tastings', 'settings'];

export const state = { coffees: [], tastings: [], settings: {}, mode: 'memory', writeFailed: false };

let backend = null;

// ------------------------------------------------------------------ backends

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('coffees', { keyPath: 'id' });
      db.createObjectStore('tastings', { keyPath: 'id' });
      db.createObjectStore('settings', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

function run(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

async function idbBackend() {
  if (typeof indexedDB === 'undefined') throw new Error('no IndexedDB');
  const db = await openDb();
  return {
    mode: 'indexeddb',
    async loadAll() {
      const [coffees, tastings, settings] = await Promise.all(STORES.map((n) => run(db, n, 'readonly', (s) => s.getAll())));
      return { coffees, tastings, settings: Object.fromEntries(settings.map((x) => [x.key, x.value])) };
    },
    put: (store, obj) => run(db, store, 'readwrite', (s) => s.put(obj)),
    remove: (store, id) => run(db, store, 'readwrite', (s) => s.delete(id)),
    clear: () => Promise.all(STORES.map((n) => run(db, n, 'readwrite', (s) => s.clear()))),
  };
}

function lsBackend() {
  localStorage.setItem('__cup-delta-probe', '1');
  localStorage.removeItem('__cup-delta-probe');
  const save = async () => localStorage.setItem(LS_KEY, JSON.stringify({ coffees: state.coffees, tastings: state.tastings, settings: state.settings }));
  return {
    mode: 'localstorage',
    async loadAll() {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : {};
    },
    put: save,
    remove: save,
    clear: async () => localStorage.removeItem(LS_KEY),
  };
}

function memoryBackend() {
  return { mode: 'memory', loadAll: async () => ({}), put: async () => {}, remove: async () => {}, clear: async () => {} };
}

export async function init() {
  try {
    backend = await idbBackend();
  } catch {
    try {
      backend = lsBackend();
    } catch {
      backend = memoryBackend();
    }
  }
  let data = {};
  try {
    data = await backend.loadAll();
  } catch {
    data = {};
  }
  state.coffees = Array.isArray(data.coffees) ? data.coffees : [];
  state.tastings = Array.isArray(data.tastings) ? data.tastings : [];
  state.settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
  state.mode = backend.mode;
  state.writeFailed = false;
}

async function write(fn) {
  try {
    await fn();
  } catch {
    state.writeFailed = true;
  }
}

function upsert(arr, obj) {
  const i = arr.findIndex((x) => x.id === obj.id);
  if (i >= 0) arr[i] = obj;
  else arr.push(obj);
}

// ------------------------------------------------------------------ reads

export const getCoffee = (id) => state.coffees.find((c) => c.id === id) || null;
export const getTasting = (id) => state.tastings.find((t) => t.id === id) || null;
export const tastingsFor = (coffeeId) => state.tastings
  .filter((t) => t.coffeeId === coffeeId)
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
export const coffeeName = (c) => (c && c.name ? c.name : 'Unnamed coffee');

// ------------------------------------------------------------------ writes

export async function saveTasting(t) {
  upsert(state.tastings, t);
  await write(() => backend.put('tastings', t));
}

export async function saveCoffee(c) {
  upsert(state.coffees, c);
  await write(() => backend.put('coffees', c));
}

/** Match by name + roaster (case-insensitive); fill in blanks from the new details. */
export async function findOrCreateCoffee(fields) {
  const key = (c) => `${(c.name || '').trim().toLowerCase()}|${(c.roaster || '').trim().toLowerCase()}`;
  const wanted = key(fields);
  let c = state.coffees.find((x) => key(x) === wanted);
  if (!c) {
    c = {
      id: uid(), name: '', roaster: '', origin: '', variety: '', process: '', roastLevel: '', roastDate: '',
      createdAt: new Date().toISOString(),
    };
  }
  const next = { ...c };
  for (const f of ['name', 'roaster', 'origin', 'variety', 'process', 'roastLevel', 'roastDate']) {
    if (fields[f]) next[f] = fields[f];
  }
  await saveCoffee(next);
  return next;
}

export async function deleteTasting(id) {
  state.tastings = state.tastings.filter((t) => t.id !== id);
  const changed = [];
  for (const t of state.tastings) {
    if (t.basedOn === id) {
      t.basedOn = null;
      changed.push(t);
    }
  }
  await write(() => backend.remove('tastings', id));
  for (const t of changed) await write(() => backend.put('tastings', t));
}

/** One "best so far" per coffee. Tapping the current best clears it. */
export async function toggleBest(id) {
  const t = getTasting(id);
  if (!t) return;
  const makeBest = !t.best;
  const changed = [];
  for (const o of state.tastings) {
    if (o.coffeeId !== t.coffeeId) continue;
    const want = makeBest && o.id === id;
    if (o.best !== want) {
      o.best = want;
      changed.push(o);
    }
  }
  for (const o of changed) await write(() => backend.put('tastings', o));
}

export async function setSetting(key, value) {
  state.settings = { ...state.settings, [key]: value };
  await write(() => backend.put('settings', { key, value }));
}

export async function clearAll() {
  state.coffees = [];
  state.tastings = [];
  state.settings = {};
  await write(() => backend.clear());
}

// ------------------------------------------------------------------ export / import

export function exportData() {
  return {
    app: 'cup-delta',
    schema: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    coffees: state.coffees,
    tastings: state.tastings,
    settings: state.settings,
  };
}

export function previewImport(text) {
  const res = parseImport(text);
  if (!res.ok) return res;
  const have = new Set(state.tastings.map((t) => t.id));
  return {
    ok: true,
    data: res.data,
    counts: {
      cups: res.data.tastings.length,
      coffees: res.data.coffees.length,
      newCups: res.data.tastings.filter((t) => !have.has(t.id)).length,
    },
  };
}

/** mode: 'merge' keeps what is here and adds/updates by id; 'replace' starts from the file. */
export async function applyImport(data, mode) {
  if (mode === 'replace') await clearAll();
  for (const c of data.coffees) await saveCoffee(c);
  for (const t of data.tastings) await saveTasting(t);
  for (const [k, v] of Object.entries(data.settings || {})) await setSetting(k, v);
}
