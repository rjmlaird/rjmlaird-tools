import { h, roving } from './dom.js';

let seq = 0;

/**
 * A single-choice control built as an ARIA radio group of buttons.
 * Arrow keys move and select; tapping the selected option clears it when `clearable`.
 */
export function segmented({ label, options, value = null, clearable = false, onChange, wrap = false, required = false, hint }) {
  const gid = `seg-${++seq}`;
  const labelEl = h('span', { class: 'label', id: `${gid}-l` }, label, required ? h('span', { class: 'req' }, ' (required)') : null);
  const clearBtn = h('button', { type: 'button', class: 'linkish', hidden: true, onclick: () => choose(value) }, 'Clear');
  const btns = options.map((o) =>
    h('button', {
      type: 'button', role: 'radio', 'aria-checked': 'false', tabindex: '-1', 'data-value': String(o.value),
      onclick: () => choose(o.value),
    }, o.label));
  const group = h('div', { class: `seg${wrap ? ' seg--wrap' : ''}`, role: 'radiogroup', 'aria-labelledby': `${gid}-l` }, btns);
  roving(group, '[role=radio]');
  const hintEl = hint ? h('p', { class: 'hint' }, hint) : null;
  const el = h('div', { class: 'field' }, h('div', { class: 'field-head' }, labelEl, clearable ? clearBtn : null), group, hintEl);

  function paint() {
    btns.forEach((b, i) => {
      const on = options[i].value === value;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.classList.toggle('on', on);
      b.tabIndex = (value === null ? i === 0 : on) ? 0 : -1;
    });
    clearBtn.hidden = value === null;
  }
  function choose(v) {
    value = clearable && value === v ? null : v;
    paint();
    onChange?.(value);
  }
  paint();
  return {
    el,
    get: () => value,
    set(v) { value = v; paint(); },
    focus: () => (btns.find((b) => b.tabIndex === 0) || btns[0]).focus(),
  };
}

/** A labelled text-like input. Returns the wrapper and the input. */
export function field(id, label, opts = {}) {
  const input = h('input', {
    id, name: id, type: opts.type || 'text', value: opts.value ?? '', placeholder: opts.placeholder,
    inputmode: opts.inputmode, step: opts.step, min: opts.min, list: opts.list, autocomplete: 'off',
    'aria-describedby': opts.hint ? `${id}-hint` : null,
  });
  const err = h('p', { class: 'error', id: `${id}-err`, role: 'alert', hidden: true });
  const el = h('div', { class: 'field' },
    h('label', { for: id, class: 'label' }, label),
    input,
    opts.hint ? h('p', { class: 'hint', id: `${id}-hint` }, opts.hint) : null,
    err);
  return { el, input, error(msg) { err.textContent = msg || ''; err.hidden = !msg; input.setAttribute('aria-invalid', msg ? 'true' : 'false'); } };
}

export function selectField(id, label, pairs, value, emptyLabel = 'Not set') {
  const input = h('select', { id, name: id },
    h('option', { value: '' }, emptyLabel),
    pairs.map(([v, l]) => h('option', { value: v }, l)));
  input.value = value || '';
  const el = h('div', { class: 'field' }, h('label', { for: id, class: 'label' }, label), input);
  return { el, input };
}

export function textArea(id, label, value = '', rows = 3) {
  const input = h('textarea', { id, name: id, rows: String(rows) });
  input.value = value;
  const el = h('div', { class: 'field' }, h('label', { for: id, class: 'label' }, label), input);
  return { el, input };
}

/** Three-pip confidence indicator that also says it in words. */
export function confidenceMeter(level) {
  const n = { low: 1, medium: 2, high: 3 }[level] || 1;
  const word = level[0].toUpperCase() + level.slice(1);
  return h('p', { class: 'conf' },
    h('span', { class: 'pips', 'aria-hidden': 'true' }, [1, 2, 3].map((i) => h('span', { class: i <= n ? 'pip on' : 'pip' }))),
    h('span', null, `Confidence: ${word}`));
}

/** Read-only five-step scale marker, text first, mark second. */
export function scaleReadout(scale, value) {
  const txt = value === null || value === undefined ? 'Not rated' : scale.options[value + 2];
  return h('div', { class: 'readout' },
    h('span', { class: 'label' }, scale.label),
    h('span', { class: 'readout-val' }, txt),
    h('span', { class: 'track', 'aria-hidden': 'true' },
      [0, 1, 2, 3, 4].map((i) => h('span', { class: value !== null && value !== undefined && value + 2 === i ? 'tick on' : 'tick' }))));
}
