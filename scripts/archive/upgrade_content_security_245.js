/* One-off (v2.4.5 part 4b): add SEC_TRUST_REPORT/SEC_COOKIE_REJECT handlers +
   cookie-banner auto-reject module to OS/js/content/security.js */
const fs = require("fs");
const f = "OS/js/content/security.js";
let c = fs.readFileSync(f, "utf8");
if (c.includes("SEC_TRUST_REPORT")) { console.log("already applied"); process.exit(0); }

const anchor = '        if (msg.action === "SEC_BLOCK_IFRAMES") { const n = scanClickjacking(true); sendResponse({ ok: true, count: n }); return true; }';
const i = c.indexOf(anchor);
if (i < 0) { console.error("anchor missing"); process.exit(1); }
const eol = c.includes("\r\n") ? "\r\n" : "\n";
const addHandlers = eol +
'        if (msg.action === "SEC_TRUST_REPORT") {' + eol +
'          let host = "";' + eol +
'          try { host = (window.location.hostname || "").toLowerCase(); } catch (e) {}' + eol +
'          let official = null;' + eol +
'          for (let i2 = 0; i2 < TRUSTED_OFFICIAL.length; i2++) {' + eol +
'            const o = TRUSTED_OFFICIAL[i2];' + eol +
'            if (host === o || host.endsWith("." + o)) { official = o; break; }' + eol +
'          }' + eol +
'          const ph = _isPhishing(window.location.href);' + eol +
'          sendResponse({ ok: true, host: host, official: official, phishing: ph || null, insecure: window.location.protocol === "http:" });' + eol +
'          return true;' + eol +
'        }' + eol +
'        if (msg.action === "SEC_COOKIE_REJECT") { _setCookieReject(!!msg.enabled); sendResponse({ ok: true }); return true; }';
c = c.slice(0, i + anchor.length) + addHandlers + c.slice(i + anchor.length);

const mod = eol + eol +
'  // Cookie-banner auto-reject: privacy-friendly, NEVER clicks "Accept All".' + eol +
'  let _cookieRejectOn = false;' + eol +
'  const BANNER_SELECTORS = [' + eol +
'    "#onetrust-banner-sdk", "#onetrust-consent-sdk", "#qc-cmp2-container", "#qc-cmp2-ui",' + eol +
'    "[class*=\'cookie-consent\']", "[class*=\'cookie-banner\']", "[class*=\'cookie-notice\']",' + eol +
'    "[class*=\'CookieBanner\']",' + eol +
'    "[id*=\'didomi-notice\']", "[class*=\'didomi-notice\']", "[class*=\'didomi-consent-popup\']",' + eol +
'    "[id^=\'CybotCookiebotDialog\']", "[id*=\'cookiebot\']", "[class*=\'cmpbox\']",' + eol +
'    "[aria-modal=\'true\'][class*=\'cookie\']", "[id*=\'cookieplus\']", "[class*=\'cookie-wall\']",' + eol +
'    "[aria-label*=\'cookie\' i]", "[aria-describedby*=\'cookie\' i"]' + eol +
'  ];' + eol +
'  const REJECT_TEXT = /(reject\\s*all|reject|decline\\s*all|decline|refuse|necessary\\s+only|only\\s+necessary|essentials?\\s+only|accept\\s+necessary|từ\\s+chối|chối\\s+tất\\s+cả|cần\\s+thiết|bỏ\\s+qua|no\\s+thanks|later)/i;' + eol +
'  function _dismissOne(el) {' + eol +
'    try {' + eol +
'      if (!el || !document.contains(el)) return false;' + eol +
'      if (el.offsetHeight === 0 && getComputedStyle(el).position !== "fixed") return false;' + eol +
'      let btns = [];' + eol +
'      try { btns = Array.prototype.slice.call(el.querySelectorAll("button,a[role=\'button\'],[role=\'button\'],input[type=\'button\'],input[type=\'submit\']")); } catch (e) {}' + eol +
'      for (let i3 = 0; i3 < btns.length; i3++) {' + eol +
'        const b = btns[i3];' + eol +
'        const txt = (b.textContent || "") + " " + (b.getAttribute("aria-label") || "") + " " + (b.getAttribute("data-action") || "") + " " + (b.id || "");' + eol +
'        if (REJECT_TEXT.test(txt)) { try { b.click(); } catch (e) {} return true; }' + eol +
'      }' + eol +
'      // no reject control found -> hide overlay WITHOUT accepting' + eol +
'      let hideTarget = el;' + eol +
'      for (let d = 0; d < 4 && hideTarget.parentElement; d++) {' + eol +
'        const pos = getComputedStyle(hideTarget).position;' + eol +
'        if (pos === "fixed") break;' + eol +
'        hideTarget = hideTarget.parentElement;' + eol +
'      }' + eol +
'      hideTarget.style.setProperty("display", "none", "important");' + eol +
'      try { document.documentElement.style.removeProperty("overflow"); if (document.body) document.body.style.overflow = ""; } catch (e2) {}' + eol +
'      return true;' + eol +
'    } catch (e) { return false; }' + eol +
'  }' + eol +
'  function _scanCookieBanners() {' + eol +
'    if (!_cookieRejectOn) return;' + eol +
'    for (let i4 = 0; i4 < BANNER_SELECTORS.length; i4++) {' + eol +
'      let els = [];' + eol +
'      try { els = document.querySelectorAll(BANNER_SELECTORS[i4]); } catch (e) { continue; }' + eol +
'      for (let j = 0; j < els.length; j++) _dismissOne(els[j]);' + eol +
'    }' + eol +
'  }' + eol +
'  function _setCookieReject(on) { _cookieRejectOn = !!on; if (_cookieRejectOn) _scanCookieBanners(); }' + eol +
'  try {' + eol +
'    const get2 = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) ? chrome.storage.local : null;' + eol +
'    if (get2) {' + eol +
'      const apply = function (r) { const s = r && r.sf_security_settings; _setCookieReject(!!(s && s.cookieReject)); };' + eol +
'      const p2 = get2.get("sf_security_settings");' + eol +
'      if (p2 && typeof p2.then === "function") p2.then(apply).catch(function () {});' + eol +
'      else get2.get("sf_security_settings", apply);' + eol +
'    }' + eol +
'    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {' + eol +
'      chrome.storage.onChanged.addListener(function (cc, aa) {' + eol +
'        if (aa === "local" && cc && cc.sf_security_settings) _setCookieReject(!!(cc.sf_security_settings.newValue && cc.sf_security_settings.newValue.cookieReject));' + eol +
'      });' + eol +
'    }' + eol +
'  } catch (e) {}' + eol +
'  try {' + eol +
'    let _crT = null;' + eol +
'    const crObs = new MutationObserver(function () {' + eol +
'      if (!_cookieRejectOn || _crT) return;' + eol +
'      _crT = setTimeout(function () { _crT = null; _scanCookieBanners(); }, 800);' + eol +
'    });' + eol +
'    const crStart = function () { try { crObs.observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {} };' + eol +
'    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", crStart); else crStart();' + eol +
'    setTimeout(_scanCookieBanners, 1500);' + eol +
'    setTimeout(_scanCookieBanners, 4000);' + eol +
'    setTimeout(function () { try { crObs.disconnect(); } catch (e) {} }, 30000);' + eol +
'  } catch (e) {}' + eol;
const last = c.lastIndexOf("})();");
if (last < 0) { console.error("tail missing"); process.exit(1); }
c = c.slice(0, last) + mod + c.slice(last);
fs.writeFileSync(f, c);
console.log("content/security.js upgraded");
