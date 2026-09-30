// tests/fixtures/probe-background.cjs
//
// Loads OS/js/userscripts_bg.js exactly the way the browser does — a real ES
// module import, with minimal chrome.* stubs — and reports whether the whole
// module graph resolves and evaluates.
//
// A syntax check cannot catch this: a wrong relative import specifier parses
// perfectly and then throws ERR_MODULE_NOT_FOUND at load time. When the module
// that fails is the background engine, the extension keeps loading but nothing
// answers runtime.sendMessage, so the sidebar shows "engine unavailable" and
// the real cause stays invisible.
//
// Prints BACKGROUND_MODULE_OK on success, otherwise a "FAIL:" line.

const listeners = { msg: [] };
const noop = () => {};

function makeEvent(key) {
  return {
    addListener: (fn) => { (listeners[key] || (listeners[key] = [])).push(fn); },
    removeListener: noop,
    hasListener: () => false
  };
}

const data = {
  sf_custom_scripts: [
    { id: "s1", name: "Demo", code: "console.log(1)", matches: ["*://*/*"], active: true }
  ]
};

globalThis.chrome = {
  runtime: {
    id: "probe",
    getURL: (p) => "chrome-extension://probe/" + (p || ""),
    getManifest: () => ({ version: "0.0.0", manifest_version: 3 }),
    onMessage: makeEvent("msg"),
    onInstalled: makeEvent("installed"),
    onStartup: makeEvent("startup"),
    sendMessage: () => Promise.resolve(),
    lastError: null
  },
  storage: {
    local: {
      get: () => Promise.resolve(data),
      set: () => Promise.resolve(),
      remove: () => Promise.resolve()
    },
    onChanged: makeEvent("storeChanged")
  },
  scripting: {
    registerContentScripts: () => Promise.resolve(),
    updateContentScripts: () => Promise.resolve(),
    unregisterContentScripts: () => Promise.resolve(),
    getRegisteredContentScripts: () => Promise.resolve([])
  },
  tabs: {
    query: () => Promise.resolve([]),
    sendMessage: () => Promise.resolve(),
    onUpdated: makeEvent("tabUpdated"),
    onRemoved: makeEvent("tabRemoved")
  },
  alarms: { create: noop, onAlarm: makeEvent("alarm"), clear: () => Promise.resolve() },
  action: { setBadgeText: noop, setBadgeBackgroundColor: noop },
  contextMenus: { create: noop, removeAll: () => Promise.resolve(), onClicked: makeEvent("menu") },
  webNavigation: { onCompleted: makeEvent("navDone") },
  cookies: { get: () => Promise.resolve([]), getAll: () => Promise.resolve([]) },
  i18n: { getMessage: (k) => k }
};

// Exercise the Chromium branch (no `browser` global) and give the code a `window`
// to probe, which is what a real service worker / event page looks like.
globalThis.browser = undefined;
globalThis.window = globalThis;

const main = async () => {
  const url = "file:///" + require("path").join(__dirname, "..", "..", "OS", "js", "userscripts_bg.js").replace(/\\/g, "/");
  await import(url);

  if (!listeners.msg.length) {
    console.log("FAIL: background registered no runtime.onMessage listener");
    process.exit(1);
  }
  if (!globalThis.SF_US_META) {
    console.log("FAIL: userscript-meta.js did not attach SF_US_META");
    process.exit(1);
  }
  if (!globalThis.SF_US_SHIM) {
    console.log("FAIL: gm-shim.js did not attach SF_US_SHIM");
    process.exit(1);
  }

  // The sidebar hides its "engine unavailable" box only when this answers.
  const handler = listeners.msg[0];
  const res = await new Promise((resolve) => {
    let settled = false;
    const done = (r) => { if (!settled) { settled = true; resolve(r); } };
    try {
      handler({ action: "US_STATUS" }, { tab: { id: 1, url: "https://example.com/" } }, done);
    } catch (e) {
      done({ ok: false, error: String(e && e.message) });
    }
    setTimeout(() => done({ __timeout: true }), 5000);
  });

  if (!res || res.ok !== true || res.available !== true) {
    console.log("FAIL: US_STATUS did not report a working engine -> " + JSON.stringify(res));
    process.exit(1);
  }

  console.log("BACKGROUND_MODULE_OK");
  process.exit(0);
};

main().catch((e) => {
  console.log("FAIL: " + String((e && e.code ? e.code + ": " : "") + (e && e.message) || e));
  process.exit(1);
});
