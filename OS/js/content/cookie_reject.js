// ---------------------------------------------------------------------------
// ScholarFlow content: OS/js/content/cookie_reject.js
// Cookie-banner auto-reject ENGINE v3 — runs in EVERY frame (all_frames:true)
// so CMPs rendered inside iframes (Quantcast, Didomi, consentmanager,
// Google consent interstitials...) are reachable. Privacy-first: only ever
// clicks REJECT/DECLINE/Necessary-only controls; falls back to hiding the
// overlay WITHOUT accepting. 100% local.
// ---------------------------------------------------------------------------
(function () {
  let _on = false;

  const REJECT_TEXT = new RegExp([
    "reject(\\s+all)?", "decline(\\s+all)?", "refuse(\\s+all)?",
    "necessary\\s+only", "only\\s+necessary", "essentials?\\s+only", "accept\\s+necessary",
    "non\\s+(et\\s+enregistrer|accepter)", "tout\\s+refuser", "refuser",
    "alle?\\s+ablehnen", "nicht\\s+akzeptieren", "nur\\s+notwendige", "ablehnen",
    "rechazar(\\s+todo)?", "solo\\s+esenciales", "denegar",
    "rifiuta", "solo\\s+necessari", "accetta\\s+solo",
    "recusar(\\s+todos)?", "apenas\\s+necess[aá]ri[oa]s", "rejeitar",
    "odrzuc", "odrzuć", "tylko\\s+necessary|tylko\\s+konieczne",
    "weigeren", "accepteer\\s+alleen", "alleen\\s+noodzakelijk",
    "respinge", "accept(ă|a)?\\s+numai",
    "reddet", "sadece\\s+gerekli",
    "tolak", "hanya\\s+wajib",
    "відхилити", "відмова",
    "avvisa", "afvis", "hylät", "απόρριψη", "odmítnout",
    "từ\\s+chối", "chối\\s+tất\\s+cả", "cần\\s+thiết", "bỏ\\s+qua", "không",
    "no\\s+thanks", "no\\s+thank", "later", "not\\s+now", "remind\\s+me\\s+later",
    "rejectall", "reject_all", "denyall", "deny_all",
    "sp_choice_type_reject"
  ].join("|"), "i");

  const CMP_RULES = [
    { c: "#onetrust-banner-sdk, #onetrust-consent-sdk, #ot-sdk-btn-floating", deny: "#onetrust-reject-all-handler, #onetrust-close-btn-container button" },
    { c: ".cky-consent-container, .cky-consent-bar, .cky-modal, .cky-overlay", deny: ".cky-btn-reject, button[class*='reject' i]" },
    { c: ".osano-cm-window", deny: ".osano-cm-deny, .osano-cm-denyAll, .osano-cm-button[aria-label*='deny' i]" },
    { c: "#iubenda-cs-banner, .iubenda-cs-container", deny: ".iubenda-cs-purge-btn, .iubenda-btn-reject, [data-iubenda-prefs-cc-purge], button[class*='reject' i]" },
    { c: ".cmplz-banner-box, #cmplz-cookiebanner-container, .cmplz-consent", deny: ".cmplz-btn.cmplz-deny, .cmplz-deny, .cmplz-btn--deny" },
    { c: "#tarteaucitronRoot", deny: "#tarteaucitronAllDenied2, #tarteaucitronAllDenied, #tarteaucitronDeny, .tarteaucitronAllDenied" },
    { c: ".cmpbox, .cmpbox2, #cmpbox", deny: ".cmpboxbtnno, [class*='cmpboxbtn'][class*='no']" },
    { c: "#qc-cmp2-container, .qc-cmp2-container", deny: "[data-option='Reject Data Usage'], [data-option*='eject'], [data-option*='efus']" },
    { c: "[id*='didomi'], [class*='didomi']", deny: "[aria-label*='refus' i], [aria-label*='eject' i], [class*='refuse' i], [class*='reject' i]" },
    { c: "[id*='sp_message'], [class*='sp_message'], [class*='sourcepoint']", deny: "[class*='sp_choice_button'] button, [id*='REJECT' i], button[class*='reject' i]" },
    { c: "[id^='CybotCookiebotDialog'], [id*='cookiebot']", deny: "[id*='Decline' i], .cb-decline-all-btn, [id*='AcceptSelected'] ~ button" },
    { c: "#truste-banner, [id*='truste'], [class*='trustarc']", deny: "#truste-consent-reject, [data-btn-type='reject' i], [id*='reject' i]" },
    { c: "[id*='axcptio'], [class*='axp-'], [id*='axeptio']", deny: "[class*='disagree' i], [class*='reject' i]" },
    { c: "#cookie-law-info-bar, #cookie-law-info-again, .cli-plugin-bar", deny: "[data-cli-action*='close' i], [data-cli-action*='reject' i], .cliCloseBtn" },
    { c: ".gcc-ccpa-popup, [class*='gcc-cookie']", deny: "[class*='reject' i]" },
    { c: ".cookie-consent, .cookie-banner, .cookie-notice, [class*='CookieBanner'], [class*='cookie-consent'], [class*='cmp-'], [class*='consent-']", deny: "button[class*='reject' i], [class*='deny' i]" }
  ];

  function _qc(el) {
    try {
      if (!el || !document.contains(el)) return false;
      if (el.offsetHeight > 0) return true;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    } catch (e) { return false; }
  }
  function _fireClick(btn) {
    try { btn.focus(); } catch (e) {}
    const evs = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
    for (let i = 0; i < evs.length; i++) {
      try {
        const E = evs[i].indexOf("pointer") === 0 && typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
        btn.dispatchEvent(new E(evs[i], { bubbles: true, cancelable: true }));
      } catch (e) {
        try { btn.click(); } catch (e2) {}
      }
    }
  }
  function _btnsOf(root) {
    let out = [];
    try {
      out = Array.prototype.slice.call(root.querySelectorAll(
        "button,a[role='button'],[role='button'],input[type='button'],input[type='submit'],.cky-btn,.cmplz-btn,.qc-cmp2-summary-buttons button,button[class*='reject' i],button[class*='deny' i],[id*='reject' i],[id*='Reject']"
      ));
    } catch (e) {}
    return out.filter(_qc).slice(0, 500);
  }
  function _hay(b) {
    return (b.textContent || "") + " " + (b.getAttribute("aria-label") || "") + " " + (b.id || "") +
      " " + (b.getAttribute("data-action") || "") + " " + (b.getAttribute("data-option") || "") +
      " " + (b.getAttribute("data-testid") || "") + " " + (b.value || "") + " " + (b.className || "");
  }
  function _unlockScroll() {
    try {
      document.documentElement.style.overflow = "";
      if (document.body) document.body.style.overflow = "";
    } catch (e) {}
  }
  function _hideUp(el) {
    let t = el;
    for (let d = 0; d < 5 && t.parentElement; d++) {
      const pos = getComputedStyle(t).position;
      if (pos === "fixed" || pos === "sticky") break;
      t = t.parentElement;
    }
    try { t.style.setProperty("display", "none", "important"); _unlockScroll(); return true; } catch (e) { return false; }
  }
  function _denyIn(root, sel) {
    if (!sel) return false;
    let els = [];
    try { els = Array.prototype.slice.call(root.querySelectorAll(sel)); } catch (e) { return false; }
    els = els.filter(_qc);
    if (!els.length) return false;
    _fireClick(els[0]);
    _unlockScroll();
    return true;
  }
  function _rejectByText(btns) {
    for (let k = 0; k < btns.length; k++) {
      if (REJECT_TEXT.test(_hay(btns[k]))) { _fireClick(btns[k]); _unlockScroll(); return true; }
    }
    return false;
  }
  function _insideFixed(el) {
    let a = el;
    for (let l = 0; l < 10 && a; l++) {
      try { const p = getComputedStyle(a).position; if (p === "fixed" || p === "sticky") return true; } catch (e) {}
      a = a.parentElement;
    }
    return false;
  }
  function _setUspGpc() {
    try {
      if (typeof window.__uspapi === "function") { try { window.__uspapi("setUSPData", { version: 1, uspString: "1YNY" }, function () {}); } catch (e) {} }
      if (typeof window.__gpp === "function") { try { window.__gpp("setGPPData", { us_national: { gpc: true } }, function () {}); } catch (e2) {} }
    } catch (e) {}
  }
  function scan() {
    if (!_on) return;
    try {
      for (let i = 0; i < CMP_RULES.length; i++) {
        const rule = CMP_RULES[i];
        let boxes = [];
        try { boxes = Array.prototype.slice.call(document.querySelectorAll(rule.c)); } catch (e) { continue; }
        for (let b = 0; b < boxes.length; b++) {
          const box = boxes[b];
          if (!_qc(box)) continue;
          if (_denyIn(box, rule.deny)) return;
          if (_rejectByText(_btnsOf(box))) return;
          _hideUp(box);
        }
      }
      if (_rejectByText(_btnsOf(document).filter(_insideFixed))) return;
    } catch (e) {}
  }
  function kick() {
    [300, 900, 1800, 3200, 5000, 7500, 11000, 16000, 24000].forEach(function (t) { setTimeout(scan, t); });
    try { _setUspGpc(); } catch (e) {}
  }
  function setOn(on) { _on = !!on; if (_on) kick(); }

  try {
    const api = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) ? chrome.storage.local : null;
    if (api) {
      const apply = function (r) { const s = r && r.sf_security_settings; setOn(!!(s && s.cookieReject)); };
      const p = api.get("sf_security_settings");
      if (p && typeof p.then === "function") p.then(apply).catch(function () {});
      else api.get("sf_security_settings", apply);
    }
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function (c, area) {
        if (area === "local" && c && c.sf_security_settings) setOn(!!(c.sf_security_settings.newValue && c.sf_security_settings.newValue.cookieReject));
      });
    }
  } catch (e) {}
  try {
    let t = null;
    const obs = new MutationObserver(function () {
      if (!_on || t) return;
      t = setTimeout(function () { t = null; scan(); }, 400);
    });
    const start = function () { try { obs.observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {} };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
    setTimeout(function () { try { obs.disconnect(); } catch (e) {} }, 60000);
  } catch (e) {}
  try {
    const rt = (typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null;
    if (rt && rt.onMessage && rt.onMessage.addListener) {
      rt.onMessage.addListener(function (msg, sender, sendResponse) {
        if (!msg || !msg.action) return;
        if (msg.action === "SEC_COOKIE_REJECT") { setOn(!!msg.enabled); sendResponse({ ok: true }); return true; }
        if (msg.action === "SEC_COOKIE_SCAN") { scan(); sendResponse({ ok: true }); return true; }
      });
    }
  } catch (e) {}
})();
