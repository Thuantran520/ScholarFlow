// OS/js/core/gm-shim.js
// Greasemonkey compatibility shim for ScholarFlow Userscripts
(function() {
  'use strict';

  const GM_SHIM_CODE = `
// ── ScholarFlow Userscript Compatibility Layer ──
// Uses var + typeof guard to prevent redeclaration errors on pages
// that already define const GM_* polyfills (e.g. Garena CDK pages).
var _sfStorageListeners = typeof _sfStorageListeners !== 'undefined' ? _sfStorageListeners : {};

var GM_getValue = typeof GM_getValue === 'function' ? GM_getValue : function(key, def) {
  try { return JSON.parse(localStorage.getItem('GM_' + key)) ?? def; }
  catch(e) { return localStorage.getItem('GM_' + key) || def; }
};

var GM_setValue = typeof GM_setValue === 'function' ? GM_setValue : function(key, val) {
  var oldVal = GM_getValue(key, undefined);
  localStorage.setItem('GM_' + key, JSON.stringify(val));
  try {
    document.dispatchEvent(new CustomEvent('__SF_GM_VAL_CHANGE__', {
      detail: { key: key, oldValue: oldVal, newValue: val, remote: false }
    }));
  } catch(e) {}
};

var GM_deleteValue = typeof GM_deleteValue === 'function' ? GM_deleteValue : function(key) {
  var oldVal = GM_getValue(key, undefined);
  localStorage.removeItem('GM_' + key);
  try {
    document.dispatchEvent(new CustomEvent('__SF_GM_VAL_CHANGE__', {
      detail: { key: key, oldValue: oldVal, newValue: undefined, remote: false }
    }));
  } catch(e) {}
};

var GM_listValues = typeof GM_listValues === 'function' ? GM_listValues : function() {
  var r = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.startsWith('GM_')) r.push(k.slice(3));
  }
  return r;
};

var GM_addStyle = typeof GM_addStyle === 'function' ? GM_addStyle : function(css) {
  var style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
  return style;
};

var GM_xmlhttpRequest = typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : function(details) {
  if (!details || !details.url) return;
  var reqId = 'xhr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  var onRes = function(e) {
    if (e.detail && e.detail.reqId === reqId) {
      document.removeEventListener('__SF_US_XHR_RES__', onRes);
      var res = e.detail;
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

var GM_addValueChangeListener = typeof GM_addValueChangeListener === 'function' ? GM_addValueChangeListener : function(name, callback) {
  var listenerId = 'vcl_' + Math.random().toString(36).substring(2, 9);
  var handler = function(e) {
    if (e.detail && e.detail.key === name && typeof callback === 'function') {
      callback(name, e.detail.oldValue, e.detail.newValue, e.detail.remote);
    }
  };
  _sfStorageListeners[listenerId] = handler;
  document.addEventListener('__SF_GM_VAL_CHANGE__', handler);
  return listenerId;
};

var GM_removeValueChangeListener = typeof GM_removeValueChangeListener === 'function' ? GM_removeValueChangeListener : function(listenerId) {
  if (_sfStorageListeners[listenerId]) {
    document.removeEventListener('__SF_GM_VAL_CHANGE__', _sfStorageListeners[listenerId]);
    delete _sfStorageListeners[listenerId];
  }
};

var GM_setClipboard = typeof GM_setClipboard === 'function' ? GM_setClipboard : function(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function() {});
    }
  } catch(e) {}
};

var GM_notification = typeof GM_notification === 'function' ? GM_notification : function(text, title, image, onclick) {
  try {
    var toast = document.createElement('div');
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

var GM_openInTab = typeof GM_openInTab === 'function' ? GM_openInTab : function(url, options) {
  try { window.open(url, '_blank'); } catch(e) {}
};

var GM = typeof GM !== 'undefined' ? GM : {
  getValue: async function(key, def) { return GM_getValue(key, def); },
  setValue: async function(key, val) { return GM_setValue(key, val); },
  deleteValue: async function(key) { return GM_deleteValue(key); },
  listValues: async function() { return GM_listValues(); },
  addStyle: function(css) { return GM_addStyle(css); },
  xmlHttpRequest: function(details) {
    return new Promise(function(resolve, reject) {
      var d = Object.assign({}, details, {
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
