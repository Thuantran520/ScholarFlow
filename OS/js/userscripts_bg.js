// OS/js/userscripts_bg.js
// Background engine for the Userscripts Studio.
//
// Registered as an ES module from background.js (MV3 service worker on
// Chromium, MV3 event page on Firefox) so it is loaded identically by every
// browser flavour. This replaced the old `importScripts()` call, which never
// resolved on Chromium and silently disabled the whole feature there.
//
// Injection mechanism: scripting.registerContentScripts() rather than
// chrome.userScripts. It needs only the permissions the extension already has
// ("scripting" + <all_urls>), needs no developer-mode toggle, and — like every
// content script — is exempt from the page CSP, so no nonce has to be stolen.

// Both live in OS/js/core/, i.e. siblings of this file, so the specifier is
// './core/...'. Getting this wrong resolves to OS/core/... and kills the whole
// background module at load, which surfaces as "engine unavailable".
import './core/userscript-meta.js';
import './core/gm-shim.js';

const US_STORE_KEY = 'sf_custom_scripts';
const US_MENU_KEY = 'sf_us_menu';
const US_USDATA_PREFIX = 'sf_usdata_';
const US_REG_PREFIX = 'sf_usr_';
const US_AUTO_UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
const US_MAX_FETCH_BYTES = 2 * 1024 * 1024;

/** Read once per worker lifetime so status queries never hit storage twice. */
let _lastRegisteredIds = [];
let _registerTimer = null;
const _runStatsTimers = new Map();
let _ignoreStoreChange = false;
let _worldUnsupported = false;

const _runtime = () => (typeof browser !== 'undefined' && browser.runtime)
  ? browser.runtime
  : (typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime : null);
const _isFirefox = typeof browser !== 'undefined' && browser.runtime && browser.runtime.getBrowserInfo;
const _storage = () => {
  const b = (typeof browser !== 'undefined' && browser.storage) ? browser.storage : null;
  const c = (typeof chrome !== 'undefined' && chrome.storage) ? chrome.storage : null;
  const api = (b && b.local) || (c && c.local) || null;
  if (!api) return null;
  return {
    get: (keys) => {
      try {
        const p = api.get(keys);
        if (p && typeof p.then === 'function') return p;
        return new Promise((resolve) => api.get(keys, resolve));
      } catch (e) {
        return Promise.resolve({});
      }
    },
    set: (data) => {
      try {
        const p = api.set(data);
        if (p && typeof p.then === 'function') return p;
        return new Promise((resolve) => api.set(data, resolve));
      } catch (e) {
        return Promise.resolve();
      }
    },
    remove: (keys) => {
      try {
        const p = api.remove(keys);
        if (p && typeof p.then === 'function') return p;
        return new Promise((resolve) => api.remove(keys, resolve));
      } catch (e) {
        return Promise.resolve();
      }
    }
  };
};
const _scripting = () => (typeof browser !== 'undefined' && browser.scripting)
  ? browser.scripting
  : (typeof chrome !== 'undefined' && chrome.scripting ? chrome.scripting : null);
const _userScripts = () => (typeof browser !== 'undefined' && browser.userScripts)
  ? browser.userScripts
  : null;

/** Registered-script ids may only contain [A-Za-z0-9_-]. */
function _regId(scriptId) {
  return US_REG_PREFIX + String(scriptId || 'anon').replace(/[^A-Za-z0-9_-]/g, '_');
}

function _shim() {
    const full = (typeof globalThis !== 'undefined' && globalThis.SF_FULL_GM_SHIM) || null;
    const api = (typeof globalThis !== 'undefined' && globalThis.SF_US_SHIM) || null;
    if (api && typeof api.build === 'function') return api;
    if (full) {
      return {
        buildConsoleRelay: function() { return ''; },
        build: function(opts) { return full + (opts && opts.code ? '\n' + opts.code : ''); }
      };
    }
    return null;
  }

function _meta() {
  return (typeof globalThis !== 'undefined' && globalThis.SF_US_META) || null;
}

async function _readScripts() {
  const store = _storage();
  if (!store) return [];
  const res = await store.get(US_STORE_KEY);
  const list = res && Array.isArray(res[US_STORE_KEY]) ? res[US_STORE_KEY] : [];
  return list;
}

async function _writeScripts(scripts) {
  const store = _storage();
  if (!store) return;
  _ignoreStoreChange = true;
  await store.set({ [US_STORE_KEY]: scripts });
  setTimeout(() => { _ignoreStoreChange = false; }, 1500);
}

function _buildCode(script) {
  const shimApi = _shim();
  let code = String((script && script.code) || '');
  if (!shimApi || typeof shimApi.build !== 'function') return code;
  const meta = _meta();
  if (meta && typeof meta.sanitizeUserscriptCode === 'function') {
    code = meta.sanitizeUserscriptCode(code);
  }
  const requireTexts = Array.isArray(script.requires)
    ? script.requires.map((r) => (r && typeof r.text === 'string' ? r.text : '')).filter(Boolean)
    : [];
  const resources = (script.resources && typeof script.resources === 'object') ? script.resources : {};
  return shimApi.buildConsoleRelay(script.id, script.name || 'script') + '\n' +
    shimApi.build({
      id: script.id,
      name: script.name,
      require: requireTexts,
      resources: resources,
      code: code
    });
}

function _toRegisteredScript(script) {
  const meta = _meta();
  const f = meta ? meta.fieldsOf(script) : {
    matches: (script.matches && script.matches.length) ? script.matches : ['<all_urls>'],
    explicitMatches: (script.matches && script.matches.length) ? script.matches.slice() : [],
    excludes: script.excludes || [],
    noframes: !!script.noframes,
    runAt: script.runAt || 'document_idle'
  };
  const explicit = Array.isArray(f.explicitMatches) ? f.explicitMatches.filter(Boolean) : [];
  const matches = explicit.length ? explicit.slice() : [];
  const code = _buildCode(script);
  const isFirefox = typeof browser !== 'undefined' && browser.runtime && browser.runtime.getBrowserInfo;
  const jsEntry = isFirefox ? 'data:text/javascript,' + encodeURIComponent(code) : code;
  const reg = {
    id: _regId(script.id),
    matches: matches,
    js: [jsEntry],
    runAt: meta && meta.isValidRunAt(f.runAt) ? meta.normalizeRunAt(f.runAt) : 'document_idle',
    allFrames: script.allFrames === true && !f.noframes,
    world: script.world === 'ISOLATED' ? 'ISOLATED' : 'MAIN',
    persistAcrossSessions: true
  };
  if (Array.isArray(f.excludeMatches) && f.excludeMatches.length) {
    reg.excludeMatches = f.excludeMatches.slice();
  }
  return reg;
}

/** A script with no @match and no usable scope cannot be registered. */
function _isRegistrable(script) {
  const meta = _meta();
  if (!meta) return true;
  const f = meta.fieldsOf(script);
  return (Array.isArray(f.explicitMatches) && f.explicitMatches.filter(Boolean).length) > 0;
}

function _describeScript(script, registered) {
  return {
    id: script.id,
    regId: _regId(script.id),
    name: script.name || '',
    active: script.active !== false,
    world: registered ? registered.world : (script.world === 'ISOLATED' ? 'ISOLATED' : 'MAIN'),
    runAt: registered ? registered.runAt : (script.runAt || 'document_idle'),
    matches: registered ? registered.matches.slice() : ((script.matches || []).slice()),
    registered: !!registered
  };
}

/** Register / update / unregister so the live set mirrors the stored set. */
async function _registerAll(reason) {
  const scripting = _scripting();
  if (!scripting) {
    console.warn('[ScholarFlow] scripting API unavailable — userscripts are disabled');
    return { ok: false, error: 'scripting unavailable', registered: [], warnings: ['engine_unavailable'] };
  }

  if (_isFirefox) {
    return _registerAllFirefox(reason);
  }

  if (typeof scripting.registerContentScripts !== 'function') {
    console.warn('[ScholarFlow] scripting.registerContentScripts unavailable — userscripts are disabled');
    return { ok: false, error: 'registerContentScripts unavailable', registered: [], warnings: ['engine_unavailable'] };
  }
  const scripts = await _readScripts();
  const active = scripts.filter((s) => s && s.active !== false && String(s.code || '').trim());
  const registrable = active.filter(_isRegistrable);
  const skippedNoMatch = active.length - registrable.length;
  const warnings = [];
  if (skippedNoMatch) warnings.push('no_match_pattern');
  const wanted = registrable.map(_toRegisteredScript);
  const wantedIds = wanted.map((r) => r.id);
  const registered = [];

  let existingIds = [];
  if (typeof scripting.getRegisteredContentScripts === 'function') {
    try {
      const all = await scripting.getRegisteredContentScripts();
      existingIds = (all || [])
        .filter((r) => String(r.id || '').indexOf(US_REG_PREFIX) === 0)
        .map((r) => r.id);
    } catch (e) {
      console.warn('[ScholarFlow] getRegisteredContentScripts failed', e);
      existingIds = _lastRegisteredIds.slice();
    }
  } else {
    existingIds = _lastRegisteredIds.slice();
  }

  const stale = existingIds.filter((id) => wantedIds.indexOf(id) === -1);
  if (stale.length) {
    try {
      await scripting.unregisterContentScripts({ ids: stale });
    } catch (e) {
      console.warn('[ScholarFlow] unregister failed', e);
    }
  }

  const shaped = _worldUnsupported
    ? wanted.map((r) => Object.assign({}, r, { world: undefined }))
    : wanted;

  const toRegister = shaped.filter((r) => existingIds.indexOf(r.id) === -1);
  const toUpdate = shaped.filter((r) => existingIds.indexOf(r.id) !== -1);

  if (toUpdate.length && typeof scripting.updateContentScripts === 'function') {
    try {
      await scripting.updateContentScripts(toUpdate);
    } catch (e) {
      if (!_worldUnsupported && /world/i.test(String(e && e.message))) {
        _worldUnsupported = true;
        return _registerAll('world-retry');
      }
      try {
        await scripting.unregisterContentScripts({ ids: toUpdate.map((r) => r.id) });
      } catch (unregErr) {
        console.warn('[ScholarFlow] update->unregister failed', unregErr);
      }
      toRegister.push(...toUpdate);
    }
  } else if (toUpdate.length) {
    try {
      await scripting.unregisterContentScripts({ ids: toUpdate.map((r) => r.id) });
    } catch (e) { /* ignore */ }
    toRegister.push(...toUpdate);
  }

  if (toRegister.length) {
    try {
      await scripting.registerContentScripts(toRegister);
    } catch (e) {
      const okIds = [];
      for (const reg of toRegister) {
        try {
          await scripting.registerContentScripts([reg]);
          okIds.push(reg.id);
        } catch (singleErr) {
          console.warn('[ScholarFlow] register failed for ' + reg.id, singleErr);
        }
      }
      _lastRegisteredIds = existingIds.concat(okIds);
      for (const reg of wanted) {
        if (okIds.indexOf(reg.id) !== -1 || toUpdate.some((u) => u.id === reg.id)) {
          registered.push(reg);
        }
      }
      return { ok: true, reason: reason, registered: registered.map((r) => _describeScript({ id: r.id }, r)), warnings: warnings };
    }
  }

  _lastRegisteredIds = wantedIds;
  for (const reg of wanted) registered.push(reg);
  return { ok: true, reason: reason, registered: registered.map((r) => _describeScript({ id: r.id }, r)), warnings: warnings };
}

/** Firefox-specific registration through the MV3 userScripts API.
 * scripting.executeScript accepts only extension files or a serialized
 * function: it has no `code` field for stored userscript source. */
async function _registerAllFirefox(reason) {
  const userScripts = _userScripts();
  if (!userScripts || typeof userScripts.register !== 'function') {
    return { ok: false, error: 'userScripts permission is required', registered: [],
      warnings: ['userscripts_permission_required'], needsUserScripts: true };
  }
  const scripts = await _readScripts();
  const active = scripts.filter((s) => s && s.active !== false && String(s.code || '').trim());
  const registrable = active.filter(_isRegistrable);
  const skippedNoMatch = active.length - registrable.length;
  const warnings = [];
  if (skippedNoMatch) warnings.push('no_match_pattern');

  try {
    const existing = typeof userScripts.getScripts === 'function' ? await userScripts.getScripts() : [];
    const ids = (existing || []).map((item) => item && item.id)
      .filter((id) => typeof id === 'string' && id.indexOf(US_REG_PREFIX) === 0);
    if (ids.length && typeof userScripts.unregister === 'function') await userScripts.unregister({ ids: ids });

    const registrations = registrable.map((script) => {
      const f = _meta() ? _meta().fieldsOf(script) : {};
      const registration = {
        id: _regId(script.id),
        js: [{ code: _buildCode(script) }],
        matches: (f.explicitMatches || script.matches || []).filter(Boolean),
        runAt: _meta() && _meta().isValidRunAt(f.runAt) ? _meta().normalizeRunAt(f.runAt) : 'document_idle',
        allFrames: script.allFrames === true && !f.noframes,
        world: script.world === 'ISOLATED' ? 'USER_SCRIPT' : 'MAIN'
      };
      if (Array.isArray(f.excludeMatches) && f.excludeMatches.length) registration.excludeMatches = f.excludeMatches.slice();
      return registration;
    });
    if (registrations.length) await userScripts.register(registrations);
  } catch (e) {
    console.warn('[ScholarFlow] Firefox userScripts registration failed', e);
    return { ok: false, error: String((e && e.message) || e), registered: [],
      warnings: warnings.concat(['userscripts_registration_failed']) };
  }
  _lastRegisteredIds = registrable.map((script) => _regId(script.id));
  return { ok: true, reason: reason, registered: registrable.map((r) => _describeScript(r, null)), warnings: warnings };
}

async function _requestFirefoxUserScriptsPermission() {
  const perms = (typeof browser !== 'undefined' && browser.permissions) ? browser.permissions : null;
  if (!perms || typeof perms.request !== 'function') return { ok: false, error: 'permissions API unavailable' };
  try {
    const granted = await perms.request({ permissions: ['userScripts'] });
    return granted ? _registerAll('userscripts-permission-granted') : { ok: false, error: 'userScripts permission was not granted' };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

/** Run one user-selected script immediately without adding an inline <script>
 * element to the page. CSP-protected sites such as Facebook correctly reject
 * inline script text, even if a nonce is copied from the page. */
async function _runFirefoxUserScriptNow(tabId, script) {
  const userScripts = _userScripts();
  if (!userScripts || typeof userScripts.execute !== 'function') {
    return { ok: false, error: 'userScripts permission is required' };
  }
  try {
    await userScripts.execute({
      target: { tabId: Number(tabId) },
      js: [{ code: _buildCode(script || {}) }],
      world: script && script.world === 'ISOLATED' ? 'USER_SCRIPT' : 'MAIN'
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

function _scheduleRegister(reason) {
  if (_registerTimer) clearTimeout(_registerTimer);
  _registerTimer = setTimeout(() => {
    _registerTimer = null;
    _registerAll(reason).catch((e) => console.warn('[ScholarFlow] register failed', e));
  }, 250);
}

function _scheduleRunStats(scriptId) {
  if (!scriptId) return;
  if (_runStatsTimers.has(scriptId)) clearTimeout(_runStatsTimers.get(scriptId));
  const handle = setTimeout(async () => {
    _runStatsTimers.delete(scriptId);
    const scripts = await _readScripts();
    let touched = false;
    for (const s of scripts) {
      if (s && s.id === scriptId) {
        s.runCount = (Number(s.runCount) || 0) + 1;
        s.lastRun = Date.now();
        touched = true;
        break;
      }
    }
    if (touched) await _writeScripts(scripts);
  }, 800);
  _runStatsTimers.set(scriptId, handle);
}

// ---------------------------------------------------------------------------
// Fetching a userscript from a URL (user-initiated, read-only)
//
// Runs here rather than in the sidebar because the service worker has host
// permissions and no page CSP, so a cross-origin GET needs no CORS dance and no
// custom headers (adding a User-Agent turns the request into a preflight).
// Nothing is installed here: the background only downloads and parses, then the
// user reviews the source in the sidebar before anything is written.
// ---------------------------------------------------------------------------
const US_FETCH_MAX_BYTES = 2 * 1024 * 1024;
const US_FETCH_MAX_URLS = 20;
const US_FETCH_TIMEOUT_MS = 20000;

/** Pages that host a userscript we can install directly. */
const US_SCRIPT_EXT_RE = /\.user\.js(\?|#|$)/i;

/**
 * Pull the real .user.js URL out of a script-hosting page.
 * Handles Greasy Fork (absolute update.greasyfork.org links) and the common
 * "<script-host>/scripts/<id>/<slug>/code/<slug>.user.js" relative form.
 * Returns null when the HTML holds no installable script.
 */
function _extractUserScriptUrl(html, pageUrl) {
  const text = String(html || '');

  // Absolute install/update links first - they are unambiguous.
  const absolute = text.match(
    /https?:\/\/[a-z0-9.-]*greasyfork\.org\/scripts\/\d+\/[^"'<>\\\s]+?\.user\.js/i
  );
  if (absolute) return absolute[0];

  const patterns = [
    /href=["']([^"']*\/scripts\/\d+\/[^"']*\/code\/[^"']*?\.user\.js[^"']*)["']/i,
    /href=["']([^"']*\/scripts\/\d+\/[^"']*?\.user\.js[^"']*)["']/i,
    /(["'])(https?:\/\/[^"']+?\.user\.js)\1/i
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const raw = m[1];
    let resolved;
    try {
      resolved = new URL(raw, pageUrl).toString();
    } catch (e) {
      continue;
    }
    if (US_SCRIPT_EXT_RE.test(resolved)) return resolved;
  }
  return null;
}

function _looksLikeHtml(body) {
  const head = String(body || '').slice(0, 1024).toLowerCase();
  return head.includes('<!doctype html') || head.includes('<html');
}

async function _fetchText(url) {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(US_FETCH_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const text = await response.text();
  if (text.length > US_FETCH_MAX_BYTES) {
    throw new Error('script too large (' + Math.round(text.length / 1024) + ' KB)');
  }
  return text;
}

/** Normalise one URL the user typed into something we are willing to fetch. */
function _normaliseUserScriptUrl(raw) {
  let candidate = String(raw || '').trim();
  if (!candidate) return null;
  if (_USER_AGENT_BLOCKED.test(candidate)) return null;
  // Bare host, or a pasted link missing the scheme.
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) candidate = 'https://' + candidate;
  let u;
  try {
    u = new URL(candidate);
  } catch (e) {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  return u.toString();
}

/**
 * Download + parse one script. Never throws: per-URL failures come back as
 * { ok: false, error } so a batch can report each link independently.
 */
async function _fetchUserscript(rawUrl) {
  const url = _normaliseUserScriptUrl(rawUrl);
  if (!url) return { ok: false, url: String(rawUrl || ''), error: 'invalid URL' };

  try {
    let body = await _fetchText(url);
    let sourceUrl = url;

    // A script-hosting page is HTML, not a script. Find the install link and
    // fetch that instead, so pasting the Greasy Fork page URL just works.
    if (_looksLikeHtml(body) && !US_SCRIPT_EXT_RE.test(url)) {
      const install = _extractUserScriptUrl(body, url);
      if (!install) {
        return { ok: false, url: url, error: 'no .user.js link found on that page' };
      }
      body = await _fetchText(install);
      sourceUrl = install;
    }

    if (_looksLikeHtml(body)) {
      return { ok: false, url: url, error: 'the server returned a web page, not a script' };
    }
    const META = (typeof globalThis !== 'undefined' && globalThis.SF_US_META) || null;
    const meta = META ? META.parse(body) : {};
    if (!meta || !String(meta.name || '').trim()) {
      return { ok: false, url: url, error: 'no ==UserScript== header found' };
    }

    const fields = META.fieldsOf({ code: body });
    return {
      ok: true,
      url: url,
      sourceUrl: sourceUrl,
      code: body,
      name: fields.name,
      namespace: fields.namespace,
      version: fields.version,
      description: fields.description,
      author: fields.author,
      homepage: fields.homepage || meta.homepage || '',
      runAt: fields.runAt,
      noframes: !!fields.noframes,
      matches: fields.explicitMatches,
      includes: fields.includes,
      excludeMatches: fields.excludeMatches,
      excludes: fields.excludes,
      requires: fields.requires,
      grants: fields.grants,
      resources: fields.resources,
      connects: Array.isArray(meta.connects) ? meta.connects : [],
      // The tag is spelled @updateURL / @downloadURL, so the parsed keys keep
      // that exact casing.
      updateUrl: (typeof meta.updateURL === 'string' && meta.updateURL) || '',
      downloadUrl: (typeof meta.downloadURL === 'string' && meta.downloadURL) || '',
      warning: fields.explicitMatches.length
        ? ''
        : 'no @match or usable @include - it will not be registered on any site'
    };
  } catch (e) {
    const msg = String((e && e.message) || e);
    return { ok: false, url: url, error: /abort|timeout/i.test(msg) ? 'timed out' : msg };
  }
}

// ---------------------------------------------------------------------------
// GM_xmlhttpRequest relay + ScholarFlow bridge
// ---------------------------------------------------------------------------
const _USER_AGENT_BLOCKED = /^(chrome|edge|about|moz-extension|chrome-extension|devtools|view-source):/i;
const _xhrControllers = new Map();

function _abortXhr(reqId) {
  const c = _xhrControllers.get(String(reqId));
  if (!c) return false;
  _xhrControllers.delete(String(reqId));
  try { c.abort('aborted'); } catch (e) { /* already settled */ }
  return true;
}

async function _handleXhr(req) {
  const url = String((req && req.url) || '');
  if (!url || _USER_AGENT_BLOCKED.test(url)) {
    return { reqId: req && req.reqId, error: 'ScholarFlow: URL not allowed' };
  }
  const controller = new AbortController();
  const reqId = String((req && req.reqId) || '');
  if (reqId) _xhrControllers.set(reqId, controller);
  const timer = setTimeout(() => controller.abort(), Number(req.timeout) || 30000);
  const method = String(req.method || 'GET').toUpperCase();
  const opts = { method: method, headers: req.headers || {}, signal: controller.signal, redirect: 'follow' };
  if (req.data !== null && req.data !== undefined && method !== 'GET' && method !== 'HEAD') {
    opts.body = typeof req.data === 'string' ? req.data : JSON.stringify(req.data);
  }
  try {
    const response = await fetch(url, opts);
    const text = await response.text();
    const headers = {};
    try {
      response.headers.forEach((val, key) => { headers[key] = val; });
    } catch (e) { /* opaque response */ }
    return {
      reqId: req.reqId,
      status: response.status,
      statusText: response.statusText,
      responseText: text,
      response: text,
      headers: headers,
      finalUrl: response.url
    };
  } catch (e) {
    const aborted = e && (e.name === 'AbortError' || /abort/i.test(String(e.message)));
    return { reqId: req.reqId, error: aborted ? 'timeout' : String((e && e.message) || e), status: 0 };
  } finally {
    clearTimeout(timer);
    if (reqId) _xhrControllers.delete(reqId);
  }
}

// The scratchpad is keyed by the *page* host. Reading location.hostname here
// would always yield the extension origin (or empty in a service worker), so
// every page would share one bucket.
function _senderHost(sender) {
  const candidates = [
    sender && sender.url,
    sender && sender.tab && sender.tab.url,
    sender && sender.documentUrl
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const h = new URL(raw).hostname;
      if (h) return h;
    } catch (e) { /* not a parseable URL */ }
  }
  return '';
}

function _scratchpadKeys(scope, host) {
  const keys = ['sf_scratchpad_global'];
  if (host) keys.push('sf_scratchpad_page_' + host);
  else keys.push('sf_scratchpad_page_');
  return scope === 'global' ? ['sf_scratchpad_global'] : keys;
}

// ---------------------------------------------------------------------------
// Locale tables for SF.t() inside the worker. The locale files are classic
// scripts that assign to `window`, which does not exist in a service worker, so
// they are pulled in through dynamic import() after aliasing window -> global.
// ---------------------------------------------------------------------------
let _i18nPromise = null;
function _ensureI18n() {
  if (_i18nPromise) return _i18nPromise;
  _i18nPromise = (async () => {
    const out = {};
    try {
      if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
      const langs = ['vi', 'en', 'zh', 'ru', 'ja'];
      await Promise.all(langs.map(async (lang) => {
        try {
          await import(`../locales/${lang}.js`);
          const table = globalThis['I18N_' + lang.toUpperCase()];
          if (table && typeof table === 'object') out[lang] = table;
        } catch (e) { /* locale file unavailable in this context */ }
      }));
      if (Object.keys(out).length) globalThis.I18N_DATA = out;
    } catch (e) { /* i18n stays unavailable; SF.t() falls back to the key */ }
    return out;
  })();
  return _i18nPromise;
}
_ensureI18n();

async function _bridge(method, payload, sender) {
  const p = payload || {};
  const store = _storage();
  const rt = _runtime();
  const tabId = sender && sender.tab ? sender.tab.id : null;
  const host = _senderHost(sender);
  // Userscript storage is namespaced per script so two scripts cannot read or
  // clobber each other's GM_* values.
  const dataKey = US_USDATA_PREFIX + String(p.scriptId || 'anon') + '__' + String(p.key || '');

  switch (method) {
    case 'toast': {
      if (tabId === null) return { ok: true };
      const tabs = (typeof chrome !== 'undefined' && chrome.tabs) ? chrome.tabs : ((typeof browser !== 'undefined' && browser.tabs) ? browser.tabs : null);
      if (!tabs || !tabs.sendMessage) return { ok: false, error: 'tabs unavailable' };
      try {
        await tabs.sendMessage(tabId, { action: 'SHOW_PAGE_TOAST', text: String(p.text || '') });
      } catch (e) { /* tab has no content script */ }
      return { ok: true };
    }

    case 'i18n.lang': {
      const res = store ? await store.get('sf_lang') : {};
      return { ok: true, value: (res && res.sf_lang) || 'vi' };
    }

    case 'i18n': {
      const key = String(p.key || '');
      await _ensureI18n();
      const lang = await _bridge('i18n.lang', null, sender).then((r) => (r && r.value) || 'vi');
      const table = (typeof globalThis !== 'undefined' && globalThis.I18N_DATA) || null;
      let text = null;
      if (table && table[lang] && table[lang][key] !== undefined) text = table[lang][key];
      else if (table && table.en && table.en[key] !== undefined) text = table.en[key];
      else if (table && table.vi && table.vi[key] !== undefined) text = table.vi[key];
      if (text === null) return { ok: true, value: key };
      if (p.params && typeof p.params === 'object') {
        for (const [k, v] of Object.entries(p.params)) {
          text = text.split('{' + k + '}').join(v === undefined || v === null ? '' : String(v));
        }
      }
      return { ok: true, value: text };
    }

    case 'clipboard': {
      // The page context can always use navigator.clipboard itself; a service
      // worker has no document and cannot, so report it as unsupported instead
      // of sending a message that no extension page is guaranteed to answer.
      return { ok: false, error: 'clipboard unavailable' };
    }

    case 'storage.get': {
      if (!store) return { ok: false, error: 'storage unavailable' };
      const res = await store.get(dataKey);
      return { ok: true, value: res ? res[dataKey] : undefined };
    }

    case 'storage.set': {
      if (!store) return { ok: false, error: 'storage unavailable' };
      await store.set({ [dataKey]: p.value === undefined ? null : p.value });
      return { ok: true };
    }

    case 'storage.remove': {
      if (!store) return { ok: false, error: 'storage unavailable' };
      await store.remove(dataKey);
      return { ok: true };
    }

    case 'storage.keys': {
      if (!store) return { ok: false, error: 'storage unavailable' };
      const all = await store.get(null);
      const ns = US_USDATA_PREFIX + String(p.scriptId || 'anon') + '__';
      const out = Object.keys(all || {}).filter((k) => k.indexOf(ns) === 0).map((k) => k.slice(ns.length));
      return { ok: true, value: out };
    }

    case 'cite.lookup': {
      const query = String(p.query || '').trim();
      if (!query) return { ok: true, value: null };
      const value = await _lookupBibliographic(query);
      return { ok: true, value: value };
    }

    case 'cite.pageMetadata': {
      const res = await _askTab(tabId, { action: 'EXTRACT_PAGE_METADATA' }, 12000);
      return { ok: !!(res && res.metadata ? res.metadata : res) || !!res, value: res };
    }

    case 'page.text': {
      const res = await _askTab(tabId, { action: 'GET_PAGE_TEXT', maxChars: Number(p.maxChars) || 20000 }, 15000);
      return { ok: true, value: res && (res.text || res.content) ? (res.text || res.content) : '' };
    }

    case 'page.selection': {
      const res = await _askTab(tabId, { action: 'GET_SELECTION_TEXT' }, 8000);
      return { ok: true, value: res && res.text ? res.text : '' };
    }

    case 'scratchpad.read': {
      if (!store) return { ok: false, error: 'storage unavailable' };
      const keys = _scratchpadKeys(p.scope, host);
      const res = await store.get(keys);
      return { ok: true, value: (res && res[keys[keys.length - 1]]) || '' };
    }

    case 'scratchpad.append': {
      if (!store) return { ok: false, error: 'storage unavailable' };
      const keys = _scratchpadKeys(p.scope, host);
      const res = await store.get(keys);
      const chunks = [];
      for (const key of keys) {
        const current = (res && res[key]) || '';
        const addition = String(p.text || '');
        chunks.push((current ? current.replace(/\s*$/, '') + '\n\n' : '') + addition);
        await store.set({ [key]: chunks[chunks.length - 1] });
      }
      return { ok: true };
    }

    case 'todo.list': {
      if (!store) return { ok: false, error: 'storage unavailable' };
      const res = await store.get('sf_todos');
      return { ok: true, value: (res && Array.isArray(res.sf_todos)) ? res.sf_todos : [] };
    }

    case 'todo.add': {
      if (!store) return { ok: false, error: 'storage unavailable' };
      const res = await store.get('sf_todos');
      const list = (res && Array.isArray(res.sf_todos)) ? res.sf_todos.slice() : [];
      list.push({ text: String(p.text || ''), done: false, from: 'userscript', at: Date.now() });
      await store.set({ sf_todos: list });
      return { ok: true };
    }

    case 'todo.toggle': {
      if (!store) return { ok: false, error: 'storage unavailable' };
      const res = await store.get('sf_todos');
      const list = (res && Array.isArray(res.sf_todos)) ? res.sf_todos.slice() : [];
      const i = Number(p.index);
      if (list[i]) list[i].done = !list[i].done;
      await store.set({ sf_todos: list });
      return { ok: true, value: list[i] ? list[i].done : null };
    }

    case 'todo.remove': {
      if (!store) return { ok: false, error: 'storage unavailable' };
      const res = await store.get('sf_todos');
      const list = (res && Array.isArray(res.sf_todos)) ? res.sf_todos.slice() : [];
      const i = Number(p.index);
      if (i >= 0 && i < list.length) list.splice(i, 1);
      await store.set({ sf_todos: list });
      return { ok: true };
    }

    case 'menu.register': {
      if (!store) return { ok: false, error: 'storage unavailable' };
      const res = await store.get(US_MENU_KEY);
      const map = (res && res[US_MENU_KEY]) || {};
      map[p.id] = { id: p.id, caption: p.caption, scriptId: p.scriptId, scriptName: p.scriptName, at: Date.now() };
      await store.set({ [US_MENU_KEY]: map });
      return { ok: true, value: p.id };
    }

    case 'menu.unregister': {
      if (!store) return { ok: false, error: 'storage unavailable' };
      const res = await store.get(US_MENU_KEY);
      const map = (res && res[US_MENU_KEY]) || {};
      delete map[p.id];
      await store.set({ [US_MENU_KEY]: map });
      return { ok: true };
    }

    case 'tab.open': {
      const tabs = (typeof chrome !== 'undefined' && chrome.tabs) ? chrome.tabs : ((typeof browser !== 'undefined' && browser.tabs) ? browser.tabs : null);
      if (!tabs || !tabs.create) return { ok: false, error: 'tabs unavailable' };
      await tabs.create({ url: String(p.url || ''), active: p.active !== false });
      return { ok: true };
    }

    default:
      return { ok: false, error: 'unknown method: ' + String(method) };
  }
}

async function _askTab(tabId, message, timeoutMs) {
  if (tabId === null || tabId === undefined) return null;
  const tabs = (typeof chrome !== 'undefined' && chrome.tabs) ? chrome.tabs : ((typeof browser !== 'undefined' && browser.tabs) ? browser.tabs : null);
  if (!tabs || !tabs.sendMessage) return null;
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, timeoutMs || 10000);
    try {
      const maybe = tabs.sendMessage(tabId, message, (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(res || null);
      });
      if (maybe && typeof maybe.then === 'function') {
        maybe.then((res) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(res || null);
        }, () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(null);
        });
      }
    } catch (e) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/** Crossref first (rich bibliographic record), OpenAlex as fallback. */
async function _lookupBibliographic(query) {
  const q = String(query || '').trim();
  const isDoi = /^10\.\d{4,9}\//i.test(q);
  const tryFetch = async (url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const r = await fetch(url, { signal: controller.signal });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  if (isDoi) {
    const cr = await tryFetch('https://api.crossref.org/works/' + encodeURIComponent(q));
    if (cr && cr.message) {
      const m = cr.message;
      return {
        source: 'crossref', doi: m.DOI, title: (m.title || [])[0] || '',
        authors: (m.author || []).map((a) => [a.given, a.family].filter(Boolean).join(' ')),
        container: (m['container-title'] || [])[0] || '',
        year: m.issued && m.issued['date-parts'] ? m.issued['date-parts'][0][0] : null,
        volume: m.volume || '', issue: m.issue || '', pages: m.page || '', publisher: m.publisher || ''
      };
    }
  }
  const crSearch = await tryFetch('https://api.crossref.org/works?rows=1&query.bibliographic=' + encodeURIComponent(q));
  if (crSearch && crSearch.message && crSearch.message.items && crSearch.message.items[0]) {
    const m = crSearch.message.items[0];
    return {
      source: 'crossref', doi: m.DOI, title: (m.title || [])[0] || '',
      authors: (m.author || []).map((a) => [a.given, a.family].filter(Boolean).join(' ')),
      container: (m['container-title'] || [])[0] || '',
      year: m.issued && m.issued['date-parts'] ? m.issued['date-parts'][0][0] : null,
      volume: m.volume || '', issue: m.issue || '', pages: m.page || '', publisher: m.publisher || ''
    };
  }
  const oa = await tryFetch('https://api.openalex.org/works?per_page=1&search=' + encodeURIComponent(q));
  if (oa && oa.results && oa.results[0]) {
    const w = oa.results[0];
    return {
      source: 'openalex', doi: w.doi ? String(w.doi).replace(/^https?:\/\/doi\.org\//, '') : '',
      title: w.title || '',
      authors: (w.authorships || []).map((a) => (a.author && a.author.display_name) || ''),
      container: (w.primary_location && w.primary_location.source && w.primary_location.source.display_name) || '',
      year: w.publication_year || null, citedBy: w.cited_by_count || 0
    };
  }
  return null;
}

/**
 * Fetch a remote userscript. User-gesture driven only (Import from URL, Check
 * updates) — the worker never polls on its own.
 */
async function _fetchRemote(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const r = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!r.ok) return { error: 'HTTP ' + r.status };
    const text = await r.text();
    if (text.length > US_MAX_FETCH_BYTES) return { error: 'response too large' };
    return { code: text };
  } catch (e) {
    return { error: String((e && e.message) || e) };
  } finally {
    clearTimeout(timer);
  }
}

function _readVersion(code) {
  const m = /@version\s+([^\s\r\n]+)/.exec(String(code || ''));
  return m ? m[1] : '';
}

function _buildScriptFromCode(code, fallbackName, sourceUrl) {
  const meta = _meta();
  const parsed = meta ? meta.parse(code) : null;
  const id = 'script_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  return {
    id: id,
    name: (parsed && parsed.name) || fallbackName || 'Imported script',
    namespace: (parsed && parsed.namespace) || '',
    version: (parsed && parsed.version) || '',
    description: (parsed && parsed.description) || '',
    author: (parsed && parsed.author) || '',
    matches: (parsed && parsed.matches && parsed.matches.length) ? parsed.matches : ['<all_urls>'],
    excludes: (parsed && parsed.excludeMatches) ? parsed.excludeMatches : [],
    includes: (parsed && parsed.includes) ? parsed.includes : [],
    requires: (parsed && parsed.requires) ? parsed.requires.map((u) => ({ url: u, text: '' })) : [],
    resources: {},
    grants: (parsed && parsed.grants) ? parsed.grants : [],
    code: String(code || ''),
    active: true,
    world: 'MAIN',
    runAt: (parsed && parsed.runAt) || 'document_idle',
    updateUrl: sourceUrl || '',
    importedAt: Date.now(),
    lastChecked: 0,
    runCount: 0,
    lastRun: null
  };
}

// ---------------------------------------------------------------------------
// Update flow — explicit, reviewable, user-gesture only
// ---------------------------------------------------------------------------
async function _checkUpdates(apply, force) {
  const scripts = await _readScripts();
  const pending = [];
  const now = Date.now();
  for (let i = 0; i < scripts.length; i++) {
    const s = scripts[i];
    if (!s || !s.updateUrl) continue;
    if (!apply && !force && s.lastChecked && (now - s.lastChecked) < US_AUTO_UPDATE_INTERVAL) {
      pending.push({ id: s.id, name: s.name, skipped: true, reason: 'checked_recently', lastChecked: s.lastChecked });
      continue;
    }
    const res = await _fetchRemote(s.updateUrl);
    if (res.error || !res.code) {
      s.lastChecked = now;
      s.lastError = res.error || 'empty response';
      continue;
    }
    const remoteVer = _readVersion(res.code);
    const localVer = s.version || _readVersion(s.code);
    s.lastChecked = now;
    if (remoteVer && remoteVer !== localVer) {
      const meta = _meta();
      const parsed = meta ? meta.parse(res.code) : null;
      pending.push({
        id: s.id, name: s.name, oldVer: localVer || '0.0', newVer: remoteVer,
        bytes: res.code.length,
        lines: (res.code.match(/\n/g) || []).length + 1,
        added: Math.max(0, res.code.split('\n').length - String(s.code || '').split('\n').length),
        parsed: !!parsed
      });
      if (apply) {
        // Snapshot the outgoing code *before* overwriting it, otherwise the
        // version history stores the new script and "undo" is a no-op.
        const previousCode = String(s.code || '');
        s.code = res.code;
        s.version = remoteVer;
        s.lastUpdated = now;
        if (parsed) {
          if (parsed.matches && parsed.matches.length) s.matches = parsed.matches.slice();
          if (parsed.excludeMatches && parsed.excludeMatches.length) s.excludes = parsed.excludeMatches.slice();
          if (parsed.name) s.name = parsed.name;
          if (parsed.description) s.description = parsed.description;
          if (parsed.author) s.author = parsed.author;
          if (parsed.grants && parsed.grants.length) s.grants = parsed.grants.slice();
        }
        s.history = Array.isArray(s.history) ? s.history.slice(-9) : [];
        s.history.push({ at: now, version: localVer || '0.0', code: previousCode.slice(0, 20000) });
        s.rev = (Number(s.rev) || 0) + 1;
        s.updatedAt = now;
        s.updatedBy = 'background:update';
        s.updatedByLabel = 'ScholarFlow (cập nhật)';
        s.updatedSession = 'background';
      }
    }
  }
  if (apply) {
    await _writeScripts(scripts);
    await _registerAll('update');
  } else {
    const store = _storage();
    if (store) await store.set({ [US_STORE_KEY]: scripts });
  }
  return {
    ok: true,
    applied: !!apply,
    updatedCount: pending.filter((p) => !p.skipped).length,
    updated: pending.filter((p) => !p.skipped)
  };
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
function _wire() {
  const store = _storage();
  if (store && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[US_STORE_KEY] && !_ignoreStoreChange) {
        _scheduleRegister('storage-change');
      }
    });
  }

  const rt = _runtime();
  if (!rt || !rt.onMessage) return;
  rt.onMessage.addListener((request, sender, sendResponse) => {
    if (!request || !request.action) return undefined;
    const action = request.action;

    const reply = (promise) => {
      promise.then((res) => {
        try { sendResponse(res); } catch (e) { /* context gone */ }
      }, (err) => {
        try { sendResponse({ ok: false, error: String((err && err.message) || err) }); } catch (e) { /* ignore */ }
      });
      return true;
    };

    switch (action) {
      // Legacy action names kept so older builds of the tab keep working.
      case 'RELOAD_USERSCRIPTS':
      case 'US_RELOAD':
        return reply(_registerAll('manual'));

      // Download one or more scripts for review. Nothing is stored here; the
      // sidebar shows the source and only then writes anything.
      case 'US_FETCH_SCRIPTS': {
        const raw = (request.urls && request.urls.length) ? request.urls : [request.url];
        const urls = (Array.isArray(raw) ? raw : [raw])
          .map((u) => String(u || '').trim())
          .filter(Boolean)
          .slice(0, US_FETCH_MAX_URLS);
        if (!urls.length) return reply(Promise.resolve({ ok: true, items: [] }));
        return reply((async () => {
          // Sequential on purpose: a paste of 10 links should not look like a
          // burst of traffic to whatever hosts the user just typed.
          const items = [];
          for (const u of urls) items.push(await _fetchUserscript(u));
          return { ok: true, items: items };
        })());
      }

      case 'US_STATUS':
        return reply((async () => {
          const scripts = await _readScripts();
          const active = scripts.filter((s) => s && s.active !== false && String(s.code || '').trim());
          return {
            ok: true,
            engine: 'scripting.registerContentScripts',
            available: !!_scripting(),
            needsUserScripts: !!(_isFirefox && (!_userScripts() || typeof _userScripts().register !== 'function')),
            worldSupported: !_worldUnsupported,
            total: scripts.length,
            active: active.length,
            registered: _lastRegisteredIds.slice(),
            ids: active.map((s) => s.regId || _regId(s.id))
          };
        })());

      case 'US_REQUEST_USERSCRIPTS_PERMISSION':
        return reply(_isFirefox ? _requestFirefoxUserScriptsPermission() : Promise.resolve({ ok: true, notNeeded: true }));

      case 'US_RUN_ONCE':
        return reply(_isFirefox
          ? _runFirefoxUserScriptNow(request.tabId, request.script)
          : Promise.resolve({ ok: false, error: 'run once is not available in this browser' }));

      case 'US_SCRIPT_RAN':
        _scheduleRunStats(request.scriptId);
        return reply(Promise.resolve({ ok: true }));

      case 'US_INSTALL':
        return reply((async () => {
          const scripts = await _readScripts();
          const incoming = request.scriptData;
          if (!incoming) return { ok: false, error: 'no scriptData' };
          const idx = scripts.findIndex((s) => s.id === incoming.id || (s.name && s.name === incoming.name));
          if (idx > -1) scripts[idx] = Object.assign({}, scripts[idx], incoming);
          else scripts.push(incoming);
          await _writeScripts(scripts);
          const reg = await _registerAll('install');
          return { ok: true, registered: reg.registered };
        })());

      // Legacy installer hook, previously dead code.
      case 'INSTALL_USERSCRIPT':
        return reply((async () => {
          const scripts = await _readScripts();
          const incoming = request.scriptData;
          if (!incoming) return { ok: false, error: 'no scriptData' };
          const idx = scripts.findIndex((s) => s.id === incoming.id);
          if (idx > -1) scripts[idx] = Object.assign({}, scripts[idx], incoming);
          else scripts.push(incoming);
          await _writeScripts(scripts);
          await _registerAll('install');
          return { ok: true };
        })());

      case 'US_FETCH_REMOTE':
        return reply((async () => {
          const res = await _fetchRemote(String(request.url || ''));
          if (res.error) return { ok: false, error: res.error };
          return {
            ok: true,
            code: res.code,
            version: _readVersion(res.code),
            script: _buildScriptFromCode(res.code, request.name || '', request.url)
          };
        })());

      // Dry run: report what would change, change nothing.
      case 'US_CHECK_UPDATES':
        return reply(_checkUpdates(false, !!request.force));

      case 'US_APPLY_UPDATES':
        return reply(_checkUpdates(true));

      // Legacy alias used to also apply; kept for compatibility.
      case 'CHECK_USERSCRIPT_UPDATES':
        return reply(_checkUpdates(true));

      case 'GM_XHR':
        return reply((async () => {
          const res = await _handleXhr(request.req || {});
          return res;
        })());

      case 'US_XHR_ABORT':
        return reply(Promise.resolve({ ok: _abortXhr(request.reqId) }));

      case 'US_BRIDGE':
        return reply(_bridge(request.method, request.payload, sender));

      // ---- menu commands (GM_registerMenuCommand) -------------------------
      case 'US_MENU_REGISTER':
        return reply((async () => {
          const store3 = _storage();
          if (!store3 || !request.entry) return { ok: false, error: 'no entry' };
          const res = await store3.get(US_MENU_KEY);
          const map = Object.assign({}, (res && res[US_MENU_KEY]) || {});
          const entry = request.entry;
          map[String(entry.id)] = {
            id: String(entry.id),
            caption: String(entry.caption || ''),
            scriptId: entry.scriptId || null,
            scriptName: entry.scriptName || '',
            accessKey: entry.accessKey || '',
            tabId: sender && sender.tab ? sender.tab.id : null,
            url: _senderHost(sender),
            at: Date.now()
          };
          await store3.set({ [US_MENU_KEY]: map });
          return { ok: true, value: String(entry.id) };
        })());

      case 'US_MENU_CLEAR':
        return reply((async () => {
          const store3 = _storage();
          if (!store3) return { ok: false, error: 'storage unavailable' };
          await store3.remove(US_MENU_KEY);
          return { ok: true };
        })());

      case 'US_MENU_INVOKE':
        return reply((async () => {
          const tabs = (typeof chrome !== 'undefined' && chrome.tabs) ? chrome.tabs : ((typeof browser !== 'undefined' && browser.tabs) ? browser.tabs : null);
          if (!tabs || !tabs.sendMessage) return { ok: false, error: 'tabs unavailable' };
          const target = Number(request.tabId);
          if (!Number.isFinite(target)) return { ok: false, error: 'no tabId' };
          try {
            await tabs.sendMessage(target, { action: 'SF_US_MENU_CLICK', id: String(request.id || '') });
            return { ok: true };
          } catch (e) {
            return { ok: false, error: 'tab unreachable' };
          }
        })());

      case 'US_CLIPBOARD': {
        // Handled by whichever extension page is open; the page context itself
        // can always fall back to navigator.clipboard.
        return undefined;
      }

      case 'US_DELETE_ALL':
        return reply((async () => {
          const store2 = _storage();
          if (store2) {
            const all = await store2.get(null);
            const keys = Object.keys(all || {}).filter((k) => k === US_STORE_KEY || k === US_MENU_KEY || k.indexOf(US_USDATA_PREFIX) === 0);
            if (keys.length) await store2.remove(keys);
          }
          const scripting = _scripting();
          if (scripting && _lastRegisteredIds.length) {
            try { await scripting.unregisterContentScripts({ ids: _lastRegisteredIds.slice() }); } catch (e) { /* ignore */ }
          }
          _lastRegisteredIds = [];
          return { ok: true, removed: true };
        })());

      default:
        return undefined;
    }
  });
}

_wire();
_scheduleRegister('startup');

export const _internals = {
  _regId,
  _buildCode,
  _toRegisteredScript,
  _isRegistrable,
  _scratchpadKeys,
  _senderHost,
  _readVersion,
  _buildScriptFromCode,
  US_STORE_KEY,
  US_USDATA_PREFIX,
  US_REG_PREFIX
};
