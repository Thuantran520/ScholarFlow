// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/tab-manager.js
// Cross-browser Tab Manager: list/search/sort/group/pin/bookmark/close/
// duplicate/mute/discard/session/export — monochrome UI.
// ---------------------------------------------------------------------------
let tabmgrState = { tabs: [], filter: "", sort: "title_asc", groupMode: "none", collapsed: {} };
let tabmgrSessions = [];

function _getTabsApi() {
  try {
    if (typeof chrome !== "undefined" && chrome.tabs) return chrome.tabs;
    if (typeof browser !== "undefined" && browser.tabs) return browser.tabs;
  } catch (e) {}
  return null;
}
function _getBookmarksApi() {
  try {
    if (typeof chrome !== "undefined" && chrome.bookmarks) return chrome.bookmarks;
    if (typeof browser !== "undefined" && browser.bookmarks) return browser.bookmarks;
  } catch (e) {}
  return null;
}
function tabmgrGetApi() { return _getTabsApi(); }

function _tabmgrDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, "") || "other"; } catch (e) { return "other"; }
}
function _tabmgrFuncGroup(url) {
  const h = _tabmgrDomain(url).toLowerCase();
  if (/(arxiv|openalex|crossref|scholar\.google|pubmed|semanticscholar|researchgate|ieeexplore|springer|nature\.com|sciencedirect|wiley|doi\.org)/.test(h)) return "academic";
  if (/(youtube|youtu\.be|vimeo|twitch)/.test(h)) return "video";
  if (/(docs\.google|drive\.google|notion|overleaf|dropbox)/.test(h)) return "docs";
  if (/(github|gitlab|stackoverflow|stackexchange)/.test(h)) return "code";
  if (/(facebook|twitter|x\.com|linkedin|reddit|instagram)/.test(h)) return "social";
  return "other";
}
function _tabmgrFuncLabel(key) {
  const map = { academic: "tabmgr_func_academic", video: "tabmgr_func_video", docs: "tabmgr_func_docs", code: "tabmgr_func_code", social: "tabmgr_func_social", other: "tabmgr_func_other" };
  const k = map[key] || "tabmgr_func_other";
  try { return t(k); } catch (e) { return key; }
}
const _SVG_NS = "http" + "://www.w3.org/2000/svg";
function _tabmgrSvg(pathD, title) {
  const svg = document.createElementNS(_SVG_NS, "svg");
  svg.setAttribute("width", "12");
  svg.setAttribute("height", "12");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  if (title) svg.setAttribute("aria-label", title);
  const p = document.createElementNS(_SVG_NS, "path");
  p.setAttribute("d", pathD);
  svg.appendChild(p);
  return svg;
}
function _tabmgrSvgWithExtra(paths) {
  const svg = document.createElementNS(_SVG_NS, "svg");
  svg.setAttribute("width", "12");
  svg.setAttribute("height", "12");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  paths.forEach(function (d) {
    const el = document.createElementNS(_SVG_NS, d.tag || "path");
    Object.keys(d.attrs).forEach(function (k) { el.setAttribute(k, d.attrs[k]); });
    svg.appendChild(el);
  });
  return svg;
}

function tabmgrLoadTabs() {
  const api = _getTabsApi();
  if (!api || !api.query) { tabmgrState.tabs = []; tabmgrRenderList(); return; }
  try {
    const p = api.query({});
    if (p && typeof p.then === "function") {
      p.then(function (tabs) { tabmgrState.tabs = tabs || []; tabmgrRenderList(); }).catch(function () { tabmgrState.tabs = []; tabmgrRenderList(); });
    } else {
      api.query({}, function (tabs) { tabmgrState.tabs = tabs || []; tabmgrRenderList(); });
    }
  } catch (e) { tabmgrState.tabs = []; tabmgrRenderList(); }
}

function _tabmgrSortedFiltered() {
  const searchEl = document.getElementById("tabmgr-search");
  const q = (searchEl ? searchEl.value : tabmgrState.filter || "").trim().toLowerCase();
  let arr = !q ? tabmgrState.tabs.slice() : tabmgrState.tabs.filter(function (t) {
    return (t.title || "").toLowerCase().indexOf(q) !== -1 || (t.url || "").toLowerCase().indexOf(q) !== -1;
  });
  const s = tabmgrState.sort;
  arr.sort(function (a, b) {
    if (s === "title_asc") return (a.title || "").localeCompare(b.title || "");
    if (s === "title_desc") return (b.title || "").localeCompare(a.title || "");
    if (s === "url_asc") return (a.url || "").localeCompare(b.url || "");
    if (s === "domain") return _tabmgrDomain(a.url || "").localeCompare(_tabmgrDomain(b.url || ""));
    return 0;
  });
  return { list: arr, q: q };
}

function tabmgrRenderList() {
  const list = document.getElementById("tabmgr-list");
  const badge = document.getElementById("tabmgr-count-badge");
  const domainBadge = document.getElementById("tabmgr-domain-count");
  const discardBadge = document.getElementById("tabmgr-discard-count");
  const ramBadge = document.getElementById("tabmgr-ram-saved");
  if (badge) badge.textContent = String(tabmgrState.tabs.length);
  const discardedCount = tabmgrState.tabs.filter(function (t) { return t.discarded; }).length;
  if (discardBadge) discardBadge.textContent = String(discardedCount);
  if (ramBadge) {
    const savedMB = Math.round(discardedCount * 40);
    try {
      ramBadge.textContent = t("tabmgr_ram_saved_badge").replace("{0}", String(savedMB));
    } catch (e) {
      ramBadge.textContent = "~" + savedMB + " MB";
    }
  }
  if (domainBadge) {
    const domains = {};
    tabmgrState.tabs.forEach(function (t) { domains[_tabmgrDomain(t.url || "")] = true; });
    domainBadge.textContent = String(Object.keys(domains).length);
  }
  if (!list) return;
  while (list.firstChild) list.removeChild(list.firstChild);
  const res = _tabmgrSortedFiltered();
  const filtered = res.list;
  const q = res.q;
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-list-box";
    const icon = document.createElement("div");
    icon.className = "empty-list-icon";
    icon.textContent = "--";
    const title = document.createElement("div");
    title.className = "empty-list-title";
    title.textContent = q ? t("tabmgr_empty_search") : t("tabmgr_empty");
    empty.appendChild(icon);
    empty.appendChild(title);
    list.appendChild(empty);
    return;
  }
  const mode = tabmgrState.groupMode;
  if (mode !== "none") {
    const groups = {};
    filtered.forEach(function (tab) {
      const key = mode === "domain" ? _tabmgrDomain(tab.url || "") : _tabmgrFuncGroup(tab.url || "");
      if (!groups[key]) groups[key] = [];
      groups[key].push(tab);
    });
    Object.keys(groups).sort().forEach(function (key) {
      const header = document.createElement("div");
      header.className = "tabmgr-group-header";
      const isCollapsed = !!tabmgrState.collapsed[mode + ":" + key];
      const toggle = document.createElement("button");
      toggle.className = "tabmgr-group-toggle";
      toggle.textContent = isCollapsed ? "+" : "-";
      toggle.setAttribute("aria-label", isCollapsed ? "Expand" : "Collapse");
      toggle.addEventListener("click", function () { tabmgrState.collapsed[mode + ":" + key] = !isCollapsed; tabmgrRenderList(); });
      const name = document.createElement("span");
      name.className = "tabmgr-group-name";
      name.textContent = mode === "domain" ? key : _tabmgrFuncLabel(key);
      const cnt = document.createElement("span");
      cnt.className = "tabmgr-group-count";
      cnt.textContent = String(groups[key].length);
      header.appendChild(toggle);
      header.appendChild(name);
      header.appendChild(cnt);
      list.appendChild(header);
      if (!isCollapsed) {
        groups[key].forEach(function (tab) { list.appendChild(_tabmgrCreateCard(tab)); });
      }
    });
  } else {
    filtered.forEach(function (tab) { list.appendChild(_tabmgrCreateCard(tab)); });
  }
  tabmgrRenderSessions();
}

function _tabmgrCreateCard(tab) {
  const card = document.createElement("div");
  card.className = "tabmgr-card" + (tab.active ? " is-active" : "") + (tab.pinned ? " is-pinned" : "") + (tab.discarded ? " is-discarded" : "");
  const top = document.createElement("div");
  top.className = "tabmgr-card-top";
  const fav = document.createElement("img");
  fav.className = "tabmgr-favicon";
  const favUrl = tab.favIconUrl || "";
  fav.alt = "";
  fav.onerror = function () { fav.style.display = "none"; };
  if (favUrl.startsWith("chrome://")) {
    fav.style.display = "none";
  } else {
    fav.src = favUrl;
    if (!favUrl) fav.style.display = "none";
  }
  const titleEl = document.createElement("div");
  titleEl.className = "tabmgr-card-title";
  titleEl.textContent = tab.title || tab.url || "Untitled";
  titleEl.title = tab.url || "";
  const pinIcon = document.createElement("span");
  pinIcon.className = "tabmgr-pin-icon";
  if (tab.pinned) pinIcon.textContent = "PIN";
  const liveDot = document.createElement("span");
  liveDot.className = "tabmgr-live-dot";
  if (tab.active) {
    try { liveDot.textContent = t("tabmgr_status_live"); } catch (e) { liveDot.textContent = "LIVE"; }
  }
  const discardDot = document.createElement("span");
  discardDot.className = "tabmgr-discard-dot";
  if (tab.discarded) {
    try { discardDot.textContent = t("tabmgr_status_hibernated"); } catch (e) { discardDot.textContent = "SLEEP"; }
  }
  top.appendChild(fav);
  top.appendChild(titleEl);
  if (tab.active) top.appendChild(liveDot);
  if (tab.discarded) top.appendChild(discardDot);
  if (tab.pinned) top.appendChild(pinIcon);
  const urlEl = document.createElement("div");
  urlEl.className = "tabmgr-card-url";
  urlEl.textContent = tab.url || "";
  urlEl.title = tab.url || "";
  const actions = document.createElement("div");
  actions.className = "tabmgr-card-actions";
  const btnGo = document.createElement("button");
  btnGo.className = "tabmgr-action-btn";
  btnGo.title = t("tabmgr_act_go");
  btnGo.appendChild(_tabmgrSvg("M5 12h14M12 5l7 7-7 7"));
  btnGo.addEventListener("click", function () { tabmgrActivateTab(tab.id); });
  const btnPin = document.createElement("button");
  btnPin.className = "tabmgr-action-btn" + (tab.pinned ? " is-active" : "");
  btnPin.title = tab.pinned ? t("tabmgr_act_unpin") : t("tabmgr_act_pin");
  btnPin.appendChild(_tabmgrSvg("M12 17a5 5 0 0 0 5-5c0-2-1.5-3.5-3-5L12 5l-2 2c-1.5 1.5-3 3-3 5a5 5 0 0 0 5 5z"));
  btnPin.addEventListener("click", function () { tabmgrTogglePin(tab.id, !tab.pinned); });
  const btnBm = document.createElement("button");
  btnBm.className = "tabmgr-action-btn";
  btnBm.title = t("tabmgr_act_bookmark");
  btnBm.appendChild(_tabmgrSvg("M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"));
  btnBm.addEventListener("click", function () { tabmgrBookmarkTab(tab); });
  const btnDup = document.createElement("button");
  btnDup.className = "tabmgr-action-btn";
  btnDup.title = t("tabmgr_act_duplicate");
  btnDup.appendChild(_tabmgrSvgWithExtra([{ tag: "rect", attrs: { x: "9", y: "9", width: "13", height: "13", rx: "2" } }, { tag: "path", attrs: { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" } }]));
  btnDup.addEventListener("click", function () { tabmgrDuplicateTab(tab.id); });
  const btnMute = document.createElement("button");
  btnMute.className = "tabmgr-action-btn" + (tab.mutedInfo && tab.mutedInfo.muted ? " is-active" : "");
  btnMute.title = tab.mutedInfo && tab.mutedInfo.muted ? t("tabmgr_act_unmute") : t("tabmgr_act_mute");
  if (tab.mutedInfo && tab.mutedInfo.muted) btnMute.appendChild(_tabmgrSvg("M16 8l4 4M12 5v14M8 9H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h4l5 5V4l-5 5z"));
  else btnMute.appendChild(_tabmgrSvg("M11 5L6 9H2v6h4l5 5V5z"));
  btnMute.addEventListener("click", function () { tabmgrToggleMute(tab.id, !(tab.mutedInfo && tab.mutedInfo.muted)); });
  const btnDiscard = document.createElement("button");
  btnDiscard.className = "tabmgr-action-btn tabmgr-discard-btn";
  btnDiscard.title = t("tabmgr_act_discard");
  btnDiscard.appendChild(_tabmgrSvg("M10 9v6m4-6v6M3 7h18M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"));
  btnDiscard.addEventListener("click", function () { tabmgrDiscardTab(tab.id); });
  const btnClose = document.createElement("button");
  btnClose.className = "tabmgr-action-btn tabmgr-del-btn";
  btnClose.title = t("tabmgr_act_close");
  btnClose.appendChild(_tabmgrSvg("M18 6L6 18M6 6l12 12"));
  btnClose.addEventListener("click", function () { tabmgrCloseTab(tab.id); });
  actions.appendChild(btnGo);
  actions.appendChild(btnPin);
  actions.appendChild(btnBm);
  actions.appendChild(btnDup);
  actions.appendChild(btnMute);
  actions.appendChild(btnDiscard);
  actions.appendChild(btnClose);
  card.appendChild(top);
  card.appendChild(urlEl);
  card.appendChild(actions);
  card.addEventListener("click", function (e) {
    if (e.target.closest(".tabmgr-action-btn") || e.target.closest(".tabmgr-group-toggle")) return;
    tabmgrActivateTab(tab.id);
  });
  return card;
}

function tabmgrActivateTab(tabId) {
  const api = _getTabsApi();
  if (!api) return;
  try {
    if (api.update) {
      const p = api.update(tabId, { active: true });
      if (p && typeof p.then === "function") p.catch(function () {});
    }
    const t = tabmgrState.tabs.find(function (x) { return x.id === tabId; });
    if (t && t.windowId) {
      try { if (typeof chrome !== "undefined" && chrome.windows && chrome.windows.update) chrome.windows.update(t.windowId, { focused: true }); } catch (e) {}
      try { if (typeof browser !== "undefined" && browser.windows && browser.windows.update) browser.windows.update(t.windowId, { focused: true }); } catch (e2) {}
    }
  } catch (e) {}
}
function tabmgrTogglePin(tabId, pinned) {
  const api = _getTabsApi();
  if (!api || !api.update) return;
  try {
    const p = api.update(tabId, { pinned: pinned });
    if (p && typeof p.then === "function") p.then(function () { tabmgrLoadTabs(); showToast(pinned ? t("tabmgr_toast_pinned") : t("tabmgr_toast_unpinned")); }).catch(function () {});
    else api.update(tabId, { pinned: pinned }, function () { tabmgrLoadTabs(); showToast(pinned ? t("tabmgr_toast_pinned") : t("tabmgr_toast_unpinned")); });
  } catch (e) {}
}
function tabmgrBookmarkTab(tab) {
  const api = _getBookmarksApi();
  if (!api || !api.create) { showToast(t("tabmgr_toast_nobookmark_api")); return; }
  const url = tab.url || "";
  const title = tab.title || url;
  if (!url || url.indexOf("chrome" + "://") === 0 || url.indexOf("about" + ":") === 0 || url.indexOf("chrome-extension" + "://") === 0) {
    showToast(t("tabmgr_toast_bookmark_invalid")); return;
  }
  try {
    const doCreate = function () {
      const p = api.create({ title: title, url: url });
      if (p && typeof p.then === "function") p.then(function () { showToast(t("tabmgr_toast_bookmarked")); }).catch(function () { showToast(t("tabmgr_toast_bookmark_err")); });
      else api.create({ title: title, url: url }, function () { showToast(t("tabmgr_toast_bookmarked")); });
    };
    if (api.search) {
      const sp = api.search({ url: url });
      if (sp && typeof sp.then === "function") {
        sp.then(function (res) { if (res && res.length > 0) { showToast(t("tabmgr_toast_already_bookmarked")); return; } doCreate(); }).catch(function () { doCreate(); });
      } else { api.search({ url: url }, function (res) { if (res && res.length > 0) { showToast(t("tabmgr_toast_already_bookmarked")); return; } doCreate(); }); }
    } else { doCreate(); }
  } catch (e) { showToast(t("tabmgr_toast_bookmark_err")); }
}
function tabmgrCloseTab(tabId) {
  const api = _getTabsApi();
  if (!api || !api.remove) return;
  try {
    const p = api.remove(tabId);
    if (p && typeof p.then === "function") p.then(function () { tabmgrLoadTabs(); showToast(t("tabmgr_toast_closed")); }).catch(function () {});
    else api.remove(tabId, function () { tabmgrLoadTabs(); showToast(t("tabmgr_toast_closed")); });
  } catch (e) {}
}
function tabmgrDuplicateTab(tabId) {
  const api = _getTabsApi();
  if (!api) return;
  const tab = tabmgrState.tabs.find(function (x) { return x.id === tabId; });
  if (!tab || !tab.url) return;
  try {
    if (api.duplicate) {
      const p = api.duplicate(tabId);
      if (p && typeof p.then === "function") p.then(function () { setTimeout(tabmgrLoadTabs, 300); showToast(t("tabmgr_toast_duplicated")); }).catch(function () {});
      else api.duplicate(tabId, function () { setTimeout(tabmgrLoadTabs, 300); showToast(t("tabmgr_toast_duplicated")); });
    } else if (api.create) {
      const p2 = api.create({ url: tab.url, active: false });
      if (p2 && typeof p2.then === "function") p2.then(function () { setTimeout(tabmgrLoadTabs, 300); showToast(t("tabmgr_toast_duplicated")); }).catch(function () {});
      else api.create({ url: tab.url, active: false }, function () { setTimeout(tabmgrLoadTabs, 300); showToast(t("tabmgr_toast_duplicated")); });
    }
  } catch (e) {}
}
function tabmgrToggleMute(tabId, muted) {
  const api = _getTabsApi();
  if (!api || !api.update) return;
  try {
    const p = api.update(tabId, { muted: muted });
    if (p && typeof p.then === "function") p.then(function () { tabmgrLoadTabs(); }).catch(function () {});
    else api.update(tabId, { muted: muted }, function () { tabmgrLoadTabs(); });
  } catch (e) {}
}
function tabmgrDiscardTab(tabId) {
  const api = _getTabsApi();
  if (!api || !api.discard) { showToast(t("tabmgr_toast_no_discard_api")); return; }
  try {
    const p = api.discard(tabId);
    if (p && typeof p.then === "function") p.then(function () { tabmgrLoadTabs(); showToast(t("tabmgr_toast_discarded")); }).catch(function () { showToast(t("tabmgr_toast_discard_err")); });
    else api.discard(tabId, function () { tabmgrLoadTabs(); showToast(t("tabmgr_toast_discarded")); });
  } catch (e) { showToast(t("tabmgr_toast_discard_err")); }
}
function tabmgrCloseDuplicates() {
  const seen = {};
  const dupIds = [];
  tabmgrState.tabs.forEach(function (tab) {
    const u = (tab.url || "").trim();
    if (!u || u.indexOf("chrome" + "://") === 0 || u.indexOf("about" + ":") === 0) return;
    if (seen[u]) dupIds.push(tab.id);
    else seen[u] = true;
  });
  if (dupIds.length === 0) { showToast(t("tabmgr_toast_no_dup")); return; }
  const api = _getTabsApi();
  if (!api || !api.remove) return;
  try {
    const p = api.remove(dupIds);
    if (p && typeof p.then === "function") p.then(function () { tabmgrLoadTabs(); showToast(t("tabmgr_toast_dup_closed").replace("{0}", String(dupIds.length))); }).catch(function () {});
    else api.remove(dupIds, function () { tabmgrLoadTabs(); showToast(t("tabmgr_toast_dup_closed").replace("{0}", String(dupIds.length))); });
  } catch (e) {}
}
function tabmgrBookmarkAll() {
  const api = _getBookmarksApi();
  if (!api || !api.create) { showToast(t("tabmgr_toast_nobookmark_api")); return; }
  let count = 0;
  tabmgrState.tabs.forEach(function (tab) {
    const url = tab.url || "";
    if (!url || url.indexOf("chrome" + "://") === 0 || url.indexOf("about" + ":") === 0 || url.indexOf("chrome-extension" + "://") === 0) return;
    try { api.create({ title: tab.title || url, url: url }); count++; } catch (e2) {}
  });
  if (count > 0) showToast(t("tabmgr_toast_bookmark_all").replace("{0}", String(count)));
  else showToast(t("tabmgr_toast_bookmark_invalid"));
}
function tabmgrCloseAll() {
  const api = _getTabsApi();
  if (!api || !api.remove) return;
  const ids = tabmgrState.tabs.filter(function (t) { return !t.pinned; }).map(function (t) { return t.id; });
  if (ids.length === 0) { showToast(t("tabmgr_toast_no_close")); return; }
  try {
    const p = api.remove(ids);
    if (p && typeof p.then === "function") p.then(function () { tabmgrLoadTabs(); showToast(t("tabmgr_toast_closed_all").replace("{0}", String(ids.length))); }).catch(function () {});
    else api.remove(ids, function () { tabmgrLoadTabs(); showToast(t("tabmgr_toast_closed_all").replace("{0}", String(ids.length))); });
  } catch (e) {}
}
function tabmgrDiscardAll() {
  const api = _getTabsApi();
  if (!api || !api.discard) { showToast(t("tabmgr_toast_no_discard_api")); return; }
  const ids = tabmgrState.tabs.filter(function (t) { return !t.active && !t.pinned && !t.discarded; }).map(function (t) { return t.id; });
  if (ids.length === 0) { showToast(t("tabmgr_toast_no_discard")); return; }
  let done = 0;
  ids.forEach(function (id) {
    try {
      const p = api.discard(id);
      if (p && typeof p.then === "function") p.then(function () { done++; if (done === ids.length) { tabmgrLoadTabs(); showToast(t("tabmgr_toast_discard_all").replace("{0}", String(done))); } }).catch(function () {});
      else api.discard(id, function () { done++; if (done === ids.length) { tabmgrLoadTabs(); showToast(t("tabmgr_toast_discard_all").replace("{0}", String(done))); } });
    } catch (e2) {}
  });
  if (done === 0) setTimeout(function () { tabmgrLoadTabs(); }, 500);
}
function tabmgrOptimizeRam() {
  const api = _getTabsApi();
  if (!api || !api.discard) { showToast(t("tabmgr_toast_no_discard_api")); return; }
  const candidates = tabmgrState.tabs.filter(function (t) { return !t.active && !t.pinned && !t.discarded; });
  if (candidates.length === 0) { showToast(t("tabmgr_toast_no_discard")); return; }
  let done = 0;
  candidates.forEach(function (tab) {
    try {
      const p = api.discard(tab.id);
      if (p && typeof p.then === "function") {
        p.then(function () {
          done++;
          if (done === candidates.length) {
            tabmgrLoadTabs();
            const freedMB = done * 40;
            showToast(t("tabmgr_toast_ram_freed").replace("{0}", String(done)).replace("{1}", String(freedMB)));
          }
        }).catch(function () {});
      } else {
        api.discard(tab.id, function () {
          done++;
          if (done === candidates.length) {
            tabmgrLoadTabs();
            const freedMB = done * 40;
            showToast(t("tabmgr_toast_ram_freed").replace("{0}", String(done)).replace("{1}", String(freedMB)));
          }
        });
      }
    } catch (e) {}
  });
  if (done === 0) setTimeout(function () { tabmgrLoadTabs(); }, 500);
}
function tabmgrCloseBlankTabs() {
  const api = _getTabsApi();
  if (!api || !api.remove) return;
  const blankTabs = tabmgrState.tabs.filter(function (t) {
    const u = (t.url || "").trim().toLowerCase();
    const title = (t.title || "").trim().toLowerCase();
    return !t.pinned && (u === "about:blank" || u === "chrome://newtab/" || u === "edge://newtab/" || (u === "" && title === ""));
  });
  if (blankTabs.length === 0) { showToast(t("tabmgr_toast_no_blank")); return; }
  const ids = blankTabs.map(function (t) { return t.id; });
  try {
    const p = api.remove(ids);
    if (p && typeof p.then === "function") {
      p.then(function () {
        tabmgrLoadTabs();
        showToast(t("tabmgr_toast_blank_closed").replace("{0}", String(ids.length)));
      }).catch(function () {});
    } else {
      api.remove(ids, function () {
        tabmgrLoadTabs();
        showToast(t("tabmgr_toast_blank_closed").replace("{0}", String(ids.length)));
      });
    }
  } catch (e) {}
}
function tabmgrExportMd() {
  const res = _tabmgrSortedFiltered();
  const list = res.list;
  if (list.length === 0) { showToast(t("tabmgr_toast_no_export")); return; }
  const md = list.map(function (tab, i) { return (i + 1) + ". [" + (tab.title || "Untitled") + "](" + (tab.url || "") + ")"; }).join("\n");
  _tabmgrCopyText(md, "tabmgr_toast_exported");
}
function tabmgrExportTxt() {
  const res = _tabmgrSortedFiltered();
  const list = res.list;
  if (list.length === 0) { showToast(t("tabmgr_toast_no_export")); return; }
  const txt = list.map(function (tab) { return (tab.title || "Untitled") + " - " + (tab.url || ""); }).join("\n");
  _tabmgrCopyText(txt, "tabmgr_toast_exported");
}
function _tabmgrCopyText(text, toastKey) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast(t(toastKey)); }).catch(function () { _tabmgrFallbackCopy(text, toastKey); });
    } else { _tabmgrFallbackCopy(text, toastKey); }
  } catch (e) { _tabmgrFallbackCopy(text, toastKey); }
}
function _tabmgrFallbackCopy(text, toastKey) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast(t(toastKey));
  } catch (e2) { showToast(t("tabmgr_toast_export_err")); }
}
function tabmgrGroupInBrowser() {
  const tabsApi = _getTabsApi();
  const canGroup = tabsApi && tabsApi.group;
  const groupApi = (function () {
    try {
      if (typeof chrome !== "undefined" && chrome.tabGroups) return chrome.tabGroups;
      if (typeof browser !== "undefined" && browser.tabGroups) return browser.tabGroups;
    } catch (e2) {}
    return null;
  })();
  if (!canGroup || !groupApi) { showToast(t("tabmgr_toast_no_group_api")); return; }
  const mode = tabmgrState.groupMode;
  if (mode === "none") { showToast(t("tabmgr_toast_group_need_mode")); return; }
  const res = _tabmgrSortedFiltered();
  const list = res.list.filter(function (t) { return t.url && t.url.indexOf("chrome" + "://") !== 0 && t.url.indexOf("about" + ":") !== 0; });
  if (list.length === 0) { showToast(t("tabmgr_toast_no_export")); return; }
  const groups = {};
  list.forEach(function (tab) {
    const key = mode === "domain" ? _tabmgrDomain(tab.url || "") : _tabmgrFuncGroup(tab.url || "");
    if (!groups[key]) groups[key] = [];
    groups[key].push(tab.id);
  });
  const colorMap = { academic: "blue", video: "red", docs: "yellow", code: "green", social: "pink", other: "grey" };
  let done = 0;
  const keys = Object.keys(groups);
  if (keys.length === 0) { showToast(t("tabmgr_toast_no_group_api")); return; }
  keys.forEach(function (key) {
    const ids = groups[key];
    if (!ids || ids.length < 2) { done++; if (done === keys.length) showToast(t("tabmgr_toast_grouped").replace("{0}", String(keys.length))); return; }
    try {
      const p = tabsApi.group({ tabIds: ids });
      const applyGroup = function (gid) {
        try {
          const title = mode === "domain" ? key : _tabmgrFuncLabel(key);
          const color = colorMap[key] || "grey";
          if (groupApi.update) {
            const up = groupApi.update(gid, { title: title, color: color, collapsed: false });
            if (up && typeof up.then === "function") up.catch(function () {});
          }
        } catch (e3) {}
        done++;
        if (done === keys.length) showToast(t("tabmgr_toast_grouped").replace("{0}", String(keys.length)));
      };
      if (p && typeof p.then === "function") p.then(applyGroup).catch(function () { done++; });
      else tabsApi.group({ tabIds: ids }, applyGroup);
    } catch (e4) { done++; }
  });
}

// Sessions
function tabmgrLoadSessions() {
  try {
    storGet("sf_tabmgr_sessions", function (res) {
      tabmgrSessions = (res && res.sf_tabmgr_sessions) || [];
      tabmgrRenderSessions();
    });
  } catch (e) { tabmgrSessions = []; }
}
function tabmgrSaveSession() {
  const input = document.getElementById("tabmgr-session-name");
  const name = input ? input.value.trim() : "";
  if (!name) { showToast(t("tabmgr_toast_session_name_req")); return; }
  const tabs = tabmgrState.tabs.map(function (tab) { return { title: tab.title || "", url: tab.url || "" }; }).filter(function (x) { return x.url; });
  if (tabs.length === 0) { showToast(t("tabmgr_toast_no_export")); return; }
  const sess = { id: String(Date.now()), name: name, tabs: tabs, createdAt: new Date().toISOString() };
  tabmgrSessions.unshift(sess);
  try { storSet({ sf_tabmgr_sessions: tabmgrSessions }, function () { tabmgrRenderSessions(); showToast(t("tabmgr_toast_session_saved")); if (input) input.value = ""; }); } catch (e) {}
}
function tabmgrRestoreSession(id) {
  const sess = tabmgrSessions.find(function (s) { return s.id === id; });
  if (!sess || !sess.tabs) return;
  const api = _getTabsApi();
  if (!api || !api.create) return;
  sess.tabs.forEach(function (tab) {
    try {
      const p = api.create({ url: tab.url, active: false });
      if (p && typeof p.then === "function") p.catch(function () {});
    } catch (e2) {}
  });
  showToast(t("tabmgr_toast_session_restored").replace("{0}", String(sess.tabs.length)));
  setTimeout(tabmgrLoadTabs, 800);
}
function tabmgrDeleteSession(id) {
  tabmgrSessions = tabmgrSessions.filter(function (s) { return s.id !== id; });
  try { storSet({ sf_tabmgr_sessions: tabmgrSessions }, function () { tabmgrRenderSessions(); showToast(t("tabmgr_toast_session_deleted")); }); } catch (e) {}
}
function tabmgrRenderSessions() {
  const box = document.getElementById("tabmgr-session-list");
  if (!box) return;
  while (box.firstChild) box.removeChild(box.firstChild);
  if (!tabmgrSessions || tabmgrSessions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "tabmgr-session-empty";
    empty.textContent = t("tabmgr_session_empty");
    box.appendChild(empty);
    return;
  }
  tabmgrSessions.forEach(function (sess) {
    const row = document.createElement("div");
    row.className = "tabmgr-session-row";
    const info = document.createElement("div");
    info.className = "tabmgr-session-info";
    const nameEl = document.createElement("div");
    nameEl.className = "tabmgr-session-name";
    nameEl.textContent = sess.name;
    const meta = document.createElement("div");
    meta.className = "tabmgr-session-meta";
    meta.textContent = sess.tabs.length + " tabs • " + (sess.createdAt || "").slice(0, 10);
    info.appendChild(nameEl);
    info.appendChild(meta);
    const actions = document.createElement("div");
    actions.className = "tabmgr-session-actions";
    const btnRestore = document.createElement("button");
    btnRestore.className = "tabmgr-session-btn";
    btnRestore.textContent = t("tabmgr_btn_restore");
    btnRestore.addEventListener("click", function () { tabmgrRestoreSession(sess.id); });
    const btnDel = document.createElement("button");
    btnDel.className = "tabmgr-session-btn tabmgr-session-del";
    btnDel.textContent = "x";
    btnDel.title = t("tabmgr_btn_delete");
    btnDel.addEventListener("click", function () { tabmgrDeleteSession(sess.id); });
    actions.appendChild(btnRestore);
    actions.appendChild(btnDel);
    row.appendChild(info);
    row.appendChild(actions);
    box.appendChild(row);
  });
}

// ==========================================================================
// Music Player Banner: now-playing across audible tabs (local media agent)
// ==========================================================================
const TABMGR_MEDIA_KEY = "sf_tabmgr_media_player";
let tabmgrMedia = {
  enabled: true,
  checking: false,
  sources: [],
  known: {},
  index: 0,
  sourceTabId: 0,
  sourceTab: null,
  state: null,
  dragging: false,
  lastPlay: null,
  signature: "",
  wheelAt: 0,
  timer: null,
  evPending: false
};

function _tabmgrMediaFmt(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ":" + (r < 10 ? "0" : "") + r;
}

function _tabmgrMediaPct(v, max) {
  const m = Number(max) || 1;
  const val = Number(v) || 0;
  return String(Math.max(0, Math.min(100, (val / m) * 100)));
}

// Digital (video-player style) clock text: 00:42 / 01:40, zero-padded minutes.
function _tabmgrMediaFmtDigital(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = (m < 10 ? "0" : "") + m;
  const ss = (r < 10 ? "0" : "") + r;
  return (h ? h + ":" + mm : mm) + ":" + ss;
}

// Push state into the video-style progress bar (--e elapsed, overlay time text).
function _tabmgrMediaSeekUI(vpb, timeEl, current, duration, live, liveStart) {
  if (live) {
    // Live stream: the track has no finite duration, so the bar is permanently
    // FULL RED and the time text becomes a pulsing LIVE badge — or, when the
    // stream start (getStartDate) is known, the stream's real elapsed time.
    const ct = Math.max(0, Math.round(Number(current) || 0));
    if (vpb) {
      vpb.classList.add("is-live");
      vpb.style.setProperty("--e", "100%");
      vpb.setAttribute("aria-valuemax", "0");
      vpb.setAttribute("aria-valuenow", String(ct));
    }
    if (timeEl) {
      const start = Number(liveStart) || 0;
      if (start > 0) {
        const elapsed = Math.max(0, Math.round((Date.now() - start) / 1000));
        timeEl.textContent = "● " + _tabmgrMediaFmtDigital(elapsed);
      } else {
        timeEl.textContent = t("tabmgr_media_live");
      }
    }
    return;
  }
  if (vpb) vpb.classList.remove("is-live");
  const maxD = Math.max(1, Math.round(Number(duration) || 0));
  const ct = Math.max(0, Math.round(Number(current) || 0));
  if (vpb) {
    vpb.style.setProperty("--e", _tabmgrMediaPct(ct, maxD) + "%");
    vpb.setAttribute("aria-valuemax", String(maxD));
    vpb.setAttribute("aria-valuenow", String(ct));
  }
  if (timeEl) timeEl.textContent = _tabmgrMediaFmtDigital(ct) + " / " + _tabmgrMediaFmtDigital(maxD);
}

function _tabmgrMediaIsLive(state) {
  return !!(state && state.isLive);
}

// Baseline for the live clock: the last authoritative (polled / seeked) position.
// Between polls the rAF loop extrapolates this forward in realtime so the red bar
// glides smoothly instead of teleporting every ~900ms (which read as lag).
function _tabmgrMediaSeekSetBase(vpb, current, duration, playing, live, liveStart) {
  if (!vpb) return;
  const maxD = live ? 0 : Math.max(1, Math.round(Number(duration) || 0));
  const ct = Math.max(0, Number(current) || 0);
  vpb._sfBase = { at: Date.now(), time: ct, dur: maxD, play: !!playing, live: !!live, liveAt: Number(liveStart) || 0 };
}

let _tabmgrMediaRafOn = false;
let _tabmgrMediaRafId = 0;

function _tabmgrMediaSeekStart() {
  if (_tabmgrMediaRafOn) return;
  if (typeof requestAnimationFrame !== "function") return;
  _tabmgrMediaRafOn = true;
  function step() {
    if (!_tabmgrMediaRafOn) return;
    _tabmgrMediaSeekTick();
    _tabmgrMediaRafId = requestAnimationFrame(step);
  }
  _tabmgrMediaRafId = requestAnimationFrame(step);
}

function _tabmgrMediaSeekStop() {
  _tabmgrMediaRafOn = false;
  if (typeof cancelAnimationFrame === "function" && _tabmgrMediaRafId) {
    try { cancelAnimationFrame(_tabmgrMediaRafId); } catch (e) {}
  }
}

// Live clock: advance --e and the time text continuously while playing, without
  // waiting for the next poll. Skip while dragging (the drag UI owns the bar) and
  // while the sidebar is hidden (avoid a wall-clock jump that overshoots audio).
function _tabmgrMediaSeekTick() {
  if (tabmgrMedia.dragging || document.hidden) return;
  const mp = document.querySelector("#tabmgr-media-body .tabmgr-mp");
  const vpb = mp && mp.querySelector(".tabmgr-vpb");
  if (!vpb) return;
  const b = vpb._sfBase;
  if (!b) return;
  const timeEl = mp.querySelector(".tabmgr-vpb-time");
  // Live with a known broadcast start: paint the elapsed stream time once per
  // second straight off the wall clock (buffered-media currentTime is clamped).
  if (b.live && Number(b.liveAt) > 0) {
    const sec = Math.max(0, Math.round((Date.now() - Number(b.liveAt)) / 1000));
    if (vpb._sfLast === sec) return;
    vpb._sfLast = sec;
    _tabmgrMediaSeekUI(vpb, timeEl, sec, 0, true, b.liveAt);
    return;
  }
  let ct = b.time;
  if (b.play) {
    ct = b.time + Math.max(0, (Date.now() - b.at) / 1000);
    if (!b.live && ct > b.dur) ct = b.dur;
  }
  const cur = Math.round(ct);
  if (vpb._sfLast === cur) return;
  vpb._sfLast = cur;
  _tabmgrMediaSeekUI(vpb, timeEl, cur, b.live ? 0 : b.dur, !!b.live, b.liveAt);
}

// Build the Video Playback Progress Bar (slim):
//   black pill container -> single red elapsed track (--e).
//   Time text is an OVERLAY (always visible, never clipped by the red width);
//   the playhead dot is a child of the red track and floats above its right edge.
// Dragging: pointer down/move scales clientX to seconds; seek is committed on
// pointerup. Keyboard (Left/Right/Home/End) keeps it accessible.
function _tabmgrMediaSeekEl(state) {
  const seek = document.createElement("div");
  seek.className = "tabmgr-mp-seek";

  const vpb = document.createElement("div");
  vpb.className = "tabmgr-vpb";
  vpb.tabIndex = 0;
  vpb.setAttribute("role", "slider");
  vpb.setAttribute("aria-label", t("tabmgr_media_seek"));
  vpb.setAttribute("aria-valuemin", "0");

  const elapsed = document.createElement("div");
  elapsed.className = "tabmgr-vpb-elapsed";
  // The playhead is a CHILD of the elapsed layer so it always tracks the right
  // edge of the red track (left:100%), independent of any other layer.
  const playhead = document.createElement("div");
  playhead.className = "tabmgr-vpb-playhead";
  elapsed.appendChild(playhead);

  const timeEl = document.createElement("span");
  timeEl.className = "tabmgr-vpb-time";

  vpb.appendChild(elapsed);
  vpb.appendChild(timeEl);
  seek.appendChild(vpb);

  const liveStart = (state && Number(state.liveStart)) || 0;
  _tabmgrMediaSeekUI(vpb, timeEl, state.currentTime, state.duration, _tabmgrMediaIsLive(state), liveStart);
  _tabmgrMediaSeekSetBase(vpb, state.currentTime, state.duration, !!state.playing, _tabmgrMediaIsLive(state), liveStart);
  _tabmgrMediaSeekStart();

  const live = _tabmgrMediaIsLive(state);
  const seekFromPointer = function (clientX) {
    if (live) return;
    const rect = vpb.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const target = Math.round(ratio * Math.max(1, Math.round(Number(state.duration) || 0)));
    tabmgrMedia.dragTime = target;
    _tabmgrMediaSeekUI(vpb, timeEl, target, state.duration, false, 0);
  };

  vpb.addEventListener("pointerdown", function (e) {
    if (live) return;
    tabmgrMedia.dragging = true;
    tabmgrMedia.dragTime = null;
    vpb.classList.add("is-dragging");
    seekFromPointer(e.clientX);
    if (vpb.setPointerCapture) { try { vpb.setPointerCapture(e.pointerId); } catch (err) {} }
  });
  vpb.addEventListener("pointermove", function (e) {
    if (tabmgrMedia.dragging) seekFromPointer(e.clientX);
  });
  const endSeek = function () {
    if (!tabmgrMedia.dragging) return;
    tabmgrMedia.dragging = false;
    vpb.classList.remove("is-dragging");
    if (tabmgrMedia.dragTime != null && tabmgrMedia.state) {
      // Repoint the live clock at the released position so the bar continues
      // smoothly from the drag point instead of snapping back to the stale poll.
      _tabmgrMediaSeekSetBase(vpb, tabmgrMedia.dragTime, state.duration, !!state.playing, live, 0);
      safeSendTabMessage(tabmgrMedia.sourceTabId, { action: "MEDIA_SEEK", time: tabmgrMedia.dragTime });
    }
    // dragTime is only a mid-gesture anchor. Left set, it would outlive the
    // drag and become the stale base for later keyboard seeks.
    tabmgrMedia.dragTime = null;
  };
  vpb.addEventListener("pointerup", endSeek);
  vpb.addEventListener("pointercancel", endSeek);

  vpb.addEventListener("keydown", function (e) {
    if (live) return;
    const stepp = (e.shiftKey ? 10 : 5);
    // Base = the position the user actually SEES: the mid-drag anchor if a
    // gesture is live, otherwise the extrapolated live clock (_sfBase is
    // refreshed by every poll). The render-time `state.currentTime` closure is
    // frozen at build time and made arrow keys jump back to it.
    const b = vpb._sfBase;
    let base;
    if (tabmgrMedia.dragTime != null) {
      base = tabmgrMedia.dragTime;
    } else if (b) {
      base = b.play ? b.time + Math.max(0, (Date.now() - b.at) / 1000) : b.time;
      if (base > b.dur) base = b.dur;
    } else {
      base = (tabmgrMedia.state && tabmgrMedia.state.currentTime) || 0;
    }
    base = Math.round(base);
    const maxD = Math.max(1, Math.round((b && b.dur) || state.duration || 0));
    let next = null;
    if (e.key === "ArrowRight") next = base + stepp;
    else if (e.key === "ArrowLeft") next = base - stepp;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = maxD;
    if (next == null) return;
    e.preventDefault();
    next = Math.max(0, Math.min(maxD, next));
    _tabmgrMediaSeekUI(vpb, timeEl, next, maxD, false, 0);
    _tabmgrMediaSeekSetBase(vpb, next, maxD, !!(state && state.playing), false, 0);
    safeSendTabMessage(tabmgrMedia.sourceTabId, { action: "MEDIA_SEEK", time: next });
  });

  return seek;
}

function _tabmgrMediaSignature(tab, state) {
  return (tab ? tab.id : 0) + "|" + (state ? state.title : "") + "|" + (state ? state.artist : "") + "|" + (state ? state.duration : 0) + "|" + (state ? state.playing : false) + "|" + _tabmgrMediaArtWork(state) + "|#" + tabmgrMedia.index + "|Q" + ((tabmgrMedia.sources || []).length) + "|L" + (state ? ((state.isLive ? 1 : 0) + ":" + (Number(state.liveStart) || 0)) : "0:0") + "|V" + (state ? ((state.isVideo ? 1 : 0) + ":" + (state.pip ? 1 : 0) + ":" + (state.pipSupported ? 1 : 0)) : "0:0:0");
}

// Poster flicker guard: reuse the same <img> element per artwork URL across
// re-renders so a queue change (new tab starts playing) doesn't re-decode and
// flash the artwork. A single shared node is moved with appendChild, not rebuilt.
const _tabmgrMediaArtCache = {};
function _tabmgrMediaArtEl(artwork) {
  const cached = artwork && _tabmgrMediaArtCache[artwork];
  if (cached && !cached._bad) {
    cached.setAttribute("src", artwork);
    return cached;
  }
  const img = document.createElement("img");
  img.className = "tabmgr-mp-art";
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  img.referrerPolicy = "no-referrer";
  img.src = artwork;
  img.addEventListener("error", function () {
    img._bad = true;
    if (artwork) delete _tabmgrMediaArtCache[artwork];
    const cover = img.closest ? img.closest(".tabmgr-mp-cover") : null;
    if (cover) cover.classList.remove("is-artwork");
    try { if (img.parentNode) img.parentNode.removeChild(img); } catch (e) {}
  });
  if (artwork) _tabmgrMediaArtCache[artwork] = img;
  return img;
}

function _tabmgrMediaArtWork(state) {
  const a = state && state.artwork ? String(state.artwork) : "";
  return /^(https?:|data:image\/)/.test(a) ? a : "";
}

function _tabmgrMediaBox() { return document.getElementById("tabmgr-media"); }
function _tabmgrMediaBody() { return document.getElementById("tabmgr-media-body"); }
function _tabmgrMediaClear(child) { while (child && child.firstChild) child.removeChild(child.firstChild); }

function _tabmgrMediaTitleText(tab, state) {
  if (state) {
    const ttl = (state.title || "").trim();
    if (ttl) return ttl;
    return t("tabmgr_media_unknown");
  }
  return (tab && tab.title) ? tab.title : t("tabmgr_media_unknown");
}

function _tabmgrMediaArtistText(tab, state) {
  const artist = state && state.artist ? state.artist.trim() : "";
  if (artist) return artist;
  const dom = tab && tab.url ? _tabmgrDomain(tab.url) : "";
  return dom || " ";
}

function _tabmgrMediaApplyUI() {
  const box = _tabmgrMediaBox();
  if (!box) return;
  box.classList.toggle("is-off", !tabmgrMedia.enabled);
  const check = document.getElementById("tabmgr-media-check");
  if (check) check.checked = tabmgrMedia.enabled;
  const lab = box.querySelector(".tabmgr-media-switch");
  const titleKey = tabmgrMedia.enabled ? "tabmgr_media_toggle_hide" : "tabmgr_media_toggle_show";
  if (lab) {
    const msg = t(titleKey);
    lab.setAttribute("title", msg);
    lab.setAttribute("data-i18n-title", titleKey);
  }
  if (!tabmgrMedia.enabled) _tabmgrMediaClear(_tabmgrMediaBody());
}

function tabmgrMediaGetPref() { return tabmgrMedia.enabled; }

function tabmgrMediaSetPref(enabled) {
  tabmgrMedia.enabled = !!enabled;
  storSet({ sf_tabmgr_media_player: tabmgrMedia.enabled });
  tabmgrMedia.signature = "";
  _tabmgrMediaApplyUI();
  if (tabmgrMedia.enabled) _tabmgrMediaPoll();
  else _tabmgrMediaStop();
}

function _tabmgrMediaSchedule(ms) {
  _tabmgrMediaStop();
  tabmgrMedia.timer = setTimeout(function () {
    tabmgrMedia.timer = null;
    _tabmgrMediaPoll();
  }, ms);
}

function _tabmgrMediaStop() {
  if (tabmgrMedia.timer) { clearTimeout(tabmgrMedia.timer); tabmgrMedia.timer = null; }
}

function _tabmgrMediaQueryAudible() {
  const api = _getTabsApi();
  if (!api || !api.query) return Promise.resolve([]);
  return new Promise(function (resolve) {
    let settled = false;
    const done = function (tbs) { if (!settled) { settled = true; resolve(tbs || []); } };
    try {
      const p = api.query({ audible: true });
      if (p && typeof p.then === "function") p.then(done).catch(function () { done([]); });
      else api.query({ audible: true }, done);
    } catch (e) { done([]); }
    setTimeout(function () { done([]); }, 1500);
  });
}

function tabmgrMediaRefresh() {
  _tabmgrMediaPoll();
}

async function _tabmgrMediaPoll() {
  const box = _tabmgrMediaBox();
  if (!box || !tabmgrMedia.enabled || document.hidden) return;
  if (tabmgrMedia.checking) return;
  tabmgrMedia.checking = true;
  try {
    const audible = await _tabmgrMediaQueryAudible();
    const full = [];
    const titled = [];
    const limit = Math.min(audible.length, 6);
    for (let i = 0; i < limit; i++) {
      const tab = audible[i];
      if (!tab || tab.discarded || !tab.id) continue;
      titled.push(tab);
      try {
        const res = await safeSendTabMessage(tab.id, { action: "MEDIA_GET_STATE" }, 600);
        if (res && res.ok && res.state && res.state.hasMedia) {
          full.push({ tab: tab, state: res.state });
        }
      } catch (e) {}
    }
    const playingSrc = full.filter(function (c) { return c.state.playing; });
    const ordered = [];
    const seen = {};
    playingSrc.forEach(function (c) { if (!seen[c.tab.id]) { seen[c.tab.id] = 1; ordered.push(c); } });
    full.forEach(function (c) { if (!seen[c.tab.id]) { seen[c.tab.id] = 1; ordered.push(c); } });
    titled.forEach(function (tab) { if (!seen[tab.id]) { seen[tab.id] = 1; ordered.push({ tab: tab, state: null }); } });

    // Sticky queue: a tab that briefly stops being "audible" (pause, mute blip,
    // buffer gap) stays in the carousel for a grace period instead of vanishing
    // mid-session and collapsing the prev/next controls.
    const now = Date.now();
    const KNOWN_TTL = 20000;
    const known = tabmgrMedia.known || (tabmgrMedia.known = {});
    const merged = ordered.slice();
    Object.keys(known).forEach(function (id) {
      const k = known[id];
      if (now - k.ts >= KNOWN_TTL) { delete known[id]; return; }
      if (!seen[id]) {
        seen[id] = 1;
        merged.push({ tab: k.tab, state: k.state });
      }
    });
    ordered.forEach(function (c) { if (c.state) known[c.tab.id] = { ts: now, tab: c.tab, state: c.state }; });
    if (merged.length > 6) merged.length = 6;

    if (merged.length === 0) {
      tabmgrMedia.sources = [];
      tabmgrMedia.index = 0;
      tabmgrMedia.sourceTabId = 0;
      tabmgrMedia.sourceTab = null;
      tabmgrMedia.state = null;
      _tabmgrMediaRenderEmpty();
      _tabmgrMediaSchedule(4000);
      return;
    }

    const prevId = tabmgrMedia.sourceTabId;
    let keptIndex = tabmgrMedia.index;
    const stillThere = tabmgrMedia.sources.findIndex(function (c) { return c.tab.id === prevId; });
    if (stillThere < 0) {
      keptIndex = Math.min(tabmgrMedia.index, merged.length - 1);
      keptIndex = Math.max(0, keptIndex);
    }
    tabmgrMedia.sources = merged;
    tabmgrMedia.index = Math.min(keptIndex, merged.length - 1);
    _tabmgrMediaApplyIndex();

    const source = { tab: tabmgrMedia.sourceTab, state: tabmgrMedia.state };
    const sig = _tabmgrMediaSignature(source.tab, source.state);
    if (tabmgrMedia.signature !== sig) {
      tabmgrMedia.signature = sig;
      tabmgrMedia.lastPlay = null;
      _tabmgrMediaRenderPlayer();
    } else {
      _tabmgrMediaPatchPlayer();
    }
    const interval = (tabmgrMedia.state && tabmgrMedia.state.playing) ? 900 : 2000;
    _tabmgrMediaSchedule(interval);
  } catch (e) {
    _tabmgrMediaSchedule(4000);
  } finally {
    tabmgrMedia.checking = false;
  }
}

function _tabmgrMediaApplyIndex() {
  const list = tabmgrMedia.sources || [];
  if (!list.length) {
    tabmgrMedia.sourceTabId = 0;
    tabmgrMedia.sourceTab = null;
    tabmgrMedia.state = null;
    return;
  }
  let idx = tabmgrMedia.index;
  if (idx < 0 || idx >= list.length) idx = 0;
  tabmgrMedia.index = idx;
  const cur = list[idx];
  tabmgrMedia.sourceTabId = cur.tab.id;
  tabmgrMedia.sourceTab = cur.tab;
  tabmgrMedia.state = cur.state;
}

function _tabmgrMediaIsMulti() {
  return (tabmgrMedia.sources || []).length > 1;
}

function _tabmgrMediaStep(dir) {
  const n = (tabmgrMedia.sources || []).length;
  if (n < 2) return;
  tabmgrMedia.index = (tabmgrMedia.index + dir + n) % n;
  _tabmgrMediaApplyIndex();
  tabmgrMedia.signature = "";
  tabmgrMedia.lastPlay = null;
  _tabmgrMediaRenderPlayer();
}

// Track-skip: prev/next buttons ask the CURRENT playing tab to change track on
// its own page (site's next/prev control, via MEDIA_SKIP). The tab queue itself
// is only rotated by the sleeve click / wheel / counter, never by these buttons.
function _tabmgrMediaSkip(dir) {
  const tabId = tabmgrMedia.sourceTabId;
  if (!tabId) return;
  safeSendTabMessage(tabId, { action: "MEDIA_SKIP", dir: dir }).then(function (res) {
    if (res && res.state) {
      tabmgrMedia.state = res.state;
      tabmgrMedia.signature = "";
      tabmgrMedia.lastPlay = null;
      _tabmgrMediaPoll();
    }
  }).catch(function () {});
}

// Jump straight to a queued tab (used by the stacked-cover cards on hover/click).
function _tabmgrMediaStepTo(idx) {
  const n = (tabmgrMedia.sources || []).length;
  if (n < 2 || idx < 0 || idx >= n || idx === tabmgrMedia.index) return;
  if (tabmgrMedia.stepToAt > Date.now() - 220) return;
  tabmgrMedia.stepToAt = Date.now();
  tabmgrMedia.index = idx;
  _tabmgrMediaApplyIndex();
  tabmgrMedia.signature = "";
  tabmgrMedia.lastPlay = null;
  _tabmgrMediaRenderPlayer();
}

// Multi-source sleeve: stack the queued tabs as overlapping poster cards (front =
// current tab). Hover fans them out in 3D; previewed cards keep their FIXED
// --fan offsets (only z-order/highlight changes), so sweeping across the deck is
// stable; a click is what actually switches the tab. A position pill (1/2) rides
// on the sleeve. The fan opens via a debounced .is-open class so micro-crossings
// along the rim cannot flap it open/closed.
function _tabmgrMediaCoverStack(cover) {
  const sources = tabmgrMedia.sources || [];
  const n = sources.length;
  if (n < 2) return;
  const maxCards = Math.min(n, 4);
  // Front card = current tab; the cards BEHIND follow the queue FORWARD from the
  // current source (current, next, next-after, ... wrapping) so the fanned deck
  // reads left-to-right as "now -> next", matching the sleeve-front click which
  // also advances. Old code stacked them by ascending (chronological) index,
  // which put an OLDER tab directly to the right of the poster — a click there
  // yanked the player backwards. Now the deck is rotation-consistent.
  const show = [tabmgrMedia.index];
  for (let k = 1; k < maxCards && k < n; k++) {
    show.push((tabmgrMedia.index + k) % n);
  }
  show.forEach(function (qidx, pos) {
    const c = sources[qidx];
    const art = _tabmgrMediaArtWork(c.state);
    const card = document.createElement("div");
    card.className = "tabmgr-mp-card" + (pos === 0 ? " is-front" : " is-behind");
    card.dataset.idx = String(qidx);
    card.style.setProperty("--fan", String(pos));
    const title = (c.state && c.state.title) ? String(c.state.title)
      : (c.tab && c.tab.title) ? String(c.tab.title) : "";
    card.title = title || " ";
    if (art) {
      card.appendChild(_tabmgrMediaArtEl(art));
    } else {
      const ph = document.createElement("span");
      ph.className = "tabmgr-mp-card-ph";
      ph.textContent = (title || "?").charAt(0).toUpperCase();
      card.appendChild(ph);
    }
    card.addEventListener("click", function (ev) {
      ev.stopPropagation();
      if (pos === 0) _tabmgrMediaStep(1);
      else _tabmgrMediaStepTo(qidx);
    });
    if (pos > 0) {
      // Hover only PREVIEWS the hovered card's title (no re-render, no movement);
      // a click is what actually switches the tab.
      card.addEventListener("pointerenter", function () {
        _tabmgrMediaPreviewTo(qidx, title);
      });
    }
    cover.appendChild(card);
  });

  // Visual fan: opens on enter, closes only after leaving for 130ms (debounce).
  // Fresh-mount lock: after a re-render (user clicked a card / stepped the queue)
  // the rebuilt cover sits exactly where the cursor is, so pointerenter would
  // re-fire instantly and replay the fan-open animation — a visible "blink".
  // Lock the fan for a beat on mount and suppress card transitions meanwhile so
  // the new deck appears settled; the fan only reopens on a real leave/re-enter.
  cover.classList.add("is-mounting");
  cover._mpOpenLock = true;
  setTimeout(function () {
    cover._mpOpenLock = false;
    cover.classList.remove("is-mounting");
  }, 260);
  cover.addEventListener("pointerenter", function () {
    if (cover._mpOpenLock) return;
    cover.classList.add("is-open");
  });
  cover.addEventListener("pointerleave", function () {
    clearTimeout(cover._mpCloseT);
    cover._mpCloseT = setTimeout(function () {
      if (cover.matches(":hover")) return;
      cover.classList.remove("is-open");
      _tabmgrMediaPreviewReset();
    }, 130);
  });

  const badge = document.createElement("button");
  badge.type = "button";
  badge.className = "tabmgr-mp-count";
  badge.title = t("tabmgr_media_list");
  badge.textContent = (tabmgrMedia.index + 1) + "/" + n;
  badge.addEventListener("click", function (ev) {
    ev.stopPropagation();
    _tabmgrMediaStep(1);
  });
  cover.appendChild(badge);
}

// Open the fan + preview the hovered card's title. Purely cosmetic: cards never
// move and tabmgrMedia.index is untouched (no render, no thrash).
function _tabmgrMediaPreviewTo(qidx, title) {
  const cover = _tabmgrMediaCoverEl();
  if (cover) cover.classList.add("is-open");
  const titleEl = _tabmgrMediaTitleEl();
  if (titleEl) {
    titleEl.textContent = title || " ";
    titleEl.classList.add("is-preview");
  }
}

// Collapse the fan and restore the committed tab's real title.
function _tabmgrMediaPreviewReset() {
  const cover = _tabmgrMediaCoverEl();
  if (cover) cover.classList.remove("is-open");
  const titleEl = _tabmgrMediaTitleEl();
  if (titleEl) {
    // Read the live source directly: `known` only caches tabs that reported
    // agent state, so audible-but-stateless tabs fell back to "Unknown" here.
    titleEl.textContent = _tabmgrMediaTitleText(tabmgrMedia.sourceTab, tabmgrMedia.state);
    titleEl.classList.remove("is-preview");
  }
}

function _tabmgrMediaCoverEl() {
  const mp = document.querySelector(".tabmgr-mp");
  return mp ? mp.querySelector(".tabmgr-mp-cover") : null;
}

function _tabmgrMediaTitleEl() {
  const mp = document.querySelector(".tabmgr-mp");
  if (!mp) return null;
  const info = mp.querySelector(".tabmgr-mp-info");
  return info ? info.querySelector(".tabmgr-mp-title") : null;
}

function _tabmgrMediaOnWheel(n) {
  if (tabmgrMedia.wheelAt > Date.now() - 240) return;
  tabmgrMedia.wheelAt = Date.now();
  const step = n > 0 ? 1 : -1;
  _tabmgrMediaStep(step);
}

// Event-driven media refresh: tab open/close/activate/audible changes must show
// up in the ‹n/m› counter quickly, not on the next slow poll. Coalesces bursts.
function _tabmgrMediaEventRefresh() {
  if (tabmgrMedia.evPending) return;
  tabmgrMedia.evPending = true;
  setTimeout(function () {
    tabmgrMedia.evPending = false;
    tabmgrMediaRefresh();
  }, 260);
}

// Realtime removal: when a sourced tab is closed browser-side, drop it from the
// queue immediately (and from the sticky known map) instead of waiting for the
// next poll; step to a neighbour if it was the current source.
function _tabmgrMediaEvRemoved(tabId) {
  if (tabmgrMedia.known) delete tabmgrMedia.known[tabId];
  const list = tabmgrMedia.sources || [];
  const idx = list.findIndex(function (c) { return c.tab.id === tabId; });
  if (idx < 0) return;
  list.splice(idx, 1);
  if (list.length === 0) {
    tabmgrMedia.sources = [];
    tabmgrMedia.index = 0;
    tabmgrMedia.sourceTabId = 0;
    tabmgrMedia.sourceTab = null;
    tabmgrMedia.state = null;
    _tabmgrMediaRenderEmpty();
    return;
  }
  if (tabmgrMedia.index >= list.length) tabmgrMedia.index = list.length - 1;
  tabmgrMedia.signature = "";
  tabmgrMedia.lastPlay = null;
  _tabmgrMediaApplyIndex();
  _tabmgrMediaRenderPlayer();
}

// Pause every queued tab that is actually playing (or unmuted fallback), keeping
// only the currently displayed tab's audio — analog to a "pause others" shortcut.
function _tabmgrMediaPauseOthers() {
  const curId = tabmgrMedia.sourceTabId;
  let sent = 0;
  (tabmgrMedia.sources || []).forEach(function (c) {
    if (!c.tab || c.tab.id === curId) return;
    if (c.state && c.state.hasMedia) {
      sent++;
      safeSendTabMessage(c.tab.id, { action: "MEDIA_TOGGLE" }).then(function (res) {
        if (res && res.state && tabmgrMedia.known) {
          tabmgrMedia.known[c.tab.id] = { ts: Date.now(), tab: c.tab, state: res.state };
        }
      }).catch(function () {});
    } else {
      const muted = !!(c.tab.mutedInfo && c.tab.mutedInfo.muted);
      if (!muted) { sent++; tabmgrToggleMute(c.tab.id, true); }
    }
  });
  if (sent > 0) _tabmgrMediaEventRefresh();
}

function _tabmgrMediaRenderEmpty() {
  const body = _tabmgrMediaBody();
  const box = _tabmgrMediaBox();
  if (!body || !box) return;
  _tabmgrMediaSeekStop();
  box.classList.remove("has-source");
  if (body.dataset.empty === "1") return;
  body.dataset.empty = "1";
  _tabmgrMediaClear(body);
  const line = document.createElement("div");
  line.className = "tabmgr-mp-empty";
  const dot = document.createElement("span");
  dot.className = "tabmgr-mp-empty-dot";
  const txt = document.createElement("span");
  txt.textContent = t("tabmgr_media_no_source");
  line.appendChild(dot);
  line.appendChild(txt);
  body.appendChild(line);
}

function _tabmgrMediaSvgBtn(pathD, title, className) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className || "tabmgr-mp-tbtn";
  b.title = title;
  b.appendChild(_tabmgrSvg(pathD));
  return b;
}

function _tabmgrMediaOnPlay() {
  if (tabmgrMedia.sourceTabId && !tabmgrMedia.state) {
    const tab = tabmgrMedia.sourceTab;
    const muted = !!(tab && tab.mutedInfo && tab.mutedInfo.muted);
    tabmgrToggleMute(tabmgrMedia.sourceTabId, !muted);
    return;
  }
  if (tabmgrMedia.sourceTabId) {
    safeSendTabMessage(tabmgrMedia.sourceTabId, { action: "MEDIA_TOGGLE" }).then(function (res) {
      if (res && res.state) {
        tabmgrMedia.state = res.state;
        tabmgrMedia.signature = "";
        tabmgrMedia.lastPlay = null;
        _tabmgrMediaPoll();
      }
    });
  }
}

function _tabmgrMediaOnMute() {
  if (!tabmgrMedia.sourceTabId) return;
  const tab = tabmgrMedia.sourceTab;
  const muted = !!(tab && tab.mutedInfo && tab.mutedInfo.muted);
  tabmgrToggleMute(tabmgrMedia.sourceTabId, !muted);
}

// Open/close the floating popup window (Picture-in-Picture) for the playing video.
function _tabmgrMediaOnPip() {
  const tabId = tabmgrMedia.sourceTabId;
  if (!tabId) return;
  const entering = !(tabmgrMedia.state && tabmgrMedia.state.pip);
  // Try the native Picture-in-Picture API on the video's tab WITHOUT bringing it
  // forward first. On browsers that don't demand a fresh user gesture for the open
  // (Edge does this today) the window pops out instantly from whatever tab you're
  // on. On Chrome/Firefox a background open is usually refused for lack of a
  // gesture; only then do we switch to the tab, where the agent has already grown
  // its own pulsing PiP button (one real tap = a valid gesture). Closing PiP is
  // always gesture-free, so it never needs the tab either way.
  safeSendTabMessage(tabId, { action: "MEDIA_PIP" }, 1500).then(function (res) {
    if (res && res.state) {
      tabmgrMedia.state = res.state;
      tabmgrMedia.signature = "";
      tabmgrMedia.lastPlay = null;
      _tabmgrMediaPoll();
    }
    if (entering && res && res.pipOutcome === "needs-gesture") tabmgrActivateTab(tabId);
  }).catch(function () {
    if (entering) tabmgrActivateTab(tabId);
  });
}

function _tabmgrMediaRenderPlayer() {
  const body = _tabmgrMediaBody();
  const box = _tabmgrMediaBox();
  if (!body || !box) return;
  delete body.dataset.empty;
  box.classList.add("has-source");
  _tabmgrMediaClear(body);

  const tab = tabmgrMedia.sourceTab;
  const state = tabmgrMedia.state;
  const playing = !!(state && state.playing);

  const mp = document.createElement("div");
  mp.className = "tabmgr-mp";

  // --- top: sleeve (cover + thumbnail) + vinyl half-out + info + play/pause ---
  const top = document.createElement("div");
  top.className = "tabmgr-mp-top";

  const vinyl = document.createElement("div");
  vinyl.className = "tabmgr-mp-vinyl" + (playing ? " is-spin" : "");

  const cover = document.createElement("div");
  cover.className = "tabmgr-mp-cover";
  if (_tabmgrMediaIsMulti()) {
    cover.classList.add("is-multi");
    cover.title = t("tabmgr_media_list");
    cover.addEventListener("click", function () { _tabmgrMediaStep(1); });
    _tabmgrMediaCoverStack(cover);
  } else {
    const artwork = _tabmgrMediaArtWork(state);
    if (artwork) {
      cover.classList.add("is-artwork");
      cover.appendChild(_tabmgrMediaArtEl(artwork));
    }
  }

  const info = document.createElement("div");
  info.className = "tabmgr-mp-info";

  const now = document.createElement("div");
  now.className = "tabmgr-mp-now";
  const eq = document.createElement("span");
  eq.className = "tabmgr-mp-eq" + (playing ? "" : " is-stop");
  for (let i = 0; i < 4; i++) {
    const bar = document.createElement("span");
    eq.appendChild(bar);
  }
  const nowTxt = document.createElement("span");
  nowTxt.textContent = playing ? t("tabmgr_media_now_playing") : t("tabmgr_media_pause");
  now.appendChild(eq);
  now.appendChild(nowTxt);

  const titleEl = document.createElement("div");
  titleEl.className = "tabmgr-mp-title";
  titleEl.textContent = _tabmgrMediaTitleText(tab, state);

  const artistEl = document.createElement("div");
  artistEl.className = "tabmgr-mp-artist";
  artistEl.textContent = _tabmgrMediaArtistText(tab, state);

  info.appendChild(now);
  info.appendChild(titleEl);
  info.appendChild(artistEl);

  top.appendChild(vinyl);
  top.appendChild(cover);
  top.appendChild(info);

  // --- seek row: video-style playback progress bar (agent-backed only) ---
  if (state) {
    mp.appendChild(_tabmgrMediaSeekEl(state));
  }

  // --- tools (MUSIC): left [prev-track + play/pause + next-track] | right [pause-all + mute + open] ---
  const tools = document.createElement("div");
  tools.className = "tabmgr-mp-tools";
  const toolsL = document.createElement("div");
  toolsL.className = "tabmgr-mp-tools-group";
  const toolsR = document.createElement("div");
  toolsR.className = "tabmgr-mp-tools-group";
  const prevBtn = _tabmgrMediaSvgBtn("M15 18l-6-6 6-6", t("tabmgr_media_prev"), "tabmgr-mp-tbtn tabmgr-mp-prev");
  prevBtn.addEventListener("click", function () { _tabmgrMediaSkip(-1); });
  toolsL.appendChild(prevBtn);
  if (state) {
    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "tabmgr-mp-playbtn";
    playBtn.title = playing ? t("tabmgr_media_pause") : t("tabmgr_media_play");
    playBtn.appendChild(playing
      ? _tabmgrSvgWithExtra([{ tag: "rect", attrs: { x: "6", y: "4", width: "4", height: "16", rx: "1" } }, { tag: "rect", attrs: { x: "14", y: "4", width: "4", height: "16", rx: "1" } }])
      : _tabmgrSvg("M8 5v14l11-7z"));
    playBtn.addEventListener("click", _tabmgrMediaOnPlay);
    toolsL.appendChild(playBtn);
  }
  const nextBtn = _tabmgrMediaSvgBtn("M9 18l6-6-6-6", t("tabmgr_media_next"), "tabmgr-mp-tbtn tabmgr-mp-next");
  nextBtn.addEventListener("click", function () { _tabmgrMediaSkip(1); });
  toolsL.appendChild(nextBtn);
  if (_tabmgrMediaIsMulti()) {
    const pauseAllBtn = _tabmgrMediaSvgBtn(
      "M8 5v14h3V5H8zM13 5v14h3V5h-3z",
      t("tabmgr_media_pause_all"),
      "tabmgr-mp-tbtn tabmgr-mp-pause-all"
    );
    const pauseAllLabel = document.createElement("span");
    pauseAllLabel.className = "tabmgr-mp-pause-all-label";
    pauseAllLabel.textContent = t("tabmgr_media_pause_all_short");
    pauseAllBtn.appendChild(pauseAllLabel);
    pauseAllBtn.addEventListener("click", _tabmgrMediaPauseOthers);
    toolsR.appendChild(pauseAllBtn);
    top.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
      _tabmgrMediaOnWheel(e.deltaX > 0 ? 1 : -1);
    });
  }
  const muteBtn = _tabmgrMediaSvgBtn("M11 5L6 9H2v6h4l5 5V5z", t("tabmgr_media_mute"), "tabmgr-mp-tbtn tabmgr-mp-mute");
  if (tab && tab.mutedInfo && tab.mutedInfo.muted) {
    muteBtn.classList.add("is-active");
    muteBtn.title = t("tabmgr_media_unmute");
  }
  muteBtn.addEventListener("click", _tabmgrMediaOnMute);
  const openBtn = _tabmgrMediaSvgBtn("M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3", t("tabmgr_media_open_tab"), "tabmgr-mp-tbtn");
  openBtn.addEventListener("click", function () { if (tabmgrMedia.sourceTabId) tabmgrActivateTab(tabmgrMedia.sourceTabId); });
  toolsR.appendChild(muteBtn);
  // PiP "popup window" toggle — only a VIDEO source can float its own window,
  // and only when the page's native Picture-in-Picture API exists (Firefox has
  // none, so the button would be a dead control there).
  if (state && state.isVideo && state.pipSupported !== false) {
    const pipBtn = document.createElement("button");
    pipBtn.type = "button";
    pipBtn.className = "tabmgr-mp-tbtn tabmgr-mp-pip" + (state.pip ? " is-active" : "");
    pipBtn.title = state.pip ? t("tabmgr_media_popout_close") : t("tabmgr_media_popout_open");
    pipBtn.appendChild(_tabmgrSvgWithExtra([
      { tag: "rect", attrs: { x: "3", y: "5", width: "18", height: "14", rx: "2" } },
      { tag: "rect", attrs: { x: "12", y: "10", width: "7", height: "7", rx: "1" } }
    ]));
    pipBtn.addEventListener("click", _tabmgrMediaOnPip);
    toolsR.appendChild(pipBtn);
  }
  toolsR.appendChild(openBtn);
  tools.appendChild(toolsL);
  tools.appendChild(toolsR);

  mp.appendChild(top);
  mp.appendChild(tools);
  body.appendChild(mp);

  _tabmgrMediaPatchPlayer();
}

function _tabmgrMediaPatchPlayer() {
  const mp = document.querySelector("#tabmgr-media-body .tabmgr-mp");
  if (!mp) return;
  const state = tabmgrMedia.state;
  const muted = !!(tabmgrMedia.sourceTab && tabmgrMedia.sourceTab.mutedInfo && tabmgrMedia.sourceTab.mutedInfo.muted);
  // fallback (no agent state): audible == playing until muted
  const playing = state ? !!(state.playing) : !muted;

  const vinyl = mp.querySelector(".tabmgr-mp-vinyl");
  if (vinyl) vinyl.classList.toggle("is-spin", !!playing);

  const eq = mp.querySelector(".tabmgr-mp-eq");
  if (eq) eq.classList.toggle("is-stop", !playing);

  const nowTxt = mp.querySelector(".tabmgr-mp-now > span:last-child");
  if (nowTxt) nowTxt.textContent = playing ? t("tabmgr_media_now_playing") : t("tabmgr_media_pause");

  const playBtn = mp.querySelector(".tabmgr-mp-playbtn");
  if (playBtn) {
    if (playing !== tabmgrMedia.lastPlay) {
      tabmgrMedia.lastPlay = playing;
      _tabmgrMediaClear(playBtn);
      playBtn.title = playing ? t("tabmgr_media_pause") : t("tabmgr_media_play");
      playBtn.appendChild(playing
        ? _tabmgrSvgWithExtra([{ tag: "rect", attrs: { x: "6", y: "4", width: "4", height: "16", rx: "1" } }, { tag: "rect", attrs: { x: "14", y: "4", width: "4", height: "16", rx: "1" } }])
        : _tabmgrSvg("M8 5v14l11-7z"));
    }
  }

  const vpb = mp.querySelector(".tabmgr-vpb");
  const timeEl = mp.querySelector(".tabmgr-vpb-time");
  if (vpb && timeEl && !tabmgrMedia.dragging) {
    const lvStart = (state && Number(state.liveStart)) || 0;
    _tabmgrMediaSeekUI(vpb, timeEl, state ? state.currentTime : 0, state ? state.duration : 0, _tabmgrMediaIsLive(state), lvStart);
    _tabmgrMediaSeekSetBase(vpb, state ? state.currentTime : 0, state ? state.duration : 0, playing, _tabmgrMediaIsLive(state), lvStart);
    _tabmgrMediaSeekStart();
  }

  const muteBtn = mp.querySelector(".tabmgr-mp-mute");
  if (muteBtn) {
    muteBtn.classList.toggle("is-active", muted);
    muteBtn.title = muted ? t("tabmgr_media_unmute") : t("tabmgr_media_mute");
  }

  const pipBtn = mp.querySelector(".tabmgr-mp-pip");
  if (pipBtn) {
    const pipOn = !!(state && state.isVideo && state.pip);
    pipBtn.classList.toggle("is-active", pipOn);
    pipBtn.title = pipOn ? t("tabmgr_media_popout_close") : t("tabmgr_media_popout_open");
  }

  const countBtn = mp.querySelector(".tabmgr-mp-count");
  const n = (tabmgrMedia.sources || []).length;
  if (countBtn) countBtn.textContent = (tabmgrMedia.index + 1) + "/" + n;
  const cover = mp.querySelector(".tabmgr-mp-cover");
  if (cover) cover.classList.toggle("is-multi", n > 1);

  // Pause-others active state: lit up while ANY other queued source is silent
  // (paused via MEDIA or muted fallback) — a clear "your pause is in effect" cue.
  const pauseAllBtn = mp.querySelector(".tabmgr-mp-pause-all");
  if (pauseAllBtn) {
    const othersSilent = (tabmgrMedia.sources || []).some(function (c) {
      if (!c.tab || c.tab.id === tabmgrMedia.sourceTabId) return false;
      if (c.state && c.state.hasMedia) return !c.state.playing;
      return !!(c.tab.mutedInfo && c.tab.mutedInfo.muted);
    });
    pauseAllBtn.classList.toggle("is-active", othersSilent);
  }
}

onReady(function () {
  // Music player banner: restore pref + bind the on/off switch
  storGet(TABMGR_MEDIA_KEY, function (res) {
    const v = res && res.sf_tabmgr_media_player;
    tabmgrMedia.enabled = v === undefined ? true : !!v;
    _tabmgrMediaApplyUI();
    if (tabmgrMedia.enabled) _tabmgrMediaPoll();
  });
  const mediaCheck = document.getElementById("tabmgr-media-check");
  if (mediaCheck) mediaCheck.addEventListener("change", function () { tabmgrMediaSetPref(mediaCheck.checked); });

  const searchInput = document.getElementById("tabmgr-search");
  if (searchInput) searchInput.addEventListener("input", function () { tabmgrState.filter = searchInput.value; tabmgrRenderList(); });
  const sortSel = document.getElementById("tabmgr-sort");
  if (sortSel) sortSel.addEventListener("change", function () { tabmgrState.sort = sortSel.value; tabmgrRenderList(); });
  const groupModeSel = document.getElementById("tabmgr-group-mode");
  if (groupModeSel) groupModeSel.addEventListener("change", function () { tabmgrState.groupMode = groupModeSel.value; tabmgrRenderList(); });
  const btnRefresh = document.getElementById("btn-tabmgr-refresh");
  if (btnRefresh) btnRefresh.addEventListener("click", tabmgrLoadTabs);
  const btnOptRam = document.getElementById("btn-tabmgr-optimize-ram");
  if (btnOptRam) btnOptRam.addEventListener("click", tabmgrOptimizeRam);
  const btnCloseBlank = document.getElementById("btn-tabmgr-close-blank");
  if (btnCloseBlank) btnCloseBlank.addEventListener("click", tabmgrCloseBlankTabs);
  const btnDup = document.getElementById("btn-tabmgr-close-dup");
  if (btnDup) btnDup.addEventListener("click", tabmgrCloseDuplicates);
  const btnBmAll = document.getElementById("btn-tabmgr-bookmark-all");
  if (btnBmAll) btnBmAll.addEventListener("click", tabmgrBookmarkAll);
  const btnCloseAll = document.getElementById("btn-tabmgr-close-all");
  if (btnCloseAll) btnCloseAll.addEventListener("click", tabmgrCloseAll);
  const btnDiscardAll = document.getElementById("btn-tabmgr-discard-all");
  if (btnDiscardAll) btnDiscardAll.addEventListener("click", tabmgrDiscardAll);
  const btnExportMd = document.getElementById("btn-tabmgr-export-md");
  if (btnExportMd) btnExportMd.addEventListener("click", tabmgrExportMd);
  const btnExportTxt = document.getElementById("btn-tabmgr-export-txt");
  if (btnExportTxt) btnExportTxt.addEventListener("click", tabmgrExportTxt);
  const btnSaveSess = document.getElementById("btn-tabmgr-save-session");
  if (btnSaveSess) btnSaveSess.addEventListener("click", tabmgrSaveSession);
  const btnGroupBrowser = document.getElementById("btn-tabmgr-group-browser");
  if (btnGroupBrowser) btnGroupBrowser.addEventListener("click", tabmgrGroupInBrowser);
  // refresh active-tab display rides on tabmgrRenderList itself (no dedicated hook)
  tabmgrLoadTabs();
  tabmgrLoadSessions();
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { tabmgrLoadTabs(); tabmgrMediaRefresh(); } });
  // Debounced event refresh: onUpdated fires many times per page-load; coalesce bursts.
  let _tabmgrEvT = null;
  function _tabmgrEventRefresh() {
    if (_tabmgrEvT) return;
    _tabmgrEvT = setTimeout(function () { _tabmgrEvT = null; tabmgrLoadTabs(); _tabmgrMediaEventRefresh(); }, 200);
  }
  try {
    const api = _getTabsApi();
    if (api && api.onUpdated && api.onUpdated.addListener) api.onUpdated.addListener(_tabmgrEventRefresh);
    if (api && api.onRemoved && api.onRemoved.addListener) api.onRemoved.addListener(_tabmgrEventRefresh);
    if (api && api.onRemoved && api.onRemoved.addListener) api.onRemoved.addListener(function (tabId) { _tabmgrMediaEvRemoved(tabId); });
    if (api && api.onCreated && api.onCreated.addListener) api.onCreated.addListener(_tabmgrEventRefresh);
    if (api && api.onActivated && api.onActivated.addListener) api.onActivated.addListener(_tabmgrEventRefresh);
    if (api && api.onHighlighted && api.onHighlighted.addListener) api.onHighlighted.addListener(_tabmgrEventRefresh);
    try {
      const winApi = (typeof chrome !== "undefined" && chrome.windows) ? chrome.windows : (typeof browser !== "undefined" && browser.windows) ? browser.windows : null;
      if (winApi && winApi.onFocusChanged && winApi.onFocusChanged.addListener) winApi.onFocusChanged.addListener(function () { setTimeout(_tabmgrEventRefresh, 200); });
      if (winApi && winApi.onRemoved && winApi.onRemoved.addListener) winApi.onRemoved.addListener(_tabmgrEventRefresh);
    } catch (e3) {}
  } catch (e2) {}
  // Safety net: if the host window never got the event (popup closed on blur in Firefox,
  // listener threw earlier, background throttle...), soft-poll only while this page is visible.
  setInterval(function () { if (!document.hidden) tabmgrLoadTabs(); }, 4000);
});
