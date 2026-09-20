// ---------------------------------------------------------------------------
// ScholarFlow OS/js/gamble-block.js — controller for OS/html/gamble-block.html
// (the page declarativeNetRequest redirects gambling domains to).
// Reads the blocked host from ?h=, localizes via the shared i18n engine, and
// offers Back / per-domain unblock (GMBL_ALLOW_HOST -> background rebuild).
// ---------------------------------------------------------------------------
"use strict";

try { window.SCHOLARFLOW_I18N_AUTO = false; } catch (e) {}

function onReady(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
}

onReady(function () {
  const params = new URLSearchParams(window.location.search);
  let host = "";
  try { host = decodeURIComponent(params.get("h") || ""); } catch (e) { host = params.get("h") || ""; }
  host = String(host).replace(/[^a-z0-9.\-_:\[\]]/gi, "").slice(0, 120);

  function apply(lang) {
    if (!lang || !window.i18n || !window.i18n.DATA[lang]) lang = "vi";
    document.documentElement.lang = lang;
    document.title = window.i18n ? window.i18n.t("gbl_title", lang) : "ScholarFlow";
    window.i18n.setLanguage(lang, true);
    const msg = document.getElementById("gbl-msg");
    if (msg && window.i18n) {
      msg.textContent = window.i18n.t("gbl_msg", lang, [host || "—"]);
    }
  }

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get("app_language", function (res) {
      apply(params.get("lang") || (res && res.app_language) || "vi");
    });
  } else {
    apply(params.get("lang") || "vi");
  }

  const back = document.getElementById("btn-gbl-back");
  if (back) back.addEventListener("click", function () {
    if (window.history.length > 1) window.history.back();
    else window.close();
  });

  const allow = document.getElementById("btn-gbl-allow");
  if (allow) allow.addEventListener("click", function () {
    try {
      const rt = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime : chrome.runtime;
      rt.sendMessage({ action: "GMBL_ALLOW_HOST", host: host });
    } catch (e) {}
    allow.disabled = true;
    allow.textContent = "✓";
    setTimeout(function () {
      if (window.history.length > 1) window.history.back();
    }, 600);
  });
});
