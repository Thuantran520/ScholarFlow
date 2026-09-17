// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/darkmode.js
// Dark Mode console (own tab): master/auto switches, scope + theme selects,
// brightness slider, per-site 🌙/☀️ + ⚡force, exclusion lists management.
// Persists sf_darkmode consumed by OS/js/content/darkmode.js (engine v2).
// ---------------------------------------------------------------------------
let dmState = { enabled: false, mode: "all", auto: true, bright: 100, theme: "std", onSites: {}, offSites: {}, forceSites: {}, siteTune: {},
  paper: { mode: "none", custom: "#f6ecd9", alpha: 18 },
  typo: { on: false, family: "", size: 100, line: 1.6, ls: 0, ws: 0 }, darkKnown: {} };
const DM_PAPERS = [
  { id: "none",     color: "transparent", key: "dm_paper_none" },
  { id: "paper",    color: "#f6ecd9",     key: "dm_paper_paper" },
  { id: "cream",    color: "#faf6ee",     key: "dm_paper_cream" },
  { id: "amber",    color: "#f9e6c8",     key: "dm_paper_amber" },
  { id: "peach",    color: "#fde8d8",     key: "dm_paper_peach" },
  { id: "rose",     color: "#fbe9ee",     key: "dm_paper_rose" },
  { id: "lavender", color: "#ece8f7",     key: "dm_paper_lavender" },
  { id: "sky",      color: "#e4edf9",     key: "dm_paper_sky" },
  { id: "mint",     color: "#e4f2e7",     key: "dm_paper_mint" },
  { id: "sage",     color: "#e5ede9",     key: "dm_paper_sage" },
  { id: "slate",    color: "#e8ecf1",     key: "dm_paper_slate" },
  { id: "custom",   color: "custom",      key: "dm_paper_custom" }
];
const DM_FONTS = [
  { v: "", key: "dm_font_default" },
  { v: "Georgia, 'Times New Roman', serif", key: "dm_font_serif" },
  { v: "'Segoe UI', system-ui, sans-serif", key: "dm_font_sans" },
  { v: "'Courier New', ui-monospace, monospace", key: "dm_font_mono" },
  { v: "'Lexend', Verdana, sans-serif", key: "dm_font_lexend" }
];
let _dmCurrentHost = "";

function _dmRefreshHost(cb) {
  try {
    ensureActiveTab().then(function (tab) {
      try {
        const u = tab && tab.url ? new URL(tab.url) : null;
        _dmCurrentHost = u && (u.protocol === "http:" || u.protocol === "https:")
          ? u.hostname.replace(/^www\./, "").toLowerCase() : "";
      } catch (e) { _dmCurrentHost = ""; }
      if (cb) cb();
    }).catch(function () { _dmCurrentHost = ""; if (cb) cb(); });
  } catch (e) { _dmCurrentHost = ""; if (cb) cb(); }
}
function dmLoad() {
  storGet("sf_darkmode", function (res) {
    const s = res && res.sf_darkmode;
    if (s) {
      dmState.enabled = !!s.enabled;
      dmState.mode = s.mode === "selected" ? "selected" : "all";
      dmState.auto = s.auto !== false;
      dmState.bright = Math.min(140, Math.max(60, parseInt(s.bright, 10) || 100));
      dmState.theme = (s.theme === "dim" || s.theme === "warm" || s.theme === "contrast") ? s.theme : "std";
      dmState.onSites = s.onSites || {};
      dmState.offSites = s.offSites || {};
      dmState.forceSites = s.forceSites || {};
      dmState.siteTune = s.siteTune || {};
      dmState.darkKnown = s.darkKnown || {};
      if (s.paper) dmState.paper = Object.assign(dmState.paper, s.paper);
      if (s.typo) dmState.typo = Object.assign(dmState.typo, s.typo);
    }
    _dmRefreshHost(dmRender);
  });
}
function dmSave() {
  storSet({ sf_darkmode: {
    enabled: dmState.enabled, mode: dmState.mode, auto: dmState.auto,
    bright: dmState.bright, theme: dmState.theme,
    onSites: dmState.onSites, offSites: dmState.offSites, forceSites: dmState.forceSites,
    siteTune: dmState.siteTune, paper: dmState.paper, typo: dmState.typo, darkKnown: dmState.darkKnown || {}
  } }, function () { dmRender(); });
}
function _dmSiteDark() {
  if (!_dmCurrentHost) return false;
  if (dmState.offSites[_dmCurrentHost]) return false;
  if (dmState.forceSites[_dmCurrentHost]) return true;
  return dmState.mode === "selected" ? !!dmState.onSites[_dmCurrentHost] : true;
}
function _dmChip(host, label, onClick, color) {
  const chip = document.createElement("span");
  chip.className = "dm-chip";
  const name = document.createElement("b");
  name.textContent = host;
  const act = document.createElement("i");
  act.textContent = " " + label;
  act.style.fontStyle = "normal";
  act.style.color = color || "#94a3b8";
  act.style.marginLeft = "4px";
  chip.appendChild(name); chip.appendChild(act);
  chip.addEventListener("click", function () { onClick(host); });
  chip.title = host + " — " + label;
  return chip;
}
function dmRender() {
  const tgl = document.getElementById("sec-dm-toggle");
  if (tgl) tgl.checked = !!dmState.enabled;
  const auto = document.getElementById("sec-dm-auto");
  if (auto) auto.checked = !!dmState.auto;
  const mode = document.getElementById("sec-dm-mode");
  if (mode) mode.value = dmState.mode;
  const theme = document.getElementById("sec-dm-theme");
  if (theme) theme.value = dmState.theme;
  const bright = document.getElementById("sec-dm-bright");
  if (bright) bright.value = String(dmState.bright);
  const bv = document.getElementById("dm-bright-val");
  if (bv) bv.textContent = dmState.bright + "%";
  const pill = document.getElementById("dm-status-pill");
  if (pill) {
    pill.textContent = dmState.enabled ? t("dm_status_on") : t("dm_status_off");
    pill.className = dmState.enabled ? "dm-pill dm-pill-on" : "dm-pill";
  }
  const st = document.getElementById("sec-dm-status");
  if (st) st.textContent = _dmCurrentHost || t("dm_host_none");
  const btn = document.getElementById("btn-sec-dm-site");
  if (btn) {
    const dark = dmState.enabled && _dmSiteDark();
    btn.textContent = dark ? t("dm_this_off") : t("dm_this_on");
    btn.disabled = !_dmCurrentHost;
  }
  const force = document.getElementById("btn-sec-dm-force");
  if (force) {
    const f = !!(_dmCurrentHost && dmState.forceSites[_dmCurrentHost]);
    force.textContent = f ? t("dm_force_off") : t("dm_force_on");
    force.classList.toggle("is-active", f);
    force.disabled = !_dmCurrentHost || !dmState.enabled;
  }
  const tune = (_dmCurrentHost && dmState.siteTune[_dmCurrentHost]) || {};
  [["dm-tune-bright", "b", 100], ["dm-tune-contrast", "c", 100], ["dm-tune-color", "s", 100]].forEach(function (row) {
    const el = document.getElementById(row[0]);
    const val = document.getElementById(row[0] + "-val");
    const v = tune[row[1]] == null ? row[2] : tune[row[1]];
    if (el) { el.value = String(v); el.disabled = !_dmCurrentHost; }
    if (val) val.textContent = v + "%";
  });
  const chips = document.getElementById("dm-paper-chips");
  if (chips) {
    _socClearBox(chips);
    DM_PAPERS.forEach(function (pp) {
      const cb = document.createElement("button");
      cb.type = "button";
      cb.className = "dm-paper-chip" + (dmState.paper.mode === pp.id ? " is-active" : "");
      const sw = document.createElement("span");
      sw.className = "dm-sw";
      if (pp.id === "none") sw.classList.add("dm-sw-none");
      else sw.style.background = pp.color === "custom" ? (dmState.paper.custom || "#f6ecd9") : pp.color;
      cb.appendChild(sw);
      cb.appendChild(document.createTextNode(t(pp.key)));
      cb.addEventListener("click", function () { dmState.paper.mode = pp.id; dmSave(); });
      chips.appendChild(cb);
    });
  }
  const pcEl = document.getElementById("dm-paper-custom");
  if (pcEl) { pcEl.value = dmState.paper.custom || "#f6ecd9"; pcEl.style.display = dmState.paper.mode === "custom" ? "" : "none"; }
  const paEl = document.getElementById("dm-paper-alpha");
  if (paEl) paEl.value = String(dmState.paper.alpha);
  const pavEl = document.getElementById("dm-paper-alpha-val");
  if (pavEl) pavEl.textContent = dmState.paper.alpha + "%";
  const tglT = document.getElementById("sec-dm-typo");
  if (tglT) tglT.checked = !!dmState.typo.on;
  const typoPanel = document.getElementById("dm-typo-panel");
  if (typoPanel) typoPanel.classList.toggle("is-open", !!dmState.typo.on);
  const famEl = document.getElementById("dm-font-family");
  if (famEl) {
    _socClearBox(famEl);
    DM_FONTS.forEach(function (op) {
      const o = document.createElement("option");
      o.value = op.v; o.textContent = t(op.key);
      if ((dmState.typo.family || "") === op.v) o.selected = true;
      famEl.appendChild(o);
    });
  }
  [["dm-font-size", "size", function (v) { return v + "%"; }], ["dm-font-line", "line", function (v) { return (Math.round(v * 10) / 10).toFixed(1) + "×"; }], ["dm-font-ls", "ls", function (v) { return (v > 0 ? "+" : "") + v.toFixed(2) + "px"; }], ["dm-font-ws", "ws", function (v) { return (v > 0 ? "+" : "") + v.toFixed(2) + "px"; }]].forEach(function (row) {
    const el = document.getElementById(row[0]);
    const vEl = document.getElementById(row[0] + "-val");
    const raw = Math.round(dmState.typo[row[1]] * 100);
    if (el) el.value = String(row[1] === "size" ? dmState.typo.size : raw);
    if (vEl) vEl.textContent = row[2](row[1] === "size" ? dmState.typo.size : dmState.typo[row[1]]);
  });
  const list = document.getElementById("dm-excl-list");
  if (list) {
    _socClearBox(list);
    let any = false;
    const hostsOf = function (o) { return Object.keys(o || {}); };
    const addAll = function (o, label, onClick, color) {
      hostsOf(o).forEach(function (h) { any = true; list.appendChild(_dmChip(h, label, onClick, color)); });
    };
    if (dmState.mode === "selected") {
      addAll(dmState.onSites, "✕", function (h) { delete dmState.onSites[h]; dmSave(); });
    } else {
      addAll(dmState.offSites, "✕", function (h) { delete dmState.offSites[h]; dmSave(); });
    }
    addAll(dmState.forceSites, "✕", function (h) { delete dmState.forceSites[h]; dmSave(); }, "#94a3b8");
    if (!any) list.appendChild(_socDiv("dm-excl-empty", t("dm_excl_empty"), "#64748b"));
  }
}
function dmToggleSite() {
  _dmRefreshHost(function () {
    if (!_dmCurrentHost) { showToast(t("dm_no_host")); return; }
    if (!dmState.enabled) { dmState.enabled = true; }
    if (_dmSiteDark()) { dmState.offSites[_dmCurrentHost] = true; delete dmState.onSites[_dmCurrentHost]; }
    else {
      delete dmState.offSites[_dmCurrentHost];
      if (dmState.mode === "selected") dmState.onSites[_dmCurrentHost] = true;
    }
    dmSave();
    showToast(t("dm_updated").replace("{0}", _dmCurrentHost));
  });
}
function dmToggleForce() {
  _dmRefreshHost(function () {
    if (!_dmCurrentHost) { showToast(t("dm_no_host")); return; }
    if (dmState.forceSites[_dmCurrentHost]) delete dmState.forceSites[_dmCurrentHost];
    else { dmState.forceSites[_dmCurrentHost] = true; delete dmState.offSites[_dmCurrentHost]; if (dmState.mode === "selected") dmState.onSites[_dmCurrentHost] = true; }
    dmSave();
    showToast(t("dm_updated").replace("{0}", _dmCurrentHost));
  });
}
function _dmSetTune(field, raw) {
  if (!_dmCurrentHost) return;
  const v = Math.max(0, Math.min(180, parseInt(raw, 10) || 100));
  const cur = dmState.siteTune[_dmCurrentHost] || { b: 100, c: 100, s: 100 };
  cur[field] = v;
  if (cur.b === 100 && cur.c === 100 && cur.s === 100) delete dmState.siteTune[_dmCurrentHost];
  else dmState.siteTune[_dmCurrentHost] = cur;
  dmSave();
}
function dmClearLists() {
  dmState.onSites = {}; dmState.offSites = {}; dmState.forceSites = {};
  dmSave();
  showToast(t("dm_updated").replace("{0}", "*"));
}

onReady(function () {
  const tgl = document.getElementById("sec-dm-toggle");
  if (tgl) tgl.addEventListener("change", function () { dmState.enabled = !!tgl.checked; dmSave(); });
  const auto = document.getElementById("sec-dm-auto");
  if (auto) auto.addEventListener("change", function () { dmState.auto = !!auto.checked; dmSave(); });
  const mode = document.getElementById("sec-dm-mode");
  if (mode) mode.addEventListener("change", function () { dmState.mode = mode.value === "selected" ? "selected" : "all"; dmSave(); });
  const theme = document.getElementById("sec-dm-theme");
  if (theme) theme.addEventListener("change", function () { dmState.theme = theme.value || "std"; dmSave(); });
  const bright = document.getElementById("sec-dm-bright");
  if (bright) bright.addEventListener("input", function () {
    dmState.bright = Math.min(140, Math.max(60, parseInt(bright.value, 10) || 100));
    const bv = document.getElementById("dm-bright-val");
    if (bv) bv.textContent = dmState.bright + "%";
  });
  if (bright) bright.addEventListener("change", function () { dmSave(); });
  const btn = document.getElementById("btn-sec-dm-site");
  if (btn) btn.addEventListener("click", dmToggleSite);
  const force = document.getElementById("btn-sec-dm-force");
  if (force) force.addEventListener("click", dmToggleForce);
  [["dm-tune-bright", "b"], ["dm-tune-contrast", "c"], ["dm-tune-color", "s"]].forEach(function (row) {
    const el = document.getElementById(row[0]);
    if (!el) return;
    el.addEventListener("input", function () {
      const val = document.getElementById(row[0] + "-val");
      if (val) val.textContent = el.value + "%";
    });
    el.addEventListener("change", function () { _dmSetTune(row[1], el.value); });
  });
  const tuneReset = document.getElementById("btn-dm-tune-reset");
  if (tuneReset) tuneReset.addEventListener("click", function () {
    if (_dmCurrentHost && dmState.siteTune[_dmCurrentHost]) { delete dmState.siteTune[_dmCurrentHost]; dmSave(); showToast(t("dm_updated").replace("{0}", _dmCurrentHost)); }
  });
  const pc = document.getElementById("dm-paper-custom");
  if (pc) pc.addEventListener("input", function () { dmState.paper.custom = pc.value; dmState.paper.mode = "custom"; dmSave(); });
  const pa = document.getElementById("dm-paper-alpha");
  if (pa) pa.addEventListener("input", function () { const v = document.getElementById("dm-paper-alpha-val"); if (v) v.textContent = pa.value + "%"; });
  if (pa) pa.addEventListener("change", function () { dmState.paper.alpha = parseInt(pa.value, 10) || 18; dmSave(); });
  const tglT = document.getElementById("sec-dm-typo");
  if (tglT) tglT.addEventListener("change", function () {
    dmState.typo.on = !!tglT.checked;
    const typoPanel = document.getElementById("dm-typo-panel");
    if (typoPanel) typoPanel.classList.toggle("is-open", !!dmState.typo.on);
    dmSave();
  });
  const fam = document.getElementById("dm-font-family");
  if (fam) fam.addEventListener("change", function () { dmState.typo.family = fam.value; dmSave(); });
  [["dm-font-size", "size"], ["dm-font-line", "line"], ["dm-font-ls", "ls"], ["dm-font-ws", "ws"]].forEach(function (row) {
    const el = document.getElementById(row[0]);
    if (!el) return;
    const fmt = row[1] === "size" ? function (x) { return x + "%"; } : row[1] === "line" ? function (x) { return (x / 100).toFixed(1) + "×"; } : function (x) { return (x / 100 > 0 ? "+" : "") + (x / 100).toFixed(2) + "px"; };
    el.addEventListener("input", function () { const v = document.getElementById(row[0] + "-val"); if (v) v.textContent = fmt(parseInt(el.value, 10)); });
    el.addEventListener("change", function () {
      const x = parseInt(el.value, 10);
      dmState.typo[row[1]] = row[1] === "size" ? x : x / 100;
      dmSave();
    });
  });
  const clr = document.getElementById("btn-dm-clear-excl");
  if (clr) clr.addEventListener("click", dmClearLists);
  try {
    const api = (typeof chrome !== "undefined" && chrome.tabs ? chrome.tabs : typeof browser !== "undefined" && browser.tabs ? browser.tabs : null);
    if (api && api.onActivated && api.onActivated.addListener) api.onActivated.addListener(function () { _dmRefreshHost(dmRender); });
  } catch (e2) {}
  dmLoad();
});
