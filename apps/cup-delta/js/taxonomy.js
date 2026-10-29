// Cup Delta starter vocabulary.
//
// Original work: written for this project as a small three-level picker
// (family -> sub-family -> descriptor). It is inspired by the idea behind public
// coffee-tasting frameworks, but it does not reproduce the SCA/WCR Coffee Taster's
// Flavor Wheel artwork or its exact taxonomy, and it is not a derivative of it.

export const ATTRIBUTION =
  'The flavour vocabulary and picker are original to Cup Delta. They are inspired by ' +
  'the general idea of public coffee-tasting frameworks, but do not copy or adapt the ' +
  'SCA/WCR Coffee Taster’s Flavor Wheel artwork or its exact taxonomy.';

// [id, label] pairs keep the data compact.
const RAW = [
  ['fruity', 'Fruity', [
    ['berry', 'Berries', [['blueberry', 'Blueberry'], ['strawberry', 'Strawberry'], ['raspberry', 'Raspberry'], ['blackcurrant', 'Blackcurrant']]],
    ['stone', 'Stone fruit', [['peach', 'Peach'], ['apricot', 'Apricot'], ['cherry', 'Cherry'], ['plum', 'Plum']]],
    ['orchard', 'Orchard fruit', [['red-apple', 'Red apple'], ['green-apple', 'Green apple'], ['pear', 'Pear']]],
    ['citrus', 'Citrus', [['lemon', 'Lemon'], ['orange', 'Orange'], ['grapefruit', 'Grapefruit'], ['bergamot', 'Bergamot']]],
    ['tropical', 'Tropical', [['pineapple', 'Pineapple'], ['mango', 'Mango'], ['passionfruit', 'Passion fruit']]],
    ['dried', 'Dried fruit', [['raisin', 'Raisin'], ['fig', 'Fig'], ['prune', 'Prune']]],
  ]],
  ['floral', 'Floral', [
    ['blossom', 'Blossom', [['jasmine', 'Jasmine'], ['rose', 'Rose'], ['elderflower', 'Elderflower'], ['honeysuckle', 'Honeysuckle']]],
    ['tea', 'Tea-like', [['black-tea', 'Black tea'], ['green-tea', 'Green tea'], ['chamomile', 'Chamomile']]],
  ]],
  ['sweet', 'Sweet', [
    ['sugars', 'Sugars', [['brown-sugar', 'Brown sugar'], ['honey', 'Honey'], ['maple-syrup', 'Maple syrup'], ['molasses', 'Molasses']]],
    ['confection', 'Confection', [['caramel', 'Caramel'], ['toffee', 'Toffee'], ['vanilla', 'Vanilla'], ['marshmallow', 'Marshmallow']]],
  ]],
  ['nutty', 'Nutty & cocoa', [
    ['nuts', 'Nuts', [['almond', 'Almond'], ['hazelnut', 'Hazelnut'], ['walnut', 'Walnut'], ['peanut', 'Peanut']]],
    ['cocoa', 'Cocoa', [['milk-chocolate', 'Milk chocolate'], ['cocoa-nib', 'Cocoa nib'], ['dark-chocolate', 'Dark chocolate']]],
  ]],
  ['spice', 'Spice', [
    ['warm', 'Warm spice', [['cinnamon', 'Cinnamon'], ['clove', 'Clove'], ['cardamom', 'Cardamom']]],
    ['sharp', 'Sharp spice', [['black-pepper', 'Black pepper'], ['ginger', 'Ginger']]],
  ]],
  ['roasted', 'Roasted', [
    ['toasty', 'Toasty', [['toast', 'Toast'], ['biscuit', 'Biscuit'], ['malt', 'Malt']]],
    ['dark', 'Dark roast', [['smoky', 'Smoky'], ['ashy', 'Ashy'], ['burnt', 'Burnt'], ['tobacco', 'Tobacco']]],
  ]],
  ['sour', 'Sour & fermented', [
    ['acid', 'Sharp acidity', [['tart', 'Tart'], ['sour', 'Sour'], ['vinegary', 'Vinegary']]],
    ['ferment', 'Fermented', [['winey', 'Winey'], ['boozy', 'Boozy'], ['funky', 'Funky'], ['overripe', 'Overripe'], ['yoghurty', 'Yoghurty']]],
  ]],
  ['green', 'Green & vegetal', [
    ['fresh', 'Fresh green', [['grassy', 'Grassy'], ['herbal', 'Herbal'], ['green-pea', 'Green pea']]],
    ['dry', 'Dry & woody', [['hay', 'Hay'], ['straw', 'Straw'], ['woody', 'Woody']]],
  ]],
  ['other', 'Other & off-notes', [
    ['stale', 'Stale', [['papery', 'Papery'], ['cardboard', 'Cardboard'], ['flat', 'Flat'], ['stale', 'Stale']]],
    ['harsh', 'Harsh', [['astringent', 'Astringent'], ['drying', 'Drying'], ['harsh', 'Harsh']]],
    ['earthy', 'Earthy', [['earthy', 'Earthy'], ['musty', 'Musty']]],
    ['chem', 'Chemical', [['rubbery', 'Rubbery'], ['medicinal', 'Medicinal'], ['metallic', 'Metallic']]],
  ]],
];

export const FAMILIES = RAW.map(([id, label, subs]) => ({
  id,
  label,
  subs: subs.map(([sid, slabel, items]) => ({
    id: sid,
    label: slabel,
    items: items.map(([did, dlabel]) => ({ id: did, label: dlabel, familyId: id, subId: sid })),
  })),
}));

export const DESCRIPTORS = FAMILIES.flatMap((f) => f.subs.flatMap((s) => s.items));

export const byId = Object.fromEntries(DESCRIPTORS.map((d) => [d.id, d]));

export const familyOf = (descriptorId) => FAMILIES.find((f) => f.id === byId[descriptorId]?.familyId) || null;

export const labelOf = (id) => byId[id]?.label || id;

export function pathOf(id) {
  const d = byId[id];
  if (!d) return '';
  const f = FAMILIES.find((x) => x.id === d.familyId);
  const s = f?.subs.find((x) => x.id === d.subId);
  return `${f?.label} › ${s?.label}`;
}

export function searchDescriptors(query, limit = 12) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = [];
  const contains = [];
  for (const d of DESCRIPTORS) {
    const l = d.label.toLowerCase();
    if (l.startsWith(q)) starts.push(d);
    else if (l.includes(q) || pathOf(d.id).toLowerCase().includes(q)) contains.push(d);
  }
  return [...starts, ...contains].slice(0, limit);
}
