import re

with open('/mnt/c/TakaExtension/OS/js/background.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {',
'''const runtimeApi = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime : (typeof chrome !== "undefined" ? chrome.runtime : null);
const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);

runtimeApi.onMessage.addListener((request, sender, sendResponse) => {''')

content = content.replace('''  if (request.action === "CAPTURE_VISIBLE_TAB") {
    chrome.tabs.captureVisibleTab(request.windowId || null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
    return true; // Keep message channel open for async response
  }''',
'''  if (request.action === "CAPTURE_VISIBLE_TAB") {
    if (tabsApi && tabsApi.captureVisibleTab) {
      if (typeof browser !== "undefined") {
        // Firefox uses Promises
        tabsApi.captureVisibleTab(request.windowId || null, { format: "png" }).then((dataUrl) => {
          sendResponse({ success: true, dataUrl });
        }).catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
      } else {
        // Chrome uses callbacks
        tabsApi.captureVisibleTab(request.windowId || null, { format: "png" }, (dataUrl) => {
          if (runtimeApi.lastError || !dataUrl) {
            sendResponse({ success: false, error: runtimeApi.lastError?.message });
          } else {
            sendResponse({ success: true, dataUrl });
          }
        });
      }
    } else {
      sendResponse({ success: false, error: "captureVisibleTab API not available" });
    }
    return true; // Keep message channel open for async response
  }''')

with open('/mnt/c/TakaExtension/OS/js/background.js', 'w', encoding='utf-8') as f:
    f.write(content)

with open('/mnt/c/TakaExtension/OS/js/sidebar.js', 'r', encoding='utf-8') as f:
    sidebar = f.read()

sidebar = sidebar.replace('''          if (!chrome.runtime?.lastError && dataUrl) {
            return resolve(dataUrl);
          }
          ((typeof browser !== "undefined" && browser.runtime) ? browser.runtime : (typeof chrome !== "undefined" ? chrome.runtime : null))?.sendMessage({ action: "CAPTURE_VISIBLE_TAB", windowId }, (res) => {
            resolve(res?.dataUrl || null);
          });''',
'''          if (!(typeof chrome !== "undefined" && chrome.runtime?.lastError) && dataUrl) {
            return resolve(dataUrl);
          }
          const rt = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null);
          if (rt) {
             rt.sendMessage({ action: "CAPTURE_VISIBLE_TAB", windowId }, (res) => {
               resolve(res?.dataUrl || null);
             });
          } else {
             resolve(null);
          }''')

with open('/mnt/c/TakaExtension/OS/js/sidebar.js', 'w', encoding='utf-8') as f:
    f.write(sidebar)
