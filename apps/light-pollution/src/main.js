// Entry for Vite: the shared brand layer, this tool's styles, then its logic.
import "@rjmlaird/ui/brand.css";
import "./tool.css";
import { PLACES } from "./places.js";
import { estimate, inRange, compass } from "./model.js";

const $ = (id) => document.getElementById(id);
const num = (n, d = 0) => Number(n).toLocaleString("en-GB", { maximumFractionDigits: d, minimumFractionDigits: d });

// Standard Bortle descriptions, shortened and adapted for UK skies. `sqm` is the typical range.
const CLASSES = [
  { n: 1, name: "Excellent dark sky", sqm: "21.9 or more", view: "Natural sky: zodiacal light, gegenschein and airglow are all visible. Essentially unreachable on the UK mainland.", suits: "Everything, including the faintest galaxies and nebulae." },
  { n: 2, name: "Typical dark sky", sqm: "21.7 to 21.9", view: "The Milky Way is vivid and textured, and the zodiacal light is easy. Only a faint glow shows low down towards distant towns. M33 is an easy naked-eye object.", suits: "Faint galaxies, nebulae and the Milky Way. Bring a red torch and take your time." },
  { n: 3, name: "Rural sky", sqm: "21.3 to 21.7", view: "Some glow along the horizon towards towns. The Milky Way still shows rich structure, and M31 and several globular clusters are visible by eye.", suits: "Deep-sky observing of almost everything, and wide-field Milky Way work." },
  { n: 4, name: "Rural to suburban transition", sqm: "20.5 to 21.3", view: "Light domes show in several directions. The Milky Way is impressive overhead but fades towards the horizon, and M31 is easy by eye.", suits: "Most deep-sky objects with a moderate telescope. Faint nebulae need a dark moonless night." },
  { n: 5, name: "Suburban sky", sqm: "19.5 to 20.5", view: "The Milky Way is faint or lost near the horizon and shows overhead on a clear, moonless night. Clouds glow grey or orange.", suits: "Clusters, brighter galaxies and nebulae, the Moon, planets and double stars. A nebula filter helps." },
  { n: 6, name: "Bright suburban sky", sqm: "18.9 to 19.5", view: "The Milky Way is barely hinted at near the zenith, and the sky within about 35° of the horizon glows. M31 is hard to see without optics.", suits: "Bright clusters and nebulae, the Moon, planets and double stars. Use a larger aperture for galaxies." },
  { n: 7, name: "Suburban to urban transition", sqm: "18.4 to 18.9", view: "The whole sky has a pale grey glow and the Milky Way is invisible. Only the brightest deep-sky objects, such as M45 and M42, stand out.", suits: "The Moon, planets, double stars and bright clusters. Save faint objects for a dark site." },
  { n: 8, name: "City sky", sqm: "17.8 to 18.4", view: "The sky glows white or orange and only the brightest stars show.", suits: "The Moon, planets and bright double stars. Travel for anything deep-sky." },
  { n: 9, name: "Inner-city sky", sqm: "below 17.8", view: "The sky is brightly lit and only a handful of stars, the Moon and the planets are visible.", suits: "The Moon, the planets and a few bright double stars. Plan a trip to a darker site." },
];

// ---- Scale table ----
const tbody = document.querySelector("#scale tbody");
for (const c of CLASSES) {
  const tr = document.createElement("tr"); tr.id = "row-" + c.n;
  const th = document.createElement("td"); th.className = "cls"; th.textContent = c.n + ". " + c.name;
  const r = document.createElement("td"); r.className = "rng"; r.textContent = c.sqm;
  const v = document.createElement("td"); v.textContent = c.view;
  tr.append(th, r, v); tbody.append(tr);
}

// ---- Place name suggestions ----
const bare = (s) => s.toLowerCase().replace(/\s*\(.*\)\s*/, "").trim();
$("places").replaceChildren(...PLACES.map((p) => Object.assign(document.createElement("option"), { value: p.name })).sort((a, b) => a.value.localeCompare(b.value)));

// ---- Location lookup ----
const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const OUTCODE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;
const COORDS = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

class LookupError extends Error {}

async function postcodesIo(path, what) {
  let res;
  try { res = await fetch("https://api.postcodes.io/" + path); }
  catch { throw new LookupError("Could not reach the postcode service. Check your connection, or enter a town name or coordinates instead."); }
  if (res.status === 404) throw new LookupError(what + " was not found. Check it for typing mistakes.");
  if (!res.ok) throw new LookupError("The postcode service returned an error (" + res.status + "). Try again, or use a town name or coordinates.");
  const j = await res.json();
  return { lat: j.result.latitude, lon: j.result.longitude };
}

async function resolve(raw) {
  const q = raw.trim();
  if (!q) throw new LookupError("Enter a postcode, place name or coordinates.");
  const c = COORDS.exec(q);
  if (c) return { lat: Number(c[1]), lon: Number(c[2]), label: "your coordinates" };
  if (POSTCODE.test(q)) {
    const pc = q.toUpperCase().replace(/\s+/g, "").replace(/(\d[A-Z]{2})$/, " $1");
    return { ...(await postcodesIo("postcodes/" + encodeURIComponent(pc), "That postcode")), label: pc };
  }
  if (OUTCODE.test(q) && /\d/.test(q)) {
    const oc = q.toUpperCase();
    return { ...(await postcodesIo("outcodes/" + encodeURIComponent(oc), "That postcode district")), label: oc + " (district centre)" };
  }
  const key = q.split(",")[0].toLowerCase().trim();
  let hits = PLACES.filter((p) => p.name.toLowerCase() === key);
  if (!hits.length) hits = PLACES.filter((p) => bare(p.name) === key);
  if (!hits.length) hits = PLACES.filter((p) => p.name.toLowerCase().startsWith(key));
  if (hits.length > 1) throw new LookupError("More than one match: " + hits.map((h) => h.name).join(", ") + ". Choose one from the suggestions.");
  if (!hits.length) throw new LookupError("“" + q + "” is not in the place list. Try a postcode, a larger nearby town, or latitude and longitude.");
  return { lat: hits[0].lat, lon: hits[0].lon, label: hits[0].name + " (town centre)" };
}

// ---- Rendering ----
function row(dl, k, v, cls) {
  const dt = document.createElement("dt"); dt.textContent = k;
  const dd = document.createElement("dd"); dd.textContent = v; if (cls) dd.className = cls;
  dl.append(dt, dd);
}

function show(loc) {
  if (!inRange(loc.lat, loc.lon)) throw new LookupError("This estimate covers the UK only. Those coordinates are outside it.");
  const e = estimate(loc.lat, loc.lon), c = CLASSES[e.bortle - 1];
  $("res").hidden = false;
  $("res-where").textContent = "For " + loc.label + " (" + num(loc.lat, 3) + ", " + num(loc.lon, 3) + ")";
  $("res-class").textContent = "Bortle " + e.bortle;
  $("res-class-name").textContent = c.name;
  const dl = $("res-kv"); dl.replaceChildren();
  row(dl, "Sky brightness", num(e.sqm, 1) + " mag/arcsec²", "lead");
  row(dl, "Naked-eye limit", "about magnitude " + num(e.nelm, 1));
  row(dl, "Versus a natural sky", "about " + num(e.ratio, e.ratio < 10 ? 1 : 0) + "× brighter");
  $("res-view").textContent = c.view;
  $("res-suits").textContent = "Best suited to: " + c.suits;
  const ul = $("res-sources"); ul.replaceChildren();
  e.top.forEach((p) => {
    const li = document.createElement("li");
    li.append(document.createTextNode(p.name + ", " + num(p.km, p.km < 10 ? 1 : 0) + " km " + compass(p.bearing) + " "));
    const s = document.createElement("span"); s.className = "share"; s.textContent = "(" + num(p.share, 0) + "% of the artificial light)";
    li.append(s); ul.append(li);
  });
  const lead = e.top[0];
  $("res-dark").textContent = !lead || lead.share <= 35 || lead.km >= 80
    ? "No single town dominates here, so the glow is spread around the horizon."
    : lead.km < 3
      ? "You are inside the main source of glow. Even a short drive out of " + lead.name + ", away from street lighting, makes a large difference."
      : "The sky is usually darkest away from " + lead.name + ", towards the " + compass((lead.bearing + 180) % 360) + ". Face that way, and wait for the Moon to be down.";
  document.querySelectorAll("#scale tr.is-est").forEach((r) => { r.classList.remove("is-est"); r.removeAttribute("aria-current"); const m = r.querySelector(".here"); if (m) m.remove(); });
  const r = $("row-" + e.bortle); r.classList.add("is-est"); r.setAttribute("aria-current", "true");
  const chip = document.createElement("span"); chip.className = "chip ok here"; chip.textContent = "Your estimate"; chip.style.marginLeft = "0.5rem";
  r.firstElementChild.append(chip);
}

function fail(msg) { const el = $("err"); el.textContent = msg; el.hidden = false; $("res").hidden = true; }
function ok() { $("err").hidden = true; }

async function run(raw) {
  try { ok(); const loc = await resolve(raw); show(loc); const u = new URL(location.href); u.searchParams.set("q", raw.trim()); history.replaceState(null, "", u); }
  catch (err) { if (err instanceof LookupError) fail(err.message); else { console.error(err); fail("Something went wrong. Try again."); } }
}

$("f").addEventListener("submit", (ev) => { ev.preventDefault(); run($("where").value); });
$("locate").addEventListener("click", () => {
  if (!navigator.geolocation) return fail("Your browser does not support location lookup. Enter a postcode or place name instead.");
  navigator.geolocation.getCurrentPosition(
    (pos) => { try { ok(); $("where").value = ""; show({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "your location" }); } catch (err) { fail(err.message); } },
    () => fail("Could not get your location. Allow location access, or enter a postcode or place name."),
    { maximumAge: 600000, timeout: 15000 },
  );
});

const initial = new URLSearchParams(location.search).get("q");
if (initial) { $("where").value = initial; run(initial); }
