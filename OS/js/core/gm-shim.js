// OS/js/core/gm-shim.js
// Greasemonkey compatibility shim for ScholarFlow Userscripts
(function() {
  'use strict';

  const GM_SHIM_CODE = `
// ── ScholarFlow Userscript Compatibility Layer ──
const _sfStorageListeners = {};

const GM_getValue = function(key, def) {
  try { return JSON.parse(localStorage.getItem('GM_' + key)) ?? def; }
  catch(e) { return localStorage.getItem('GM_' + key) || def; }
};

const GM_setValue = function(key, val) {
  const oldVal = GM_getValue(key, undefined);
  localStorage.setItem('GM_' + key, JSON.stringify(val));
  try {
    document.dispatchEvent(new CustomEvent('__SF_GM_VAL_CHANGE__', {
      detail: { key: key, oldValue: oldVal, newValue: val, remote: false }
    }));
  } catch(e) {}
};

const GM_deleteValue = function(key) {
  const oldVal = GM_getValue(key, undefined);
  localStorage.removeItem('GM_' + key);
  try {
    document.dispatchEvent(new CustomEvent('__SF_GM_VAL_CHANGE__', {
      detail: { key: key, oldValue: oldVal, newValue: undefined, remote: false }
    }));
  } catch(e) {}
};

const GM_listValues = function() {
  const r = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('GM_')) r.push(k.slice(3));
  }
  return r;
};

const GM_addStyle = function(css) {
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
  return style;
};

const GM_xmlhttpRequest = function(details) {
  if (!details || !details.url) return;
  const reqId = 'xhr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const onRes = function(e) {
    if (e.detail && e.detail.reqId === reqId) {
      document.removeEventListener('__SF_US_XHR_RES__', onRes);
      const res = e.detail;
      if (res.error) {
        if (typeof details.onerror === 'function') details.onerror(res);
      } else {
        if (typeof details.onload === 'function') details.onload(res);
      }
    }
  };
  document.addEventListener('__SF_US_XHR_RES__', onRes);
  document.dispatchEvent(new CustomEvent('__SF_US_XHR_REQ__', {
    detail: {
      reqId: reqId,
      url: details.url,
      method: details.method || 'GET',
      headers: details.headers || {},
      data: details.data || null,
      timeout: details.timeout || 30000
    }
  }));
};

const GM_addValueChangeListener = function(name, callback) {
  const listenerId = 'vcl_' + Math.random().toString(36).substring(2, 9);
  const handler = function(e) {
    if (e.detail && e.detail.key === name && typeof callback === 'function') {
      callback(name, e.detail.oldValue, e.detail.newValue, e.detail.remote);
    }
  };
  _sfStorageListeners[listenerId] = handler;
  document.addEventListener('__SF_GM_VAL_CHANGE__', handler);
  return listenerId;
};

const GM_removeValueChangeListener = function(listenerId) {
  if (_sfStorageListeners[listenerId]) {
    document.removeEventListener('__SF_GM_VAL_CHANGE__', _sfStorageListeners[listenerId]);
    delete _sfStorageListeners[listenerId];
  }
};

const GM_setClipboard = function(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function() {});
    }
  } catch(e) {}
};

const GM_notification = function(text, title, image, onclick) {
  try {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999999;background:#0f172a;color:#f8fafc;border:1px solid #38bdf8;border-radius:8px;padding:10px 14px;box-shadow:0 10px 30px rgba(0,0,0,0.8);font-family:sans-serif;font-size:12px;cursor:pointer;display:flex;gap:8px;align-items:center;transition:opacity 0.3s;max-width:320px;';
    toast.innerHTML = '<strong style="color:#38bdf8;">' + (title || 'ScholarFlow') + ':</strong> <span>' + text + '</span>';
    toast.onclick = function() {
      if (typeof onclick === 'function') onclick();
      toast.remove();
    };
    (document.body || document.documentElement).appendChild(toast);
    setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { toast.remove(); }, 300); }, 4000);
  } catch(e) {}
};

const GM_openInTab = function(url, options) {
  try { window.open(url, '_blank'); } catch(e) {}
};

const GM = {
  getValue: async function(key, def) { return GM_getValue(key, def); },
  setValue: async function(key, val) { return GM_setValue(key, val); },
  deleteValue: async function(key) { return GM_deleteValue(key); },
  listValues: async function() { return GM_listValues(); },
  addStyle: function(css) { return GM_addStyle(css); },
  xmlHttpRequest: function(details) {
    return new Promise(function(resolve, reject) {
      const d = Object.assign({}, details, {
        onload: function(r) { resolve(r); },
        onerror: function(err) { reject(err); }
      });
      GM_xmlhttpRequest(d);
    });
  },
  setClipboard: function(text) { GM_setClipboard(text); },
  notification: function(text, title, image, onclick) { GM_notification(text, title, image, onclick); },
  openInTab: function(url, options) { GM_openInTab(url, options); }
};
`;

  if (typeof window !== 'undefined') {
    window.SF_GM_SHIM = GM_SHIM_CODE;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.SF_FULL_GM_SHIM = GM_SHIM_CODE;
  }
})();
