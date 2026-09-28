// OS/js/userscripts_bg.js
// Background worker for custom userscript management

let _ffRegisteredScripts = [];

const _fallbackGmShim = `
// Fallback GM shim (used when SF_FULL_GM_SHIM is unavailable).
// Uses var + typeof guards to prevent redeclaration errors on pages
// that already declare const GM_* polyfills (e.g. Garena, cdkgarena).
var _sfStorageListeners = typeof _sfStorageListeners !== 'undefined' ? _sfStorageListeners : {};
var GM_getValue = typeof GM_getValue === 'function' ? GM_getValue : function(key, def) { try { return JSON.parse(localStorage.getItem('GM_' + key)) ?? def; } catch(e) { return localStorage.getItem('GM_' + key) || def; } };
var GM_setValue = typeof GM_setValue === 'function' ? GM_setValue : function(key, val) { localStorage.setItem('GM_' + key, JSON.stringify(val)); };
var GM_deleteValue = typeof GM_deleteValue === 'function' ? GM_deleteValue : function(key) { localStorage.removeItem('GM_' + key); };
var GM_listValues = typeof GM_listValues === 'function' ? GM_listValues : function() { var r=[]; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k&&k.startsWith('GM_')) r.push(k.slice(3)); } return r; };
var GM_addStyle = typeof GM_addStyle === 'function' ? GM_addStyle : function(css) { var style=document.createElement('style'); style.textContent=css; (document.head||document.documentElement).appendChild(style); return style; };
var GM_setClipboard = typeof GM_setClipboard === 'function' ? GM_setClipboard : function(text) { try { if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function(){}); } catch(e){} };
var GM_openInTab = typeof GM_openInTab === 'function' ? GM_openInTab : function(url) { try { window.open(url,'_blank'); } catch(e){} };
var GM = typeof GM !== 'undefined' ? GM : {
  getValue: async function(key, def) { return GM_getValue(key, def); },
  setValue: async function(key, val) { return GM_setValue(key, val); },
  deleteValue: async function(key) { return GM_deleteValue(key); },
  listValues: async function() { return GM_listValues(); },
  addStyle: function(css) { return GM_addStyle(css); },
  setClipboard: function(text) { GM_setClipboard(text); },
  openInTab: function(url) { GM_openInTab(url); }
};
`;

function _getEffectiveGmShim() {
  if (typeof self !== 'undefined' && self.SF_FULL_GM_SHIM) return self.SF_FULL_GM_SHIM;
  if (typeof globalThis !== 'undefined' && globalThis.SF_FULL_GM_SHIM) return globalThis.SF_FULL_GM_SHIM;
  return _fallbackGmShim;
}

async function _registerUserScripts() {
  const browserApi = (typeof browser !== 'undefined' && browser.userScripts) ? browser : chrome;
  const isFirefox = typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL('').startsWith('moz');
  
  if (!browserApi || !browserApi.userScripts || !browserApi.userScripts.register) {
    console.warn("UserScripts API not available. Make sure 'userScripts' permission is granted.");
    return;
  }
  
  try {
    if (typeof browserApi.userScripts.unregister === 'function') {
      await browserApi.userScripts.unregister();
    }
    if (isFirefox) {
      for (const scriptObj of _ffRegisteredScripts) {
        if (scriptObj && typeof scriptObj.unregister === 'function') {
          await scriptObj.unregister();
        }
      }
      _ffRegisteredScripts = [];
    }
  } catch (e) {
    console.log("No scripts to unregister or error: ", e);
  }

  const storageApi = browserApi.storage ? browserApi.storage.local : chrome.storage.local;
  const data = await storageApi.get("sf_custom_scripts");
  let scripts = data.sf_custom_scripts || [];
  
  // Auto Update Logic (Check every 24h)
  const now = Date.now();
  let hasUpdates = false;
  
  for (let i = 0; i < scripts.length; i++) {
    const s = scripts[i];
    if (s.updateUrl && s.active) {
      if (!s.lastUpdated || (now - s.lastUpdated > 24 * 60 * 60 * 1000)) {
        try {
          console.log("Auto-updating script: " + s.name);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          const response = await fetch(s.updateUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (response.ok) {
            const newCode = await response.text();
            if (newCode && newCode.includes('==UserScript==')) {
              s.code = newCode;
              
              // Also update matches and excludes if possible
              let matches = [];
              const matchRe = /@match\s+(.+)/g;
              let m;
              while ((m = matchRe.exec(newCode)) !== null) {
                matches.push(m[1].trim());
              }
              if (matches.length > 0) s.matches = matches;
              
              let excludes = [];
              const excludeRe = /@exclude\s+(.+)/g;
              while ((m = excludeRe.exec(newCode)) !== null) {
                excludes.push(m[1].trim());
              }
              if (excludes.length > 0) s.excludes = excludes;
              
              s.lastUpdated = now;
              hasUpdates = true;
            }
          }
        } catch(e) {
          console.error("Failed to auto-update script " + s.name, e);
        }
      }
    }
  }
  
  if (hasUpdates) {
    // Save the updated scripts back to storage
    // But remove the listener temporarily so we don't trigger an infinite loop
    _ignoreStorageChange = true;
    await storageApi.set({ sf_custom_scripts: scripts });
    setTimeout(() => { _ignoreStorageChange = false; }, 2000);
  }
  
  const activeScripts = scripts.filter(s => s.active && s.code);
  if (activeScripts.length === 0) return;
  
  console.log("Registering " + activeScripts.length + " custom userscripts in background...");

  try {
    const activeShim = _getEffectiveGmShim();
    if (isFirefox) {
      for (const s of activeScripts) {
        try {
          const opts = {
            matches: s.matches && s.matches.length > 0 ? s.matches : ["<all_urls>"],
            js: [{ code: activeShim + '\n' + s.code }],
            runAt: s.runAt || "document_idle"
          };
          if (s.excludes && s.excludes.length > 0) {
            opts.excludeMatches = s.excludes;
          }
          const registered = await browser.userScripts.register(opts);
          _ffRegisteredScripts.push(registered);
        } catch (err) {
          console.error("Failed to register script in Firefox: " + s.id, err);
        }
      }
    } else {
      const scriptsToRegister = activeScripts.map(s => {
        const opts = {
          id: s.id,
          matches: s.matches && s.matches.length > 0 ? s.matches : ["<all_urls>"],
          js: [{ code: activeShim + '\n' + s.code }],
          runAt: s.runAt || "document_idle",
          world: "MAIN"
        };
        if (s.excludes && s.excludes.length > 0) {
          opts.excludeMatches = s.excludes;
        }
        return opts;
      });
      if (chrome.userScripts && chrome.userScripts.register) {
        await chrome.userScripts.register(scriptsToRegister);
      }
    }
  } catch (e) {
    console.error("Failed to register userscripts:", e);
  }
}

let _ignoreStorageChange = false;
const runtimeApiForStorage = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;
if (runtimeApiForStorage && runtimeApiForStorage.storage && runtimeApiForStorage.storage.onChanged) {
  runtimeApiForStorage.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.sf_custom_scripts && !_ignoreStorageChange) {
      _registerUserScripts();
    }
  });
}

setTimeout(() => {
  _registerUserScripts();
}, 2000);

const runtimeApiMsg = (typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : chrome.runtime;
if (runtimeApiMsg && runtimeApiMsg.onMessage) {
  runtimeApiMsg.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "RELOAD_USERSCRIPTS") {
      _registerUserScripts().then(() => sendResponse({success: true}));
      return true;
    }

    if (request.action === "GM_XHR" && request.req) {
      const { reqId, url, method, headers, data, timeout } = request.req;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout || 30000);
      const opts = {
        method: method || 'GET',
        headers: headers || {},
        signal: controller.signal
      };
      if (data && method !== 'GET' && method !== 'HEAD') {
        opts.body = data;
      }
      fetch(url, opts).then(async (response) => {
        clearTimeout(timer);
        const text = await response.text();
        const resHeaders = {};
        response.headers.forEach((val, key) => { resHeaders[key] = val; });
        sendResponse({
          reqId,
          status: response.status,
          statusText: response.statusText,
          responseText: text,
          headers: resHeaders,
          finalUrl: response.url
        });
      }).catch((err) => {
        clearTimeout(timer);
        sendResponse({
          reqId,
          error: err.message || String(err),
          status: 0
        });
      });
      return true;
    }

    if (request.action === "INSTALL_USERSCRIPT" && request.scriptData) {
      const storageApi = (typeof browser !== 'undefined' && browser.storage) ? browser.storage.local : chrome.storage.local;
      storageApi.get("sf_custom_scripts").then(res => {
        const scripts = res.sf_custom_scripts || [];
        const newScript = request.scriptData;
        const existingIdx = scripts.findIndex(s => s.id === newScript.id || (s.name && s.name === newScript.name));
        if (existingIdx > -1) {
          scripts[existingIdx] = Object.assign({}, scripts[existingIdx], newScript);
        } else {
          scripts.push(newScript);
        }
        return storageApi.set({ sf_custom_scripts: scripts });
      }).then(() => {
        return _registerUserScripts();
      }).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    if (request.action === "CHECK_USERSCRIPT_UPDATES") {
      const storageApi = (typeof browser !== 'undefined' && browser.storage) ? browser.storage.local : chrome.storage.local;
      storageApi.get("sf_custom_scripts").then(async res => {
        const scripts = res.sf_custom_scripts || [];
        const updatedList = [];
        for (const s of scripts) {
          if (!s.updateUrl) continue;
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);
            const resp = await fetch(s.updateUrl, { signal: controller.signal });
            clearTimeout(timer);
            if (resp.ok) {
              const code = await resp.text();
              const verMatch = code.match(/@version\s+([^\s\r\n]+)/);
              const newVer = verMatch ? verMatch[1] : '';
              const oldVer = s.version || (s.code.match(/@version\s+([^\s\r\n]+)/) || [])[1] || '0.0';
              if (newVer && newVer !== oldVer) {
                s.code = code;
                s.version = newVer;
                s.lastUpdated = Date.now();
                updatedList.push({ id: s.id, name: s.name, oldVer, newVer });
              }
            }
          } catch (_e) {}
        }
        if (updatedList.length > 0) {
          await storageApi.set({ sf_custom_scripts: scripts });
          await _registerUserScripts();
        }
        sendResponse({ success: true, updated: updatedList });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }
  });
}
