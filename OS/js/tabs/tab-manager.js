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
  fav.src = tab.favIconUrl || "";
  fav.alt = "";
  fav.onerror = function () { fav.style.display = "none"; };
  if (!tab.favIconUrl) fav.style.display = "none";
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

onReady(function () {
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
  // refresh active-live display via events only (no ping)
  function _tabmgrUpdateActiveLive() {
    const activeInfo = document.getElementById("tabmgr-active-live");
    if (!activeInfo) return;
    const active = tabmgrState.tabs.find(function (x) { return x.active; });
    if (active) activeInfo.textContent = (active.title || active.url || "").slice(0, 50);
    else if (tabmgrState.tabs.length) activeInfo.textContent = tabmgrState.tabs.length + " tabs";
    else activeInfo.textContent = t("tabmgr_empty");
  }
  const _origRender = tabmgrRenderList;
  tabmgrRenderList = function () { _origRender(); _tabmgrUpdateActiveLive(); };
  tabmgrLoadTabs();
  tabmgrLoadSessions();
  document.addEventListener("visibilitychange", function () { if (!document.hidden) tabmgrLoadTabs(); });
  // Debounced event refresh: onUpdated fires many times per page-load; coalesce bursts.
  let _tabmgrEvT = null;
  function _tabmgrEventRefresh() {
    if (_tabmgrEvT) return;
    _tabmgrEvT = setTimeout(function () { _tabmgrEvT = null; tabmgrLoadTabs(); }, 200);
  }
  try {
    const api = _getTabsApi();
    if (api && api.onUpdated && api.onUpdated.addListener) api.onUpdated.addListener(_tabmgrEventRefresh);
    if (api && api.onRemoved && api.onRemoved.addListener) api.onRemoved.addListener(_tabmgrEventRefresh);
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
