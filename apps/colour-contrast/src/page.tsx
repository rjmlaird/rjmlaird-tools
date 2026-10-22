import { Layout } from "@rjmlaird/ui";

const css = `
.pickers { display: grid; gap: 0 1.25rem; grid-template-columns: 1fr; }
@media (min-width: 40rem) { .pickers { grid-template-columns: 1fr 1fr; } }
.pair { display: grid; grid-template-columns: 56px 1fr; gap: .5rem; }
.pair input[type=color] { padding: 2px; cursor: pointer; }
.pair input[type=text] { font-family: var(--font-mono); }
#preview { margin-top: 1.25rem; padding: 1.25rem; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); }
#preview p { margin: 0 0 .5rem; }
#preview .large { font-size: 1.5rem; font-weight: 700; line-height: 1.25; }
table.grades { width: 100%; border-collapse: collapse; margin-top: .75rem; }
table.grades th, table.grades td { padding: .55rem .5rem; border-bottom: 1px solid var(--border); text-align: left; }
table.grades th { color: var(--text-lo); font-weight: 500; font-size: .85rem; }
.badge { display: inline-flex; align-items: center; gap: .35rem; font-weight: 700; }
.badge.pass { color: var(--teal); }
.badge.fail { color: var(--danger); }
.ratio { font-family: var(--font-display); font-size: clamp(2rem, 8vw, 2.75rem); font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.sug { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem .75rem; padding: .5rem 0; }
.sug h3 { font-size: 1rem; margin: 1rem 0 .25rem; }
.swatch { display: inline-block; width: 1.5rem; height: 1.5rem; border: 1px solid var(--border-strong); border-radius: 6px; vertical-align: middle; }
.sug button { min-height: 36px; padding: .25rem .75rem; font-size: .85rem; }
`;

const script = `
const BASE = "/colour-contrast";
const $ = (id) => document.getElementById(id);
const fgT = $("fg"), bgT = $("bg"), fgP = $("fg-pick"), bgP = $("bg-pick");
const err = $("err"), out = $("out"), prev = $("preview");
let timer, seq = 0;
const CRITERIA = [
  ["aaNormal", "Normal text, AA", "4.5:1"],
  ["aaLarge", "Large text, AA", "3:1"],
  ["aaaNormal", "Normal text, AAA", "7:1"],
  ["aaaLarge", "Large text, AAA", "4.5:1"],
  ["uiComponents", "UI components and graphics, AA", "3:1"],
];
function badge(ok) {
  const s = document.createElement("span"); s.className = "badge " + (ok ? "pass" : "fail");
  s.textContent = (ok ? "✓ Pass" : "✗ Fail"); return s;
}
function swatch(hex) { const s = document.createElement("span"); s.className = "swatch"; s.style.background = hex; s.setAttribute("aria-hidden", "true"); return s; }
function suggestionLine(parent, what, sug, apply) {
  const d = document.createElement("div"); d.className = "sug";
  if (!sug) { d.textContent = what + ": no colour of this hue reaches the target. Try changing the other colour."; parent.append(d); return; }
  const t = document.createElement("span"); t.textContent = what + ": ";
  const c = document.createElement("code"); c.textContent = sug.hex.toUpperCase();
  const r = document.createElement("span"); r.className = "muted small"; r.textContent = "(" + (Math.floor(sug.ratio * 100) / 100).toFixed(2) + ":1)";
  const b = document.createElement("button"); b.type = "button"; b.textContent = "Use this";
  b.addEventListener("click", () => { apply(sug.hex); run(); });
  d.append(swatch(sug.hex), t, c, r, b); parent.append(d);
}
function show(j) {
  out.replaceChildren();
  const big = document.createElement("div"); big.className = "ratio"; big.textContent = j.ratioDisplay + ":1";
  const lab = document.createElement("div"); lab.className = "lab"; lab.textContent = "Contrast ratio";
  out.append(big, lab);
  const table = document.createElement("table"); table.className = "grades";
  const head = table.createTHead().insertRow();
  for (const h of ["Criterion", "Needs", "Result"]) { const th = document.createElement("th"); th.scope = "col"; th.textContent = h; head.append(th); }
  const body = table.createTBody();
  for (const [key, name, need] of CRITERIA) {
    const tr = body.insertRow();
    tr.insertCell().textContent = name; tr.insertCell().textContent = need; tr.insertCell().append(badge(j.results[key]));
  }
  out.append(table);
  if (j.suggestions.length) {
    const h = document.createElement("h3"); h.textContent = "Suggested fixes"; h.style.margin = "1.25rem 0 0"; out.append(h);
    const hint = document.createElement("p"); hint.className = "muted small"; hint.textContent = "Smallest lightness change that keeps the hue and saturation.";
    out.append(hint);
    for (const s of j.suggestions) {
      const h3 = document.createElement("h3"); h3.textContent = "To reach " + s.label; out.append(h3);
      suggestionLine(out, "Change the text colour to", s.foreground, (hex) => { fgT.value = hex; });
      suggestionLine(out, "Or change the background to", s.background, (hex) => { bgT.value = hex; });
    }
  }
  fgP.value = j.foreground.hex; bgP.value = j.background.hex;
  prev.style.color = j.foreground.hex; prev.style.background = j.background.hex;
}
async function run() {
  const my = ++seq;
  const p = new URLSearchParams({ fg: fgT.value, bg: bgT.value });
  $("api").textContent = location.origin + BASE + "/api/check?" + p;
  try {
    const res = await fetch(BASE + "/api/check?" + p);
    const j = await res.json();
    if (my !== seq) return;
    if (!res.ok) throw new Error(j.error || "Request failed");
    err.hidden = true; fgT.removeAttribute("aria-invalid"); bgT.removeAttribute("aria-invalid"); show(j);
  } catch (e) {
    if (my !== seq) return;
    err.textContent = e.message; err.hidden = false; out.replaceChildren();
    (e.message.startsWith("Background") ? bgT : fgT).setAttribute("aria-invalid", "true");
  }
}
const later = () => { clearTimeout(timer); timer = setTimeout(run, 200); };
fgT.addEventListener("input", later); bgT.addEventListener("input", later);
fgP.addEventListener("input", () => { fgT.value = fgP.value; later(); });
bgP.addEventListener("input", () => { bgT.value = bgP.value; later(); });
$("swap").addEventListener("click", () => { const t = fgT.value; fgT.value = bgT.value; bgT.value = t; run(); });
$("f").addEventListener("submit", (ev) => { ev.preventDefault(); run(); });
run();
`;

export const Page = () => (
  <Layout
    title="Colour Contrast Checker"
    lede="Check WCAG 2 contrast ratios between a text colour and its background, see AA and AAA results, and get the smallest colour change that fixes a failure."
    wide
    css={css}
    script={script}
  >
    <section class="panel" aria-labelledby="in-h">
      <h2 id="in-h">Colours</h2>
      <form id="f" novalidate>
        <div class="pickers">
          <div>
            <label for="fg">Text (foreground)</label>
            <div class="pair">
              <input id="fg-pick" type="color" value="#777777" aria-label="Pick foreground colour" />
              <input id="fg" type="text" value="#777777" autocomplete="off" spellcheck={false} />
            </div>
          </div>
          <div>
            <label for="bg">Background</label>
            <div class="pair">
              <input id="bg-pick" type="color" value="#ffffff" aria-label="Pick background colour" />
              <input id="bg" type="text" value="#ffffff" autocomplete="off" spellcheck={false} />
            </div>
          </div>
        </div>
        <p class="muted small" style="margin:.6rem 0 0">
          Accepts hex (<code>#1a2b3c</code> or <code>#abc</code>), <code>rgb(26, 43, 60)</code>,{" "}
          <code>hsl(210, 40%, 17%)</code> and common colour names. Transparent colours are not supported.
        </p>
        <div class="row" style="margin-top:1rem">
          <button class="btn-primary" type="submit" style="margin-top:0">
            Check contrast
          </button>
          <button class="btn-secondary" type="button" id="swap">
            ⇄ Swap colours
          </button>
        </div>
      </form>
      <p id="err" class="error" role="alert" hidden></p>
      <div id="preview" aria-label="Preview of the two colours">
        <p>Normal text: the quick brown fox jumps over the lazy dog.</p>
        <p class="large">Large text: 24 px or 18.66 px bold</p>
      </div>
      <div id="out" class="result" aria-live="polite"></div>
    </section>

    <details>
      <summary>How this is calculated</summary>
      <ul>
        <li>
          Contrast ratio = (L1 + 0.05) ÷ (L2 + 0.05), where L1 is the lighter and L2 the darker relative luminance, as
          defined in WCAG 2.x. Ratios are shown rounded down, so 4.49 is never displayed as 4.5.
        </li>
        <li>Large text means at least 24 px (18 pt) regular or 18.66 px (14 pt) bold. AA needs 4.5:1 for normal text and 3:1 for large text; AAA needs 7:1 and 4.5:1.</li>
        <li>Meaningful icons, form-field borders and focus indicators need 3:1 against adjacent colours (WCAG 1.4.11).</li>
        <li>
          WCAG 2 contrast is a simple formula and is known to misjudge some colour pairs, especially dark backgrounds. Treat
          it as the compliance test, and still look at the result.
        </li>
        <li>Suggested fixes change only HSL lightness, so the hue and saturation stay the same.</li>
      </ul>
    </details>
    <details>
      <summary>Use this as an API</summary>
      <pre id="api"></pre>
      <p class="muted small">
        <code>GET /colour-contrast/api/check?fg=%23777777&amp;bg=%23ffffff</code>. Encode <code>#</code> as <code>%23</code>.
      </p>
    </details>
  </Layout>
);
