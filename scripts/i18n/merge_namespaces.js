// ---------------------------------------------------------------------------
// ScholarFlow i18n unification - merge_namespaces.js
// Single source of truth = OS/locales/{vi,en,zh,ru,ja}.js
// Merges content-script strings (content_*) and privacy-page strings
// (privacy_*) extracted from OS/js/content/i18n.js (CONTENT_I18N) and
// OS/js/privacy.js (PRIVACY_I18N) into every locale file.
//
// Idempotent: re-runs replace the injected blocks (marked comments).
//
// Usage: node scripts/i18n/merge_namespaces.js
// Exit 0 = merged cleanly, 1 = error.
// ---------------------------------------------------------------------------

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..", "..");
const LOCALES_DIR = path.join(ROOT, "OS", "locales");
const LOCALE_FILES = ["vi", "en", "zh", "ru", "ja"].map((l) => ({
  lang: l,
  file: path.join(LOCALES_DIR, l + ".js"),
}));
const CONTENT_I18N_SRC = path.join(ROOT, "OS", "js", "content", "i18n.js");
const PRIVACY_I18N_SRC = path.join(ROOT, "OS", "js", "privacy.js");
const MANIFEST_OUT = path.join(__dirname, "namespace_manifest.json");

const CONTENT_BEGIN = "/* i18n: content_* block start - generated, do not edit */";
const CONTENT_END = "/* i18n: content_* block end */";
const PRIVACY_BEGIN = "/* i18n: privacy_* block start - generated, do not edit */";
const PRIVACY_END = "/* i18n: privacy_* block end */";

function readUtf8(p) {
  return fs.readFileSync(p, "utf8");
}

// Run a JS file inside a sandbox up to (but excluding) `cutToken`, then
// execute `captureExpr` to return the top-level const value we need.
function captureTopLevel(filePath, cutToken, captureExpr, sandboxExtras = {}) {
  const src = readUtf8(filePath);
  const cutAt = src.indexOf(cutToken);
  if (cutAt < 0) throw new Error(`cut token not found in ${filePath}: ${cutToken}`);
  const head = src.slice(0, cutAt);
  const sandbox = Object.assign(
    {
      console,
      setTimeout,
      clearTimeout,
      window: { location: { search: "" } },
      document: {
        readyState: "complete",
        documentElement: {},
        addEventListener() {},
        removeEventListener() {},
        getElementById() { return null; },
        querySelectorAll() { return []; },
        createElement() { return {}; },
      },
      chrome: { storage: { local: { get() {} }, onChanged: { addListener() {} } }, runtime: {} },
      browser: undefined,
      DOMParser: class {
        parseFromString() { return { body: { childNodes: [] } }; }
      },
      URLSearchParams: class {
        constructor() { this._t = {}; }
        get(k) { return this._t[k] || null; }
      },
      CustomEvent: class {},
      navigator: { language: "vi" },
      location: { search: "" },
    },
    sandboxExtras
  );
  vm.createContext(sandbox);
  vm.runInContext(head + "\n;globalThis.__CAPTURE = " + captureExpr + ";", sandbox, {
    filename: path.basename(filePath),
  });
  return sandbox.__CAPTURE;
}

// Convert an arrow function like (px) => `Làm mờ (${px}px)` into the
// positional template `Làm mờ ({0}px)` (editor-friendly, storage-friendly).
function fnToTemplate(fn) {
  const s = fn.toString().trim();
  const m = s.match(/^(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>\s*([\s\S]*)$/);
  if (!m) throw new Error("Unparseable function value: " + s);
  const params = (m[1] || m[2] || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  let body = m[3].trim();
  const first = body[0];
  if (first === "`") {
    if (!body.endsWith("`")) throw new Error("Unterminated template literal: " + s);
    body = body.slice(1, -1);
    // ${var} -> {index by param order}; unknown placeholders kept as-is
    body = body.replace(/\$\{([A-Za-z_$][\w$]*)\}/g, (mm, p) => {
      const i = params.indexOf(p);
      return i >= 0 ? "{" + i + "}" : mm;
    });
    return body;
  }
  if (first === '"' || first === "'") {
    if (!body.endsWith(first)) throw new Error("Unterminated string literal: " + s);
    body = body.slice(1, -1);
    return body;
  }
  throw new Error("Unsupported function body: " + s);
}

function collectContentI18N() {
  const data = captureTopLevel(
    CONTENT_I18N_SRC,
    "function tContent",
    "CONTENT_I18N"
  );
  const out = {};
  for (const [lang, dict] of Object.entries(data)) {
    const flat = {};
    for (const [key, val] of Object.entries(dict)) {
      flat[key] = typeof val === "function" ? fnToTemplate(val) : String(val);
    }
    out[lang] = flat;
  }
  return out;
}

function collectPrivacyI18N() {
  return captureTopLevel(
    PRIVACY_I18N_SRC,
    "function applyPrivacyLanguage",
    "PRIVACY_I18N"
  );
}

function jsonEscape(obj) {
  return JSON.stringify(obj);
}

function serializeKeys(dict, prefix) {
  const keys = Object.keys(dict);
  const lines = keys.map((k) => `   ${jsonEscape(prefix + k)}: ${jsonEscape(dict[k])},`);
  return lines.join("\n");
}

// Replace (or insert before the closing }; ) the generated block at file end.
function stripBlock(text, markerBegin, markerEnd) {
  const bi = text.indexOf(markerBegin);
  const ei = text.indexOf(markerEnd);
  if (bi >= 0 && ei > bi) return text.slice(0, bi) + text.slice(ei + markerEnd.length);
  return text;
}

function main() {
  const content = collectContentI18N();
  const privacy = collectPrivacyI18N();

  // Cross-check: every language must have identical key sets
  const cKeys = Object.keys(content[Object.keys(content)[0]]).sort();
  const pKeys = Object.keys(privacy[Object.keys(privacy)[0]]).sort();
  for (const lang of Object.keys(content)) {
    const k = Object.keys(content[lang]).sort();
    if (JSON.stringify(k) !== JSON.stringify(cKeys)) {
      throw new Error(`content key parity broken for lang '${lang}'`);
    }
  }
  for (const lang of Object.keys(privacy)) {
    const k = Object.keys(privacy[lang]).sort();
    if (JSON.stringify(k) !== JSON.stringify(pKeys)) {
      throw new Error(`privacy key parity broken for lang '${lang}'`);
    }
  }

  // Detect collisions with existing non-namespaced keys in each locale dump
  const written = [];
  for (const { lang, file } of LOCALE_FILES) {
    let txt = readUtf8(file);

    // Sanitize scan copy: strip previously-generated blocks so re-runs do not
    // flag the injected keys as collisions against themselves.
    let scanTxt = txt;
    for (const [b, e] of [[CONTENT_BEGIN, CONTENT_END], [PRIVACY_BEGIN, PRIVACY_END]]) {
      const bi = scanTxt.indexOf(b);
      const ei = scanTxt.indexOf(e);
      if (bi >= 0 && ei > bi) {
        scanTxt = scanTxt.slice(0, bi) + scanTxt.slice(ei + e.length);
      }
    }
    const existing = new Set(scanTxt.match(/"([A-Za-z0-9_]+)"/g) || []);
    for (const k of cKeys) {
      if (existing.has(`"content_${k}"`)) throw new Error(`collision content_${k} in ${lang}.js`);
    }
    for (const k of pKeys) {
      if (existing.has(`"privacy_${k}"`)) throw new Error(`collision privacy_${k} in ${lang}.js`);
    }

    const contentBlock = [
      `   ${CONTENT_BEGIN}`,
      "   // ── Content-script strings (used by in-page content scripts) ──",
      serializeKeys(content[lang], "content_"),
      `   ${CONTENT_END}`,
    ].join("\n");
    const privacyBlock = [
      `   ${PRIVACY_BEGIN}`,
      "   // ── Privacy-policy page strings (used by privacy.html) ──",
      serializeKeys(privacy[lang], "privacy_"),
      `   ${PRIVACY_END}`,
    ].join("\n");

    // Always strip existing generated regions, then re-insert both at the end.
    txt = stripBlock(txt, CONTENT_BEGIN, CONTENT_END);
    txt = stripBlock(txt, PRIVACY_BEGIN, PRIVACY_END);

    const tail = txt.trimEnd();
    if (!tail.endsWith("};")) throw new Error("Locale file does not end with };");
    const body = tail.slice(0, -2).replace(/\s+$/, "");
    // First insertion: the last original property had no trailing comma.
    const needComma = /["']$/.test(body);
    txt = body + (needComma ? "," : "") + "\n" + contentBlock + "\n" + privacyBlock + "\n};\n";

    fs.writeFileSync(file, txt);
    written.push(lang);
    console.log(`[merge] ${lang}.js updated (content_*=${cKeys.length}, privacy_*=${pKeys.length})`);
  }

  fs.writeFileSync(
    MANIFEST_OUT,
    JSON.stringify({ content: cKeys, privacy: pKeys }, null, 2) + "\n"
  );
  console.log(`[merge] manifest written: scripts/i18n/namespace_manifest.json`);
}

try {
  main();
  console.log("[merge] OK");
  process.exit(0);
} catch (e) {
  console.error("[merge] FAIL: " + e.message);
  process.exit(1);
}