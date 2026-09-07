// Web Super Assistant - Background Service Worker (Manifest V3)
// Handles: Chrome/Edge Native Side Panel API, Full-Page Screenshot Stitching, Tab Management

// Enable native Side Panel on action click for Chromium browsers (Chrome 114+, Edge 114+)
try {
  if (typeof chrome !== "undefined" && chrome) {
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
});
