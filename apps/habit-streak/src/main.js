// Entry for Vite: the shared brand layer, this tool's styles, then its logic.
import "@rjmlaird/ui/brand.css";
import "./tool.css";

const KEY = "rjmlaird-habit-streak-v1", OLD = "habit_tracker_data_v1";
const CATS = ["Health", "Mind", "Productivity", "Fitness", "General"];
const $ = (id) => document.getElementById(id);
let habits = [], filter = "all", pendingDelete = null, canSave = true, toastTimer;

const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const el = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids.filter((k) => k != null)); return e; };
const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");

function toast(t) {
  const b = $("toast"); b.textContent = t; b.hidden = false; clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { b.hidden = true; }, 3500);
}
function clean(h) {
  if (!h || typeof h !== "object" || typeof h.name !== "string" || !h.name.trim()) return null;
  const logs = {};
  if (h.logs && typeof h.logs === "object") for (const k of Object.keys(h.logs)) if (DATE_RE.test(k) && h.logs[k]) logs[k] = true;
  return {
    id: typeof h.id === "string" && h.id ? h.id : "h_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: h.name.trim().slice(0, 80), icon: typeof h.icon === "string" && h.icon.trim() ? h.icon.trim().slice(0, 4) : "⚡",
    category: CATS.includes(h.category) ? h.category : "General",
    targetDays: Math.min(7, Math.max(1, parseInt(h.targetDays, 10) || 7)),
    note: typeof h.note === "string" ? h.note.trim().slice(0, 140) : "", archived: !!h.archived, logs,
  };
}
function load() {
  try {
    localStorage.setItem("__rj", "1"); localStorage.removeItem("__rj");
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD);
    const data = raw ? JSON.parse(raw) : [];
    habits = (Array.isArray(data) ? data : []).map(clean).filter(Boolean);
  } catch { canSave = false; habits = []; }
  $("mem").hidden = canSave;
}
function save() {
  if (!canSave) return;
  try { localStorage.setItem(KEY, JSON.stringify(habits)); }
  catch { canSave = false; $("mem").hidden = false; }
}

function stats(h) {
  const now = new Date(), logs = h.logs, tStr = ymd(now), yStr = ymd(addDays(now, -1));
  const doneToday = !!logs[tStr];
  let cur = 0;
  if (doneToday || logs[yStr]) { let d = doneToday ? now : addDays(now, -1); while (logs[ymd(d)]) { cur++; d = addDays(d, -1); } }
  let best = 0, run = 0, prev = null;
  for (const k of Object.keys(logs).sort()) {
    const d = parse(k);
    run = prev && Math.round((d - prev) / 864e5) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
  best = Math.max(best, cur);
  let n30 = 0, n7 = 0;
  for (let i = 0; i < 30; i++) if (logs[ymd(addDays(now, -i))]) { n30++; if (i < 7) n7++; }
  return { cur, best, total: Object.keys(logs).length, rate: Math.round((n30 / 30) * 100), doneToday, week: n7 };
}

function renderStats() {
  const act = habits.filter((h) => !h.archived); let today = 0, best = 0, total = 0;
  for (const h of act) { const s = stats(h); if (s.doneToday) today++; best = Math.max(best, s.best); total += s.total; }
  $("s-active").textContent = act.length;
  $("s-today").textContent = today + (act.length ? " of " + act.length : "");
  $("s-best").textContent = plural(best, "day"); $("s-total").textContent = total;
}

function card(h) {
  const s = stats(h), now = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(now, -i));
  const li = el("li", { className: "hb-card" });
  const top = el("div", { className: "hb-top" });
  const meta = el("div", { className: "hb-meta" }, el("span", { className: "chip off", textContent: h.category }));
  if (h.archived) meta.append(el("span", { className: "chip warn", textContent: "Archived" }));
  top.append(
    el("div", { className: "hb-title" }, el("div", { className: "hb-icon", textContent: h.icon, ariaHidden: "true" }), el("div", {}, el("h3", { textContent: h.name }), meta)),
    el("div", { className: "hb-actions" },
      act("Edit", "Edit " + h.name, () => openEdit(h.id)),
      act(h.archived ? "Restore" : "Archive", (h.archived ? "Restore " : "Archive ") + h.name, () => { h.archived = !h.archived; save(); renderAll(); toast((h.archived ? "Archived " : "Restored ") + h.name); }),
      act("Delete", "Delete " + h.name, () => askDelete(h))));
  li.append(top);
  if (h.note) li.append(el("p", { className: "hb-note", textContent: h.note }));
  const dl = el("dl", { className: "hb-nums" });
  for (const [k, v] of [["Current streak", plural(s.cur, "day")], ["Best streak", plural(s.best, "day")], ["30-day rate", s.rate + "%"], ["Check-ins", s.total]])
    dl.append(el("div", {}, el("dt", { textContent: k }), el("dd", { textContent: v })));
  li.append(dl);
  const pct = Math.min(100, Math.round((s.week / h.targetDays) * 100));
  li.append(el("p", { className: "hb-week", textContent: "Last 7 days: " + s.week + " of " + h.targetDays + " target" }));
  const m = el("div", { className: "meter" + (s.week >= h.targetDays ? "" : s.week === 0 ? " bad" : " warn"), ariaHidden: "true" }, el("span", { style: "width:" + pct + "%" }));
  li.append(m);
  const ul = el("ul", { className: "hb-days", ariaLabel: "Check-ins for " + h.name });
  for (const d of days) {
    const key = ymd(d), on = !!h.logs[key], isToday = key === ymd(now);
    const label = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const b = el("button", { type: "button", textContent: on ? "✓" : String(d.getDate()), ariaPressed: String(on), ariaLabel: h.name + ", " + label + (isToday ? " (today)" : "") });
    b.dataset.habit = h.id; b.dataset.date = key;
    b.addEventListener("click", () => toggle(h, key));
    ul.append(el("li", { className: isToday ? "today" : "" }, el("small", { textContent: isToday ? "Today" : d.toLocaleDateString("en-GB", { weekday: "short" }) }), b));
  }
  li.append(ul);
  return li;
}
function act(text, label, fn) { const b = el("button", { type: "button", textContent: text, ariaLabel: label }); b.addEventListener("click", fn); return b; }

function toggle(h, key) {
  if (h.logs[key]) delete h.logs[key]; else h.logs[key] = true;
  save(); renderAll();
  const b = document.querySelector('[data-habit="' + h.id + '"][data-date="' + key + '"]'); if (b) b.focus();
  const s = stats(h);
  $("live").textContent = h.name + " " + (h.logs[key] ? "checked in" : "check-in removed") + ". Current streak " + plural(s.cur, "day") + ".";
}

function renderList() {
  const q = $("q").value.trim().toLowerCase(), arch = $("arch").checked;
  const rows = habits.filter((h) => !!h.archived === arch && (filter === "all" || h.category === filter) && h.name.toLowerCase().includes(q));
  const ul = $("list"); ul.replaceChildren();
  if (!rows.length) {
    ul.append(el("li", { className: "hb-empty" },
      el("h3", { textContent: habits.length ? "No habits match" : "No habits yet" }),
      el("p", { textContent: habits.length ? "Try another category or search, or change whether archived habits are shown." : "Create your first habit, or load a few demo habits to see how streaks and the heatmap work." })));
    return;
  }
  for (const h of rows) ul.append(card(h));
}

function renderHeat() {
  const act = habits.filter((h) => !h.archived), now = new Date(), cells = []; let days = 0, busiest = null;
  for (let i = 55; i >= 0; i--) {
    const d = addDays(now, -i), k = ymd(d); const n = act.filter((h) => h.logs[k]).length;
    const r = act.length ? n / act.length : 0;
    const lvl = n === 0 ? "" : r <= 0.34 ? "l1" : r <= 0.67 ? "l2" : "l3";
    if (n) days++; if (n && (!busiest || n > busiest.n)) busiest = { n, k };
    cells.push(el("span", { className: lvl, title: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ": " + plural(n, "check-in") }));
  }
  $("heat").replaceChildren(...cells);
  $("heat-sum").textContent = act.length
    ? days + " of the last 56 days had at least one check-in" + (busiest ? "; the busiest was " + parse(busiest.k).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) + " with " + plural(busiest.n, "habit") + "." : ".")
    : "Add a habit to start building your map.";
  $("heat").ariaLabel = "Heatmap of the last 56 days, oldest first. " + $("heat-sum").textContent;
}
function renderCats() {
  const box = $("cats"); box.replaceChildren();
  for (const c of ["all", ...CATS.slice(0, 4)]) {
    const b = el("button", { type: "button", textContent: c === "all" ? "All" : c, ariaPressed: String(filter === c) });
    b.addEventListener("click", () => { filter = c; renderCats(); renderList(); }); box.append(b);
  }
}
function renderAll() { renderStats(); renderList(); renderHeat(); }

// Habit dialog
const hd = $("hd"), dd = $("dd");
$("h-cat").replaceChildren(...CATS.map((c) => el("option", { value: c, textContent: c })));
function openHabit(h) {
  $("hf").reset(); $("h-err").hidden = true; $("h-name").removeAttribute("aria-invalid");
  $("hd-t").textContent = h ? "Edit habit" : "New habit"; $("h-id").value = h ? h.id : "";
  if (h) { $("h-name").value = h.name; $("h-icon").value = h.icon; $("h-cat").value = h.category; $("h-target").value = String(h.targetDays); $("h-note").value = h.note; }
  hd.showModal(); $("h-name").focus();
}
const openEdit = (id) => openHabit(habits.find((h) => h.id === id));
$("new").addEventListener("click", () => openHabit(null));
$("h-cancel").addEventListener("click", () => hd.close());
$("hf").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("h-name").value.trim();
  if (!name) { $("h-err").hidden = false; $("h-name").setAttribute("aria-invalid", "true"); $("h-name").focus(); return; }
  const f = { name, icon: $("h-icon").value.trim() || "⚡", category: $("h-cat").value, targetDays: Number($("h-target").value), note: $("h-note").value.trim() };
  const id = $("h-id").value;
  if (id) { Object.assign(habits.find((h) => h.id === id), f); toast("Updated " + name); }
  else { habits.push(clean({ ...f, logs: {} })); toast("Created " + name); }
  save(); hd.close(); renderAll();
});
function askDelete(h) { pendingDelete = h; $("dd-p").textContent = "“" + h.name + "” and all of its check-ins will be removed from this browser. This can’t be undone."; dd.showModal(); $("dd-cancel").focus(); }
$("dd-cancel").addEventListener("click", () => dd.close());
$("dd-ok").addEventListener("click", () => { habits = habits.filter((h) => h !== pendingDelete); save(); dd.close(); renderAll(); toast("Deleted " + pendingDelete.name); $("new").focus(); });

// Export, import, demo
$("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ app: "habit-streak", version: 1, habits }, null, 2)], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: "habits-" + ymd(new Date()) + ".json" }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Exported " + plural(habits.length, "habit") + ".");
});
$("import").addEventListener("click", () => $("file").click());
$("file").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    const data = JSON.parse(await f.text()); const list = Array.isArray(data) ? data : data.habits;
    if (!Array.isArray(list)) throw new Error("no habits");
    const have = new Set(habits.map((h) => h.id)); let n = 0;
    for (const raw of list) { const h = clean(raw); if (!h) continue; if (have.has(h.id)) h.id = h.id + "_" + Date.now().toString(36) + n; habits.push(h); have.add(h.id); n++; }
    save(); renderAll(); toast("Imported " + plural(n, "habit") + ".");
  } catch { toast("That file isn’t a valid habit export."); }
});
$("demo").addEventListener("click", () => {
  const defs = [["🚶", "Morning walk", "Fitness", 5, 0.8], ["📖", "Read for 20 minutes", "Mind", 7, 0.7], ["💧", "Drink water", "Health", 7, 0.9], ["✍️", "Write one page", "Productivity", 4, 0.5]];
  let added = 0;
  for (const [i, [icon, name, category, targetDays, p]] of defs.entries()) {
    if (habits.some((h) => h.name === name)) continue;
    const logs = {}; let seed = 17 + i * 31;
    for (let d = 0; d < 56; d++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; if (seed / 0x7fffffff < p && d !== 0) logs[ymd(addDays(new Date(), -d))] = true; }
    habits.push(clean({ name, icon, category, targetDays, note: "Demo habit", logs })); added++;
  }
  save(); renderAll(); toast(added ? "Loaded " + plural(added, "demo habit") + "." : "Demo habits are already loaded.");
});

$("q").addEventListener("input", renderList); $("arch").addEventListener("change", renderList);
load(); renderCats(); renderAll();
