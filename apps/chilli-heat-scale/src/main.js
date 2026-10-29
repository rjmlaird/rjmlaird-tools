/*
 * Chilli Heat Scale Explorer — logic for tools.rjmlaird.co.uk/chilli-heat-scale
 *
 * Contents
 *   1. Data and categories      (HOW TO ADD OR EDIT PEPPER DATA: change the PEPPERS array)
 *   2. Logarithmic slider mapping
 *   3. Small helpers
 *   4. Explore tab (slider, markers, filters, search, card, heat meter)
 *   5. Compare tab
 *   6. Quiz tab                 (scoring and SHU-range mapping)
 *   7. Calculator tab           (dose formula and assumptions)
 *   8. Shareable summary
 *   9. Tabs and start-up
 *
 * EMBEDDING: the page is self-contained and makes no network requests. Embed it with an iframe
 * (see README.md) or link to a tab with #explore, #compare, #quiz or #calculator.
 *
 * ACCESSIBILITY NOTES
 *   - Tabs follow the ARIA tabs pattern: roving tabindex, Left/Right/Home/End to move.
 *   - The slider's value is a position (0-1000), so aria-valuetext carries the real SHU value and
 *     heat category. A debounced polite live region announces changes without chattering while dragging.
 *   - On wide screens the pepper markers are labelled buttons; on narrow screens they are replaced by a
 *     list of buttons, so only one set is ever in the tab order. The dots on the scale are decorative.
 *   - Colour is never the only signal: heat is also given as a number and a named category.
 *   - Focus rings come from brand.css (:focus-visible); motion respects prefers-reduced-motion.
 */
import "@rjmlaird/ui/brand.css";
import "./tool.css";

/* ------------------------------------------------------------------ 1. Data and categories */

const MAX_SHU = 3_200_000;
const SHARE_URL = "tools.rjmlaird.co.uk/chilli-heat-scale";

/*
 * Peppers. lo/hi are the published SHU range. `median` (the representative value used for slider
 * positions, comparisons and the calculator) defaults to the rounded midpoint of the range; set it
 * explicitly to override. `podG` is a rough typical fresh pod weight in grams, used only for the
 * "about N pods" hint in the calculator; leave it out to hide the hint. `aliases` feed the search box.
 * Order is the order shown in lists. Categories, filters, markers and search all derive from this.
 */
const PEPPERS = [
  { id: "bell", name: "Bell pepper", lo: 0, hi: 0, botanical: "Capsicum annuum", podG: 150, aliases: ["capsicum", "sweet pepper"],
    flavour: "Sweet, juicy and slightly grassy. Bell peppers carry a gene that prevents capsaicinoid production, so there is no heat.",
    use: "Roasting, stuffing, fajitas, salads and as a vegetable base for sauces.",
    note: "No handling precautions needed. Useful when you want pepper flavour without heat." },
  { id: "poblano", name: "Poblano / Ancho", lo: 1000, hi: 2000, botanical: "Capsicum annuum", podG: 100, aliases: ["poblano", "ancho"],
    flavour: "Earthy and mild, with a slight smokiness. Dried poblano (ancho) is sweeter and raisin-like.",
    use: "Chiles rellenos, rajas, mole and chilli sauces; ancho is ground for rubs and powders.",
    note: "Heat varies from pod to pod, so a poblano is occasionally livelier than expected." },
  { id: "jalapeno", name: "Jalapeño", lo: 2500, hi: 8000, botanical: "Capsicum annuum", podG: 15, aliases: ["jalapeno", "chipotle"],
    flavour: "Bright, green and grassy when unripe; sweeter and fruitier when red. Smoked and dried, it becomes chipotle.",
    use: "Salsas, nachos, poppers, pickles, guacamole and green hot sauces.",
    note: "Removing the seeds and pale ribs lowers the heat noticeably. Wash hands after cutting." },
  { id: "serrano", name: "Serrano", lo: 10000, hi: 23000, botanical: "Capsicum annuum", podG: 6, aliases: [],
    flavour: "Crisp, clean and bright, with a sharper, more immediate heat than a jalapeño.",
    use: "Pico de gallo, salsa verde, guacamole and stir-fries.",
    note: "Thin walls and small pods mean it is easy to overdo. Add a little at a time." },
  { id: "cayenne", name: "Cayenne", lo: 30000, hi: 50000, botanical: "Capsicum annuum", podG: 6, aliases: [],
    flavour: "Clean, sharp heat with a faint fruitiness and little smoke.",
    use: "Dried and ground as cayenne powder; Louisiana-style hot sauces, rubs and spice blends.",
    note: "Powdered cayenne irritates if inhaled or rubbed into eyes. Start with a pinch." },
  { id: "thai", name: "Thai bird’s eye", lo: 50000, hi: 100000, botanical: "Capsicum annuum (some types C. frutescens)", podG: 1, aliases: ["thai", "bird eye", "birds eye", "prik kee noo"],
    flavour: "Sharp, fast, bright heat with a slightly fruity edge.",
    use: "Thai curries and dipping sauces, stir-fries, noodle dishes and chilli vinegar.",
    note: "Tiny pods carry a lot of heat. Wear gloves if chopping many." },
  { id: "habanero", name: "Habanero", lo: 100000, hi: 350000, botanical: "Capsicum chinense", podG: 8, aliases: [],
    flavour: "Fruity and floral, with tropical, apricot-like notes before a strong, rounded heat.",
    use: "Yucatán and Caribbean salsas, hot sauces, marinades and fruit salsas such as mango.",
    note: "Avoid touching your eyes. Wear gloves for larger quantities and offer yoghurt or milk with very hot dishes." },
  { id: "scotch-bonnet", name: "Scotch bonnet", lo: 100000, hi: 350000, botanical: "Capsicum chinense", podG: 10, aliases: ["scotch"],
    flavour: "Sweet, fruity and slightly smoky; closely related to the habanero.",
    use: "Jerk seasoning, Caribbean pepper sauces, stews, and rice and peas.",
    note: "Adding the pod whole and removing it later gives more flavour with less heat than chopping it. Handle with care." },
  { id: "madame-jeanette", name: "Madame Jeanette", lo: 125000, hi: 325000, botanical: "Capsicum chinense", podG: 10, aliases: ["jeanette", "jeanette"],
    flavour: "Fruity and citrusy, with a lemony brightness and a quick, strong heat.",
    use: "Surinamese cooking and Caribbean-style sauces, sambals and marinades.",
    note: "Treat it like a habanero: gloves for larger quantities, and keep away from eyes." },
  { id: "ghost", name: "Ghost pepper / Bhut Jolokia", lo: 855000, hi: 1041427, botanical: "Capsicum chinense × C. frutescens", podG: 8, aliases: ["ghost", "bhut jolokia", "naga jolokia"],
    flavour: "Smoky and fruity, with a delayed heat that builds slowly and lingers.",
    use: "Northeast Indian cooking, chilli oils, hot sauces and powders, always in small amounts.",
    note: "Use gloves and eye protection, and ventilate when cooking. Label dishes clearly.",
    record: "Recognised by Guinness World Records as the hottest chilli in 2007." },
  { id: "7-pot-douglah", name: "7 Pot Douglah", lo: 923000, hi: 1853000, botanical: "Capsicum chinense", podG: 10, aliases: ["7 pot", "seven pot", "douglah"],
    flavour: "Fruity with a slightly nutty, earthy note, then fierce heat that builds.",
    use: "Very hot sauces and powders, in tiny amounts.",
    note: "Gloves, eye protection and ventilation. Start with a fraction of what a recipe suggests.",
    record: "Reported values vary between growers and labs; there is no single official figure." },
  { id: "moruga", name: "Trinidad Moruga Scorpion", lo: 1200000, hi: 2009231, botanical: "Capsicum chinense", podG: 8, aliases: ["moruga", "scorpion"],
    flavour: "Sweet and fruity at first, followed by intense, delayed heat.",
    use: "Extremely hot sauces, powders and chilli oils, in tiny amounts.",
    note: "Gloves, eye protection and ventilation. Keep out of reach of children." },
  { id: "reaper", name: "Carolina Reaper", lo: 1400000, hi: 2200000, botanical: "Capsicum chinense", podG: 6, aliases: ["reaper", "carolina"],
    flavour: "Fruity and sweet on the first bite, then severe, lingering heat.",
    use: "Very hot sauces and challenge foods; a tiny piece flavours a whole pot.",
    note: "Gloves and eye protection. Do not serve it to anyone who has not agreed to eat it.",
    record: "Recognised by Guinness World Records as the hottest chilli from 2013 until 2023." },
  { id: "pepper-x", name: "Pepper X", lo: 2693000, hi: 3180000, botanical: "Capsicum chinense", podG: 8, aliases: ["pepper x", "x"],
    flavour: "Reported as fruity, with intense heat that builds slowly. It has little culinary history.",
    use: "Extreme hot sauces and novelty products, in tiny amounts.",
    note: "Gloves, eye protection and ventilation. Treat it with extreme caution.",
    record: "Recognised by Guinness World Records as the hottest chilli in 2023." },
];
for (const p of PEPPERS) p.median ??= Math.round((p.lo + p.hi) / 2);
const byId = Object.fromEntries(PEPPERS.map((p) => [p.id, p]));

/*
 * Heat categories by SHU. `max` is exclusive. `tier` groups them for the five-step heat meter
 * (Mild, Medium, Hot, Very hot, Superhot). Superhot starts at 800,000 SHU so that the ghost pepper,
 * which is widely called a superhot, falls inside it.
 */
const CATEGORIES = [
  { max: 1, key: "none", label: "No heat", chip: "ok", tier: 0 },
  { max: 1000, key: "very-mild", label: "Very mild", chip: "ok", tier: 0 },
  { max: 5000, key: "mild", label: "Mild", chip: "ok", tier: 0 },
  { max: 30000, key: "medium", label: "Medium", chip: "warn", tier: 1 },
  { max: 100000, key: "hot", label: "Hot", chip: "bad", tier: 2 },
  { max: 350000, key: "very-hot", label: "Very hot", chip: "bad", tier: 3 },
  { max: 800000, key: "extreme", label: "Extreme", chip: "bad", tier: 3 },
  { max: Infinity, key: "superhot", label: "Superhot", chip: "bad", tier: 4 },
];
const categoryOf = (shu) => CATEGORIES.find((c) => shu < c.max);

// Preset filters. Each lists the category keys it includes.
const FILTERS = {
  all: { label: "All", keys: null },
  mild: { label: "Mild", keys: ["none", "very-mild", "mild"] },
  medium: { label: "Medium", keys: ["medium"] },
  hot: { label: "Hot", keys: ["hot", "very-hot", "extreme"] },
  superhot: { label: "Superhot", keys: ["superhot"] },
};
const passesFilter = (p, f) => !FILTERS[f].keys || FILTERS[f].keys.includes(categoryOf(p.median).key);

// Gradient stops, used for the scale, and for the accent colour of the readout.
const HEAT_STOPS = [
  [0, [62, 207, 114]], [3000, [242, 225, 76]], [25000, [245, 154, 35]],
  [150000, [229, 56, 59]], [900000, [157, 11, 52]], [MAX_SHU, [107, 15, 46]],
];

/* ------------------------------------------------------------------ 2. Logarithmic slider mapping */
/*
 * The slider has 1001 integer positions (0-1000) and maps them to 0-3,200,000 SHU with
 *
 *     shu = (MAX + 1) ^ (position / 1000) - 1
 *
 * The "+1 / -1" offset makes position 0 exactly 0 SHU (a plain logarithm cannot reach zero) while
 * position 1000 is exactly MAX. Compared with a linear slider this gives bell pepper through
 * jalapeño about the first half of the track, instead of under 0.2% of it.
 * The inverse, used to place markers and move the thumb, is
 *
 *     position = 1000 * ln(shu + 1) / ln(MAX + 1)
 *
 * The mapping is exact; only the displayed value is rounded, to a step that grows with magnitude
 * (5 below 100 SHU up to 10,000 above 1 million), so the numbers stay readable. Choosing a pepper
 * sets the exact median instead of a rounded slider value.
 */
const LOG_MAX = Math.log(MAX_SHU + 1);
const posFrac = (shu) => Math.log(shu + 1) / LOG_MAX; // 0..1
const sliderToShu = (pos) => Math.pow(MAX_SHU + 1, pos / 1000) - 1;
const shuToSlider = (shu) => Math.round(posFrac(shu) * 1000);
function roundDisplay(v) {
  const step = v < 100 ? 5 : v < 1000 ? 10 : v < 10000 ? 50 : v < 100000 ? 500 : v < 1000000 ? 5000 : 10000;
  return Math.min(MAX_SHU, Math.round(v / step) * step);
}
function colourAt(shu) {
  const f = posFrac(shu);
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    const [s0, c0] = HEAT_STOPS[i - 1], [s1, c1] = HEAT_STOPS[i];
    const f0 = posFrac(s0), f1 = posFrac(s1);
    if (f <= f1) {
      const t = f1 === f0 ? 0 : Math.max(0, (f - f0) / (f1 - f0));
      return "rgb(" + c0.map((c, k) => Math.round(c + (c1[k] - c) * t)).join(",") + ")";
    }
  }
  return "rgb(" + HEAT_STOPS.at(-1)[1].join(",") + ")";
}
const GRADIENT = "linear-gradient(90deg," +
  HEAT_STOPS.map(([s, c]) => "rgb(" + c.join(",") + ") " + (posFrac(s) * 100).toFixed(1) + "%").join(",") + ")";

// Five-step heat meter: equal-width tiers, log-interpolated inside each tier.
const TIER_BOUNDS = [0, 5000, 30000, 100000, 800000, MAX_SHU];
function meterFrac(shu) {
  let i = 0;
  while (i < 4 && shu >= TIER_BOUNDS[i + 1]) i++;
  const lo = TIER_BOUNDS[i], hi = TIER_BOUNDS[i + 1];
  const f = i === 0 ? Math.log(shu + 1) / Math.log(hi + 1) : Math.log(shu / lo) / Math.log(hi / lo);
  return (i + Math.min(1, Math.max(0, f))) / 5;
}

/* ------------------------------------------------------------------ 3. Helpers */

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (n) => Number(n).toLocaleString("en-GB", { maximumFractionDigits: 0 });
const rangeText = (p) => (p.lo === p.hi ? fmt(p.lo) + " SHU" : fmt(p.lo) + "–" + fmt(p.hi) + " SHU");
const tidyG = (g) => (g < 1 ? g.toFixed(2) : g < 10 ? g.toFixed(1) : fmt(g)) + " g";
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const wideQuery = window.matchMedia("(min-width: 48rem)");

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
}

let liveTimer;
function announce(msg, delay = 0) {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => { $("live").textContent = msg; }, delay);
}

// Nearest pepper by distance on the logarithmic scale. Ties (for example habanero, Scotch bonnet and
// Madame Jeanette share a median) keep the preferred pepper if it is among them.
function nearest(shu, list, preferId) {
  const d = (p) => Math.abs(Math.log(shu + 1) - Math.log(p.median + 1));
  const best = Math.min(...list.map(d));
  const tied = list.filter((p) => d(p) - best < 1e-9);
  return tied.find((p) => p.id === preferId) || tied[0];
}

// Position helper: x pixel for each pepper, nudging peppers that share a median so none sits exactly on another.
function pepperXs(W) {
  const groups = new Map();
  for (const p of PEPPERS) (groups.get(p.median) || groups.set(p.median, []).get(p.median)).push(p);
  const xs = new Map();
  for (const g of groups.values()) g.forEach((p, i) => xs.set(p.id, clamp(posFrac(p.median) * W + (i - (g.length - 1) / 2) * 10, 0, W)));
  return xs;
}

/* ------------------------------------------------------------------ 4. Explore tab */

const state = { shu: 0, pepperId: "jalapeno", filter: "all", quiz: null, cardId: null };
const el = {
  slider: $("slider"), out: $("shu-out"), chip: $("cat-chip"), inner: $("inner"), labels: $("labels"), dots: $("dots"),
  list: $("list"), card: $("card"), pin: $("pin"), meter: $("meter"), meterText: $("meter-text"), band: $("band"), bandNote: $("band-note"),
};
el.bar = $("bar");
el.bar.style.background = GRADIENT;
$("cmp-bar").style.background = GRADIENT;

const marks = {}; // id -> { dot, leader, label, item }
for (const p of PEPPERS) {
  const m = {
    dot: h("span", { class: "chs-dot" }),
    leader: h("span", { class: "chs-leader" }),
    label: h("button", { type: "button", class: "chs-mk", "aria-pressed": "false", title: p.name + ", " + rangeText(p), onclick: () => pick(p) }, p.name),
    item: h("li", null, h("button", { type: "button", class: "chs-item", "aria-pressed": "false", onclick: () => pick(p) }, h("span", null, p.name), h("small", null, p.lo === p.hi ? "0 SHU" : fmt(p.median) + " SHU"))),
  };
  marks[p.id] = m;
  el.dots.append(m.dot);
  el.labels.append(m.leader, m.label);
  el.list.append(m.item);
}
$("pepper-names").append(...PEPPERS.map((p) => h("option", { value: p.name })));

const visible = () => PEPPERS.filter((p) => passesFilter(p, state.filter));

function layout() {
  const W = el.inner.clientWidth;
  if (!W) return;
  const xs = pepperXs(W);
  for (const p of PEPPERS) marks[p.id].dot.style.left = xs.get(p.id) + "px";
  if (!wideQuery.matches) { el.labels.style.height = "0"; return; }
  // Greedy row packing: labels sit above the bar in as many rows as needed so none overlap.
  const ROW = 28, GAP = 6, rights = [];
  const placed = visible().map((p) => ({ p, x: xs.get(p.id), w: marks[p.id].label.offsetWidth })).sort((a, b) => a.x - b.x);
  for (const it of placed) {
    const left = clamp(it.x - it.w / 2, -10, W - it.w + 10);
    let r = 0;
    while (rights[r] !== undefined && left < rights[r] + GAP) r++;
    rights[r] = left + it.w;
    const m = marks[it.p.id];
    m.label.style.left = left + "px";
    m.label.style.bottom = r * ROW + 6 + "px";
    m.leader.style.left = it.x + "px";
    m.leader.style.height = r * ROW + 8 + "px";
  }
  el.labels.style.height = Math.max(1, rights.length) * ROW + 8 + "px";
}

function paint(fromSlider) {
  const shu = state.shu, p = byId[state.pepperId], cat = categoryOf(shu);
  el.out.textContent = fmt(shu);
  el.chip.className = "chip " + cat.chip;
  el.chip.textContent = cat.label;
  el.out.parentElement.parentElement.style.setProperty("--heat", colourAt(shu));
  if (!fromSlider) el.slider.value = shuToSlider(shu);
  el.slider.setAttribute("aria-valuetext", fmt(shu) + " SHU, " + cat.label.toLowerCase() + ". Nearest pepper: " + p.name);
  // Markers and list
  const vis = new Set(visible().map((v) => v.id));
  for (const q of PEPPERS) {
    const m = marks[q.id], on = q.id === p.id, match = !!state.quiz && state.quiz.ids.has(q.id), show = vis.has(q.id);
    for (const e of [m.dot, m.leader, m.label, m.item]) e.hidden = !show;
    m.dot.classList.toggle("on", on); m.dot.classList.toggle("match", match);
    m.leader.classList.toggle("on", on);
    m.label.classList.toggle("on", on); m.label.classList.toggle("match", match);
    m.label.setAttribute("aria-pressed", String(on));
    const btn = m.item.firstChild;
    btn.classList.toggle("on", on); btn.classList.toggle("match", match);
    btn.setAttribute("aria-pressed", String(on));
  }
  // Pepper card and meter
  if (state.cardId !== p.id) { renderCard(p); state.cardId = p.id; }
  const mf = meterFrac(shu), tierNames = ["Mild", "Medium", "Hot", "Very hot", "Superhot"];
  el.pin.style.left = mf * 100 + "%";
  const tier = tierNames[cat.tier];
  el.meter.setAttribute("aria-label", "Heat meter: " + tier + ", step " + (cat.tier + 1) + " of 5");
  el.meterText.textContent = fmt(shu) + " SHU is in the “" + tier + "” step of five (Mild to Superhot), and is described as " + cat.label.toLowerCase() + ".";
}

function renderCard(p) {
  const cat = categoryOf(p.median);
  const same = PEPPERS.filter((q) => q.id !== p.id && q.lo === p.lo && q.hi === p.hi).map((q) => q.name);
  const dl = h("dl", { class: "kv chs-kv" },
    h("dt", null, "Botanical name"), h("dd", null, h("i", null, p.botanical)),
    h("dt", null, "Flavour"), h("dd", null, p.flavour),
    h("dt", null, "Typical use"), h("dd", null, p.use),
    h("dt", null, "Handling and serving"), h("dd", null, p.note),
    p.record && [h("dt", null, "Record status"), h("dd", null, p.record)],
    same.length > 0 && [h("dt", null, "Same range"), h("dd", null, same.join(", "))]);
  el.card.replaceChildren(
    h("div", { class: "chs-cardhead" }, h("h3", { id: "card-name" }, p.name), h("span", { class: "chip " + cat.chip }, cat.label)),
    h("p", { class: "chs-range" }, h("strong", null, rangeText(p)), h("span", { class: "muted" }, p.lo === p.hi ? "" : " · representative value " + fmt(p.median) + " SHU")),
    dl,
    p.median >= 100000 && h("p", { class: "notice chs-warn" }, "Above 100,000 SHU: avoid eye contact, consider gloves for larger quantities, label the dish and offer dairy-based accompaniments."));
  el.card.classList.remove("pop"); void el.card.offsetWidth; el.card.classList.add("pop");
}

// Set the heat. `pepperId` prefers that pepper when several are equally near.
function setHeat(shu, opts = {}) {
  state.shu = clamp(shu, 0, MAX_SHU);
  state.pepperId = nearest(state.shu, visible(), opts.pepperId || state.pepperId).id;
  paint(opts.fromSlider);
  announce(fmt(state.shu) + " SHU, " + categoryOf(state.shu).label.toLowerCase() + ". Nearest pepper: " + byId[state.pepperId].name + ".", 450);
}

function pick(p, { quiet } = {}) {
  if (!passesFilter(p, state.filter)) setFilter("all", true);
  setHeat(p.median, { pepperId: p.id });
  if (!quiet) setSummary(pepperSummary(p));
}

const onSlider = () => setHeat(roundDisplay(sliderToShu(+el.slider.value)), { fromSlider: true });
const onCommit = () => {
  const p = byId[state.pepperId];
  setSummary(state.shu >= p.lo && state.shu <= p.hi
    ? pepperSummary(p)
    : "Around " + fmt(state.shu) + " SHU (" + categoryOf(state.shu).label.toLowerCase() + "), nearest to " + p.name + " at " + rangeText(p) + ".");
};
el.slider.addEventListener("input", onSlider);
el.slider.addEventListener("change", onCommit);
el.slider.addEventListener("keydown", (e) => {
  const steps = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageUp: 50, PageDown: -50 };
  if (!(e.key in steps)) return;
  e.preventDefault();
  let d = steps[e.key];
  if (e.shiftKey && Math.abs(d) === 5) d = Math.sign(d);
  el.slider.value = clamp(+el.slider.value + d, 0, 1000);
  onSlider();
  onCommit();
});

// Filters
const filterBox = $("filters");
for (const [key, f] of Object.entries(FILTERS)) {
  filterBox.append(h("button", { type: "button", "data-f": key, "aria-pressed": String(key === "all"), onclick: () => setFilter(key) }, f.label));
}
function setFilter(key, silent) {
  state.filter = key;
  for (const b of filterBox.children) b.setAttribute("aria-pressed", String(b.dataset.f === key));
  layout();
  setHeat(state.shu);
  layout();
  if (!silent) announce("Showing " + visible().length + " pepper" + (visible().length === 1 ? "" : "s") + ": " + FILTERS[key].label + ".");
}

// Search
const qMsg = $("q-msg");
function findMatches(raw) {
  const q = norm(raw);
  if (q.length < 1) return [];
  const names = (p) => [p.name, ...p.aliases].map(norm);
  const exact = PEPPERS.filter((p) => names(p).includes(q));
  if (exact.length) return exact;
  // Otherwise every pepper whose name or alias contains the text, with names that start with it first.
  const has = PEPPERS.filter((p) => names(p).some((n) => n.includes(q)));
  const starts = (p) => names(p).some((n) => n.startsWith(q));
  return [...has.filter(starts), ...has.filter((p) => !starts(p))];
}
function search(commit) {
  const raw = $("q").value, hits = findMatches(raw);
  if (!norm(raw)) { qMsg.textContent = ""; return; }
  if (!hits.length) { qMsg.textContent = "No pepper found. Try another name, or choose from the suggestions."; return; }
  // While typing, jump only when the match is unambiguous; Enter or choosing a suggestion takes the first match.
  if (hits.length === 1 || commit) {
    pick(hits[0]);
    qMsg.textContent = "Jumped to " + hits[0].name + (hits.length > 1 ? ". " + (hits.length - 1) + " other match" + (hits.length > 2 ? "es" : "") + " for this search." : ".");
  } else qMsg.textContent = hits.length + " matches (" + hits.slice(0, 4).map((p) => p.name).join(", ") + (hits.length > 4 ? "…" : "") + "). Keep typing, or press Enter for the first.";
}
$("q").addEventListener("input", (e) => search(e.inputType === "insertReplacementText" || !e.inputType));
$("q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); search(true); } });

/* ------------------------------------------------------------------ 5. Compare tab */

const cmp = { a: "jalapeno", b: "habanero" };
for (const id of ["cmp-a", "cmp-b"]) $(id).append(...PEPPERS.map((p) => h("option", { value: p.id }, p.name)));
$("cmp-a").value = cmp.a; $("cmp-b").value = cmp.b;

// Round a ratio sensibly: one decimal below 10, whole numbers below 100, then tens and hundreds.
function roundRatio(r) {
  if (r < 10) return String(Math.round(r * 10) / 10);
  if (r < 100) return String(Math.round(r));
  if (r < 1000) return fmt(Math.round(r / 10) * 10);
  return fmt(Math.round(r / 100) * 100);
}
function compareText(a, b) {
  if (a.id === b.id) return "Choose two different peppers to compare.";
  if (a.median === b.median) return a.name + " and " + b.name + " share the same representative value (" + fmt(a.median) + " SHU), so on this scale they are about equally hot.";
  const [hot, mild] = a.median > b.median ? [a, b] : [b, a];
  if (mild.median === 0) return mild.name + " has no capsaicinoid heat (0 SHU), so " + hot.name + " cannot be expressed as a multiple of it.";
  const r = hot.median / mild.median;
  let t = hot.name + " is " + (r < 10 ? "about " : "roughly ") + roundRatio(r) + " times hotter than " + mild.name + ", comparing representative median values.";
  if (hot.lo > mild.hi && mild.lo > 0) t += " Across the full published ranges the multiple runs from about " + roundRatio(hot.lo / mild.hi) + " to " + roundRatio(hot.hi / mild.lo) + " times.";
  else if (hot.lo <= mild.hi) t += " Their published ranges overlap, so an individual " + mild.name + " pod can be as hot as an individual " + hot.name + " pod.";
  return t;
}
function renderCompare() {
  const a = byId[cmp.a], b = byId[cmp.b];
  const text = compareText(a, b);
  $("cmp-result").replaceChildren(h("p", { class: "big chs-statement" }, text));
  const row = (label, f) => h("tr", null, h("th", { scope: "row" }, label), h("td", null, f(a)), h("td", null, f(b)));
  $("cmp-table").replaceChildren(
    h("caption", null, "Side-by-side detail"),
    h("thead", null, h("tr", null, h("td"), h("th", { scope: "col" }, "A: " + a.name), h("th", { scope: "col" }, "B: " + b.name))),
    h("tbody", null,
      row("Published range", rangeText), row("Representative value", (p) => fmt(p.median) + " SHU"),
      row("Heat category", (p) => categoryOf(p.median).label), row("Botanical name", (p) => p.botanical),
      row("Flavour", (p) => p.flavour), row("Typical use", (p) => p.use)));
  layoutCompare();
  if (a.id !== b.id) setSummary(text);
}
function layoutCompare() {
  const inner = $("cmp-bar").parentElement, W = inner.clientWidth;
  if (!W) return;
  const a = byId[cmp.a], b = byId[cmp.b];
  const dots = [["a", a, "A"], ["b", b, "B"]];
  $("cmp-dots").replaceChildren(...dots.map(([k, p, l]) => h("span", { class: "chs-dot big " + k, style: "left:" + posFrac(p.median) * W + "px" }, l)));
  for (const [zone, [, p, l]] of [[$("cmp-top"), dots[0]], [$("cmp-bottom"), dots[1]]]) {
    const flag = h("span", { class: "chs-flag" }, l + ": " + p.name + " · " + fmt(p.median) + " SHU");
    zone.replaceChildren(flag);
    const x = posFrac(p.median) * W;
    flag.style.left = clamp(x - flag.offsetWidth / 2, -10, W - flag.offsetWidth + 10) + "px";
    flag.style.setProperty("--tick", x + "px");
    zone.style.setProperty("--tick", x + "px");
  }
}
$("cmp-a").addEventListener("change", (e) => { cmp.a = e.target.value; renderCompare(); });
$("cmp-b").addEventListener("change", (e) => { cmp.b = e.target.value; renderCompare(); });
$("cmp-swap").addEventListener("click", () => { [cmp.a, cmp.b] = [cmp.b, cmp.a]; $("cmp-a").value = cmp.a; $("cmp-b").value = cmp.b; renderCompare(); });

/* ------------------------------------------------------------------ 6. Quiz tab */
/*
 * SCORING. Each question has five answers worth 0-4 points (first answer 0, last answer 4).
 * The weighted score is
 *
 *     w = 0.5 * tolerance + 0.3 * dishes + 0.2 * burn        (0 to 4)
 *
 * Tolerance counts most because it is the most direct statement of comfort. Two conservative caps then apply:
 *   - w never exceeds tolerance + 0.45, so cooking habits and burn preferences cannot lift you more than
 *     about half a step above what you say you tolerate;
 *   - w never exceeds (lowest answer + 1.95), so contradictory answers (for example "makes me sweat" with
 *     "no burn at all") pull the result down rather than averaging out.
 * The capped score then falls into one of nine bands (BANDS below, `max` exclusive). Each band is a SHU
 * range aligned with real peppers, and the result is always shown as a range. Bands are chosen so that
 * the top band needs near-unanimous top answers (w of 3.85 or more). Pepper X is deliberately never suggested.
 */
const QUIZ = [
  { id: "tol", legend: "1. Heat tolerance", opts: ["I avoid chilli heat", "A little warmth is nice", "I enjoy a noticeable kick", "I like food that makes me sweat", "The hotter the better"] },
  { id: "dish", legend: "2. Preferred dishes", opts: ["Mild family meals, roasted vegetables, soups", "Tacos, curries and stir-fries with a gentle lift", "Salsas, wings and spicy noodles", "Fiery hot sauces, jerk-style dishes and chilli-heavy cooking", "Extreme sauces and superhot challenges"] },
  { id: "burn", legend: "3. Desired burn duration", opts: ["No burn at all", "A brief warmth that fades quickly", "A clear kick for a minute or two", "A long, building burn", "An intense, lingering burn"] },
];
const WEIGHTS = [0.5, 0.3, 0.2];
const BANDS = [
  { max: 0.5, lo: 0, hi: 1000, phrase: "bell pepper territory, with little or no heat",
    text: "You will be happiest with flavour rather than heat: roasted vegetables, mild soups and family meals. Sweet peppers and mild paprika sit here." },
  { max: 1.0, lo: 1000, hi: 2500, phrase: "poblano and ancho territory",
    text: "A gentle background warmth. Think mole, mild chilli powder blends and stuffed poblanos, where chilli adds depth rather than a kick." },
  { max: 1.5, lo: 2500, hi: 8000, phrase: "jalapeño territory",
    text: "A friendly lift that most people enjoy. Fresh jalapeños suit salsas, nachos and tacos; remove the seeds and pale ribs for less heat." },
  { max: 2.0, lo: 5000, hi: 15000, phrase: "jalapeño to mild serrano territory",
    text: "A noticeable but comfortable kick: hot jalapeños, mild serranos and many everyday hot sauces." },
  { max: 2.5, lo: 10000, hi: 25000, phrase: "serrano territory, edging towards cayenne",
    text: "A clear, bright heat that suits pico de gallo, spicy noodles and wings. You can use serranos freely and start cautiously with cayenne." },
  { max: 3.0, lo: 30000, hi: 100000, phrase: "cayenne to Thai bird’s eye territory",
    text: "Serious, sweat-inducing heat. Cayenne-based sauces and Thai curries with bird’s eye chillies are comfortable ground; add them gradually." },
  { max: 3.5, lo: 100000, hi: 350000, phrase: "habanero to Scotch bonnet territory",
    text: "Strong, fruity heat as in jerk dishes and Caribbean pepper sauces. Use gloves for larger quantities and keep yoghurt or milk to hand." },
  { max: 3.85, lo: 350000, hi: 1000000, phrase: "top-end habanero family to ghost pepper territory",
    text: "Very hot, long-lasting heat. Work in tiny amounts, taste between additions and label what you cook." },
  { max: Infinity, lo: 1000000, hi: 2200000, phrase: "superhot territory, from ghost pepper to Carolina Reaper",
    text: "Extreme heat that is as much about challenge as cooking. Use a sliver rather than a pod, wear gloves and eye protection, and never serve it unannounced." },
];
function scoreQuiz(ans) {
  const w = ans.reduce((s, a, i) => s + a * WEIGHTS[i], 0);
  const capped = Math.min(w, ans[0] + 0.45, Math.min(...ans) + 1.95);
  return BANDS.find((b) => capped < b.max);
}
// A pepper overlaps the result if their ranges share more than an endpoint (zero-heat peppers must fall inside it).
const overlaps = (p, lo, hi) => (p.lo === p.hi ? p.lo >= lo && p.lo <= hi : p.lo < hi && p.hi > lo);

const quizForm = $("quiz");
QUIZ.forEach((q, qi) => quizForm.append(h("fieldset", { class: "chs-fs" }, h("legend", null, q.legend),
  h("div", { class: "chs-opts" }, q.opts.map((o, oi) => h("label", { class: "check" }, h("input", { type: "radio", name: "q" + qi, value: String(oi), required: true }), o))))));
quizForm.append(h("button", { type: "submit", class: "btn-primary" }, "See my comfort zone"));

quizForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const ans = QUIZ.map((_, i) => quizForm.querySelector('input[name="q' + i + '"]:checked')).map((r) => (r ? +r.value : null));
  $("quiz-error").hidden = ans.every((a) => a !== null);
  if (ans.includes(null)) return;
  const band = scoreQuiz(ans), mid = Math.round((band.lo + band.hi) / 2);
  const matches = PEPPERS.filter((p) => overlaps(p, band.lo, band.hi));
  state.quiz = { lo: band.lo, hi: band.hi, ids: new Set(matches.map((p) => p.id)) };
  const headline = "Your comfort zone: roughly " + fmt(band.lo) + "–" + fmt(band.hi) + " SHU — " + band.phrase + ".";
  quizForm.hidden = true;
  $("quiz-result").replaceChildren(
    h("p", { class: "big chs-statement" }, headline),
    h("p", null, band.text),
    h("p", { class: "lab" }, "Peppers that overlap your range"),
    h("ul", { class: "chs-chips" }, matches.map((p) => h("li", { class: "chip off" }, p.name))),
    h("p", { class: "muted small" }, "This is a personal guide based on your self-reported preferences. It is not a medical or physiological measurement, and comfort changes with the dish, your mood and what you have eaten. The scale has been set to the middle of your range (" + fmt(mid) + " SHU)."),
    h("div", { class: "row" },
      h("button", { type: "button", class: "btn-primary", onclick: () => switchTab("explore", true) }, "Show on the scale"),
      h("button", { type: "button", class: "btn-secondary", id: "retake", onclick: retake }, "Retake quiz")));
  setHeat(mid);
  showBand();
  setSummary("My chilli comfort zone: roughly " + fmt(band.lo) + "–" + fmt(band.hi) + " SHU — " + band.phrase + ".");
  $("quiz-result").focus();
});
function retake() {
  quizForm.reset(); quizForm.hidden = false; $("quiz-error").hidden = true;
  $("quiz-result").replaceChildren(); state.quiz = null; showBand(); paint(true);
  quizForm.querySelector("input").focus();
}
// Shade the user's range on the main scale.
function showBand() {
  const q = state.quiz;
  el.band.hidden = !q; el.bandNote.hidden = !q;
  if (!q) return;
  const l = posFrac(q.lo) * 100, r = posFrac(q.hi) * 100;
  el.band.style.left = l + "%"; el.band.style.width = Math.max(0.8, r - l) + "%";
  el.bandNote.textContent = "Your comfort zone (" + fmt(q.lo) + "–" + fmt(q.hi) + " SHU) is outlined on the scale; matching peppers have an amber outline.";
  paint(true);
}

/* ------------------------------------------------------------------ 7. Calculator tab */
/*
 * DOSE FORMULA AND ASSUMPTIONS
 *
 *     pepper mass (g) = target SHU x sauce mass (g) / pepper median SHU
 *
 * This treats SHU as a concentration, so the finished sauce has heat = (pepper share of sauce) x (pepper SHU).
 * Assumptions: the pepper's representative (median) SHU applies to everything that goes into the pot, the
 * heat is evenly mixed, and nothing else in the recipe adds heat. It ignores seeds and ribs, fat, dilution at
 * serving, and cooking losses, all of which change perceived heat. Hence "start low":
 *   - first addition = 50% of the estimate (25% above 100,000 SHU, 10% for superhots, 800,000 SHU and above).
 * If the formula needs more pepper than the sauce weighs, the pepper is too mild for that target and the tool says so.
 * Pod-size hints use the rough `podG` weights in PEPPERS and are shown only where the amount is credible.
 */
const TARGETS = [["Gentle", 1000], ["Medium", 3000], ["Hot", 10000], ["Very hot", 30000], ["Extreme", 100000]];
$("c-pepper").append(...PEPPERS.filter((p) => p.median > 0).map((p) => h("option", { value: p.id }, p.name + " (" + fmt(p.median) + " SHU)")));
$("c-pepper").value = "habanero";
$("c-desc").append(...TARGETS.map(([n, v], i) => h("option", { value: String(v) }, n + " (about " + fmt(v) + " SHU)")));
$("c-desc").value = "10000";

function podPhrase(p, g) {
  if (!p.podG) return null;
  if (g < 0.1) return "far too little to weigh: use a tiny sliver";
  const n = g / p.podG;
  if (n > 30) return null;
  if (n < 0.15) return "a small slice, well under a quarter of a typical pod";
  if (n < 0.375) return "about a quarter of a typical pod";
  if (n < 0.625) return "about half a typical pod";
  if (n < 0.875) return "about three-quarters of a typical pod";
  if (n < 1.25) return "about one typical pod";
  const r = n < 5 ? Math.round(n * 2) / 2 : Math.round(n);
  const word = Number.isInteger(r) ? String(r) : Math.floor(r) + "½";
  return "about " + word + " typical pods";
}
function fieldError(inputId, errId, msg) {
  const inp = $(inputId), err = $(errId);
  err.hidden = !msg; err.textContent = msg || "";
  inp.setAttribute("aria-invalid", msg ? "true" : "false");
}
function calc() {
  const mode = document.querySelector('input[name="c-mode"]:checked').value;
  $("c-desc-wrap").hidden = mode !== "desc"; $("c-shu-wrap").hidden = mode !== "shu";
  const out = $("calc-result"), p = byId[$("c-pepper").value];
  const weight = parseFloat($("c-weight").value), target = mode === "desc" ? +$("c-desc").value : parseFloat($("c-shu").value);
  const wErr = !(weight > 0) ? "Enter a sauce weight greater than 0 g." : weight > 100000 ? "Enter a weight of 100,000 g (100 kg) or less." : "";
  const tErr = mode === "shu" ? (!(target > 0) ? "Enter a target greater than 0 SHU." : target > MAX_SHU ? "Enter a target of 3,200,000 SHU or less." : "") : "";
  fieldError("c-weight", "c-weight-err", wErr);
  fieldError("c-shu", "c-shu-err", tErr);
  if (wErr || tErr) { out.replaceChildren(); return; }

  const mass = (target * weight) / p.median;
  const kids = [];
  if (mass >= weight) {
    out.className = "result error";
    out.replaceChildren(h("p", null, p.name + " is too mild to reach " + fmt(target) + " SHU. Even a sauce made entirely of it would reach only about " + fmt(p.median) + " SHU. Choose a hotter pepper or a lower target."));
    return;
  }
  out.className = "result";
  const frac = p.median >= 800000 ? 0.1 : p.median >= 100000 ? 0.25 : 0.5, first = mass * frac;
  const pods = podPhrase(p, mass), podsFirst = podPhrase(p, first);
  kids.push(
    h("p", null, "For a " + fmt(weight) + " g sauce at a target of " + fmt(target) + " SHU using " + p.name + " at a representative " + fmt(p.median) + " SHU, the estimate is about " + tidyG(mass) + " of pepper. Start with roughly " + tidyG(first) + (podsFirst ? " (" + podsFirst + ")" : "") + ", then taste and add gradually. Actual heat will vary."),
    h("dl", { class: "kv" },
      h("dt", null, "Estimate (full amount)"), h("dd", { class: "lead" }, tidyG(mass)),
      h("dt", null, "First addition (" + Math.round(frac * 100) + "%)"), h("dd", null, tidyG(first)),
      pods && [h("dt", null, "Kitchen guide"), h("dd", null, "Full amount: " + pods + ". Typical pod about " + p.podG + " g; real pods vary widely.")],
      h("dt", null, "Pepper share of sauce"), h("dd", null, (mass / weight * 100).toFixed(mass / weight < 0.1 ? 1 : 0) + "%"),
      h("dt", null, "Calculation"), h("dd", null, fmt(target) + " × " + fmt(weight) + " ÷ " + fmt(p.median) + " = " + (mass < 10 ? mass.toFixed(2) : mass.toFixed(1)) + " g")),
    h("p", { class: "muted small" }, "Basis: assumes the pepper’s median SHU is evenly distributed through the final sauce."));
  if (mass / weight > 0.4) kids.push(h("p", { class: "notice" }, "That is a large share of the sauce, so expect a strong pepper flavour and texture. A hotter pepper would need less."));
  if (p.median >= 800000) kids.push(h("p", { class: "notice" }, "Superhot caution: begin with much less than the calculator suggests, such as a tenth of the estimate. Wear gloves and eye protection, ventilate the kitchen, label the finished sauce and keep it away from children."));
  else if (p.median >= 100000) kids.push(h("p", { class: "notice" }, "Above 100,000 SHU: avoid eye contact, consider gloves for larger quantities, label very hot dishes and offer yoghurt or milk."));
  out.replaceChildren(...kids);
  setSummary("For a " + fmt(weight) + " g sauce at " + fmt(target) + " SHU, I’d start with about " + tidyG(first) + " of " + p.name + " (full estimate " + tidyG(mass) + ") — then adjust carefully.");
}
for (const id of ["c-weight", "c-pepper", "c-desc", "c-shu"]) $(id).addEventListener("input", calc);
for (const r of document.querySelectorAll('input[name="c-mode"]')) r.addEventListener("change", calc);
$("calc").addEventListener("submit", (e) => e.preventDefault());

/* ------------------------------------------------------------------ 8. Shareable summary */

const summaryEl = $("summary"), copyMsg = $("copy-msg");
const pepperSummary = (p) => p.lo === p.hi
  ? p.name + ": " + fmt(p.lo) + " SHU, so no capsaicinoid heat."
  : p.name + ": roughly " + rangeText(p) + " (" + categoryOf(p.median).label.toLowerCase() + ").";
function setSummary(text) { summaryEl.value = text + "\n" + SHARE_URL; copyMsg.textContent = ""; }
$("copy").addEventListener("click", async () => {
  const text = summaryEl.value;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(text);
    copyMsg.textContent = "Copied to the clipboard.";
  } catch {
    // Fallback: select the text and try the legacy command; if that fails, ask the visitor to copy manually.
    summaryEl.focus(); summaryEl.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    copyMsg.textContent = ok ? "Copied to the clipboard." : "Copying was blocked. The text is selected: press Ctrl+C (or Cmd+C) to copy it.";
  }
});

/* ------------------------------------------------------------------ 9. Tabs and start-up */

const TABS = ["explore", "compare", "quiz", "calculator"];
function switchTab(id, focusSlider) {
  for (const t of TABS) {
    const on = t === id;
    $("t-" + t).setAttribute("aria-selected", String(on));
    $("t-" + t).tabIndex = on ? 0 : -1;
    $("p-" + t).hidden = !on;
  }
  history.replaceState(null, "", "#" + id);
  if (id === "explore") { layout(); if (focusSlider) el.slider.focus(); }
  if (id === "compare") layoutCompare();
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest('[role="tab"]'); if (b) switchTab(b.id.slice(2)); });
$("tabs").addEventListener("keydown", (e) => {
  const i = TABS.indexOf(document.activeElement.id.slice(2));
  if (i < 0) return;
  const next = { ArrowRight: (i + 1) % 4, ArrowLeft: (i + 3) % 4, Home: 0, End: 3 }[e.key];
  if (next === undefined) return;
  e.preventDefault();
  switchTab(TABS[next]);
  $("t-" + TABS[next]).focus();
});
window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (TABS.includes(t)) switchTab(t); });

new ResizeObserver(() => { layout(); layoutCompare(); }).observe(el.inner);
wideQuery.addEventListener("change", layout);

setHeat(byId.jalapeno.median, { pepperId: "jalapeno" });
renderCompare();
calc();
setSummary(pepperSummary(byId.jalapeno));
layout();
const startTab = location.hash.slice(1);
if (TABS.includes(startTab)) switchTab(startTab);
