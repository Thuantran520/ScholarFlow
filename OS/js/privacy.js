// ---------------------------------------------------------------------------
// ScholarFlow privacy.html controller (thin)
// Relies on OS/locales/*.js + OS/js/i18n.js for translations.
// All privacy_* keys live in the locale files (single source of truth).
// Re-run the merge script after editing any locale file:
//   node scripts/i18n/merge_namespaces.js
// ---------------------------------------------------------------------------
"use strict";

// This page drives its own language flow (URL param > storage); disable the
// generic auto-init translation pass in i18n.js to avoid a read race.
try { window.SCHOLARFLOW_I18N_AUTO = false; } catch (e) {}

function onReady(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
}

onReady(() => {
  const sel = document.getElementById("select-privacy-lang");
  const closeBtn = document.getElementById("btn-close-page");

  // 1. Detect language: URL param > storage > default vi
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get("lang");

  function apply(lang) {
    if (!lang || !window.i18n || !window.i18n.DATA[lang]) lang = "vi";
    if (window.i18n) window.i18n.setLanguage(lang, false);
    document.title = window.i18n ? window.i18n.t("privacy_title", lang) : "ScholarFlow";
    document.documentElement.lang = lang;
    if (sel && sel.value !== lang) sel.value = lang;
  }

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get("app_language", (res) => {
      apply(urlLang || (res && res.app_language) || "vi");
    });
  } else {
    apply(urlLang || "vi");
  }

  // 2. Language switcher event
  if (sel) {
    sel.addEventListener("change", (e) => {
      const newLang = e.target.value;
      if (window.i18n) {
        window.i18n.setLanguage(newLang, true);
      } else {
        apply(newLang);
      }
      document.title = window.i18n ? window.i18n.t("privacy_title", newLang) : "ScholarFlow";
      document.documentElement.lang = newLang;
      sel.value = newLang;
    });
  }

  // 3. Close button
  if (closeBtn) closeBtn.addEventListener("click", () => window.close());
});