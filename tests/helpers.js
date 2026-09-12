// ---------------------------------------------------------------------------
// tests/helpers.js
//
// Shared jsdom harness for the ScholarFlow test files:
//   * makeChromeStub(storeInit)  - minimal chrome/browser stub (promise+cb)
//   * loadPage(htmlFile, opts)   - load sidebar/popup/privacy into jsdom,
//     evaluate ALL <script src> files in DOM order into ONE shared scope, and
//     append optional `extraChunks` inside the same global eval so top-level
//     let/const bindings (citationSettings, savedBibliographies, ...) are
//     reachable from window helpers defined there.
//   * check(cond, msg) / finish() - tiny pass/fail reporter with exit code.
//
// Run with: npm test  (or: node tests/helpers.js which just prints OK)
// ---------------------------------------------------------------------------

const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const path = require("path");
const { pathToFileURL, fileURLToPath } = require("url");

const REPO_ROOT = path.join(__dirname, "..");
const OS_HTML = path.join(REPO_ROOT, "OS", "html");
const OS_JS = path.join(REPO_ROOT, "OS", "js");

// Reusable chunk that grants access to the closure-only bindings:
//   window.__cs(patch?) -> set/read citationSettings (returns a JSON copy)
//   window.__lang(code) -> switch the unified i18n language
const CS_CHUNK = [
  "window.__cs = function (patch) {",
  "  if (patch) Object.assign(citationSettings, patch);",
  "  return JSON.parse(JSON.stringify(citationSettings));",
  "};",
  "window.__lang = function (code) {",
  "  try { window.i18n && window.i18n.setLanguage && window.i18n.setLanguage(code); } catch (e) {}",
  "  try { LANGUAGE = code; } catch (e) {}",
  "};"
].join("\n");

// ---------------------------------------------------------------------------
// Minimal chrome/browser stub (callback + promise styles, resolved promises).
// ---------------------------------------------------------------------------
function makeChromeStub(storeInit = {}) {
  const store = { ...storeInit };
  const storageLocal = {
    get(key, cb) {
      let res = {};
      if (typeof key === "string") res[key] = store[key];
      else if (Array.isArray(key)) for (const k of key) if (k in store) res[k] = store[k];
      else if (typeof key === "object" && key != null) {
        for (const k of Object.keys(key)) res[k] = k in store ? store[k] : key[k];
      } else res = Object.assign({}, store);
      const p = Promise.resolve(res);
      if (typeof cb === "function") { p.then(cb); return undefined; }
      return p;
    },
    set(obj, cb) {
      Object.assign(store, obj);
      const p = Promise.resolve();
      if (typeof cb === "function") { p.then(cb); return undefined; }
      return p;
    },
    remove(keys, cb) {
      (Array.isArray(keys) ? keys : [keys]).forEach(k => { delete store[k]; });
      const p = Promise.resolve();
      if (typeof cb === "function") { p.then(cb); return undefined; }
      return p;
    }
  };
  return {
    storage: { local: storageLocal, sync: storageLocal },
    runtime: {
      getManifest: () => ({ name: "ScholarFlow", version: "0.0.0-test", manifest_version: 3 }),
      getURL: (p) => "chrome-extension://test/" + p,
      sendMessage: (...args) => { if (args.length > 1 && typeof args[args.length - 1] === "function") args[args.length - 1]({}); return Promise.resolve({}); },
      onMessage: { addListener: () => {}, removeListener: () => {} },
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} }
    },
    tabs: {
      query: (q) => Promise.resolve([{ id: 1, url: "https://example.com/paper", title: "Paper", active: true, windowId: 1 }]),
      create: (o) => Promise.resolve({ id: 99, url: o && o.url }),
      update: (t, o) => Promise.resolve({}),
      get: (t) => Promise.resolve({ id: Number(t) || 1, url: "https://example.com/paper", title: "Paper" }),
      remove: (t) => Promise.resolve(),
      sendMessage: (t, msg) => Promise.resolve({}),
      onUpdated: { addListener: () => {} },
      onActivated: { addListener: () => {} },
      onRemoved: { addListener: () => {} }
    },
    windows: {
      getCurrent: () => Promise.resolve({ id: 1, focused: true }),
      onFocusChanged: { addListener: () => {} }
    },
    scripting: { executeScript: () => Promise.resolve([{ result: null }]) },
    commands: { onCommand: { addListener: () => {} } },
    downloads: { download: () => Promise.resolve(1) },
    action: { setBadgeText: () => Promise.resolve(), setTitle: () => Promise.resolve() },
    id: { getRandom: () => Math.random().toString(36).slice(2) }
  };
}

// ---------------------------------------------------------------------------
// Load an OS/html page into jsdom and evaluate all classic scripts (+ extras).
// ---------------------------------------------------------------------------
async function loadPage(htmlFile, { storeInit = {}, extraChunks = [], settleMs = 30, ignoreNotImplemented = true } = {}) {
  const htmlPath = path.join(OS_HTML, htmlFile);
  const html = fs.readFileSync(htmlPath, "utf8");

  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (e) => errors.push(String((e && e.message) || e)));

  const dom = new JSDOM(html, {
    url: pathToFileURL(htmlPath).href,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole
  });
  const { window } = dom;
  window.chrome = makeChromeStub(storeInit);
  window.browser = window.chrome;
  window.addEventListener("error", (e) => errors.push(String((e && e.message) || e)));

  const chunks = [];
  for (const script of window.document.querySelectorAll("script[src]")) {
    const abs = fileURLToPath(new URL(script.getAttribute("src"), pathToFileURL(htmlPath).href));
    if (!fs.existsSync(abs)) throw new Error(`${htmlFile}: referenced script missing on disk: ${abs}`);
    chunks.push(fs.readFileSync(abs, "utf8"));
  }
  try {
    window.eval([...chunks, ...extraChunks].join("\n;\n"));
  } catch (e) {
    throw new Error(`${htmlFile}: evaluating scripts threw: ${(e && e.stack) || e}`);
  }

  await new Promise((r) => setTimeout(r, settleMs));

  const relevantErrors = (ignoreNotImplemented ? errors.filter(e => !/Not implemented:/.test(e)) : errors).slice();
  return { window, dom, errors: relevantErrors, htmlFile };
}

// ---------------------------------------------------------------------------
// Tiny reporter
// ---------------------------------------------------------------------------
let failures = 0;
let count = 0;
function check(cond, msg) {
  count++;
  if (cond) {
    console.log(`  PASS  ${msg}`);
  } else {
    failures++;
    console.error(`  FAIL  ${msg}`);
  }
}
function summary(label) {
  console.log(`\n${label}: ${count - failures}/${count} checks passed` + (failures ? ` (${failures} FAILED)` : ""));
}
function finish(label = "TESTS") {
  summary(label);
  process.exit(failures === 0 ? 0 : 1);
}
function resetReporter() {
  failures = 0;
  count = 0;
}

module.exports = {
  REPO_ROOT,
  OS_HTML,
  OS_JS,
  CS_CHUNK,
  makeChromeStub,
  loadPage,
  check,
  summary,
  finish,
  resetReporter
};