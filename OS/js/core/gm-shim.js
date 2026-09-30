// OS/js/core/gm-shim.js
// Greasemonkey compatibility shim for ScholarFlow Userscripts
(function() {
  'use strict';

  const GM_SHIM_CODE = `
// ── ScholarFlow Userscript Compatibility Layer ──
// Uses var + typeof guard to prevent redeclaration errors on pages
// that already define const GM_* polyfills (e.g. Garena CDK pages).
// Also provides safe global assignment helpers that won't throw on const/frozen bindings.
var _sfStorageListeners = typeof _sfStorageListeners !== 'undefined' ? _sfStorageListeners : {};

var _sfGM_getValue = typeof GM_getValue === 'function' ? GM_getValue : function(key, def) {
  try { return JSON.parse(localStorage.getItem('GM_' + key)) ?? def; }
  catch(e) { return localStorage.getItem('GM_' + key) || def; }
};

var _sfGM_setValue = typeof GM_setValue === 'function' ? GM_setValue : function(key, val) {
  var oldVal = _sfGM_getValue(key, undefined);
  localStorage.setItem('GM_' + key, JSON.stringify(val));
  try {
    document.dispatchEvent(new CustomEvent('__SF_GM_VAL_CHANGE__', {
      detail: { key: key, oldValue: oldVal, newValue: val, remote: false }
    }));
  } catch(e) {}
};

var _sfGM_deleteValue = typeof GM_deleteValue === 'function' ? GM_deleteValue : function(key) {
  var oldVal = _sfGM_getValue(key, undefined);
  localStorage.removeItem('GM_' + key);
  try {
    document.dispatchEvent(new CustomEvent('__SF_GM_VAL_CHANGE__', {
      detail: { key: key, oldValue: oldVal, newValue: undefined, remote: false }
    }));
  } catch(e) {}
};

var _sfGM_listValues = typeof GM_listValues === 'function' ? GM_listValues : function() {
  var r = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.startsWith('GM_')) r.push(k.slice(3));
  }
  return r;
};

var _sfGM_addStyle = typeof GM_addStyle === 'function' ? GM_addStyle : function(css) {
  var style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
  return style;
};

var _sfGM_xmlhttpRequest = typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : function(details) {
  if (!details || !details.url) return;
  var reqId = 'xhr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

  // Use postMessage for cross-world communication (ISOLATED <-> MAIN)
  // CustomEvent.detail is not accessible across worlds in Firefox due to Xray wrappers
  var msgHandler = function(e) {
    if (e.source !== window || !e.data || typeof e.data !== 'object') return;
    if (e.data.type !== '__SF_US_XHR_RES__') return;
    var resReqId = e.data.reqId || (e.data.payload && e.data.payload.reqId);
    if (resReqId !== reqId) return;
    window.removeEventListener('message', msgHandler);
    document.removeEventListener('__SF_US_XHR_RES__', legacyHandler);
    var res = e.data.payload || e.data;
    if (res && res.error) {
      if (typeof details.onerror === 'function') details.onerror(res);
    } else {
      if (typeof details.onload === 'function') details.onload(res);
    }
  };
  window.addEventListener('message', msgHandler);

  var legacyHandler = function(e) {
    var d = e && e.detail;
    if (d && d.reqId === reqId) {
      document.removeEventListener('__SF_US_XHR_RES__', legacyHandler);
      window.removeEventListener('message', msgHandler);
      if (d.error) {
        if (typeof details.onerror === 'function') details.onerror(d);
      } else {
        if (typeof details.onload === 'function') details.onload(d);
      }
    }
  };
  document.addEventListener('__SF_US_XHR_RES__', legacyHandler);

  var reqPayload = {
    reqId: reqId,
    url: details.url,
    method: details.method || 'GET',
    headers: details.headers || {},
    data: details.data || null,
    timeout: details.timeout || 30000
  };

  try {
    document.dispatchEvent(new CustomEvent('__SF_US_XHR_REQ__', { detail: reqPayload }));
  } catch(e) {}
  try {
    window.postMessage({ type: '__SF_US_XHR_REQ__', reqId: reqId, payload: reqPayload }, '*');
  } catch(e) {}
};

var _sfGM_addValueChangeListener = typeof GM_addValueChangeListener === 'function' ? GM_addValueChangeListener : function(name, callback) {
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

var _sfGM_removeValueChangeListener = typeof GM_removeValueChangeListener === 'function' ? GM_removeValueChangeListener : function(listenerId) {
  if (_sfStorageListeners[listenerId]) {
    document.removeEventListener('__SF_GM_VAL_CHANGE__', _sfStorageListeners[listenerId]);
    delete _sfStorageListeners[listenerId];
  }
};

var _sfGM_setClipboard = typeof GM_setClipboard === 'function' ? GM_setClipboard : function(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function() {});
    }
  } catch(e) {}
};

var _sfGM_notification = typeof GM_notification === 'function' ? GM_notification : function(text, title, image, onclick) {
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

var _sfGM_openInTab = typeof GM_openInTab === 'function' ? GM_openInTab : function(url, options) {
  try { window.open(url, '_blank'); } catch(e) {}
};

var _sfGM_registerMenuCommand = typeof GM_registerMenuCommand === 'function' ? GM_registerMenuCommand : function(caption, onClick) {
  try {
    document.dispatchEvent(new CustomEvent('__SF_US_MENU_REQ__', {
      detail: { caption: caption }
    }));
  } catch(e) {}
  return caption;
};

var _sfGM_unregisterMenuCommand = typeof GM_unregisterMenuCommand === 'function' ? GM_unregisterMenuCommand : function() {};

var _sfGM_download = typeof GM_download === 'function' ? GM_download : function(options) {
  if (typeof options === 'string') options = { url: options, name: '' };
  if (!options || !options.url) return;
  try {
    var a = document.createElement('a');
    a.href = options.url;
    if (options.name) a.download = options.name;
    a.target = '_blank';
    (document.body || document.documentElement).appendChild(a);
    a.click();
    a.remove();
    if (typeof options.onload === 'function') options.onload();
  } catch(e) {
    if (typeof options.onerror === 'function') options.onerror(e);
  }
};

var _sfGM_info = (typeof GM_info !== 'undefined' && GM_info) ? GM_info : {
  script: { name: 'ScholarFlow Script', version: '1.0' },
  scriptHandler: 'ScholarFlow',
  version: '1.0'
};

var _sfGM_log = typeof GM_log === 'function' ? GM_log : function() {
  console.log.apply(console, arguments);
};

var _sfGM_cookie = typeof GM_cookie !== 'undefined' ? GM_cookie : {
  list: function(details, cb) { if (cb) cb([]); },
  set: function(details, cb) { if (cb) cb(); },
  delete: function(details, cb) { if (cb) cb(); }
};

// Safe global assignment helper — never throws even if binding is const/frozen
var _sfSafeDefine = function(name, value) {
  try {
    if (typeof window[name] === 'undefined') {
      window[name] = value;
    } else {
      try { window[name] = value; } catch(e) {}
      try {
        Object.defineProperty(window, name, {
          value: value,
          writable: true,
          configurable: true
        });
      } catch(e2) {}
    }
  } catch(e) {}
};

try {
  // Ensure GM object exists (handle const/frozen GM case)
  var _sfGM = {};
  _sfGM.getValue = function(key, def) { return _sfGM_getValue(key, def); };
  _sfGM.setValue = function(key, val) { return _sfGM_setValue(key, val); };
  _sfGM.deleteValue = function(key) { return _sfGM_deleteValue(key); };
  _sfGM.listValues = function() { return _sfGM_listValues(); };
  _sfGM.addStyle = function(css) { return _sfGM_addStyle(css); };
  _sfGM.xmlHttpRequest = function(details) {
    return new Promise(function(resolve, reject) {
      var d = Object.assign({}, details, {
        onload: function(r) { resolve(r); },
        onerror: function(err) { reject(err); }
      });
      _sfGM_xmlhttpRequest(d);
    });
  };
  _sfGM.setClipboard = function(text) { _sfGM_setClipboard(text); };
  _sfGM.notification = function(text, title, image, onclick) { _sfGM_notification(text, title, image, onclick); };
  _sfGM.openInTab = function(url, options) { _sfGM_openInTab(url, options); };
  _sfGM.registerMenuCommand = function(caption, onClick) { return _sfGM_registerMenuCommand(caption, onClick); };
  _sfGM.unregisterMenuCommand = function(id) { return _sfGM_unregisterMenuCommand(id); };
  _sfGM.download = function(options) { return _sfGM_download(options); };
  _sfGM.info = _sfGM_info;
  _sfGM.cookie = _sfGM_cookie;
  _sfGM.log = _sfGM_log;

  // Try to install on global GM (override if possible)
  try {
    if (typeof GM === 'undefined') {
      GM = _sfGM;
    } else {
      // Try to define properties on existing GM
      Object.keys(_sfGM).forEach(function(k) {
        try { GM[k] = _sfGM[k]; } catch(e) {}
      });
    }
  } catch(e) {
    // If GM is const/frozen, try to redefine window.GM
    try {
      Object.defineProperty(window, 'GM', {
        value: _sfGM,
        writable: true,
        configurable: true
      });
    } catch(e2) {
      // Last resort: the global functions GM_openInTab etc. are already set below
    }
  }

  // Install global GM_* functions using safe define (won't throw on const/frozen)
  _sfSafeDefine('GM_getValue', _sfGM_getValue);
  _sfSafeDefine('GM_setValue', _sfGM_setValue);
  _sfSafeDefine('GM_deleteValue', _sfGM_deleteValue);
  _sfSafeDefine('GM_listValues', _sfGM_listValues);
  _sfSafeDefine('GM_addStyle', _sfGM_addStyle);
  _sfSafeDefine('GM_xmlhttpRequest', _sfGM_xmlhttpRequest);
  _sfSafeDefine('GM_addValueChangeListener', _sfGM_addValueChangeListener);
  _sfSafeDefine('GM_removeValueChangeListener', _sfGM_removeValueChangeListener);
  _sfSafeDefine('GM_setClipboard', _sfGM_setClipboard);
  _sfSafeDefine('GM_notification', _sfGM_notification);
  _sfSafeDefine('GM_openInTab', _sfGM_openInTab);
  _sfSafeDefine('GM_registerMenuCommand', _sfGM_registerMenuCommand);
  _sfSafeDefine('GM_unregisterMenuCommand', _sfGM_unregisterMenuCommand);
  _sfSafeDefine('GM_download', _sfGM_download);
  _sfSafeDefine('GM_info', _sfGM_info);
  _sfSafeDefine('GM_log', _sfGM_log);
  _sfSafeDefine('GM_cookie', _sfGM_cookie);

  // Expose internal _sfGM_* functions globally so sanitized user script code
  // (which calls _sfGM_addStyle, _sfGM_getValue, etc.) can resolve them.
  // The sanitizer rewrites GM_addStyle -> _sfGM_addStyle, etc.
  window._sfGM_getValue = _sfGM_getValue;
  window._sfGM_setValue = _sfGM_setValue;
  window._sfGM_deleteValue = _sfGM_deleteValue;
  window._sfGM_listValues = _sfGM_listValues;
  window._sfGM_addStyle = _sfGM_addStyle;
  window._sfGM_xmlhttpRequest = _sfGM_xmlhttpRequest;
  window._sfGM_addValueChangeListener = _sfGM_addValueChangeListener;
  window._sfGM_removeValueChangeListener = _sfGM_removeValueChangeListener;
  window._sfGM_setClipboard = _sfGM_setClipboard;
  window._sfGM_notification = _sfGM_notification;
  window._sfGM_openInTab = _sfGM_openInTab;
  window._sfGM_registerMenuCommand = _sfGM_registerMenuCommand;
  window._sfGM_unregisterMenuCommand = _sfGM_unregisterMenuCommand;
  window._sfGM_download = _sfGM_download;
  window._sfGM_info = _sfGM_info;
  window._sfGM_log = _sfGM_log;
  window._sfGM_cookie = _sfGM_cookie;
} catch(e) {}
`;

  function buildConsoleRelay(scriptId, scriptName) {
    return '';
  }

  function build(opts) {
    var code = GM_SHIM_CODE;
    if (opts && opts.require && Array.isArray(opts.require)) {
      opts.require.forEach(function(r) {
        if (r && r.text) code += '\n' + r.text;
      });
    }
    if (opts && opts.code) {
      code += '\n' + opts.code;
    }
    return code;
  }

  if (typeof window !== 'undefined') {
    window.SF_GM_SHIM = GM_SHIM_CODE;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.SF_FULL_GM_SHIM = GM_SHIM_CODE;
    globalThis.SF_US_SHIM = { build: build, buildConsoleRelay: buildConsoleRelay };
  }
})();
