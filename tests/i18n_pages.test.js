// ---------------------------------------------------------------------------
// tests/i18n_pages.test.js
//
// i18n integrity + nav drift guard.
//   1. Every data-i18n* key used by the pages exists in ALL five locales.
//   2. The unified translator renders every [data-i18n] element for each of
//      the five languages (textContent === i18n.t(key, lang)).
//   3. The @@NAV@@ block embedded in sidebar.html and popup.html is kept in
//      verbatim sync with OS/html/partials/main-nav.html (2-space indent, no
//      tabs), so a partial edit that is not re-synced fails loudly here.
//
// Run with: node tests/i18n_pages.test.js
// ---------------------------------------------------------------------------

const {
  loadPage, CS_CHUNK, check, finish, REPO_ROOT
} = require("./helpers");

const FS = require("fs");
const PATH = require("path");

const HTML_DIR = PATH.join(REPO_ROOT, "OS", "html");
const LOCALE_DIR = PATH.join(REPO_ROOT, "OS", "locales");
const LANGS = ["vi", "en", "zh", "ru", "ja"];
const PAGES = ["sidebar.html", "popup.html", "prompter.html"];

// attr regex covers data-i18n, data-i18n-placeholder, data-i18n-title, data-i18n-aria
const KEY_RX = /data-i18n(?:-placeholder|-title|-aria)?="([^"]+)"/g;
const LOCALE_KEY_RX = /^\s*["']([a-zA-Z0-9_-]+)["']\s*:/gm;

function dictKeys(lang) {
  const src = FS.readFileSync(PATH.join(LOCALE_DIR, `${lang}.js`), "utf8");
  return new Set([...(src.matchAll(LOCALE_KEY_RX))].map((m) => m[1]));
}

async function main() {
  // --- 1. Key coverage: every used key present in all 5 locales -------------
  console.log("Key coverage (pages -> locales):");
  const dicts = {};
  for (const lang of LANGS) dicts[lang] = dictKeys(lang);
  for (const lang of LANGS) {
    check(dicts[lang].size > 0, `${lang}.js parsed ${dicts[lang].size} dictionary keys`);
  }

  for (const page of PAGES) {
    const html = FS.readFileSync(PATH.join(HTML_DIR, page), "utf8");
    const used = [...new Set([...html.matchAll(KEY_RX)].map((m) => m[1]))];
    const missing = {};
    let anyMissing = false;
    for (const lang of LANGS) {
      const ms = used.filter((k) => !dicts[lang].has(k));
      if (ms.length) { missing[lang] = ms; anyMissing = true; }
    }
    check(!anyMissing, `${page}: all ${used.length} data-i18n* keys defined in all 5 locales` +
      (anyMissing ? ` -> ${JSON.stringify(Object.fromEntries(Object.entries(missing).map(([l, ks]) => [l, ks.slice(0, 6)])))}` : ""));
  }

  // --- 2. Render every language through the live translator -----------------
  console.log("Render all five locales (sidebar.html):");
  const { window: w, errors } = await loadPage("sidebar.html", {
    storeInit: { app_language: "vi" },
    extraChunks: [CS_CHUNK]
  });
  check(errors.length === 0, "sidebar loads with no uncaught errors" + (errors.length ? ` -> ${errors.slice(0, 3).join(" | ")}` : ""));

  for (const lang of LANGS) {
    const r = JSON.parse(w.eval(`(function () {
      window.__lang(${JSON.stringify(lang)});
      var total = 0, mism = [];
      document.querySelectorAll("[data-i18n]").forEach(function (el) {
        if (el.getAttribute("data-i18n-html") === "true") return;
        var key = el.getAttribute("data-i18n");
        if (!key) return;
        total++;
        var want = i18n.t(key, ${JSON.stringify(lang)});
        if (el.textContent !== want) {
          if (mism.length < 6) mism.push({ key: key, got: (el.textContent || "").slice(0, 60), want: (want || "").slice(0, 60) });
        }
      });
      return JSON.stringify({ total: total, active: i18n.getLanguage(), mism: mism });
    })()`));
    check(r.active === lang && r.mism.length === 0,
      `lang='${lang}' applies to ${r.total} [data-i18n] elements with zero mismatches (active='${r.active}')` +
      (r.mism.length ? ` -> ${JSON.stringify(r.mism)}` : ""));
  }

  // --- 3. Nav drift guard ---------------------------------------------------
  console.log("Nav partial sync drift guard:");
  const partialRaw = FS.readFileSync(PATH.join(HTML_DIR, "partials", "main-nav.html"), "utf8")
    .replace(/\r\n/g, "\n");
  const partialLines = partialRaw.split("\n");
  const partialTrim = partialLines.map((l) => l.trimEnd());

  check(partialLines.every((l) => !l.includes("\t")),
    "main-nav.html uses spaces only (no tabs)");
  check(partialTrim.length > 0 &&
    partialTrim.every((l) => { const ind = l.length - l.trimStart().length; return ind % 2 === 0; }),
    "main-nav.html indent widths are even (base-2)");

  for (const page of ["sidebar.html", "popup.html"]) {
    const lines = FS.readFileSync(PATH.join(HTML_DIR, page), "utf8")
      .replace(/\r\n/g, "\n").split("\n");
    const a = lines.findIndex((l) => l.includes("@@NAV@@"));
    const b = lines.findIndex((l) => l.includes("@@NAV-END@@"));
    const marker1ok = a !== -1 && lines.filter((l) => l.includes("@@NAV@@")).length === 1;
    const marker2ok = b !== -1 && lines.filter((l) => l.includes("@@NAV-END@@")).length === 1;
    const emb = a !== -1 && b !== -1 && b > a ? lines.slice(a + 1, b).map((l) => l.trimEnd()) : null;
    const same = emb !== null && emb.length === partialTrim.length &&
      emb.every((l, i) => l === partialTrim[i]);
    check(marker1ok && marker2ok && same,
      `${page}: @@NAV@@ block (${emb ? emb.length : 0}/${partialTrim.length} lines) is verbatim-synced with main-nav.html`);
  }

  // No @@NAV@@ leftovers inside the partial itself
  check(!partialRaw.includes("@@NAV@@"), "partial contains no @NAV@ markers");

  finish("i18n_pages.test.js");
}

main().catch((e) => {
  console.error("FATAL:", (e && e.stack) || e);
  process.exit(1);
});