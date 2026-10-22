// Client script for the tool, inlined into the page. Calls the JSON API under /physical-limits/api.
export const script = `
"use strict";
var BASE = "/physical-limits";
var LIMITS = [
  { id: "escape", title: "Escape velocity", blurb: "Speed needed to leave a body's gravity from a given distance from its centre.",
    endpoint: BASE + "/api/escape-velocity",
    fields: [["mass", "Mass of body (kg)"], ["radius", "Distance from centre (m)"]],
    presets: [["Earth", { mass: "5.972e24", radius: "6.371e6" }], ["Moon", { mass: "7.342e22", radius: "1.7374e6" }], ["Sun", { mass: "1.989e30", radius: "6.957e8" }], ["Jupiter", { mass: "1.898e27", radius: "6.9911e7" }]],
    render: function (d) {
      var out = [big(sci(d.velocityKmS) + " km/s", "Escape velocity"), row([["In m/s", sci(d.velocityMS)], ["Fraction of light speed", sci(d.fractionOfLightSpeed)]])];
      if (d.exceedsLightSpeed) out.push(note("This distance is at or inside the Schwarzschild radius: not even light escapes."));
      return out;
    } },
  { id: "hill", title: "Hill sphere", blurb: "Region where a body's own gravity dominates over its parent's, so it can hold satellites.",
    endpoint: BASE + "/api/hill-sphere",
    fields: [["primary_mass", "Parent mass (kg)"], ["secondary_mass", "Body mass (kg)"], ["semi_major_axis", "Orbit semi-major axis (m)"], ["eccentricity", "Eccentricity (0 to under 1)"]],
    presets: [["Earth around Sun", { primary_mass: "1.989e30", secondary_mass: "5.972e24", semi_major_axis: "1.496e11", eccentricity: "0.0167" }], ["Jupiter around Sun", { primary_mass: "1.989e30", secondary_mass: "1.898e27", semi_major_axis: "7.785e11", eccentricity: "0.0489" }]],
    render: function (d) { return [big(sci(d.radiusKm) + " km", "Hill sphere radius"), row([["In metres", sci(d.radiusM)]])]; } },
  { id: "roche", title: "Roche limit", blurb: "Closest a satellite held together by its own gravity can orbit before tides tear it apart.",
    endpoint: BASE + "/api/roche-limit",
    fields: [["primary_mass", "Parent mass (kg)"], ["primary_radius", "Parent radius (m)"], ["satellite_density", "Satellite density (kg/m³)"]],
    presets: [["Moon-like moon at Earth", { primary_mass: "5.972e24", primary_radius: "6.371e6", satellite_density: "3344" }], ["Icy moon at Saturn", { primary_mass: "5.683e26", primary_radius: "5.8232e7", satellite_density: "930" }]],
    render: function (d) { return [big(sci(d.fluidKm) + " km", "Fluid satellite (loose, deformable)"), big(sci(d.rigidKm) + " km", "Rigid satellite"), row([["Parent density", sci(d.primaryDensityKgM3) + " kg/m³"]])]; } },
  { id: "schwarzschild", title: "Schwarzschild radius", blurb: "Radius to which a mass must be compressed to become a black hole.",
    endpoint: BASE + "/api/schwarzschild-radius",
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
function row(pairs) { var dl = el("dl", { "class": "kv" }); pairs.forEach(function (p) { dl.append(el("dt", {}, [p[0]]), el("dd", {}, [p[1]])); }); return dl; }

LIMITS.forEach(function (L) {
  var form = el("form", { novalidate: "" });
  var inputs = {};
  L.fields.forEach(function (f) {
    var input = el("input", { name: f[0], type: "text", inputmode: "decimal", autocomplete: "off", required: "" });
    inputs[f[0]] = input;
    form.append(el("label", {}, [f[1], input]));
  });
  var out = el("div", { "class": "result", "aria-live": "polite" }, [el("span", { "class": "muted" }, ["Enter values or pick a preset, then calculate."])]);
  var presetRow = el("div", { "class": "row", role: "group", "aria-label": L.title + " presets" });
  L.presets.forEach(function (p) {
    var b = el("button", { type: "button" }, [p[0]]);
    b.addEventListener("click", function () { Object.keys(p[1]).forEach(function (k) { inputs[k].value = p[1][k]; }); form.requestSubmit(); });
    presetRow.append(b);
  });
  form.append(el("div", { "class": "row" }, [el("button", { type: "submit", "class": "btn-primary" }, ["Calculate"])]));
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var qs = new URLSearchParams();
    L.fields.forEach(function (f) { var v = inputs[f[0]].value.trim(); if (v !== "") qs.set(f[0], v); });
    out.replaceChildren(el("span", { "class": "muted" }, ["Calculating…"]));
    fetch(L.endpoint + "?" + qs.toString())
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) { out.replaceChildren(el("p", { "class": "error" }, [res.d.error || "Request failed."])); return; }
        out.replaceChildren.apply(out, L.render(res.d));
      })
      .catch(function () { out.replaceChildren(el("p", { "class": "error" }, ["Could not reach the calculator. Check your connection and try again."])); });
  });
  document.getElementById("grid").append(el("section", { "class": "panel", "aria-labelledby": "h-" + L.id }, [
    el("h2", { id: "h-" + L.id }, [L.title]), el("p", { "class": "muted" }, [L.blurb]), presetRow, form, out
  ]));
});
`;
