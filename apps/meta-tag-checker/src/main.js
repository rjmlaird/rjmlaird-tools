// Entry for Vite: the shared brand layer, this tool's styles, then its logic.
import "@rjmlaird/ui/brand.css";
import "./tool.css";

const $ = (id) => document.getElementById(id);
const PH = { title: "Your title appears here", desc: "Your description appears here. Keep it accurate, specific and written for people.", url: "https://example.com" };
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

function parseUrl(v) {
  try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:" ? u : null; } catch { return null; }
}
function meter(id, len, max, minGood) {
  const el = $(id); const bar = el.firstElementChild;
  bar.style.width = Math.min(100, (len / max) * 100) + "%";
  el.className = "meter" + (len > max ? " bad" : len >= max * 0.8 || (len > 0 && len < minGood) ? " warn" : "");
}
function check(level, label, text) {
  const li = document.createElement("li");
  const chip = document.createElement("span"); chip.className = "chip " + level; chip.textContent = label;
  const p = document.createElement("span"); p.textContent = text;
  li.append(chip, p); return li;
}

function update() {
  const rawTitle = $("title").value.trim(), rawDesc = $("desc").value.trim();
  const rawUrl = $("url").value.trim(), rawImg = $("image").value.trim();
  const title = rawTitle || PH.title, desc = rawDesc || PH.desc, url = rawUrl || PH.url;
  const tl = $("title").value.length, dl = $("desc").value.length;

  $("title-count").textContent = tl + " / 60";
  $("desc-count").textContent = dl + " / 160";
  meter("title-meter", tl, 60, 30);
  meter("desc-meter", dl, 160, 70);

  $("serp-url").textContent = url; $("serp-title").textContent = title; $("serp-desc").textContent = desc;
  $("og-title").textContent = title; $("og-desc").textContent = desc;
  const u = parseUrl(rawUrl);
  $("og-domain").textContent = (u ? u.hostname : "example.com").toUpperCase();

  const imgU = parseUrl(rawImg), box = $("og-img");
  if (imgU) {
    const img = document.createElement("img"); img.alt = ""; img.src = imgU.href;
    img.addEventListener("error", () => { box.textContent = "Image could not be loaded"; });
    box.replaceChildren(img);
  } else box.textContent = rawImg ? "Not a valid http(s) URL" : "No image set";

  const idx = $("idx").checked, fol = $("fol").checked;
  const robots = (idx ? "index" : "noindex") + ", " + (fol ? "follow" : "nofollow");

  const list = [];
  list.push(!rawTitle ? check("bad", "Fix", "Add a title. It is the main link text in search results.")
    : tl > 60 ? check("bad", "Fix", "Title is " + tl + " characters; it will probably be truncated in results.")
    : tl < 30 ? check("warn", "Check", "Title is short (" + tl + " characters). Around 30 to 60 usually reads well.")
    : check("ok", "Good", "Title length (" + tl + " characters) is within the usual range."));
  list.push(!rawDesc ? check("bad", "Fix", "Add a description. Without one, search engines choose a snippet.")
    : dl > 160 ? check("bad", "Fix", "Description is " + dl + " characters; it may be cut off.")
    : dl < 70 ? check("warn", "Check", "Description is short (" + dl + " characters). Around 70 to 160 usually works.")
    : check("ok", "Good", "Description length (" + dl + " characters) is within the usual range."));
  list.push(!rawUrl ? check("warn", "Check", "No canonical URL. Add one to avoid duplicate-URL ambiguity.")
    : !u ? check("bad", "Fix", "The canonical URL must be an absolute http(s) URL.")
    : u.protocol === "http:" ? check("warn", "Check", "Canonical uses http. Prefer https if the page is served over it.")
    : check("ok", "Good", "Canonical is an absolute https URL."));
  list.push(!rawImg ? check("warn", "Check", "No social image. Cards will be text-only (twitter:card will be “summary”).")
    : !imgU ? check("bad", "Fix", "The social image must be an absolute http(s) URL.")
    : check("ok", "Good", "Social image set; large-image card will be used. 1200×630 px is a common size."));
  list.push(!idx ? check("warn", "Check", "noindex is set: search engines are asked not to list this page.")
    : !fol ? check("warn", "Check", "nofollow is set: crawlers are asked not to follow links on this page.")
    : check("ok", "Good", "Page may be indexed and its links followed."));
  $("checklist").replaceChildren(...list);

  const e = esc, im = rawImg && imgU ? imgU.href : "";
  $("code-out").textContent = [
    "<!-- Primary meta tags -->",
    "<title>" + e(title) + "</title>",
    '<meta name="description" content="' + e(desc) + '">',
    '<meta name="robots" content="' + robots + '">',
    '<link rel="canonical" href="' + e(url) + '">',
    "",
    "<!-- Open Graph -->",
    '<meta property="og:type" content="website">',
    '<meta property="og:url" content="' + e(url) + '">',
    '<meta property="og:title" content="' + e(title) + '">',
    '<meta property="og:description" content="' + e(desc) + '">',
    ...(im ? ['<meta property="og:image" content="' + e(im) + '">'] : []),
    "",
    "<!-- X (Twitter) -->",
    '<meta name="twitter:card" content="' + (im ? "summary_large_image" : "summary") + '">',
    '<meta name="twitter:title" content="' + e(title) + '">',
    '<meta name="twitter:description" content="' + e(desc) + '">',
    ...(im ? ['<meta name="twitter:image" content="' + e(im) + '">'] : []),
  ].join("\n");
}

$("copy").addEventListener("click", async () => {
  const text = $("code-out").textContent, live = $("live"), btn = $("copy");
  try {
    await navigator.clipboard.writeText(text);
    live.textContent = "Tags copied to the clipboard."; btn.textContent = "Copied";
  } catch {
    const r = document.createRange(); r.selectNodeContents($("code-out"));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    live.textContent = "Could not copy automatically. The tags are selected; press Ctrl+C or ⌘C.";
  }
  setTimeout(() => { btn.textContent = "Copy tags"; }, 2000);
});
for (const id of ["title", "desc", "url", "image", "idx", "fol"]) $(id).addEventListener("input", update);
update();
