// "Taste" screen: the quick-log form. Basics first, brew detail behind a disclosure.

import * as store from '../store.js';
import { h } from './dom.js';
import { segmented, field, selectField, textArea } from './controls.js';
import { createFlavourPicker } from './flavour.js';
import { METHODS, ROAST_LEVELS, PROCESSES, GRIND_FEELS } from '../rules.js';
import { SCALES, SCALE_VALUES } from '../scales.js';
import { diagnose } from '../diagnosis.js';
import { ATTRIBUTION } from '../taxonomy.js';
import { uid, parseNum, parseDuration, durationInputValue, localDateISO, daysBetween, round2 } from '../util.js';

export function renderTaste(ctx) {
  const { settings } = store.state;
  const base = ctx.draft?.basedOn ? store.getTasting(ctx.draft.basedOn) : null;
  const baseCoffee = base ? store.getCoffee(base.coffeeId) : null;
  const suggestion = base ? diagnose(base, baseCoffee, settings).next : null;
  const apply = suggestion?.apply || null;
  const b = base?.brew || {};
  const cf = baseCoffee || {};

  let method = base ? b.method : settings.lastMethod || null;
  const ratings = { sourBitter: null, body: null, clean: null, love: null };
  let preference = null;

  // ---- brew + coffee basics
  const methodSeg = segmented({
    label: 'Brew method', required: true, wrap: true, value: method,
    options: METHODS.map((m) => ({ value: m.id, label: m.label })),
    onChange: (v) => { method = v; methodErr.hidden = true; },
  });
  const methodErr = h('p', { class: 'error', role: 'alert', hidden: true }, 'Choose a brew method to continue.');

  const names = [...new Set(store.state.coffees.map((c) => c.name).filter(Boolean))];
  const f = {
    name: field('coffee-name', 'Coffee name', { value: cf.name || '', placeholder: 'Optional', list: 'coffee-names' }),
    roaster: field('roaster', 'Roaster', { value: cf.roaster || '' }),
    origin: field('origin', 'Origin', { value: cf.origin || '' }),
    variety: field('variety', 'Variety', { value: cf.variety || '' }),
    process: selectField('process', 'Process', PROCESSES, cf.process),
    roastLevel: selectField('roast-level', 'Roast level', ROAST_LEVELS, cf.roastLevel),
    roastDate: field('roast-date', 'Roast date', { type: 'date', value: cf.roastDate || '' }),
    beanAge: field('bean-age', 'Days after roast', { type: 'number', inputmode: 'numeric', min: '0', step: '1', placeholder: 'Auto from roast date' }),
    dose: field('dose', 'Dose (g)', { type: 'number', inputmode: 'decimal', step: '0.1', min: '0', value: b.dose ?? '' }),
    water: field('water', 'Water (g)', { type: 'number', inputmode: 'decimal', step: '1', min: '0', value: b.water ?? '' }),
    grind: field('grind', 'Grind setting', { value: b.grind || '', placeholder: 'For example 20 clicks' }),
    grindFeel: selectField('grind-feel', 'How coarse is that?', GRIND_FEELS, b.grindFeel || ''),
    temp: field('temp', 'Water temperature (°C)', { type: 'number', inputmode: 'decimal', step: '1', min: '0', value: b.temp ?? '' }),
    time: field('time', 'Total brew time', { inputmode: 'numeric', placeholder: 'm:ss or seconds', value: durationInputValue(b.time) }),
    grinder: field('grinder', 'Grinder', { value: b.grinder || '' }),
    filter: field('filter', 'Filter', { value: b.filter || '' }),
    waterProfile: field('water-profile', 'Water profile', { value: b.waterProfile || '', placeholder: 'For example filtered tap' }),
  };
  const note = textArea('note', 'Note', '', 3);

  const ratioOut = h('output', { class: 'ratio', for: 'dose water' }, 'Ratio appears when dose and water are set');
  function paintRatio() {
    const d = parseNum(f.dose.input.value);
    const w = parseNum(f.water.input.value);
    ratioOut.textContent = d > 0 && w > 0 ? `Ratio 1:${round2(w / d).toFixed(1)}` : 'Ratio appears when dose and water are set';
  }
  f.dose.input.addEventListener('input', paintRatio);
  f.water.input.addEventListener('input', paintRatio);
  paintRatio();

  let ageTouched = false;
  f.beanAge.input.addEventListener('input', () => { ageTouched = true; });
  f.roastDate.input.addEventListener('input', () => {
    if (ageTouched && f.beanAge.input.value) return;
    const d = daysBetween(f.roastDate.input.value, localDateISO());
    f.beanAge.input.value = d !== null && d >= 0 ? String(d) : '';
    ageTouched = false;
  });

  // suggested change from the previous cup, applied once and marked
  if (apply) {
    const target = { grind: f.grind, temp: f.temp, time: f.time }[apply.field];
    if (target) {
      target.input.value = apply.field === 'time' ? durationInputValue(apply.value) : apply.value;
      target.el.classList.add('is-changed');
      target.el.append(h('p', { class: 'hint delta-hint' }, 'Changed from your last cup'));
    }
  }

  // ---- flavour + sensory
  const picker = createFlavourPicker({});
  const scaleControls = SCALES.map((s) =>
    segmented({
      label: s.label, clearable: true,
      options: SCALE_VALUES.map((v, i) => ({ value: v, label: s.options[i] })),
      onChange: (v) => { ratings[s.key] = v; },
    }));
  const prefSeg = segmented({
    label: 'Overall preference (1–5)', clearable: true,
    options: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) })),
    onChange: (v) => { preference = v; },
    hint: '1 is not for me, 5 is exactly what I wanted.',
  });

  const formError = h('p', { class: 'error', role: 'alert', hidden: true });
  const saveBtn = h('button', { type: 'submit', class: 'btn primary' }, 'Save and diagnose');

  const details = h('details', { class: 'more', open: base ? true : null },
    h('summary', null, 'Brew details (optional)'),
    h('div', { class: 'more-body' },
      h('h3', { class: 'label' }, 'Coffee'),
      h('div', { class: 'grid2' }, f.roaster.el, f.origin.el, f.variety.el, f.process.el, f.roastLevel.el, f.roastDate.el),
      h('h3', { class: 'label' }, 'Recipe'),
      h('div', { class: 'grid2' }, f.dose.el, f.water.el),
      ratioOut,
      h('div', { class: 'grid2' }, f.grind.el, f.grindFeel.el, f.temp.el, f.time.el, f.beanAge.el),
      h('h3', { class: 'label' }, 'Equipment'),
      h('div', { class: 'grid2' }, f.grinder.el, f.filter.el, f.waterProfile.el)));

  const banner = base
    ? h('section', { class: 'callout', 'aria-labelledby': 'next-h' },
      h('h2', { class: 'label', id: 'next-h' }, 'Next cup, one change'),
      h('p', null, `Based on ${store.coffeeName(baseCoffee)}. ${suggestion.text}`),
      h('p', { class: 'hint' }, 'Only that one field is changed below. Everything else is copied from the last cup so the comparison stays fair.'))
    : null;

  const form = h('form', { class: 'taste', novalidate: true, onsubmit: onSubmit },
    h('datalist', { id: 'coffee-names' }, names.map((n) => h('option', { value: n }))),
    h('section', { class: 'block' },
      methodSeg.el, methodErr, f.name.el),
    h('section', { class: 'block', 'aria-labelledby': 'flavour-h' },
      h('h2', { id: 'flavour-h' }, 'What do you taste?'),
      picker.el,
      h('p', { class: 'hint small' }, ATTRIBUTION)),
    h('section', { class: 'block', 'aria-labelledby': 'cup-h' },
      h('h2', { id: 'cup-h' }, 'How did the cup feel?'),
      ...scaleControls.map((c) => c.el),
      prefSeg.el,
      note.el),
    details,
    formError,
    h('div', { class: 'actions' }, saveBtn));

  async function onSubmit(e) {
    e.preventDefault();
    formError.hidden = true;
    for (const k of ['time']) f[k].error('');
    if (!method) {
      methodErr.hidden = false;
      methodSeg.focus();
      return;
    }
    const tm = parseDuration(f.time.input.value);
    if (Number.isNaN(tm)) {
      f.time.error('Use m:ss or seconds, for example 2:30.');
      details.open = true;
      f.time.input.focus();
      return;
    }
    saveBtn.disabled = true;
    const v = (x) => x.input.value.trim();
    const coffee = await store.findOrCreateCoffee({
      name: v(f.name), roaster: v(f.roaster), origin: v(f.origin), variety: v(f.variety),
      process: v(f.process), roastLevel: v(f.roastLevel), roastDate: v(f.roastDate),
    });
    let age = parseNum(f.beanAge.input.value);
    if (age === null && coffee.roastDate) {
      const d = daysBetween(coffee.roastDate, localDateISO());
      age = d !== null && d >= 0 ? d : null;
    }
    const tasting = {
      id: uid(),
      coffeeId: coffee.id,
      createdAt: new Date().toISOString(),
      basedOn: base ? base.id : null,
      best: false,
      brew: {
        method,
        dose: parseNum(f.dose.input.value),
        water: parseNum(f.water.input.value),
        grind: v(f.grind),
        grindFeel: v(f.grindFeel),
        temp: parseNum(f.temp.input.value),
        time: tm,
        beanAge: age,
        grinder: v(f.grinder),
        filter: v(f.filter),
        waterProfile: v(f.waterProfile),
      },
      descriptors: picker.get(),
      ratings: { ...ratings },
      preference,
      note: note.input.value.trim(),
    };
    await store.saveTasting(tasting);
    await store.setSetting('lastMethod', method);
    ctx.navigate(`cup-${tasting.id}`);
  }

  const intro = !store.state.tastings.length && !base
    ? h('p', { class: 'lede' }, 'Pick a method, tap a few notes and rate the cup. You get a diagnosis and one change to try next. It takes under a minute.')
    : null;

  return {
    el: h('div', { class: 'view' },
      h('h1', { tabindex: '-1' }, base ? 'Brew the next cup' : 'Taste a cup'),
      intro, banner, form),
  };
}
