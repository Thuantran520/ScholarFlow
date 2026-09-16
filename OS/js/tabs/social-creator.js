// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/social-creator.js
// Creator workspace for KOL/KOC: local post planner (schedule/status),
// per-post metrics (views/likes/shares/comments) with summary + CSV export,
// and group/channel registry with quick open. 100% local storage.
// ---------------------------------------------------------------------------
const SOC_CR_PLATFORMS = ["facebook", "instagram", "tiktok", "youtube", "zalo", "x", "discord"];
const SOC_CR_STATUSES = ["idea", "scheduled", "posted"];
let socCreator = { posts: [], groups: [] };

function _socCrLoad() {
  storGet("sf_creator_workspace", function (res) {
    const v = res && res.sf_creator_workspace;
    socCreator = { posts: (v && v.posts) || [], groups: (v && v.groups) || [] };
    _socCrRender();
  });
}
function _socCrSave() {
  storSet({ sf_creator_workspace: socCreator }, function () { _socCrRender(); });
}
function _socCrStatusKey(id) {
  if (id === "idea") return "soc_cr_status_idea";
  if (id === "scheduled") return "soc_cr_status_scheduled";
  return "soc_cr_status_posted";
}
function _socCrNum(v) {
  const n = parseInt(v, 10);
  return (isNaN(n) || n < 0) ? 0 : n;
}
function _socCrSummary(posts) {
  let v = 0, l = 0, s = 0, c = 0;
  posts.forEach(function (p) { v += _socCrNum(p.views); l += _socCrNum(p.likes); s += _socCrNum(p.shares); c += _socCrNum(p.comments); });
  return t("soc_cr_summary")
    .replace("{n}", String(posts.length)).replace("{v}", String(v))
    .replace("{l}", String(l)).replace("{s}", String(s)).replace("{c}", String(c));
}
function _socCrFiltered() {
  const pf = document.getElementById("soc-cr-f-platform");
  const sf = document.getElementById("soc-cr-f-status");
  const q = document.getElementById("soc-cr-q");
  const plat = pf ? pf.value : "";
  const st = sf ? sf.value : "";
  const search = (q ? q.value : "").trim().toLowerCase();
  return socCreator.posts.filter(function (p) {
    if (plat && p.platform !== plat) return false;
    if (st && p.status !== st) return false;
    if (search && (p.title || "").toLowerCase().indexOf(search) === -1) return false;
    return true;
  });
}
function _socCrRender() {
  const list = document.getElementById("soc-cr-list");
  const sum = document.getElementById("soc-cr-summary");
  if (sum) sum.textContent = _socCrSummary(socCreator.posts);
  if (!list) return;
  _socClearBox(list);
  const posts = _socCrFiltered();
  if (!posts.length) { list.appendChild(_socDiv("soc-cr-empty", t("soc_cr_empty"), "#64748b")); return; }
  posts.sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });
  posts.forEach(function (p) {
    const card = _socDiv("soc-cr-card");
    const top = document.createElement("div");
    top.className = "soc-cr-top";
    const titleEl = document.createElement("input");
    titleEl.type = "text"; titleEl.className = "soc-cr-title-input";
    titleEl.value = p.title || "";
    titleEl.addEventListener("change", function () { p.title = titleEl.value; _socCrSave(); });
    top.appendChild(titleEl);
    const del = _socBtn("soc-cr-del", "✕", function () {
      socCreator.posts = socCreator.posts.filter(function (x) { return x.id !== p.id; });
      _socCrSave();
    });
    del.title = t("btn_delete");
    top.appendChild(del);
    card.appendChild(top);
    const meta = document.createElement("div");
    meta.className = "soc-cr-meta";
    const platSel = document.createElement("select");
    platSel.className = "soc-cr-sel";
    SOC_CR_PLATFORMS.forEach(function (pl) {
      const o = document.createElement("option");
      o.value = pl; o.textContent = pl;
      if (p.platform === pl) o.selected = true;
      platSel.appendChild(o);
    });
    platSel.addEventListener("change", function () { p.platform = platSel.value; _socCrSave(); });
    meta.appendChild(platSel);
    const dateIn = document.createElement("input");
    dateIn.type = "date"; dateIn.className = "soc-cr-date";
    dateIn.value = p.date || "";
    dateIn.addEventListener("change", function () { p.date = dateIn.value; _socCrSave(); });
    meta.appendChild(dateIn);
    const stSel = document.createElement("select");
    stSel.className = "soc-cr-sel";
    SOC_CR_STATUSES.forEach(function (st) {
      const o = document.createElement("option");
      o.value = st; o.textContent = t(_socCrStatusKey(st));
      if (p.status === st) o.selected = true;
      stSel.appendChild(o);
    });
    stSel.addEventListener("change", function () { p.status = stSel.value; _socCrSave(); });
    meta.appendChild(stSel);
    card.appendChild(meta);
    const mrow = document.createElement("div");
    mrow.className = "soc-cr-metrics";
    [["views", "soc_cr_views"], ["likes", "soc_cr_likes"], ["shares", "soc_cr_shares"], ["comments", "soc_cr_comments"]].forEach(function (pair) {
      const lbl = document.createElement("label");
      lbl.className = "soc-cr-metric";
      const key = pair[0];
      lbl.appendChild(_socDiv("soc-cr-metric-l", t(pair[1]), "#94a3b8"));
      const inp = document.createElement("input");
      inp.type = "number"; inp.min = "0"; inp.className = "soc-cr-num";
      inp.value = p[key] || 0;
      inp.addEventListener("change", function () { p[key] = String(_socCrNum(inp.value)); inp.value = p[key]; _socCrSave(); });
      lbl.appendChild(inp);
      mrow.appendChild(lbl);
    });
    card.appendChild(mrow);
    list.appendChild(card);
  });
  const glist = document.getElementById("soc-cr-glist");
  if (glist) {
    _socClearBox(glist);
    if (!socCreator.groups.length) { glist.appendChild(_socDiv("soc-cr-empty", t("soc_cr_gempty"), "#64748b")); }
    socCreator.groups.forEach(function (g) {
      const row = document.createElement("div");
      row.className = "soc-cr-grow";
      row.appendChild(_socDiv("soc-cr-gname", g.name, "#cbd5e1"));
      if (g.niche) row.appendChild(_socDiv("soc-cr-gniche", "#" + g.niche, "#8b5cf6"));
      const ops = document.createElement("div");
      ops.className = "soc-cr-gops";
      ops.appendChild(_socBtn("soc-cr-gbtn", t("soc_cr_gopen"), function () { if (g.url) _socOpen(g.url); }));
      ops.appendChild(_socBtn("soc-cr-gbtn", "✕", function () {
        socCreator.groups = socCreator.groups.filter(function (x) { return x.id !== g.id; });
        _socCrSave();
      }));
      row.appendChild(ops);
      glist.appendChild(row);
    });
  }
}
function socCrAddPost() {
  const title = document.getElementById("soc-cr-title");
  const plat = document.getElementById("soc-cr-platform");
  const date = document.getElementById("soc-cr-date-in");
  const status = document.getElementById("soc-cr-status");
  const tt = title ? title.value.trim() : "";
  if (!tt) { showToast(t("soc_cr_need_title")); return; }
  socCreator.posts.push({
    id: String(Date.now()),
    title: tt,
    platform: plat ? plat.value : "facebook",
    date: date ? date.value : "",
    status: status ? status.value : "idea",
    views: "0", likes: "0", shares: "0", comments: "0"
  });
  if (title) title.value = "";
  _socCrSave();
}
function socCrAddGroup() {
  const name = document.getElementById("soc-cr-gname-in");
  const url = document.getElementById("soc-cr-gurl-in");
  const niche = document.getElementById("soc-cr-gniche-in");
  const nn = name ? name.value.trim() : "";
  if (!nn) { showToast(t("soc_cr_gneed_name")); return; }
  socCreator.groups.push({ id: String(Date.now()), name: nn, url: url ? url.value.trim() : "", niche: niche ? niche.value.trim() : "" });
  if (name) name.value = ""; if (url) url.value = ""; if (niche) niche.value = "";
  _socCrSave();
}
function socCrOpenAllGroups() {
  const gs = socCreator.groups.filter(function (g) { return g.url; });
  if (!gs.length) { showToast(t("soc_cr_gempty")); return; }
  gs.forEach(function (g) { _socOpen(g.url); });
}
function socCrExportCsv() {
  if (!socCreator.posts.length) { showToast(t("soc_cr_empty")); return; }
  const esc = function (s) { return '"' + String(s || "").replace(/"/g, '""') + '"'; };
  const lines = ["platform,date,status,views,likes,shares,comments,title"];
  socCreator.posts.forEach(function (p) {
    lines.push([p.platform, p.date, p.status, p.views, p.likes, p.shares, p.comments, esc(p.title)].join(","));
  });
  try {
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "scholarflow-posts.csv";
    document.body.appendChild(a); a.click();
    setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 120);
  } catch (e) { showToast(t("err_008")); }
}

onReady(function () {
  const add = document.getElementById("btn-soc-cr-add");
  if (add) add.addEventListener("click", socCrAddPost);
  const gadd = document.getElementById("btn-soc-cr-gadd");
  if (gadd) gadd.addEventListener("click", socCrAddGroup);
  const gopen = document.getElementById("btn-soc-cr-gopenall");
  if (gopen) gopen.addEventListener("click", socCrOpenAllGroups);
  const csv = document.getElementById("btn-soc-cr-csv");
  if (csv) csv.addEventListener("click", socCrExportCsv);
  ["soc-cr-f-platform", "soc-cr-f-status"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", _socCrRender);
  });
  const q = document.getElementById("soc-cr-q");
  if (q) q.addEventListener("input", _socCrRender);
  _socCrLoad();
});
