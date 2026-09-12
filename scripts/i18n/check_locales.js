// ---------------------------------------------------------------------------
// ScholarFlow i18n integrity checker (single source of truth = OS/locales/*.js)
// Checks:
//  1. All 5 locale files expose the exact same key set (parity).
//  2. content_* / privacy_* namespaces match the merge manifest.
//  3. Every value is a non-empty string (no dangling placeholders that break).
//  4. Every data-i18n / data-i18n-placeholder / data-i18n-title / data-i18n-aria
//     key referenced by popup/sidebar/privacy html resolves in the locale dumps.
//  5. Static t()/getI18nText() keys in the sidebar modules resolve too.
//  6. OS/js/content/i18n.js generated artifact is in sync (--verify mode).
//
// Usage: node scripts/i18n/check_locales.js
// Exit 0 = pass, 1 = fail.
// ---------------------------------------------------------------------------

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const LANGS = ["vi", "en", "zh", "ru", "ja"];
const MANIFEST = path.join(__dirname, "namespace_manifest.json");
const LOCALE_DIR = path.join(ROOT, "OS", "locales");

const results = [];
function add(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? " -> " + detail : ""}`);
}

function readUtf8(p) {
  return fs.readFileSync(p, "utf8");
}

function loadLocale(lang) {
  const code = readUtf8(path.join(LOCALE_DIR, lang + ".js"));
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: lang + ".js" });
  const dict = sandbox.window["I18N_" + lang.toUpperCase()];
  if (!dict || typeof dict !== "object") throw new Error(`${lang}.js did not expose I18N_${lang.toUpperCase()}`);
  return dict;
}

function main() {
  console.log("ScholarFlow i18n integrity check");
  console.log("--------------------------------");

  const dicts = {};
  for (const lang of LANGS) dicts[lang] = loadLocale(lang);

  // 1. Key-set parity
  const baseKeys = Object.keys(dicts.vi).sort();
  let parityOk = true;
  let parityMsg = `${baseKeys.length} keys`;
  for (const lang of LANGS) {
    const k = Object.keys(dicts[lang]).sort();
    if (JSON.stringify(k) !== JSON.stringify(baseKeys)) {
      parityOk = false;
      const missing = baseKeys.filter(x => !k.includes(x));
      const extra = k.filter(x => !baseKeys.includes(x));
      parityMsg = `${lang}: missing=${missing.length} extra=${extra.length}`;
      break;
    }
  }
  add("locale key parity across vi/en/zh/ru/ja", parityOk, parityMsg);

  // 2. Namespace keys match manifest
  const manifest = JSON.parse(readUtf8(MANIFEST));
  const contentKeys = Object.keys(dicts.vi).filter(k => k.startsWith("content_")).map(k => k.slice(8));
  const privacyKeys = Object.keys(dicts.vi).filter(k => k.startsWith("privacy_")).map(k => k.slice(8));
  const cOk = JSON.stringify([...contentKeys].sort()) === JSON.stringify([...manifest.content].sort());
  const pOk = JSON.stringify([...privacyKeys].sort()) === JSON.stringify([...manifest.privacy].sort());
  add("content_* namespace == manifest", cOk, `got ${contentKeys.length}`);
  add("privacy_* namespace == manifest", pOk, `got ${privacyKeys.length}`);

  // 3. Non-empty string values (all languages)
  const empty = [];
  for (const lang of LANGS) {
    for (const [k, v] of Object.entries(dicts[lang])) {
      if (typeof v !== "string" || v.length === 0) empty.push(`${lang}.${k}`);
    }
  }
  add("all locale values are non-empty strings", empty.length === 0, empty.length ? empty.slice(0, 5).join(", ") : "");

  // Unused placeholder check: '{' should be paired or numeric
  const badPlaceholders = [];
  for (const lang of LANGS) {
    for (const [k, v] of Object.entries(dicts[lang])) {
      const opens = (v.match(/\{/g) || []).length;
      const closes = (v.match(/\}/g) || []).length;
      if (opens !== closes) badPlaceholders.push(`${lang}.${k}`);
    }
  }
  add("balanced {} placeholders in every value", badPlaceholders.length === 0, badPlaceholders.length ? badPlaceholders.slice(0, 5).join(", ") : "");

  // 4. HTML data-i18n key references resolve
  const attrMap = {
    "data-i18n": "data-i18n",
    "data-i18n-placeholder": "data-i18n-placeholder",
    "data-i18n-title": "data-i18n-title",
    "data-i18n-aria": "data-i18n-aria"
  };
  const htmlFiles = ["popup.html", "sidebar.html", "privacy.html"];
  const refs = {};
  for (const f of htmlFiles) {
    const txt = readUtf8(path.join(ROOT, "OS", "html", f));
    for (const attr of Object.keys(attrMap)) {
      for (const m of txt.matchAll(new RegExp(attr + '="([^"\\s]+)"', "g"))) {
        const key = m[1];
        refs[key] = refs[key] || { file: f, missing: false };
      }
    }
  }
  const missingRefs = Object.entries(refs).filter(([key]) => dicts.vi[key] === undefined).map(([key, info]) => `${info.file}:${key}`);
  add(`html data-i18n* references resolve (${Object.keys(refs).length} unique keys)`, missingRefs.length === 0, missingRefs.length ? missingRefs.slice(0, 8).join(", ") : "");

  // 5. Static t() / getI18nText() keys in sidebar modules resolve
  const scanDirs = ["OS/js/i18n.js", "OS/js/init.js", "OS/js/tabs", "OS/js/citation", "OS/js/core", "OS/js/editor", "OS/js/utils", "OS/js/verify.js", "OS/js/redact.js"];
  const keyRe = /(?:\bt\s*\(\s*"|getI18nText\s*\(\s*"|i18n\.t\s*\(\s*")([^")]+)"/g;
  const jsKeys = new Set();
  function walk(file) {
    const st = fs.statSync(file);
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(file)) walk(path.join(file, e));
      return;
    }
    if (!file.endsWith(".js")) return;
    const txt = readUtf8(file);
    for (const m of txt.matchAll(keyRe)) jsKeys.add(m[1]);
  }
  for (const rel of scanDirs) walk(path.join(ROOT, rel));
  const missingJs = [...jsKeys].filter(k => dicts.vi[k] === undefined && !k.startsWith("content_"));
  add(`static t()/getI18nText() keys resolve (${jsKeys.size} unique)`, missingJs.length === 0, missingJs.length ? missingJs.slice(0, 8).join(", ") : "");

  // 6. Generated content/i18n.js in sync
  let genOk = false;
  let genMsg = "";
  try {
    execFileSync(process.execPath, [path.join(__dirname, "generate_content_i18n.js"), "--verify"], {
      cwd: ROOT, stdio: "pipe"
    });
    genOk = true;
  } catch (e) {
    genMsg = String((e.stdout || "") + (e.stderr || "")).trim().split("\n")[0];
  }
  add("generated OS/js/content/i18n.js in sync", genOk, genMsg);

  const fails = results.filter(r => !r.ok).length;
  console.log("--------------------------------");
  console.log(fails === 0 ? "i18n check: ALL PASSED" : `i18n check: ${fails} FAILED`);
  process.exit(fails === 0 ? 0 : 1);
}

try {
  main();
} catch (e) {
  console.error("i18n check FATAL: " + e.message);
  process.exit(1);
}