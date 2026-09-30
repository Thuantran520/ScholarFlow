// OS/js/content/userscripts_runner.js
// Bridge between the page (where userscripts run) and the background engine.
//
// Userscripts are injected by the background through
// scripting.registerContentScripts() with world: "MAIN", so they live in the
// page's JS context and cannot touch extension APIs. This content script runs
// in the isolated world and relays the DOM CustomEvents they emit to the
// background, and the answers back.
//
// It deliberately does NOT inject anything itself any more — that used to make
// it fight with the registered scripts and fail under strict page CSP.
(function() {
  'use strict';

  const api = (typeof browser !== 'undefined' && browser.runtime) ? browser : ((typeof chrome !== 'undefined' && chrome.runtime) ? chrome : null);
  if (!api || !api.runtime || !api.runtime.onMessage) return;

  const EXT = (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL)
    ? browser.runtime.getURL('')
    : ((typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL('') : '');
  // Never relay anything to the extension's own pages: the sidebar and the
  // Studio already have the APIs and must not be treated as a content tab.
  const ON_EXTENSION_PAGE = (function() {
    try { return !!(EXT && location.href.indexOf(EXT) === 0); } catch (e) { return false; }
  })();

  function send(message) {
    try {
      const p = api.runtime.sendMessage(message);
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_e) { /* extension context invalidated */ }
  }

  // Fire a message and relay the answer back into the page. The shim waits on a
  // DOM event keyed by reqId, so every request MUST come back with its reqId or
  // the userscript sits until its 15s timeout.
  function request(message, eventName, reqId) {
    const reply = (detail) => {
      respond(eventName, Object.assign({}, detail, { reqId: reqId }));
    };
    let p;
    try {
      // Both engines (Firefox and Chrome 99+) answer with a promise here.
      p = api.runtime.sendMessage(message);
    } catch (_e) {
      reply({ error: 'ScholarFlow: extension context invalidated' });
      return;
    }
    if (p && typeof p.then === 'function') {
      p.then(
        function (res) { reply(res && typeof res === 'object' ? res : { value: res }); },
        function (err) { reply({ error: 'ScholarFlow: ' + String((err && err.message) || err) }); }
      );
      return;
    }
    // No promise: answer rather than re-send, so the request is never duplicated.
    reply({ value: p === undefined ? null : p });
  }

  function respond(name, detail) {
    try {
      document.dispatchEvent(new CustomEvent(name, { detail: detail }));
    } catch (_e) { /* document gone */ }
    try {
      // Also postMessage for cross-world listeners (ISOLATED -> MAIN)
      window.postMessage({ type: name, reqId: detail && detail.reqId, payload: detail }, '*');
    } catch (_e) {}
  }

  function on(name, handler) {
    document.addEventListener(name, function(ev) {
      if (!ev || !ev.detail) return;
      try { handler(ev.detail); } catch (_e) { /* never break the page */ }
    }, true);
  }

  // Cross-world postMessage listener for Firefox Xray wrapper boundary (MAIN -> ISOLATED)
  window.addEventListener('message', function(ev) {
    if (ev.source !== window || !ev.data || typeof ev.data !== 'object') return;
    if (ev.data.type === '__SF_US_XHR_REQ__') {
      const detail = ev.data.payload || ev.data;
      if (!detail || !detail.reqId) return;
      request(
        { action: 'GM_XHR', req: detail },
        '__SF_US_XHR_RES__',
        detail.reqId
      );
    } else if (ev.data.type === '__SF_US_XHR_ABORT__' && ev.data.reqId) {
      send({ action: 'US_XHR_ABORT', reqId: ev.data.reqId });
    }
  });

  // ---- console log feed ---------------------------------------------------
  on('__SF_US_LOG__', function(detail) {
    send({
      action: 'SF_US_LIVE_LOG',
      log: {
        level: String(detail.level || 'log'),
        text: String(detail.text == null ? '' : detail.text).slice(0, 4000),
        scriptId: detail.scriptId || null,
        name: detail.name || '',
        url: location.href.slice(0, 500),
        time: detail.time || Date.now()
      }
    });
  });

  // ---- run statistics -----------------------------------------------------
  on('__SF_US_READY__', function(detail) {
    if (detail && detail.scriptId) send({ action: 'US_SCRIPT_RAN', scriptId: detail.scriptId });
  });

  // ---- GM_xmlhttpRequest --------------------------------------------------
  // The background needs the caller identity to namespace its per-script
  // storage, and the shim is waiting on __SF_US_XHR_RES__ keyed by reqId.
  on('__SF_US_XHR_REQ__', function(detail) {
    if (!detail || !detail.reqId) return;
    request(
      { action: 'GM_XHR', req: detail },
      '__SF_US_XHR_RES__',
      detail.reqId
    );
  });

  on('__SF_US_XHR_ABORT__', function(detail) {
    if (detail && detail.reqId) send({ action: 'US_XHR_ABORT', reqId: detail.reqId });
  });

  // ---- ScholarFlow bridge -------------------------------------------------
  // scriptId/name travel in the envelope, but the background reads them from the
  // payload, so they are merged in here; without this every userscript shares
  // the "anon" storage bucket.
  on('__SF_US_BRIDGE_REQ__', function(detail) {
    if (!detail || !detail.reqId) return;
    const payload = Object.assign(
      {},
      (detail.payload && typeof detail.payload === 'object') ? detail.payload : null,
      { scriptId: detail.scriptId || 'anon', name: detail.name || '' }
    );
    request(
      { action: 'US_BRIDGE', method: detail.method, payload: payload },
      '__SF_US_BRIDGE_RES__',
      detail.reqId
    );
  });

  // ---- GM_registerMenuCommand --------------------------------------------
  on('__SF_US_MENU_ADD__', function(detail) {
    if (!detail || !detail.id) return;
    send({
      action: 'US_MENU_REGISTER',
      entry: {
        id: String(detail.id),
        caption: String(detail.caption == null ? '' : detail.caption),
        scriptId: detail.scriptId || null,
        scriptName: detail.scriptName || '',
        accessKey: detail.accessKey || ''
      }
    });
  });

  // ---- menu commands invoked from the extension UI ------------------------
  // The sidebar cannot call a page callback directly, so it asks the tab to
  // dispatch the click and the shim looks the entry up by id.
  try {
    if (api.runtime.onMessage && api.runtime.onMessage.addListener) {
      api.runtime.onMessage.addListener(function(message) {
        if (!message || message.action !== 'SF_US_MENU_CLICK') return undefined;
        respond('__SF_US_MENU_CLICK__', { id: String(message.id || '') });
        return Promise.resolve({ ok: true });
      });
    }
  } catch (_e) { /* messaging unavailable */ }

  if (ON_EXTENSION_PAGE) return;

  // Tell the background which page this is, so the sidebar can offer
  // "chạy thử script trên trang này" without a second round-trip.
  try {
    document.documentElement.setAttribute('data-sf-userscripts', 'ready');
  } catch (_e) { /* ignore */ }
})();
