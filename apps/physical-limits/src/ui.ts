/** Single-page UI served at "/". Calls the JSON API in this same Worker. */
export const page = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Physical Limits</title>
<style>
  :root { --bg:#f2f0ea; --ink:#16212b; --muted:#566371; --line:#c9ccc6; --panel:#fbfaf7; --accent:#0b5d73; --warn:#8a4b00; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:1rem/1.55 system-ui,-apple-system,"Segoe UI",sans-serif; }
  .wrap { max-width:62rem; margin:0 auto; padding:1.5rem 1rem 3rem; }
  h1 { font:700 clamp(1.8rem,6vw,2.6rem)/1.1 Georgia,"Iowan Old Style",serif; margin:0 0 .5rem; }
  h2 { font:700 1.3rem/1.2 Georgia,"Iowan Old Style",serif; margin:0 0 .25rem; }
  p { margin:0 0 .75rem; } .muted { color:var(--muted); } .small { font-size:.875rem; }
  .grid { display:grid; gap:1.25rem; grid-template-columns:1fr; margin-top:1.5rem; }
  @media (min-width:52rem) { .grid { grid-template-columns:1fr 1fr; } }
  section { background:var(--panel); border:1px solid var(--line); border-left:6px solid var(--accent); padding:1rem; }
  form { display:grid; gap:.6rem; margin-top:.5rem; }
  label { display:grid; gap:.2rem; font-weight:600; font-size:.9rem; }
  input { font:inherit; padding:.55rem .6rem; min-height:44px; border:1px solid #8c948f; background:#fff; color:var(--ink); width:100%; }
  .row { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }
  button { font:inherit; min-height:44px; padding:.4rem .9rem; cursor:pointer; border:1px solid var(--accent); background:#fff; color:var(--accent); }
  button.go { background:var(--accent); color:#fff; font-weight:700; }
  a:focus-visible, button:focus-visible, input:focus-visible { outline:3px solid #d97f00; outline-offset:2px; }
  .out { margin-top:1rem; padding-top:.75rem; border-top:1px solid var(--line); min-height:3rem; }
  .big { font:700 clamp(1.5rem,5vw,2rem)/1.15 Georgia,"Iowan Old Style",serif; font-variant-numeric:tabular-nums; }
  .big + .lab { margin-bottom:.6rem; }
  .lab { color:var(--muted); font-size:.875rem; }
  .note { color:var(--warn); font-weight:600; }
  .err { color:#a01616; font-weight:600; }
  dl { margin:.25rem 0 0; display:grid; grid-template-columns:max-content 1fr; gap:.15rem .75rem; font-variant-numeric:tabular-nums; }
  dd { margin:0; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Physical limits</h1>
  <p class="muted">Four gravitational thresholds: how fast to escape, where a moon's pull ends, how close a satellite can orbit before tidal forces break it, and how small a mass must be squeezed to form a black hole.</p>
  <p class="muted small">Inputs are SI units. Scientific notation such as 5.972e24 works. Use a preset to fill the fields.</p>
  <div class="grid" id="grid"></div>
  <p class="muted small" style="margin-top:1.5rem">Hill sphere and Roche limit are standard approximations (Hill sphere assumes the secondary is much lighter than the primary; Roche limit assumes a self-gravitating satellite with no internal strength beyond the rigid or fluid case). JSON API: <a href="/api">/api</a>.</p>
</div>
<script>
"use strict";
var LIMITS = [
  { id: "escape", title: "Escape velocity", blurb: "Speed needed to leave a body's gravity from a given distance from its centre.",
    endpoint: "/api/escape-velocity",
    fields: [["mass", "Mass of body (kg)"], ["radius", "Distance from centre (m)"]],
    presets: [["Earth", { mass: "5.972e24", radius: "6.371e6" }], ["Moon", { mass: "7.342e22", radius: "1.7374e6" }], ["Sun", { mass: "1.989e30", radius: "6.957e8" }], ["Jupiter", { mass: "1.898e27", radius: "6.9911e7" }]],
    render: function (d) {
      var out = [big(sci(d.velocityKmS) + " km/s", "Escape velocity"), row([["In m/s", sci(d.velocityMS)], ["Fraction of light speed", sci(d.fractionOfLightSpeed)]])];
      if (d.exceedsLightSpeed) out.push(note("This distance is at or inside the Schwarzschild radius: not even light escapes."));
      return out;
    } },
  { id: "hill", title: "Hill sphere", blurb: "Region where a body's own gravity dominates over its parent's, so it can hold satellites.",
    endpoint: "/api/hill-sphere",
    fields: [["primary_mass", "Parent mass (kg)"], ["secondary_mass", "Body mass (kg)"], ["semi_major_axis", "Orbit semi-major axis (m)"], ["eccentricity", "Eccentricity (0 to under 1)"]],
    presets: [["Earth around Sun", { primary_mass: "1.989e30", secondary_mass: "5.972e24", semi_major_axis: "1.496e11", eccentricity: "0.0167" }], ["Jupiter around Sun", { primary_mass: "1.989e30", secondary_mass: "1.898e27", semi_major_axis: "7.785e11", eccentricity: "0.0489" }]],
    render: function (d) { return [big(sci(d.radiusKm) + " km", "Hill sphere radius"), row([["In metres", sci(d.radiusM)]])]; } },
  { id: "roche", title: "Roche limit", blurb: "Closest a satellite held together by its own gravity can orbit before tides tear it apart.",
    endpoint: "/api/roche-limit",
    fields: [["primary_mass", "Parent mass (kg)"], ["primary_radius", "Parent radius (m)"], ["satellite_density", "Satellite density (kg/m³)"]],
    presets: [["Moon-like moon at Earth", { primary_mass: "5.972e24", primary_radius: "6.371e6", satellite_density: "3344" }], ["Icy moon at Saturn", { primary_mass: "5.683e26", primary_radius: "5.8232e7", satellite_density: "930" }]],
    render: function (d) { return [big(sci(d.fluidKm) + " km", "Fluid satellite (loose, deformable)"), big(sci(d.rigidKm) + " km", "Rigid satellite"), row([["Parent density", sci(d.primaryDensityKgM3) + " kg/m³"]])]; } },
  { id: "schwarzschild", title: "Schwarzschild radius", blurb: "Radius to which a mass must be compressed to become a black hole.",
    endpoint: "/api/schwarzschild-radius",
    fields: [["mass", "Mass (kg)"]],
    presets: [["Earth", { mass: "5.972e24" }], ["Sun", { mass: "1.989e30" }], ["Sagittarius A*", { mass: "8.26e36" }]],
    render: function (d) { return [big(sci(d.radiusKm) + " km", "Schwarzschild radius"), row([["In metres", sci(d.radiusM)]])]; } }
];

function el(tag, attrs, kids) {
  var n = document.createElement(tag);
  Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
  (kids || []).forEach(function (k) { n.append(k); });
  return n;
}
function sci(n) {
  if (n === 0) return "0";
  var a = Math.abs(n);
  return (a >= 1e6 || a < 1e-3) ? n.toExponential(3) : n.toLocaleString(undefined, { maximumSignificantDigits: 5 });
}
function big(value, label) { var f = document.createDocumentFragment(); f.append(el("div", { "class": "big" }, [value]), el("div", { "class": "lab" }, [label])); return f; }
function note(t) { return el("p", { "class": "note" }, [t]); }
function row(pairs) { var dl = el("dl"); pairs.forEach(function (p) { dl.append(el("dt", { "class": "lab" }, [p[0]]), el("dd", {}, [p[1]])); }); return dl; }

LIMITS.forEach(function (L) {
  var form = el("form", { novalidate: "" });
  var inputs = {};
  L.fields.forEach(function (f) {
    var input = el("input", { name: f[0], type: "text", inputmode: "decimal", autocomplete: "off", required: "" });
    inputs[f[0]] = input;
    form.append(el("label", {}, [f[1], input]));
  });
  var out = el("div", { "class": "out", "aria-live": "polite" }, [el("span", { "class": "muted" }, ["Enter values or pick a preset, then calculate."])]);
  var presetRow = el("div", { "class": "row", role: "group", "aria-label": L.title + " presets" });
  L.presets.forEach(function (p) {
    var b = el("button", { type: "button" }, [p[0]]);
    b.addEventListener("click", function () { Object.keys(p[1]).forEach(function (k) { inputs[k].value = p[1][k]; }); form.requestSubmit(); });
    presetRow.append(b);
  });
  form.append(el("div", { "class": "row" }, [el("button", { type: "submit", "class": "go" }, ["Calculate"])]));
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var qs = new URLSearchParams();
    L.fields.forEach(function (f) { var v = inputs[f[0]].value.trim(); if (v !== "") qs.set(f[0], v); });
    out.replaceChildren(el("span", { "class": "muted" }, ["Calculating…"]));
    fetch(L.endpoint + "?" + qs.toString())
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) { out.replaceChildren(el("p", { "class": "err" }, [res.d.error || "Request failed."])); return; }
        out.replaceChildren.apply(out, L.render(res.d));
      })
      .catch(function () { out.replaceChildren(el("p", { "class": "err" }, ["Could not reach the calculator. Check your connection and try again."])); });
  });
  document.getElementById("grid").append(el("section", { "aria-labelledby": "h-" + L.id }, [
    el("h2", { id: "h-" + L.id }, [L.title]), el("p", { "class": "muted" }, [L.blurb]), presetRow, form, out
  ]));
});
</script>
</body>
</html>`;
