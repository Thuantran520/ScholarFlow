/* One-off (v2.4.5 part 9): cookie-banner auto-reject v2 in content/security.js —
   major-CMP rules, event-firing clicks, broader text match, longer scan window. */
const fs = require("fs");
const f = "OS/js/content/security.js";
let c = fs.readFileSync(f, "utf8");
const startMark = "  // Cookie-banner auto-reject";
const s = c.indexOf(startMark);
const tail = "})();";
const end = c.lastIndexOf(tail);
if (s < 0 || end < 0 || end < s) { console.error("anchors not found"); process.exit(1); }

const eol = c.includes("\r\n") ? "\r\n" : "\n";
const mod = `  // Cookie-banner auto-reject v2: privacy-friendly, NEVER clicks "Accept All".${eol}` +
`  // Major-CMP rules + generic overlay scan. Iframes (Google Funding Choices${eol}` +
`  // and other cross-origin CMPs) are out of reach for content scripts.${eol}` +
`  let _cookieRejectOn = false;${eol}` +
`  const REJECT_TEXT = /(reject(\\s+all)?|decline(\\s+all)?|refuse(\\s+all)?|refuser|tout\\s+refuser|alles?\\s+ablehnen|nicht\\s+akzeptieren|rechazar|rechazar\\s+todo|solo\\s+esenciales|necessar[iy]\\s+only|only\\s+necessar|rifiuta|solo\\s+necessari|recusar|apenas\\s+necess[aá]ri[oa]s|necessary\\s+only|accept\\s+necessary|từ\\s+chối|chối\\s+tất\\s+cả|cần\\s+thiết|bỏ\\s+qua|no\\s+thanks|later)/i;${eol}` +
`  const CMP_RULES = [${eol}` +
`    { c: "#onetrust-banner-sdk, #onetrust-consent-sdk", deny: "#onetrust-reject-all-handler" },${eol}` +
`    { c: ".cky-consent-container, .cky-consent-bar, .cky-modal", deny: ".cky-btn-reject" },${eol}` +
`    { c: ".osano-cm-window", deny: ".osano-cm-deny, .osano-cm-denyAll" },${eol}` +
`    { c: "#iubenda-cs-banner", deny: ".iubenda-cs-purge-btn, .iubenda-btn-reject" },${eol}` +
`    { c: ".cmplz-banner-box, #cmplz-cookiebanner-container", deny: ".cmplz-btn.cmplz-deny, .cmplz-deny, .cmplz-btn--deny" },${eol}` +
`    { c: "#tarteaucitronRoot", deny: "#tarteaucitronAllDenied2, #tarteaucitronAllDenied, #tarteaucitronDeny" },${eol}` +
`    { c: ".cmpbox, .cmpbox2", deny: ".cmpboxbtnno" },${eol}` +
`    { c: "#qc-cmp2-container", deny: "[data-option='Reject Data Usage'], [data-option*='efuser'], [data-option*='efuse']" },${eol}` +
`    { c: "[id*='didomi'], [class*='didomi']", deny: "[aria-label*='refus' i]" },${eol}` +
`    { c: "[id*='sp_message'], [class*='sp-message'], [class*='sourcepoint']", deny: "" },${eol}` +
`    { c: "[id^='CybotCookiebotDialog'], [id*='cookiebot']", deny: "[id*='Decline'], .cb-decline-all-btn" },${eol}` +
`    { c: "[class*='cookie-consent'], [class*='cookie-banner'], [class*='cookie-notice'], [class*='CookieBanner']", deny: "" }${eol}` +
`  ];${eol}` +
`  function _qc(el) {${eol}` +
`    try {${eol}` +
`      if (!el || !document.contains(el)) return false;${eol}` +
`      if (el.offsetHeight > 0) return true;${eol}` +
`      const r = el.getBoundingClientRect();${eol}` +
`      return r.width > 0 && r.height > 0;${eol}` +
`    } catch (e) { return false; }${eol}` +
`  }${eol}` +
`  function _fireClick(btn) {${eol}` +
`    try { btn.focus(); } catch (e) {}${eol}` +
`    const evs = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];${eol}` +
`    let ok = false;${eol}` +
`    for (let i = 0; i < evs.length; i++) {${eol}` +
`      try {${eol}` +
`        const E = evs[i].indexOf("pointer") === 0 && typeof PointerEvent === "function" ? PointerEvent : MouseEvent;${eol}` +
`        btn.dispatchEvent(new E(evs[i], { bubbles: true, cancelable: true }));${eol}` +
`        ok = true;${eol}` +
`      } catch (e) {}${eol}` +
`    }${eol}` +
`    if (!ok || evs.indexOf("click") === -1) { try { btn.click(); } catch (e) {} }${eol}` +
`  }${eol}` +
`  function _btnsOf(root) {${eol}` +
`    let out = [];${eol}` +
`    try { out = Array.prototype.slice.call(root.querySelectorAll("button,a[role='button'],[role='button'],input[type='button'],input[type='submit'],.cky-btn,.cmplz-btn,.qc-cmp2-summary-buttons button")); } catch (e) {}${eol}` +
`    return out.filter(_qc).slice(0, 400);${eol}` +
`  }${eol}` +
`  function _btnHay(b) {${eol}` +
`    return (b.textContent || "") + " " + (b.getAttribute("aria-label") || "") + " " + (b.id || "") + " " + (b.getAttribute("data-action") || "") + " " + (b.getAttribute("data-option") || "") + " " + (b.className || "");${eol}` +
`  }${eol}` +
`  function _unlockScroll() {${eol}` +
`    try { document.documentElement.style.overflow = ""; if (document.body) document.body.style.overflow = ""; } catch (e) {}${eol}` +
`  }${eol}` +
`  function _hideUp(el) {${eol}` +
`    let t = el;${eol}` +
`    for (let d = 0; d < 4 && t.parentElement; d++) {${eol}` +
`      const pos = getComputedStyle(t).position;${eol}` +
`      if (pos === "fixed" || pos === "sticky") break;${eol}` +
`      t = t.parentElement;${eol}` +
`    }${eol}` +
`    try { t.style.setProperty("display", "none", "important"); _unlockScroll(); return true; } catch (e) { return false; }${eol}` +
`  }${eol}` +
`  function _denyIn(root, sel) {${eol}` +
`    if (!sel) return false;${eol}` +
`    let els = [];${eol}` +
`    try { els = Array.prototype.slice.call(root.querySelectorAll(sel)); } catch (e) { return false; }${eol}` +
`    els = els.filter(_qc);${eol}` +
`    if (!els.length) return false;${eol}` +
`    _fireClick(els[0]);${eol}` +
`    _unlockScroll();${eol}` +
`    return true;${eol}` +
`  }${eol}` +
`  function _isInsideFixed(el) {${eol}` +
`    let a = el;${eol}` +
`    for (let l = 0; l < 10 && a; l++) {${eol}` +
`      try { const p = getComputedStyle(a).position; if (p === "fixed" || p === "sticky") return true; } catch (e) {}${eol}` +
`      a = a.parentElement;${eol}` +
`    }${eol}` +
`    return false;${eol}` +
`  }${eol}` +
`  function _scanCookieBanners() {${eol}` +
`    if (!_cookieRejectOn) return;${eol}` +
`    try {${eol}` +
`      for (let i = 0; i < CMP_RULES.length; i++) {${eol}` +
`        const rule = CMP_RULES[i];${eol}` +
`        let boxes = [];${eol}` +
`        try { boxes = document.querySelectorAll(rule.c); } catch (e) { continue; }${eol}` +
`        for (let b = 0; b < boxes.length; b++) {${eol}` +
`          const box = boxes[b];${eol}` +
`          if (!_qc(box)) continue;${eol}` +
`          if (_denyIn(box, rule.deny)) return;${eol}` +
`          const btns = _btnsOf(box);${eol}` +
`          for (let k = 0; k < btns.length; k++) {${eol}` +
`            if (REJECT_TEXT.test(_btnHay(btns[k]))) { _fireClick(btns[k]); _unlockScroll(); return; }${eol}` +
`          }${eol}` +
`          _hideUp(box);${eol}` +
`        }${eol}` +
`      }${eol}` +
`      const all = _btnsOf(document);${eol}` +
`      for (let a = 0; a < all.length; a++) {${eol}` +
`        if (!REJECT_TEXT.test(_btnHay(all[a]))) continue;${eol}` +
`        if (_isInsideFixed(all[a])) { _fireClick(all[a]); _unlockScroll(); return; }${eol}` +
`      }${eol}` +
`    } catch (e) {}${eol}` +
`  }${eol}` +
`  function _kickScans() {${eol}` +
`    [400, 1200, 2500, 4000, 6000, 9000, 14000, 20000].forEach(function (t) { setTimeout(_scanCookieBanners, t); });${eol}` +
`  }${eol}` +
`  function _setCookieReject(on) { _cookieRejectOn = !!on; if (_cookieRejectOn) _kickScans(); }${eol}` +
`  try {${eol}` +
`    const get2 = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) ? chrome.storage.local : null;${eol}` +
`    if (get2) {${eol}` +
`      const apply = function (r) { const s2 = r && r.sf_security_settings; _setCookieReject(!!(s2 && s2.cookieReject)); };${eol}` +
`      const p2 = get2.get("sf_security_settings");${eol}` +
`      if (p2 && typeof p2.then === "function") p2.then(apply).catch(function () {});${eol}` +
`      else get2.get("sf_security_settings", apply);${eol}` +
`    }${eol}` +
`    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {${eol}` +
`      chrome.storage.onChanged.addListener(function (cc, aa) {${eol}` +
`        if (aa === "local" && cc && cc.sf_security_settings) _setCookieReject(!!(cc.sf_security_settings.newValue && cc.sf_security_settings.newValue.cookieReject));${eol}` +
`      });${eol}` +
`    }${eol}` +
`  } catch (e) {}${eol}` +
`  try {${eol}` +
`    let _crT = null;${eol}` +
`    const crObs = new MutationObserver(function () {${eol}` +
`      if (!_cookieRejectOn || _crT) return;${eol}` +
`      _crT = setTimeout(function () { _crT = null; _scanCookieBanners(); }, 500);${eol}` +
`    });${eol}` +
`    const crStart = function () { try { crObs.observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {} };${eol}` +
`    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", crStart); else crStart();${eol}` +
`    setTimeout(function () { try { crObs.disconnect(); } catch (e) {} }, 45000);${eol}` +
`  } catch (e) {}${eol}`;
c = c.slice(0, s) + mod + c.slice(end);
fs.writeFileSync(f, c);
console.log("cookie module v2 installed");
