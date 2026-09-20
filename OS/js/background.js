// Web Super Assistant - Background Service Worker (Manifest V3)
// Handles: Chrome/Edge Native Side Panel API, Full-Page Screenshot Stitching, Tab Management

// Enable native Side Panel on action click for Chromium browsers (Chrome 114+, Edge 114+)
try {
  const isEdge = navigator.userAgent.toLowerCase().includes("edg/");
  if (!isEdge && typeof chrome !== "undefined" && chrome) {
    const sp = chrome["sidePanel"];
    if (sp && typeof sp.setPanelBehavior === "function") {
      sp.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
    }
  }
} catch (e) {
  // Ignore in Firefox where sidePanel is unsupported
}

// Fallback click listener for Chromium to open native side panel
if (typeof chrome !== "undefined" && chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(async (tab) => {
    try {
      const sp = chrome ? chrome["sidePanel"] : null;
      if (sp && typeof sp["open"] === "function") {
        if (tab?.windowId) {
          await sp["open"]({ windowId: tab.windowId });
        } else if (tab?.id) {
          await sp["open"]({ tabId: tab.id });
        }
      }
    } catch (e) {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_DOCKED_SIDEBAR" }).catch(() => {});
      }
    }
  });
}

const browserRuntimeApi = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime : null;
const chromeRuntimeApi = (typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null;
const browserTabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : null;
const chromeTabsApi = (typeof chrome !== "undefined" && chrome.tabs) ? chrome.tabs : null;
const tabsApi = browserTabsApi || chromeTabsApi;
const runtimeApi = browserRuntimeApi || chromeRuntimeApi;

// Listen for messages from sidebar or content script
(runtimeApi && runtimeApi.onMessage ? runtimeApi : chromeRuntimeApi)?.onMessage?.addListener((request, sender, sendResponse) => {
  if (request.action === "CAPTURE_VISIBLE_TAB") {
    const doCapture = (tabApi) => {
      const maybePromise = tabApi.captureVisibleTab(request.windowId || null, { format: "png" });
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then((dataUrl) => {
          sendResponse({ success: !!dataUrl, dataUrl: dataUrl || null });
        }).catch((err) => {
          sendResponse({ success: false, error: err?.message || "captureVisibleTab failed" });
        });
        return true;
      }

      tabApi.captureVisibleTab(request.windowId || null, { format: "png" }, (dataUrl) => {
        if (!dataUrl) {
          sendResponse({ success: false, error: "Empty capture result" });
          return;
        }
        sendResponse({ success: true, dataUrl });
      });
      return true;
    };

    if (browserTabsApi && typeof browserTabsApi.captureVisibleTab === "function") {
      return doCapture(browserTabsApi);
    }
    if (chromeTabsApi && typeof chromeTabsApi.captureVisibleTab === "function") {
      return doCapture(chromeTabsApi);
    }

    sendResponse({ success: false, error: "captureVisibleTab API not available" });
    return false;
  }

  if (request.action === "OPEN_IN_PAGE_SIDEBAR" || request.action === "OPEN_SIDEBAR") {
    const queryTabs = (api) => new Promise((resolve) => {
      if (!api || typeof api.query !== "function") return resolve([]);
      api.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs || []));
    });

    (async () => {
      const allTabs = await queryTabs(chromeTabsApi || browserTabsApi).catch(() => []);
      const tab = allTabs && allTabs[0] ? allTabs[0] : null;
      if (!tab) {
        sendResponse({ success: true });
        return;
      }

      // 1. Try Chromium native sidePanel API (Chrome 114+, Edge 114+)
      try {
        const sp = (typeof chrome !== "undefined" && chrome && chrome.sidePanel) ? chrome.sidePanel : null;
        if (sp && typeof sp.open === "function") {
          if (tab.id) {
            await sp.open({ tabId: tab.id });
            sendResponse({ success: true });
            return;
          }
          if (tab.windowId) {
            await sp.open({ windowId: tab.windowId });
            sendResponse({ success: true });
            return;
          }
        }
      } catch (e) {}

      // 2. Try Firefox native sidebarAction API
      try {
        if (typeof browser !== "undefined" && browser.sidebarAction && typeof browser.sidebarAction.open === "function") {
          await browser.sidebarAction.open();
          sendResponse({ success: true });
          return;
        }
      } catch (e) {}

      // 3. Fallback: In-page docked sidebar on current active tab
      const sendToPage = browserTabsApi || chromeTabsApi;
      if (sendToPage && typeof sendToPage.sendMessage === "function") {
        sendToPage.sendMessage(tab.id, { action: "TOGGLE_DOCKED_SIDEBAR" }).catch(() => {});
      }
      sendResponse({ success: true });
    })();

    return true;
  }
  if (request.action === "DOWNLOAD_PDF_IN_BACKGROUND") {
    fetch(request.url)
      .then(res => {
        if (!res.ok) throw new Error("HTTP Status " + res.status);
        return res.arrayBuffer();
      })
      .then(ab => {
        let binary = "";
        const bytes = new Uint8Array(ab);
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        const base64 = btoa(binary);
        const filename = (request.url.split('/').pop() || 'document.pdf').split('?')[0];

        sendResponse({ base64: base64, filename: filename });
      })
      .catch(err => {
        console.error("Lỗi fetch PDF từ Background:", err);
        sendResponse(null);
      });

    return true;
  }

});

// Context Menu Setup
if (typeof chrome !== "undefined" && chrome.contextMenus) {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "quote-to-cite",
      title: "Lưu trích dẫn kèm trích đoạn",
      contexts: ["selection"]
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "quote-to-cite" && info.selectionText) {
      // We broadcast a message. The sidebar.js or content.js will intercept this.
      // Send directly to the active tab so the sidebar can catch it, or if sidebar is open it will listen to runtime.onMessage
      chrome.runtime.sendMessage({
        action: "QUOTE_TO_CITE",
        selectionText: info.selectionText,
        pageUrl: info.pageUrl
      });
      // Also open side panel automatically if possible
      try {
        const sp = chrome["sidePanel"];
        if (sp && sp.open) {
          sp.open({ tabId: tab.id, windowId: tab.windowId });
        }
      } catch (e) {}
    }
  });
}

// ---------------------------------------------------------------------------
// Gambling shield: declarativeNetRequest dynamic rules redirect known
// betting/casino domains (VN bookmaker network) to the local block page
// OS/html/gamble-block.html. On/off switch + per-host allowlist live in
// sf_social_settings { gamble, gambleAllow } managed by the Social tab.
// 100% local: the domain set is curated below; nothing is fetched.
// ---------------------------------------------------------------------------
const GMBL_LIST = [
  "kubet", "kbets", "88bet", "bet88", "w88", "fun88", "go88", "iwin", "ri88",
  "debet", "mig8", "v9bet", "188bet", "bet188", "bet365", "dafabet", "sbobet",
  "sobet", "12bet", "cmd368", "bong88", "agbong88", "letou", "1xbet", "1win",
  "melbet", "linebet", "bk8", "f8bet", "kimsa", "vb68", "net88", "sunwin",
  "zowin", "nohu", "nhatvip", "789bet", "m88", "m88win", "one88", "manclub",
  "youwin", "red88", "sv388", "sv88", "new88", "ufabet", "bayvip", "doiuba",
  "tweelwin", "zwin", "b52", "v99", "v88", "v789", "hi88", "vik88", "yo88",
  "mmavin", "567live", "lucky88", "noh9", "vnbet", "kkwin", "kfa88"
];

function _gmblDnrApi() {
  const b = (typeof browser !== "undefined" && browser.declarativeNetRequest) ? browser.declarativeNetRequest : null;
  const c = (typeof chrome !== "undefined" && chrome.declarativeNetRequest) ? chrome.declarativeNetRequest : null;
  return b || c;
}
function _gmblStor() {
  const b = (typeof browser !== "undefined" && browser.storage) ? browser.storage : null;
  const c = (typeof chrome !== "undefined" && chrome.storage) ? chrome.storage : null;
  return (b && b.local) || (c && c.local) || null;
}
function _gmblEscape(t) {
  return String(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function _gmblBuildRules(allow) {
  const blockUrl = ((typeof browser !== "undefined" && browser.runtime) || chrome.runtime)
    .getURL("OS/html/gamble-block.html");
  const isFF = typeof browser !== "undefined" && !!browser.declarativeNetRequest;
  const rt = isFF ? ["MAIN_FRAME", "SUB_FRAME"] : ["main_frame", "sub_frame"];
  const rules = [];
  let id = 1;
  GMBL_LIST.forEach(function (d) {
    if (allow && allow[d]) return;
    rules.push({
      id: id++,
      priority: 1,
      action: { type: "redirect", redirect: { regexSubstitution: blockUrl + "?h={{encodingHost}}" } },
      condition: {
        regexFilter: "^https?://(?:[a-z0-9-]+\\.)*" + _gmblEscape(d) + "[0-9a-z-]*\\.[a-z]{2,}(?::\\d+)?(?:/|$|\\?)",
        resourceTypes: rt
      }
    });
  });
  if (!(allow && allow.__casino)) {
    rules.push({
      id: id++,
      priority: 1,
      action: { type: "redirect", redirect: { regexSubstitution: blockUrl + "?h={{encodingHost}}" } },
      condition: {
        regexFilter: "^https?://(?:[a-z0-9-]+\\.)*[a-z0-9-]*casino[a-z0-9-]*\\.([a-z]{2,})(?::\\d+)?(?:/|$|\\?)",
        resourceTypes: rt
      }
    });
  }
  return rules;
}
function _gmblApply() {
  const api = _gmblDnrApi();
  const stor = _gmblStor();
  if (!api || !stor) return;
  const installRules = function (add) {
    const after = function (existing) {
      const removeRuleIds = (existing || []).map(function (r) { return r.id; });
      try {
        const p = api.updateDynamicRules({ removeRuleIds: removeRuleIds, addRules: add });
        if (p && p.then) p.then(function () {}, function () {});
      } catch (e) {}
    };
    try {
      const g = api.getDynamicRules();
      if (g && g.then) g.then(after, function () { after([]); });
      else if (g) after(g);
      else api.getDynamicRules(after);
    } catch (e) { after([]); }
  };
  const onSettings = function (res) {
    const s = (res && res.sf_social_settings) || {};
    const on = s.gamble !== false;
    installRules(on ? _gmblBuildRules(s.gambleAllow || {}) : []);
  };
  try {
    const p = stor.get("sf_social_settings");
    if (p && p.then) p.then(onSettings, function () {});
    else stor.get("sf_social_settings", onSettings);
  } catch (e) {}
}
function _gmblTokenForHost(host) {
  const h = String(host || "").toLowerCase();
  for (let i = 0; i < GMBL_LIST.length; i++) {
    if (h.indexOf(GMBL_LIST[i]) !== -1) return GMBL_LIST[i];
  }
  return h.indexOf("casino") !== -1 ? "__casino" : "";
}
function _gmblAllowHost(token) {
  const stor = _gmblStor();
  if (!stor || !token) return;
  const write = function (s) {
    s.gambleAllow = s.gambleAllow || {};
    s.gambleAllow[token] = true;
    try {
      const p = stor.set({ sf_social_settings: s });
      if (p && p.then) p.then(function () { _gmblApply(); }, function () {});
      else stor.set({ sf_social_settings: s }, _gmblApply);
    } catch (e) {}
  };
  try {
    const g = stor.get("sf_social_settings");
    if (g && g.then) { g.then(function (res) { write((res && res.sf_social_settings) || {}); }, function () {}); return; }
    stor.get("sf_social_settings", function (res) { write((res && res.sf_social_settings) || {}); });
  } catch (e) {}
}
try {
  if (typeof chrome !== "undefined" && chrome.runtime) {
    if (chrome.runtime.onInstalled) chrome.runtime.onInstalled.addListener(function () { _gmblApply(); });
    if (chrome.runtime.onStartup) chrome.runtime.onStartup.addListener(function () { _gmblApply(); });
  }
  const storG = _gmblStor();
  if (storG && storG.onChanged) {
    storG.onChanged.addListener(function (c, area) {
      if (area === "local" && c && c.sf_social_settings) _gmblApply();
    });
  }
  const rtG = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime
    : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null);
  if (rtG && rtG.onMessage && rtG.onMessage.addListener) {
    rtG.onMessage.addListener(function (msg, sender, sendResponse) {
      if (!msg || msg.action !== "GMBL_ALLOW_HOST") return;
      _gmblAllowHost(_gmblTokenForHost(msg.host));
      try { sendResponse({ ok: true }); } catch (e) {}
    });
  }
  _gmblApply();
} catch (e) {}
