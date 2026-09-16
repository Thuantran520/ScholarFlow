// ---------------------------------------------------------------------------
// ScholarFlow content: OS/js/content/social.js
// Social Privacy Shield (Facebook/Messenger, Zalo, Instagram, WhatsApp Web,
// TikTok, Discord, X, Telegram Web) — best-effort CSS-only hiding of
// typing/seen/online indicators + social tracker scan on demand.
// Selectors may need updates when platforms change their UI.
// ---------------------------------------------------------------------------
(function () {
  const SHIELD_STYLE_ID = "__sf_soc_shield";
  const PLATFORM_HOSTS = {
    facebook: ["facebook.com", "messenger.com"],
    zalo: ["zalo.me", "zaloapp.com"],
    instagram: ["instagram.com"],
    whatsapp: ["web.whatsapp.com"],
    tiktok: ["tiktok.com"],
    discord: ["discord.com"],
    x: ["x.com", "twitter.com"],
    telegram: ["web.telegram.org"]
  };
  const TRACKER_HOSTS = [
    "connect.facebook.net", "facebook.net", "google-analytics.com", "googletagmanager.com",
    "doubleclick.net", "analytics.tiktok.com", "analytics.twitter.com", "bat.bing.com",
    "hotjar.com", "mixpanel.com", "segment.io", "scorecardresearch.com", "ads-twitter.com",
    "snap.licdn.com", "clarity.ms", "criteo.com", "taboola.com", "outbrain.com"
  ];

  function _detectPlatform() {
    let h = "";
    try { h = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : ""; } catch (e) { return null; }
    for (const k in PLATFORM_HOSTS) {
      const list = PLATFORM_HOSTS[k];
      for (let i = 0; i < list.length; i++) {
        if (h === list[i] || h.endsWith("." + list[i])) return k;
      }
    }
    return null;
  }
  function _readSettings(cb) {
    const api = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) ? chrome.storage.local : null;
    if (!api) { cb(null); return; }
    try {
      const p = api.get("sf_social_settings");
      if (p && typeof p.then === "function") p.then(function (r) { cb(r && r.sf_social_settings); }).catch(function () { cb(null); });
      else api.get("sf_social_settings", function (r) { cb(r && r.sf_social_settings); });
    } catch (e) { cb(null); }
  }
  function _cssFor(platform, s) {
    if (!s) return "";
    let css = "";
    const p = (s.platforms && s.platforms[platform]) || {};
    const typing = !!p.typing, seen = !!p.seen, online = !!p.online;
    if (platform === "facebook") {
      css += typing ? '[data-name="typing-indicator"],span[aria-label*="typing"],._1bf ._ak57,._98eh{display:none!important}' : "";
      css += seen ? '[data-name="message-read-receipt"],#viewport>div:last-child>div:last-child{display:none!important}' : "";
      css += online ? '[aria-label*="Active Status"] [role="img"],.__c__,._1g9s,a i._3qb,.profilepiccirclepresence{display:none!important}' : "";
    } else if (platform === "zalo") {
      css += typing ? '[class*="typing"],[class*="dang-soan"]{display:none!important}' : "";
      css += seen ? '[class*="read-state"],.icon-eye,[class*="seen"]{display:none!important}' : "";
      css += online ? '.status-dot,[class*="online-dot"],[class*="activity"]{display:none!important}' : "";
    } else if (platform === "instagram") {
      css += typing ? '[data-ix="typing-indicator"],[class*="typing"]{display:none!important}' : "";
      css += seen ? '[data-name="message-read-receipt"],[class*="seen-indicator"]{display:none!important}' : "";
      css += online ? 'div[data-presence]:after{display:none!important}' : "";
    } else if (platform === "whatsapp") {
      css += typing ? '[data-icon="pencil"]{display:none!important}' : "";
      css += seen ? '[data-icon="status-dblcheck"],[data-icon="status-check"]{opacity:.25;filter:grayscale(1)}' : "";
    } else if (platform === "x") {
      css += typing ? '[data-testid*="typing"]{display:none!important}' : "";
    } else if (platform === "telegram") {
      css += typing ? '[class*="typing"]{display:none!important}' : "";
      css += online ? '[class*="presence"],[class*="online-dot"]{visibility:hidden!important}' : "";
    } else if (platform === "discord") {
      css += typing ? '[class*="typing"]{display:none!important}' : "";
    }
    return css;
  }
  function _applyShield(css) {
    try {
      let st = document.getElementById(SHIELD_STYLE_ID);
      if (!css) { if (st) st.remove(); return; }
      if (!st) {
        st = document.createElement("style");
        st.id = SHIELD_STYLE_ID;
        (document.head || document.documentElement).appendChild(st);
      }
      st.textContent = css;
    } catch (e) {}
  }
  function _refresh() {
    const platform = _detectPlatform();
    if (!platform) { _applyShield(""); return; }
    _readSettings(function (s) {
      _applyShield(s ? _cssFor(platform, s) : "");
    });
  }
  function _scanTrackers() {
    const found = [];
    try {
      document.querySelectorAll("script[src],iframe[src],img[src]").forEach(function (el) {
        try {
          const host = new URL(el.src).hostname.toLowerCase();
          for (let i = 0; i < TRACKER_HOSTS.length; i++) {
            const t = TRACKER_HOSTS[i];
            if ((host === t || host.endsWith("." + t)) && found.indexOf(t) === -1) found.push(t);
          }
        } catch (e) {}
      });
    } catch (e) {}
    return found;
  }
  try { _refresh(); } catch (e) {}
  try {
    const api = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) ? chrome.storage.onChanged : null;
    if (api && api.addListener) api.addListener(function (changes, area) { if (area === "local" && changes && changes.sf_social_settings) _refresh(); });
  } catch (e) {}
  try {
    const rt = (typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : (typeof browser !== "undefined" && browser.runtime) ? browser.runtime : null;
    if (rt && rt.onMessage && rt.onMessage.addListener) {
      rt.onMessage.addListener(function (msg, sender, sendResponse) {
        if (!msg || !msg.action) return;
        if (msg.action === "SOC_REFRESH") { _refresh(); sendResponse({ ok: true, platform: _detectPlatform() }); return true; }
        if (msg.action === "SOC_SCAN_TRACKERS") { sendResponse({ ok: true, trackers: _scanTrackers() }); return true; }
        if (msg.action === "SOC_GET_PLATFORM") { sendResponse({ ok: true, platform: _detectPlatform() }); return true; }
      });
    }
  } catch (e) {}
})();
