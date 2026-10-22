import { CATEGORIES } from "@rjmlaird/utils";
import { Layout } from "@rjmlaird/ui";
import { Hono } from "hono";

const data = CATEGORIES.map(({ id, name, units }) => ({
  id,
  name,
  units: units.map(({ id, name, symbol }) => ({ id, label: `${name} (${symbol})` })),
}));

// "<" is escaped so the JSON can't close the script tag.
const json = JSON.stringify(data).replace(/</g, "\\u003c");

const script = `
const DATA = ${json};
const $ = (id) => document.getElementById(id);
const cat = $("cat"), from = $("from"), to = $("to"), val = $("val"), out = $("out");
DATA.forEach((c) => cat.add(new Option(c.name, c.id)));
function fill() {
  const c = DATA.find((x) => x.id === cat.value);
  from.length = to.length = 0;
  c.units.forEach((u) => { from.add(new Option(u.label, u.id)); to.add(new Option(u.label, u.id)); });
  if (to.options.length > 1) to.selectedIndex = 1;
  run();
}
async function run() {
  if (val.value === "") { out.textContent = ""; return; }
  const q = new URLSearchParams({ category: cat.value, from: from.value, to: to.value, value: val.value });
  const res = await fetch("/unit-converter/convert?" + q);
  const j = await res.json();
  out.textContent = res.ok ? Number(j.result).toPrecision(10).replace(/\\.?0+(e|$)/, "$1") : j.error;
  out.classList.toggle("error", !res.ok);
}
cat.addEventListener("change", fill);
[from, to, val].forEach((el) => el.addEventListener("input", run));
$("swap").addEventListener("click", () => { const t = from.value; from.value = to.value; to.value = t; run(); });
fill();
`;

export const pageRoute = new Hono();

pageRoute.get("/", (c) =>
  c.html(
    <Layout
      title="Unit Converter"
      lede="Physics, engineering and astronomy units, from newtons and pascals to parsecs, solar masses and electronvolts."
      script={script}
    >
      <section class="panel" aria-labelledby="conv-h">
        <h2 id="conv-h">Convert</h2>
        <label for="cat">Category</label>
        <select id="cat"></select>
        <label for="val">Value</label>
        <input id="val" type="number" step="any" value="1" />
        <label for="from">From</label>
        <select id="from"></select>
        <label for="to">To</label>
        <select id="to"></select>
        <button id="swap" type="button" class="btn-secondary" style="margin-top:1rem">
          ⇄ Swap units
        </button>
        <div class="result" aria-live="polite">
          <div id="out" class="big"></div>
        </div>
        <p class="muted small">
          API: <code>GET /unit-converter/convert?category=length&amp;value=1&amp;from=pc&amp;to=ly</code>
        </p>
      </section>
    </Layout>,
  ),
);
