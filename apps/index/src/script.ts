// Client-side filtering and sorting. Plain JS, no dependencies.
export const script = `
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var group = $("#group-filter"), tech = $("#tech-filter"), status = $("#status-filter"), sort = $("#sort-filter");
  var clear = $("#clear-filter"), summary = $("#filter-summary"), none = $("#no-results");
  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-card]"));
  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-group-section]"));
  var label = function (el) { return el.options[el.selectedIndex].text; };
  var phrases = {
    "updated-desc": "recently updated first", "updated-asc": "oldest update first",
    "title-asc": "title A to Z", "title-desc": "title Z to A", "status": "by status"
  };

  function compare(mode) {
    return function (a, b) {
      var au = a.dataset.updated, bu = b.dataset.updated, at = a.dataset.title, bt = b.dataset.title;
      var as = Number(a.dataset.statusOrder), bs = Number(b.dataset.statusOrder);
      if (mode === "updated-asc") return au.localeCompare(bu) || at.localeCompare(bt);
      if (mode === "title-asc") return at.localeCompare(bt);
      if (mode === "title-desc") return bt.localeCompare(at);
      if (mode === "status") return (as - bs) || bu.localeCompare(au) || at.localeCompare(bt);
      return bu.localeCompare(au) || at.localeCompare(bt);
    };
  }

  function apply() {
    var g = group.value, t = tech.value.toLowerCase(), s = status.value, mode = sort.value;
    var shown = 0;
    cards.forEach(function (c) {
      var ok = (g === "all" || c.dataset.group === g) &&
               (t === "all" || c.dataset.tech.split("|").indexOf(t) !== -1) &&
               (s === "all" || c.dataset.status === s);
      c.hidden = !ok;
      if (ok) shown++;
    });
    sections.forEach(function (sec) {
      var grid = sec.querySelector("[data-grid]");
      var mine = Array.prototype.slice.call(grid.querySelectorAll("[data-card]"));
      mine.sort(compare(mode)).forEach(function (c) { grid.appendChild(c); });
      sec.hidden = !mine.some(function (c) { return !c.hidden; });
    });
    var active = g !== "all" || t !== "all" || s !== "all";
    clear.hidden = !active;
    none.hidden = shown !== 0;
    var parts = [];
    if (g !== "all") parts.push(label(group));
    if (t !== "all") parts.push(label(tech));
    if (s !== "all") parts.push(label(status));
    var noun = shown === 1 ? "tool" : "tools";
    summary.textContent = active
      ? "Showing " + shown + " " + noun + " matching " + parts.join(" · ") + ", " + phrases[mode] + "."
      : "Showing all " + cards.length + " tools, " + phrases[mode] + ".";
  }

  [group, tech, status, sort].forEach(function (el) { el.addEventListener("change", apply); });
  clear.addEventListener("click", function () {
    group.value = tech.value = status.value = "all";
    sort.value = "updated-desc";
    apply();
    group.focus();
  });
  apply();
})();
`;
