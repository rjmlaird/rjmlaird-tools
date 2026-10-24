// Entry for Vite: the shared brand layer, this tool's styles, then its logic.
import "@rjmlaird/ui/brand.css";
import "./tool.css";

const MODEL = {
  uplift: 1.08, rf: 1.93, saf: 0.8, rail: 0.035, treeKgYr: 22, carKgKm: 0.17, homeKgDay: 8.5, ukPerCapitaKg: 4700, earthKm: 6371,
  haul: [
    { max: 300, f: 0.155, label: "Short-haul", range: "under 300 km" },
    { max: 3700, f: 0.088, label: "Medium-haul", range: "300 to 3,700 km" },
    { max: Infinity, f: 0.102, label: "Long-haul", range: "over 3,700 km" },
  ],
  cabins: [
    { id: "economy", label: "Economy", m: 1.0 }, { id: "premium", label: "Premium economy", m: 1.6 },
    { id: "business", label: "Business", m: 2.9 }, { id: "first", label: "First", m: 3.8 },
  ],
};
const A = (code, name, city, country, lat, lng) => ({ code, name, city, country, lat, lng });
const AIRPORTS = [
  A("LHR", "London Heathrow Airport", "London", "United Kingdom", 51.4706, -0.4619), A("LGW", "London Gatwick Airport", "London", "United Kingdom", 51.1537, -0.1821),
  A("MAN", "Manchester Airport", "Manchester", "United Kingdom", 53.3537, -2.275), A("LCY", "London City Airport", "London", "United Kingdom", 51.505, 0.0553),
  A("EDI", "Edinburgh Airport", "Edinburgh", "United Kingdom", 55.95, -3.3725), A("CDG", "Charles de Gaulle Airport", "Paris", "France", 49.0097, 2.5479),
  A("AMS", "Amsterdam Airport Schiphol", "Amsterdam", "Netherlands", 52.3105, 4.7683), A("FRA", "Frankfurt Airport", "Frankfurt", "Germany", 50.0379, 8.5622),
  A("MAD", "Adolfo Suárez Madrid–Barajas", "Madrid", "Spain", 40.4839, -3.568), A("JFK", "John F. Kennedy Intl Airport", "New York", "United States", 40.6413, -73.7781),
  A("LAX", "Los Angeles Intl Airport", "Los Angeles", "United States", 33.9416, -118.4085), A("ORD", "O'Hare International Airport", "Chicago", "United States", 41.9742, -87.9073),
  A("SFO", "San Francisco Intl Airport", "San Francisco", "United States", 37.6213, -122.379), A("DXB", "Dubai International Airport", "Dubai", "United Arab Emirates", 25.2532, 55.3657),
  A("SIN", "Singapore Changi Airport", "Singapore", "Singapore", 1.3644, 103.9915), A("HND", "Tokyo Haneda Airport", "Tokyo", "Japan", 35.5494, 139.7798),
  A("NRT", "Narita International Airport", "Tokyo", "Japan", 35.772, 140.3929), A("SYD", "Sydney Kingsford Smith Airport", "Sydney", "Australia", -33.9399, 151.1753),
  A("HKG", "Hong Kong International Airport", "Hong Kong", "Hong Kong", 22.308, 113.9185), A("BKK", "Suvarnabhumi Airport", "Bangkok", "Thailand", 13.69, 100.7501),
  A("YYZ", "Toronto Pearson Intl Airport", "Toronto", "Canada", 43.6777, -79.6248), A("GRU", "São Paulo/Guarulhos Intl", "São Paulo", "Brazil", -23.4356, -46.4731),
  A("CPT", "Cape Town International Airport", "Cape Town", "South Africa", -33.9715, 18.6021), A("DOH", "Hamad International Airport", "Doha", "Qatar", 25.2731, 51.6081),
];

const $ = (id) => document.getElementById(id);
const el = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids.filter((k) => k != null)); return e; };
const num = (n, d = 0) => Number(n).toLocaleString("en-GB", { maximumFractionDigits: d, minimumFractionDigits: d });
const state = { o: AIRPORTS.find((a) => a.code === "LHR"), d: AIRPORTS.find((a) => a.code === "JFK"), trip: "one-way", cabin: "economy", pax: 1, rf: true, saf: 0 };

const rad = (d) => (d * Math.PI) / 180;
function haversine(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return MODEL.earthKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
const haulFor = (km) => MODEL.haul.find((h) => km <= h.max) || MODEL.haul[2];
const label = (a) => (a.code.startsWith("CUST") ? "Custom (" + a.lat.toFixed(2) + ", " + a.lng.toFixed(2) + ")" : a.code + " – " + a.city + " (" + a.name + ")");

// ---- calculation
function compute(s) {
  const oneWay = haversine(s.o, s.d) * MODEL.uplift;
  const km = s.trip === "round" ? oneWay * 2 : oneWay;
  const haul = haulFor(oneWay), cabin = MODEL.cabins.find((c) => c.id === s.cabin);
  const paxKm = km * s.pax, direct = paxKm * haul.f * cabin.m;
  const rf = s.rf ? MODEL.rf : 1, gross = direct * rf, net = gross * (1 - (s.saf / 100) * MODEL.saf);
  const dPart = net / rf;
  return { oneWay, km, haul, cabin, paxKm, net, dPart, rPart: net - dPart, gPerKm: paxKm ? (net * 1000) / paxKm : 0 };
}

// ---- render
function renderMap(r) {
  const svg = $("map"); svg.replaceChildren();
  const NS = "http://www.w3.org/2000/svg", mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  for (let lng = -150; lng <= 150; lng += 30) svg.append(mk("line", { x1: (lng + 180) * 2, y1: 0, x2: (lng + 180) * 2, y2: 360, class: "g" }));
  for (let lat = -60; lat <= 60; lat += 30) svg.append(mk("line", { x1: 0, y1: (90 - lat) * 2, x2: 720, y2: (90 - lat) * 2, class: lat === 0 ? "g eq" : "g" }));
  const { o, d } = state, v = (la, lo) => [Math.cos(rad(la)) * Math.cos(rad(lo)), Math.cos(rad(la)) * Math.sin(rad(lo)), Math.sin(rad(la))];
  const a = v(o.lat, o.lng), b = v(d.lat, d.lng), w = Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120; let lat, lng;
    if (w < 1e-6 || Math.sin(w) < 1e-6) { lat = o.lat + (d.lat - o.lat) * t; lng = o.lng + (d.lng - o.lng) * t; }
    else { const x = Math.sin((1 - t) * w) / Math.sin(w), y = Math.sin(t * w) / Math.sin(w); const p = [0, 1, 2].map((k) => x * a[k] + y * b[k]); lat = (Math.asin(p[2]) * 180) / Math.PI; lng = (Math.atan2(p[1], p[0]) * 180) / Math.PI; }
    pts.push([(lng + 180) * 2, (90 - lat) * 2, lng]);
  }
  let dpath = "";
  pts.forEach((p, i) => { dpath += i === 0 || Math.abs(p[2] - pts[i - 1][2]) > 180 ? "M" : "L"; dpath += p[0].toFixed(1) + " " + p[1].toFixed(1) + " "; });
  svg.append(mk("path", { d: dpath, class: "route" }));
  const pin = (p, color, code, dy) => { svg.append(mk("circle", { cx: (p.lng + 180) * 2, cy: (90 - p.lat) * 2, r: 7, fill: color })); const t = mk("text", { x: Math.min(690, Math.max(30, (p.lng + 180) * 2)), y: Math.max(14, (90 - p.lat) * 2 + dy), "text-anchor": "middle" }); t.textContent = code; svg.append(t); };
  pin(o, "#00c2a8", o.code.startsWith("CUST") ? "From" : o.code, -10); pin(d, "#f5a623", d.code.startsWith("CUST") ? "To" : d.code, 20);
  svg.setAttribute("aria-label", "Great-circle route from " + o.code + " to " + d.code + ", " + num(r.km) + " km flown");
}

function render() {
  const msg = $("msg"), out = $("out");
  const valid = state.o && state.d && !(state.o.lat === state.d.lat && state.o.lng === state.d.lng);
  msg.hidden = valid; out.hidden = !valid;
  if (!valid) { msg.textContent = !state.o || !state.d ? "Choose an origin and a destination." : "Origin and destination are the same place. Choose two different locations."; sync(); return; }
  const r = compute(state), kg = r.net;
  $("total").textContent = kg >= 1000 ? num(kg / 1000, 2) : num(kg);
  $("unit").textContent = kg >= 1000 ? "tonnes CO₂e" : "kg CO₂e";
  $("note").textContent = state.pax + (state.pax === 1 ? " passenger" : " passengers") + ", " + (state.trip === "round" ? "return" : "one way") + ", " + r.cabin.label.toLowerCase() + (state.saf ? ", " + state.saf + "% SAF" : "") + (state.rf ? ", including non-CO₂ effects" : ", CO₂ only");
  $("dist").textContent = num(r.km) + " km"; $("dist2").textContent = num(r.km * 0.621371) + " mi · " + num(r.km * 0.539957) + " NM";
  $("inten").textContent = num(r.gPerKm) + " g";
  $("haul").textContent = r.haul.label; $("haul2").textContent = r.haul.range + " (per direction)";
  const dp = Math.round((r.dPart / r.net) * 100) || 100;
  $("bd").style.width = dp + "%"; $("br").style.width = 100 - dp + "%";
  $("vd").textContent = num(r.dPart) + " kg"; $("vr").textContent = num(r.rPart) + " kg";
  $("eq").replaceChildren(...[
    ["Tree-years to absorb", num(kg / MODEL.treeKgYr, 1), "at " + MODEL.treeKgYr + " kg CO₂ per tree per year"],
    ["Petrol-car driving", num(kg / MODEL.carKgKm) + " km", "at " + MODEL.carKgKm * 1000 + " g CO₂e per km"],
    ["Days of home energy", num(kg / MODEL.homeKgDay), "at " + MODEL.homeKgDay + " kg CO₂e per day"],
    ["UK yearly per-person", num((kg / MODEL.ukPerCapitaKg) * 100, 1) + "%", "of about " + num(MODEL.ukPerCapitaKg / 1000, 1) + " t a year"],
  ].map(([l, v, n]) => el("li", {}, el("div", { className: "lab", textContent: l }), el("div", { className: "big", textContent: v }), el("div", { className: "lab", textContent: n }))));
  const tips = [];
  if (r.km < 800) { const rail = r.km * MODEL.rail * state.pax; tips.push(["Consider the train", "For trips this short, electric rail at about " + MODEL.rail * 1000 + " g per passenger-km would emit roughly " + num(Math.max(0, kg - rail)) + " kg CO₂e less."]); }
  if (state.cabin !== "economy") tips.push(["Travel in economy", "The same trip in economy would emit roughly " + num(kg - kg / r.cabin.m) + " kg CO₂e less, because each seat takes more of the cabin floor area."]);
  tips.push(["Fly direct where you can", "Take-off and climb use a large share of a flight's fuel, so an extra stop usually adds emissions."]);
  if (state.saf < 20) tips.push(["Ask about verified SAF", "Some airlines and travel programmes offer sustainable aviation fuel. Check how the claim is verified, as schemes differ."]);
  $("tips").replaceChildren(...tips.map(([t, d]) => el("li", {}, el("b", { textContent: t }), el("span", { textContent: d }))));
  renderMap(r); sync();
}

// ---- URL state (bookmarkable)
function sync() {
  const p = new URLSearchParams();
  const std = (a) => a && AIRPORTS.some((x) => x.code === a.code);
  if (std(state.o)) p.set("o", state.o.code); if (std(state.d)) p.set("d", state.d.code);
  if (state.trip === "round") p.set("trip", "round"); if (state.cabin !== "economy") p.set("cabin", state.cabin);
  if (state.pax !== 1) p.set("pax", state.pax); if (!state.rf) p.set("rf", "0"); if (state.saf) p.set("saf", state.saf);
  const q = p.toString(); try { history.replaceState(null, "", location.pathname + (q ? "?" + q : "")); } catch { /* sandboxed or file: URL */ }
}
function readUrl() {
  const p = new URLSearchParams(location.search), f = (c) => AIRPORTS.find((a) => a.code === (c || "").toUpperCase());
  if (f(p.get("o"))) state.o = f(p.get("o")); if (f(p.get("d"))) state.d = f(p.get("d"));
  if (p.get("trip") === "round") state.trip = "round";
  if (MODEL.cabins.some((c) => c.id === p.get("cabin"))) state.cabin = p.get("cabin");
  const pax = parseInt(p.get("pax"), 10); if (pax >= 1 && pax <= 20) state.pax = pax;
  if (p.get("rf") === "0") state.rf = false;
  const saf = parseInt(p.get("saf"), 10); if (saf >= 0 && saf <= 100) state.saf = saf - (saf % 5);
}

// ---- airport combobox
function combo(key) {
  const input = $(key), list = $(key + "-list"); let items = [], active = -1;
  const setActive = (i) => { active = i; [...list.children].forEach((li, n) => li.setAttribute("aria-selected", String(n === i))); if (i >= 0) { input.setAttribute("aria-activedescendant", list.children[i].id); list.children[i].scrollIntoView({ block: "nearest" }); } else input.removeAttribute("aria-activedescendant"); };
  const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); setActive(-1); };
  const choose = (a) => { state[key] = a; input.value = label(a); close(); render(); };
  function open() {
    const q = input.value.trim().toLowerCase(), shown = q && q !== label(state[key] || { code: "", city: "", name: "" }).toLowerCase() ? q : "";
    items = AIRPORTS.filter((a) => !shown || [a.code, a.name, a.city, a.country].some((s) => s.toLowerCase().includes(shown))).slice(0, 12);
    list.replaceChildren(...(items.length ? items.map((a, i) => { const li = el("li", { id: key + "-opt" + i, role: "option" }, el("span", {}, el("b", { textContent: a.code }), " " + a.city, el("br"), el("span", { className: "muted small", textContent: a.name })), el("span", { className: "muted small", textContent: a.country })); li.setAttribute("aria-selected", "false"); li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(a); }); return li; }) : [el("li", { className: "none", textContent: "No matching airport found", role: "option" })]));
    list.hidden = false; input.setAttribute("aria-expanded", "true"); setActive(-1);
  }
  input.addEventListener("focus", () => { input.select(); open(); });
  input.addEventListener("input", () => { if (!input.value.trim()) { state[key] = null; render(); } open(); });
  input.addEventListener("blur", () => { close(); input.value = state[key] ? label(state[key]) : input.value.trim() ? "" : ""; });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (list.hidden) open(); setActive(Math.min(items.length - 1, active + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(Math.max(0, active - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(items[active]); }
    else if (e.key === "Escape" && !list.hidden) { e.preventDefault(); close(); input.value = state[key] ? label(state[key]) : ""; }
  });
  return () => { input.value = state[key] ? label(state[key]) : ""; };
}
const fillO = combo("o"), fillD = combo("d");
$("swap").addEventListener("click", () => { [state.o, state.d] = [state.d, state.o]; fillO(); fillD(); render(); });

// ---- controls
$("cabins").replaceChildren(...MODEL.cabins.map((c) => el("label", { className: "check" }, el("input", { type: "radio", name: "cabin", value: c.id }), el("span", { textContent: c.label }), el("span", { className: "muted", textContent: "×" + c.m + " factor" }))));
document.querySelectorAll('input[name="trip"]').forEach((r) => r.addEventListener("change", () => { state.trip = r.value; render(); }));
document.querySelectorAll('input[name="cabin"]').forEach((r) => r.addEventListener("change", () => { state.cabin = r.value; render(); }));
$("pax").addEventListener("input", () => { const n = parseInt($("pax").value, 10); if (n >= 1 && n <= 20) { state.pax = n; $("pax").removeAttribute("aria-invalid"); render(); } else $("pax").setAttribute("aria-invalid", "true"); });
$("rf").addEventListener("change", () => { state.rf = $("rf").checked; render(); });
$("saf").addEventListener("input", () => { state.saf = Number($("saf").value); $("saf-out").textContent = state.saf + "%"; render(); });
$("c-apply").addEventListener("click", () => {
  const v = ["c-olat", "c-olng", "c-dlat", "c-dlng"].map((id) => ($(id).value.trim() === "" ? NaN : Number($(id).value))), err = $("c-err");
  const okLat = (x) => x >= -90 && x <= 90, okLng = (x) => x >= -180 && x <= 180;
  const o = okLat(v[0]) && okLng(v[1]), d = okLat(v[2]) && okLng(v[3]);
  if (!o && !d) { err.textContent = "Enter a latitude (−90 to 90) and longitude (−180 to 180) for at least one end of the route."; err.hidden = false; return; }
  err.hidden = true;
  if (o) state.o = { code: "CUST1", name: "Custom origin", city: "Custom", country: "", lat: v[0], lng: v[1] };
  if (d) state.d = { code: "CUST2", name: "Custom destination", city: "Custom", country: "", lat: v[2], lng: v[3] };
  fillO(); fillD(); render();
});

// ---- method table
$("consts").replaceChildren(
  el("caption", { textContent: "Model constants used by this page" }),
  ...[["Routing uplift on great-circle distance", "×" + MODEL.uplift], ...MODEL.haul.map((h) => ["Direct factor, " + h.label.toLowerCase() + " (" + h.range + ")", h.f + " kg CO₂e per passenger-km"]),
    ...MODEL.cabins.map((c) => ["Cabin multiplier, " + c.label.toLowerCase(), "×" + c.m]), ["Non-CO₂ multiplier", "×" + MODEL.rf], ["SAF lifecycle saving", MODEL.saf * 100 + "%"], ["Rail comparison", MODEL.rail * 1000 + " g per passenger-km"]]
    .map(([k, v]) => el("tr", {}, el("th", { scope: "row", textContent: k }), el("td", { className: "num", textContent: v }))));

readUrl();
document.querySelector('input[name="trip"][value="' + state.trip + '"]').checked = true;
document.querySelector('input[name="cabin"][value="' + state.cabin + '"]').checked = true;
$("pax").value = state.pax; $("rf").checked = state.rf; $("saf").value = state.saf; $("saf-out").textContent = state.saf + "%";
fillO(); fillD(); render();
