// Data model and import sanitising.
//
// Coffee   { id, name, roaster, origin, variety, process, roastLevel, roastDate, createdAt }
// Tasting  { id, coffeeId, createdAt, basedOn, best,
//            brew: { method, dose, water, grind, grindFeel, temp, time, beanAge,
//                    grinder, filter, waterProfile },
//            descriptors: [descriptorId], ratings: { sourBitter, body, clean, love },
//            preference, note }
// Settings { higherCoarser, lastMethod }
//
// A "change" is the derived difference between two tastings (see compare.js diffBrew) and a
// "comparison" is a pair of tasting ids plus that derived result. Both are recomputed from the
// stored tastings, so they can never drift out of date and are not stored in v1.

import { METHODS, ROAST_LEVELS, PROCESSES, GRIND_FEELS } from './rules.js';
import { byId } from './taxonomy.js';
import { parseNum, uid } from './util.js';

export const SCHEMA_VERSION = 1;

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const oneOf = (v, list) => (list.some(([id]) => id === v) ? v : '');
const idOk = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);
const rating = (v) => (Number.isInteger(v) && v >= -2 && v <= 2 ? v : null);
const isoDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
const isoStamp = (v) => (typeof v === 'string' && !Number.isNaN(new Date(v).getTime()) ? new Date(v).toISOString() : new Date().toISOString());
const posNum = (v) => {
  const n = parseNum(v);
  return n !== null && n >= 0 && n < 100000 ? n : null;
};

export function cleanCoffee(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: idOk(raw.id) ? raw.id : uid(),
    name: str(raw.name),
    roaster: str(raw.roaster),
    origin: str(raw.origin),
    variety: str(raw.variety),
    process: oneOf(raw.process, PROCESSES),
    roastLevel: oneOf(raw.roastLevel, ROAST_LEVELS),
    roastDate: isoDate(raw.roastDate),
    createdAt: isoStamp(raw.createdAt),
  };
}

export function cleanTasting(raw) {
  if (!raw || typeof raw !== 'object' || !idOk(raw.id) || !idOk(raw.coffeeId)) return null;
  const b = raw.brew && typeof raw.brew === 'object' ? raw.brew : {};
  if (typeof b.method !== 'string') return null;
  const r = raw.ratings && typeof raw.ratings === 'object' ? raw.ratings : {};
  const pref = Number.isInteger(raw.preference) && raw.preference >= 1 && raw.preference <= 5 ? raw.preference : null;
  return {
    id: raw.id,
    coffeeId: raw.coffeeId,
    createdAt: isoStamp(raw.createdAt),
    basedOn: idOk(raw.basedOn) ? raw.basedOn : null,
    best: raw.best === true,
    brew: {
      method: METHODS.some((m) => m.id === b.method) ? b.method : 'other',
      dose: posNum(b.dose),
      water: posNum(b.water),
      grind: str(String(b.grind ?? ''), 40),
      grindFeel: oneOf(b.grindFeel, GRIND_FEELS),
      temp: posNum(b.temp),
      time: Number.isInteger(b.time) && b.time >= 0 && b.time < 36000 ? b.time : null,
      beanAge: posNum(b.beanAge),
      grinder: str(b.grinder),
      filter: str(b.filter),
      waterProfile: str(b.waterProfile),
    },
    descriptors: Array.isArray(raw.descriptors) ? [...new Set(raw.descriptors.filter((d) => typeof d === 'string' && byId[d]))] : [],
    ratings: { sourBitter: rating(r.sourBitter), body: rating(r.body), clean: rating(r.clean), love: rating(r.love) },
    preference: pref,
    note: str(raw.note, 2000),
  };
}

export function cleanSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  if (typeof s.higherCoarser === 'boolean') out.higherCoarser = s.higherCoarser;
  if (METHODS.some((m) => m.id === s.lastMethod)) out.lastMethod = s.lastMethod;
  return out;
}

/** Parse and sanitise an export file. Never throws. */
export function parseImport(textOrObject) {
  let obj = textOrObject;
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj);
    } catch {
      return { ok: false, error: 'That is not valid JSON.' };
    }
  }
  if (!obj || typeof obj !== 'object' || obj.app !== 'cup-delta') {
    return { ok: false, error: 'This does not look like a Cup Delta export.' };
  }
  if (typeof obj.schema === 'number' && obj.schema > SCHEMA_VERSION) {
    return { ok: false, error: 'This file was made by a newer version of Cup Delta.' };
  }
  const coffees = (Array.isArray(obj.coffees) ? obj.coffees : []).map(cleanCoffee).filter(Boolean);
  const tastings = (Array.isArray(obj.tastings) ? obj.tastings : []).map(cleanTasting).filter(Boolean);
  const known = new Set(coffees.map((c) => c.id));
  for (const t of tastings) {
    if (!known.has(t.coffeeId)) {
      known.add(t.coffeeId);
      coffees.push(cleanCoffee({ id: t.coffeeId, name: '' }));
    }
  }
  if (!tastings.length && !coffees.length) return { ok: false, error: 'The file has no cups in it.' };
  return { ok: true, data: { coffees, tastings, settings: cleanSettings(obj.settings) } };
}
