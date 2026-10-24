// Entry for Vite: the shared brand layer, this tool's styles, then its logic.
import "@rjmlaird/ui/brand.css";
import "./tool.css";

const M = {
  factor: { elec: 0.2072, gas: 0.1829, oil: 0.2468, lpg: 0.2145 }, // kg CO2e per kWh
  rate: { elec: 0.245, gas: 0.062, oil: 0.085, lpg: 0.095 },         // £ per kWh (illustrative)
  standing: { elec: 193, gas: 115 },                                   // £ per year (illustrative)
  tdcv: { elec: { low: 1800, med: 2700, high: 4100 }, gas: { low: 7500, med: 11500, high: 17000 } },
  solarShare: 0.45,
  scopUpgrade: 3.4,
  m3ToKwh: (1.02264 * 39.5) / 3.6,
  heatSplit: 0.78,
  elecSplit: 0.65,
};

const FUELS = {
  gas: "Mains natural gas",
  oil: "Heating oil",
  lpg: "LPG",
  heatpump: "Air source heat pump",
  electric: "Direct electric / storage heaters",
};

const MEASURES = [
  { id: "loft", title: "Loft insulation top-up to 270 mm", desc: "Top up existing mineral wool from 100 mm to 270 mm to cut roof heat loss.", cost: 650, heatPct: 0.15 },
  { id: "cavity", title: "Cavity wall insulation", desc: "Fill the external wall cavity with insulation beads.", cost: 1200, heatPct: 0.18 },
  { id: "draught", title: "Draught proofing doors and windows", desc: "Seal gaps around doors, windows, floorboards and loft hatches.", cost: 250, heatPct: 0.05 },
  { id: "controls", title: "Smart thermostat and radiator valves", desc: "Zoned smart controls with thermostatic radiator valves.", cost: 300, heatPct: 0.1 },
  { id: "solar_pv", title: "4 kW solar PV array", desc: "Roof-mounted panels producing around 3,400 kWh a year, of which part is used in the home.", cost: 6000, solar: true },
  { id: "heat_pump", title: "Air source heat pump (net of a £7,500 grant)", desc: "Replace a boiler or direct electric heating with a heat pump at an assumed SCOP of 3.4.", cost: 4500, hp: true },
];

const KEY = "rjmlaird-home-energy-v1";
const OLD = "uk_home_energy_state";
const DEFAULTS = {
  floor: 95,
  occ: 3,
  elecMode: "kwh",
  elecKwh: 2700,
  elecSpend: 70,
  elecRate: 24.5,
  r1: 12000,
  r2: 14700,
  days: 365,
  heat: "gas",
  heatUnit: "kwh",
  heatKwh: 11500,
  eff: 85,
  scop: 3.2,
  sel: [],
};

let state = { ...DEFAULTS };
let canSave = true;
let toastTimer;

// ---- DOM Helpers & Formatters
const $ = (id) => document.getElementById(id);
const el = (tag, props, ...kids) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids.filter((k) => k != null));
  return node;
};

const fin = (v, d = 0) => (Number.isFinite(v) ? v : d);
const pos = (v, d = 0) => Math.max(0, fin(v, d));
const nf = (n, d = 0) => Number(n).toLocaleString("en-GB", { maximumFractionDigits: d, minimumFractionDigits: d });
const gbp = (n) => "£" + nf(Math.round(n));

const toast = (t) => {
  const b = $("toast");
  b.textContent = t;
  b.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    b.hidden = true;
  }, 3000);
};

// ---- State Management
function sanitise(raw) {
  const s = { ...DEFAULTS };
  const r = raw && typeof raw === "object" ? raw : {};

  const num = (k, lo, hi) => {
    const v = Number(r[k]);
    if (r[k] !== "" && r[k] != null && Number.isFinite(v)) {
      s[k] = Math.min(hi, Math.max(lo, v));
    }
  };

  num("floor", 10, 1000);
  num("occ", 1, 20);
  num("elecKwh", 0, 1e6);
  num("elecSpend", 0, 1e5);
  num("elecRate", 1, 200);
  num("r1", 0, 1e9);
  num("r2", 0, 1e9);
  num("days", 1, 1000);
  num("heatKwh", 0, 1e6);
  num("eff", 50, 100);
  num("scop", 1, 6);

  if (["kwh", "cost", "meter"].includes(r.elecMode)) s.elecMode = r.elecMode;

  const heat = r.heat === "none" ? "electric" : r.heat;
  if (FUELS[heat]) s.heat = heat;

  if (["kwh", "m3"].includes(r.heatUnit)) s.heatUnit = r.heatUnit;

  if (Array.isArray(r.sel)) {
    s.sel = r.sel.filter((id) => MEASURES.some((m) => m.id === id));
  } else if (Array.isArray(r.selectedActions)) {
    const map = {
      loft_insulation: "loft",
      cavity_wall: "cavity",
      draught_proofing: "draught",
      smart_thermostat: "controls",
      solar_pv: "solar_pv",
      heat_pump: "heat_pump",
    };
    s.sel = r.selectedActions.map((id) => map[id]).filter(Boolean);
  }

  return s;
}

function load() {
  try {
    localStorage.setItem("__rj", "1");
    localStorage.removeItem("__rj");
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD);
    if (raw) state = sanitise(JSON.parse(raw));
  } catch {
    canSave = false;
  }
  $("mem").hidden = canSave;
}

function save() {
  if (!canSave) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    canSave = false;
    $("mem").hidden = false;
  }
}

// ---- Calculation Model
function baseline(s) {
  let elec = 0;
  let note = "";

  if (s.elecMode === "kwh") {
    elec = pos(s.elecKwh);
  } else if (s.elecMode === "cost") {
    const rate = fin(s.elecRate, 24.5) / 100;
    elec = rate > 0 ? Math.max(0, (pos(s.elecSpend) * 12 - M.standing.elec) / rate) : 0;
    note = "After a standing charge of about " + gbp(M.standing.elec) + " a year.";
  } else {
    const diff = fin(s.r2) - fin(s.r1);
    const days = pos(s.days, 365) || 365;
    elec = Math.max(0, (diff / days) * 365);
    note = diff < 0 ? "The latest reading is lower than the earlier one." : "Scaled to a full year.";
  }

  const input = s.heatUnit === "m3" && s.heat === "gas" ? pos(s.heatKwh) * M.m3ToKwh : pos(s.heatKwh);
  const fuel = s.heat === "heatpump" ? input / Math.max(1, fin(s.scop, 3.2)) : input;

  return { elec, fuel, input, note };
}

function figures(elec, fuel, type, gasConnected) {
  const elecFuel = type === "heatpump" || type === "electric";
  const fKg = elecFuel ? M.factor.elec : M.factor[type] ?? 0;
  const fRate = elecFuel ? M.rate.elec : M.rate[type] ?? 0;

  const co2 = (elec * M.factor.elec + fuel * fKg) / 1000;
  const cost = elec * M.rate.elec + M.standing.elec + fuel * fRate + (gasConnected ? M.standing.gas : 0);

  return {
    co2,
    cost,
    kwh: elec + fuel,
    elecCo2: (elec * M.factor.elec) / 1000,
    fuelCo2: (fuel * fKg) / 1000,
    elecCost: elec * M.rate.elec + M.standing.elec,
    fuelCost: fuel * fRate + (gasConnected ? M.standing.gas : 0),
  };
}

const hpApplicable = (s) => s.heat !== "heatpump";

function scenario(s, b, sel) {
  let fuel = b.fuel;
  let elec = b.elec;
  const type = s.heat;
  const has = (id) => sel.includes(id);

  for (const m of MEASURES) {
    if (has(m.id) && m.heatPct) fuel *= 1 - m.heatPct;
  }

  const hp = has("heat_pump") && hpApplicable(s);
  if (hp) {
    const eff = s.heat === "electric" ? 1 : fin(s.eff, 85) / 100;
    elec += (fuel * eff) / M.scopUpgrade;
    fuel = 0;
  }

  if (has("solar_pv")) {
    elec = Math.max(0, elec - b.elec * M.solarShare);
  }

  return figures(elec, fuel, type, s.heat === "gas" && !hp);
}

function evaluate() {
  const b = baseline(state);
  const base = figures(b.elec, b.fuel, state.heat, state.heat === "gas");
  const items = MEASURES.map((m) => {
    const na = m.hp && !hpApplicable(state);
    const sc = scenario(state, b, [m.id]);
    const save = na ? 0 : base.cost - sc.cost;
    const co2 = na ? 0 : base.co2 - sc.co2;
    return { ...m, na, save, co2, payback: save > 0 ? m.cost / save : Infinity };
  });
  return {
    b,
    base,
    items,
    combined: scenario(state, b, state.sel.filter((id) => !(id === "heat_pump" && !hpApplicable(state)))),
  };
}

// ---- Rendering & UI Updates
function tierOf(v, t) {
  return v <= t.low ? ["ok", "Low"] : v <= t.high ? ["off", "Typical range"] : ["warn", "High"];
}

function bmCard(prefix, v, t, applicable, why) {
  const chip = $("bm-" + prefix + "-chip");
  const bar = $("bm-" + prefix + "-bar");
  const ticks = $("bm-" + prefix + "-ticks");
  const txt = $("bm-" + prefix + "-t");

  bar.replaceChildren();
  ticks.replaceChildren();

  if (!applicable) {
    chip.className = "chip off";
    chip.textContent = "Not applicable";
    txt.textContent = why;
    return null;
  }

  const [c, l] = tierOf(v, t);
  chip.className = "chip " + c;
  chip.textContent = l;

  const max = t.high * 1.25;
  bar.append(
    el("div", { className: "meter" + (c === "warn" ? " warn" : ""), ariaHidden: "true" }, el("span", { style: "width:" + Math.min(100, (v / max) * 100) + "%" }))
  );

  for (const k of ["low", "med", "high"]) {
    bar.append(el("i", { style: "left:" + (t[k] / max) * 100 + "%", ariaHidden: "true" }));
  }

  for (const [k, n] of [["low", "Low"], ["med", "Medium"], ["high", "High"]]) {
    ticks.append(el("div", {}, el("span", { className: "muted", textContent: n }), el("b", { textContent: nf(t[k]) + " kWh" })));
  }

  txt.textContent = "Your use: " + nf(v) + " kWh a year, " + Math.round((v / t.med) * 100) + "% of the medium value.";
  return l;
}

function renderDonut(e, h) {
  const svg = $("donut");
  svg.replaceChildren();
  const NS = "http://www.w3.org/2000/svg";
  const mk = (t, a) => {
    const x = document.createElementNS(NS, t);
    for (const k in a) x.setAttribute(k, a[k]);
    return x;
  };

  const tot = e + h;
  const pe = tot ? (e / tot) * 100 : 0;

  svg.append(mk("circle", { cx: 21, cy: 21, r: 15.9155, fill: "none", stroke: "#1b2436", "stroke-width": 5 }));
  if (tot) {
    svg.append(mk("circle", { cx: 21, cy: 21, r: 15.9155, fill: "none", stroke: "#f5a623", "stroke-width": 5, "stroke-dasharray": (100 - pe) + " " + pe, "stroke-dashoffset": 25 - pe }));
    if (pe > 0) {
      svg.append(mk("circle", { cx: 21, cy: 21, r: 15.9155, fill: "none", stroke: "#00c2a8", "stroke-width": 5, "stroke-dasharray": pe + " " + (100 - pe), "stroke-dashoffset": 25 }));
    }
  }

  const t1 = mk("text", { x: 21, y: 22, "text-anchor": "middle" });
  t1.textContent = nf(tot, 1);
  const t2 = mk("text", { x: 21, y: 27, "text-anchor": "middle", class: "t2" });
  t2.textContent = "t CO₂e a year";

  svg.append(t1, t2);
  svg.setAttribute("aria-label", "Emissions split: electricity " + nf(e, 2) + " tonnes, heating " + nf(h, 2) + " tonnes");
}

function renderFlow(b) {
  const svg = $("flow");
  svg.replaceChildren();
  const NS = "http://www.w3.org/2000/svg";
  const mk = (t, a) => {
    const x = document.createElementNS(NS, t);
    for (const k in a) x.setAttribute(k, a[k]);
    return x;
  };

  const heat = b.fuel * M.heatSplit;
  const water = b.fuel * (1 - M.heatSplit);
  const app = b.elec * M.elecSplit;
  const light = b.elec * (1 - M.elecSplit);

  const max = Math.max(heat, water, app, light, 1);
  const w = (v) => Math.max(3, (v / max) * 52);

  const fuelName = state.heat === "heatpump" || state.heat === "electric" ? "Electricity for heating" : FUELS[state.heat];
  const L = [
    { y: 135, label: fuelName, v: b.fuel, c: "#f5a623" },
    { y: 320, label: "Other electricity", v: b.elec, c: "#00c2a8" },
  ];
  const R = [
    { y: 70, label: "Space heating", v: heat, c: "#f5a623", from: 0 },
    { y: 170, label: "Hot water", v: water, c: "#f5a623", from: 0 },
    { y: 270, label: "Appliances and electronics", v: app, c: "#00c2a8", from: 1 },
    { y: 370, label: "Lighting and cooking", v: light, c: "#8b7cf6", from: 1 },
  ];

  for (const r of R) {
    const l = L[r.from];
    const p = mk("path", { d: "M170 " + l.y + " C 450 " + l.y + ", 450 " + r.y + ", 730 " + r.y, stroke: r.c, "stroke-width": w(r.v), class: "lk" });
    svg.append(p);
  }

  const node = (x, n) => {
    const g = mk("g", {});
    g.append(mk("rect", { x, y: n.y - 26, width: 170, height: 52, rx: 10, fill: "#121826", stroke: n.c, "stroke-width": 2 }));
    const a = mk("text", { x: x + 85, y: n.y - 4, "text-anchor": "middle" });
    a.textContent = n.label;
    const bb = mk("text", { x: x + 85, y: n.y + 15, "text-anchor": "middle", class: "v" });
    bb.textContent = "~" + nf(n.v) + " kWh";
    g.append(a, bb);
    svg.append(g);
  };

  L.forEach((n) => node(0, n));
  R.forEach((n) => node(730, n));

  $("flow-stats").replaceChildren(
    ...R.map((r) => el("li", {}, el("div", { className: "lab", textContent: r.label }), el("div", { className: "big", style: "font-size:1.3rem", textContent: "~" + nf(r.v) + " kWh" })))
  );

  svg.setAttribute("aria-label", "Flow of " + nf(b.fuel + b.elec) + " kWh a year from " + fuelName.toLowerCase() + " and electricity to space heating, hot water, appliances and lighting and cooking");
}

function renderActs(ev) {
  const sort = $("sort").value;
  const items = [...ev.items].sort((a, c) => (a.na - c.na) || (sort === "saving" ? c.save - a.save : sort === "co2" ? c.co2 - a.co2 : a.payback - c.payback));
  const ul = $("acts");
  ul.replaceChildren();

  for (const m of items) {
    const on = state.sel.includes(m.id) && !m.na;
    const cb = el("input", { type: "checkbox", checked: on, disabled: m.na });

    cb.addEventListener("change", () => {
      state.sel = cb.checked ? [...state.sel, m.id] : state.sel.filter((x) => x !== m.id);
      save();
      update(m.id);
    });
    cb.id = "a-" + m.id;
    cb.dataset.id = m.id;

    const li = el(
      "li",
      { className: "he-act" + (on ? " on" : "") + (m.na ? " na" : "") },
      el(
        "div",
        { className: "he-top" },
        el("label", { className: "check", htmlFor: cb.id }, cb, el("span", {}, el("b", { textContent: m.title }), el("span", { className: "muted small", textContent: m.na ? "Not applicable: you already have a heat pump." : m.desc })))
      ),
      el("span", { className: "he-cost", textContent: gbp(m.cost) })
    );

    if (!m.na) {
      li.append(
        el(
          "dl",
          { className: "he-figs" },
          ...[["Saves", gbp(m.save) + " / yr"], ["CO₂ avoided", nf(m.co2, 2) + " t / yr"], ["Payback", m.payback > 20 ? "over 20 yrs" : m.payback === Infinity ? "n/a" : nf(m.payback, 1) + " yrs"]].map(([k, v]) =>
            el("div", {}, el("dt", { textContent: k }), el("dd", { textContent: v }))
          )
        )
      );
    }
    ul.append(li);
  }

  const cost = MEASURES.filter((m) => state.sel.includes(m.id) && !(m.hp && !hpApplicable(state))).reduce((a, m) => a + m.cost, 0);
  $("sc-cost").textContent = gbp(cost);
  $("sc-save").textContent = gbp(ev.base.cost - ev.combined.cost) + " / year";
  $("sc-co2").textContent = nf(ev.base.co2 - ev.combined.co2, 2) + " t / year";
}

let focusId = null;
function update(keepFocus) {
  focusId = keepFocus || null;
  const ev = evaluate();
  const { b, base } = ev;

  $("m-kwh").hidden = state.elecMode !== "kwh";
  $("m-cost").hidden = state.elecMode !== "cost";
  $("m-meter").hidden = state.elecMode !== "meter";

  const isHp = state.heat === "heatpump";
  const isBoiler = ["gas", "oil", "lpg"].includes(state.heat);

  $("f-eff").hidden = !isBoiler;
  $("f-scop").hidden = !isHp;
  $("f-unit").hidden = state.heat !== "gas";

  $("heat-l").textContent = isHp
    ? "Heat delivered each year (kWh)"
    : state.heat === "gas" && state.heatUnit === "m3"
    ? "Annual gas use (m³)"
    : "Annual " + (state.heat === "electric" ? "electric heating" : FUELS[state.heat].toLowerCase()) + " use (kWh)";

  $("heat-h").textContent = isHp
    ? "Electricity used = heat delivered ÷ SCOP."
    : state.heat === "gas" && state.heatUnit === "m3"
    ? "Converted at about " + nf(M.m3ToKwh, 2) + " kWh per m³."
    : isBoiler
    ? "Boiler efficiency is used only to size a heat pump upgrade on the “Ways to cut it” tab."
    : "";

  const e1 = $("el-err");
  e1.hidden = !(state.elecMode === "meter" && state.r2 < state.r1);
  e1.textContent = "The latest reading is lower than the earlier one, so electricity use is shown as 0.";

  $("el-note").textContent = b.note;
  $("el-sum").textContent = nf(b.elec) + " kWh = " + gbp(base.elecCost) + " a year";

  $("ht-note").textContent = isHp
    ? "Electricity: " + nf(b.fuel) + " kWh"
    : state.heat === "gas" && state.heatUnit === "m3"
    ? nf(b.input) + " kWh from gas volume"
    : "";

  $("ht-sum").textContent = nf(b.fuel) + " kWh = " + gbp(base.fuelCost) + " a year";

  $("k-co2").textContent = nf(base.co2, 2);
  $("k-co2pp").textContent = "About " + nf((base.co2 * 1000) / Math.max(1, state.occ)) + " kg per occupant";
  $("k-cost").textContent = gbp(base.cost);
  $("k-cost-m").textContent = "About " + gbp(base.cost / 12) + " a month";
  $("k-kwh").textContent = nf(base.kwh);
  $("k-int").textContent = "About " + nf(base.kwh / Math.max(1, state.floor), 1) + " kWh per m²";

  bmCard("el", b.elec, M.tdcv.elec, true);
  const gasOn = state.heat === "gas";
  bmCard("gs", b.fuel, M.tdcv.gas, gasOn, "This benchmark is for mains gas. Your main heating fuel is " + FUELS[state.heat].toLowerCase() + ".");

  const comb = gasOn ? b.elec + b.fuel : b.elec;
  const ct = gasOn ? { low: M.tdcv.elec.low + M.tdcv.gas.low, high: M.tdcv.elec.high + M.tdcv.gas.high, med: M.tdcv.elec.med + M.tdcv.gas.med } : M.tdcv.elec;
  const [, tier] = tierOf(comb, ct);

  $("k-tier").textContent = tier;
  $("k-tier-n").textContent = (gasOn ? "Electricity and gas combined" : "Electricity only") + ": " + Math.round((comb / ct.med) * 100) + "% of medium";

  $("bm-text").textContent =
    "Your electricity use is " +
    Math.round((b.elec / M.tdcv.elec.med) * 100) +
    "% of the medium Ofgem value (" +
    nf(M.tdcv.elec.med) +
    " kWh)" +
    (gasOn ? ", and your gas use is " + Math.round((b.fuel / M.tdcv.gas.med) * 100) + "% of the medium gas value (" + nf(M.tdcv.gas.med) + " kWh)" : "") +
    ". Your home’s operational emissions are about " +
    nf(base.co2, 2) +
    " tonnes CO₂e a year. Typical values describe average households, so a different home size or occupancy will naturally sit above or below them.";

  renderDonut(base.elecCo2, base.fuelCo2);
  $("b-el").textContent = nf(base.elecCo2, 2) + " t";
  $("b-ht").textContent = nf(base.fuelCo2, 2) + " t";

  renderFlow(b);
  renderActs(ev);

  if (focusId) {
    const c = $("a-" + focusId);
    if (c) c.focus();
  }
  save();
}

// ---- Event Wiring
function fillInputs() {
  for (const e of document.querySelectorAll("[data-k]")) {
    const k = e.dataset.k;
    if (e.type === "radio") e.checked = state[k] === e.value;
    else e.value = state[k];
  }
}

for (const e of document.querySelectorAll("[data-k]")) {
  e.addEventListener(e.type === "radio" || e.tagName === "SELECT" ? "change" : "input", () => {
    const k = e.dataset.k;
    if (e.type === "radio") {
      if (e.checked) state[k] = e.value;
    } else if (e.type === "number") {
      state[k] = e.valueAsNumber;
      const invalid = !Number.isFinite(e.valueAsNumber) || e.valueAsNumber < Number(e.min || 0);
      e.toggleAttribute("aria-invalid", invalid);
    } else {
      state[k] = e.value;
    }
    update();
  });
}

$("sort").addEventListener("change", () => update());

const tabs = [...$("tabs").children];
function openTab(t, focus) {
  tabs.forEach((b) => {
    const on = b === t;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
    $(b.getAttribute("aria-controls")).hidden = !on;
  });
  if (focus) t.focus();
}

tabs.forEach((b, i) => {
  b.addEventListener("click", () => openTab(b));
  b.addEventListener("keydown", (e) => {
    const n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (n) {
      e.preventDefault();
      openTab(tabs[(i + n + tabs.length) % tabs.length], true);
    } else if (e.key === "Home") {
      e.preventDefault();
      openTab(tabs[0], true);
    } else if (e.key === "End") {
      e.preventDefault();
      openTab(tabs[tabs.length - 1], true);
    }
  });
});

$("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ app: "home-energy-baseline", version: 1, ...state }, null, 2)], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: "home-energy-baseline-" + new Date().toISOString().slice(0, 10) + ".json" });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Exported to JSON.");
});

$("import").addEventListener("click", () => $("file").click());

$("file").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    state = sanitise(JSON.parse(await f.text()));
    fillInputs();
    update();
    toast("Imported.");
  } catch {
    toast("That file isn’t a valid export.");
  }
});

$("print").addEventListener("click", () => window.print());

$("reset").addEventListener("click", () => {
  state = { ...DEFAULTS };
  fillInputs();
  update();
  toast("Reset to the example household.");
});

$("factors").replaceChildren(
  el("caption", { textContent: "Emission factors and illustrative tariffs" }),
  el("thead", {}, el("tr", {}, ...["Energy", "kg CO₂e per kWh", "Unit rate"].map((h, i) => el("th", { scope: "col", className: i ? "num" : "", textContent: h })))),
  el(
    "tbody",
    {},
    ...[["Grid electricity", "elec"], ["Mains gas", "gas"], ["Heating oil", "oil"], ["LPG", "lpg"]].map(([n, k]) =>
      el("tr", {}, el("th", { scope: "row", textContent: n }), el("td", { className: "num", textContent: M.factor[k] }), el("td", { className: "num", textContent: nf(M.rate[k] * 100, 1) + "p" }))
    )
  )
);

load();
fillInputs();
update();