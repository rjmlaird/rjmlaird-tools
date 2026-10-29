// Tiny DOM helpers. Text is always set as text nodes, never as HTML, so nothing a
// person types (coffee names, notes, imported files) can inject markup.

const PROPS = new Set(['value', 'checked', 'disabled', 'hidden', 'selected']);

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (PROPS.has(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, kids);
  return el;
}

export function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

/**
 * Arrow-key navigation for tabs and radios. Focus moves and the item is activated,
 * which matches the "automatic activation" pattern for both widgets.
 * `cols` makes up/down move by a row in a grid.
 */
export function roving(container, selector, { cols = 0 } = {}) {
  container.addEventListener('keydown', (e) => {
    const items = [...container.querySelectorAll(selector)].filter((x) => !x.hidden);
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    const n = items.length;
    let j = null;
    switch (e.key) {
      case 'ArrowRight': j = (i + 1) % n; break;
      case 'ArrowLeft': j = (i - 1 + n) % n; break;
      case 'ArrowDown': j = cols ? (i + cols < n ? i + cols : i) : (i + 1) % n; break;
      case 'ArrowUp': j = cols ? (i - cols >= 0 ? i - cols : i) : (i - 1 + n) % n; break;
      case 'Home': j = 0; break;
      case 'End': j = n - 1; break;
      default: return;
    }
    e.preventDefault();
    if (j !== i) {
      items[j].focus();
      items[j].click();
    }
  });
}

export async function copyText(text, fallbackEl) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (fallbackEl) {
      fallbackEl.focus();
      fallbackEl.select();
    }
    return false;
  }
}
