// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/social-protection.js
// Social Protection CORE: state, privacy toggles, storage sync, shared
// constants + DOM helpers. Feature modules (recovery/vault/checklist/tools/
// creator) extend this file via globals — keep this module loaded FIRST.
// 100% local: no network, no telemetry.
// ---------------------------------------------------------------------------
let socState = {
  fb: { typing: true, seen: true, online: true },
  zalo: { typing: true, seen: true, online: true },
  ig: { typing: true, seen: true, activity: true },
  shield: { wa: false, tt: false, dc: false, x: false, tg: false },
  lastScan: null
};
let _socCurrentHost = "";

const SOC_PLAT_LINKS = {
  facebook: [
    { label: "soc_link_recovery", url: "https://www.facebook.com/hacked" },
    { label: "soc_link_sessions", url: "https://www.facebook.com/settings?tab=security" },
    { label: "soc_link_contact", url: "https://www.facebook.com/help/contact/260749603972907" }
  ],
  instagram: [
    { label: "soc_link_recovery", url: "https://www.instagram.com/accounts/password/reset/" },
    { label: "soc_link_sessions", url: "https://www.instagram.com/accounts/center/" }
  ],
  zalo: [
    { label: "soc_link_recovery", url: "https://zalo.me/" },
    { label: "soc_link_sessions", url: "https://zalo.me/settings/security" }
  ],
  whatsapp: [
    { label: "soc_link_help", url: "https://faq.whatsapp.com/590521506536618" }
  ],
  google: [
    { label: "soc_link_recovery", url: "https://accounts.google.com/signin/recovery" },
    { label: "soc_link_help", url: "https://support.google.com/accounts" }
  ],
  tiktok: [
    { label: "soc_link_help", url: "https://support.tiktok.com/en/log-in-troubleshoot" }
  ],
  discord: [
    { label: "soc_link_contact", url: "https://support.discord.com/hc/en-us/requests/new" }
  ],
  x: [
    { label: "soc_link_recovery", url: "https://help.x.com/en/forms/account-access/restore-your-account" }
  ],
  telegram: [
    { label: "soc_link_sessions", url: "https://my.telegram.org/" }
  ]
};
const SOC_SCENARIOS = ["active_session", "still_pw", "email_lost", "phone_lost", "both_lost", "twofa", "whatsapp", "sim"];
const SOC_WIZ_TITLES = {
  active_session: "soc_wz_active_session_t",
  still_pw: "soc_wz_still_pw_t",
  email_lost: "soc_wz_email_lost_t",
  phone_lost: "soc_wz_phone_lost_t",
  both_lost: "soc_wz_both_lost_t",
  twofa: "soc_wz_twofa_t",
  whatsapp: "soc_wz_whatsapp_t",
  sim: "soc_wz_sim_t"
};
const SOC_UNREAD_LINKS = {
  fb: "https://www.messenger.com/",
  ig: "https://www.instagram.com/direct/inbox/",
  zalo: "https://zalo.me/",
  x: "https://x.com/home",
  tt: "https://www.tiktok.com/",
  dc: "https://discord.com/channels/@me",
  tg: "https://web.telegram.org/"
};
const SOC_TRACKER_COOKIE_DOMAINS = [
  "facebook.com", "fbcdn.net", "instagram.com", "tiktok.com", "twitter.com", "x.com",
  "discord.com", "telegram.org", "doubleclick.net", "google-analytics.com", "googletagmanager.com",
  "facebook.net", "linkedin.com", "snapchat.com", "whatsapp.com"
];
const SOC_SESSION_COOKIES = [
  { key: "facebook", domains: ["facebook.com"], names: ["c_user", "xs"] },
  { key: "messenger", domains: ["messenger.com"], names: ["c_user", "xs"] },
  { key: "instagram", domains: ["instagram.com"], names: ["sessionid", "ds_user_id"] },
  { key: "zalo", domains: ["zalo.me"], names: ["token", "uid", "zaxs"] },
  { key: "tiktok", domains: ["tiktok.com"], names: ["sessionid"] },
  { key: "x", domains: ["x.com"], names: ["auth_token", "ct0"] },
  { key: "discord", domains: ["discord.com"], names: ["__cfruid"] },
  { key: "telegram", domains: ["web.telegram.org"], names: ["K", "A"] }
];

function _socPlatformsPayload() {
  return {
    platforms: {
      facebook: { typing: socState.fb.typing, seen: socState.fb.seen, online: socState.fb.online },
      instagram: { typing: socState.ig.typing, seen: socState.ig.seen, online: socState.ig.activity },
      zalo: { typing: socState.zalo.typing, seen: socState.zalo.seen, online: socState.zalo.online },
      whatsapp: { typing: socState.shield.wa, seen: socState.shield.wa, online: false },
      tiktok: { typing: socState.shield.tt, seen: false, online: false },
      discord: { typing: socState.shield.dc, seen: false, online: false },
      x: { typing: socState.shield.x, seen: false, online: false },
      telegram: { typing: socState.shield.tg, seen: false, online: socState.shield.tg }
    }
  };
}
function socLoadSettings() {
  storGet("sf_social_settings", function (res) {
    const s = res && res.sf_social_settings;
    if (s) {
      socState.fb = Object.assign({ typing: true, seen: true, online: true }, s.fb || {});
      socState.zalo = Object.assign({ typing: true, seen: true, online: true }, s.zalo || {});
      socState.ig = Object.assign({ typing: true, seen: true, activity: true }, s.ig || {});
      socState.shield = Object.assign({ wa: false, tt: false, dc: false, x: false, tg: false }, s.shield || {});
      socState.lastScan = s.lastScan || null;
    }
    socUpdateActiveHost(function () { socUpdateUI(); });
  });
}
function socSaveSettings() {
  const payload = {
    fb: socState.fb, zalo: socState.zalo, ig: socState.ig, shield: socState.shield,
    lastScan: socState.lastScan,
    platforms: _socPlatformsPayload().platforms
  };
  storSet({ sf_social_settings: payload }, function () {
    socUpdateUI();
    socPushToActiveTab();
  });
}
function socUpdateActiveHost(cb) {
  try {
    ensureActiveTab().then(function (tab) {
      try { _socCurrentHost = tab && tab.url ? new URL(tab.url).hostname.toLowerCase() : ""; } catch (e) { _socCurrentHost = ""; }
      if (cb) cb();
    }).catch(function () { _socCurrentHost = ""; if (cb) cb(); });
  } catch (e) { _socCurrentHost = ""; if (cb) cb(); }
}
function socUpdateUI() {
  const set = function (id, v) { const el = document.getElementById(id); if (el) el.checked = !!v; };
  set("soc-fb-typing", socState.fb.typing); set("soc-fb-seen", socState.fb.seen); set("soc-fb-online", socState.fb.online);
  set("soc-zalo-typing", socState.zalo.typing); set("soc-zalo-seen", socState.zalo.seen); set("soc-zalo-online", socState.zalo.online);
  set("soc-ig-typing", socState.ig.typing); set("soc-ig-seen", socState.ig.seen); set("soc-ig-activity", socState.ig.activity);
  set("soc-wa-shield", socState.shield.wa); set("soc-tt-shield", socState.shield.tt);
  set("soc-dc-shield", socState.shield.dc); set("soc-x-shield", socState.shield.x); set("soc-tg-shield", socState.shield.tg);
  const st = document.getElementById("soc-status");
  if (st) {
    const on = function (v) { return v ? "●" : "○"; };
    st.textContent = "FB " + on(socState.fb.typing) + on(socState.fb.seen) + on(socState.fb.online) +
      " • IG " + on(socState.ig.typing) + on(socState.ig.seen) + on(socState.ig.activity) +
      " • Zalo " + on(socState.zalo.typing) + on(socState.zalo.seen) + on(socState.zalo.online);
  }
}
function socPushToActiveTab() {
  socSendToActive({ action: "SOC_REFRESH" }, function () {});
}
function socSendToActive(msg, cb) {
  try {
    ensureActiveTab().then(function (tab) {
      if (!tab || !tab.id) { if (cb) cb(null); return; }
      sendTabMessage(msg, function (res) { if (cb) cb(res); });
    }).catch(function () { if (cb) cb(null); });
  } catch (e) { if (cb) cb(null); }
}

// Shared DOM/format helpers used by all social feature modules
function _socClearBox(box) { while (box && box.firstChild) box.removeChild(box.firstChild); }
function _socDiv(cls, text, color) {
  const d = document.createElement("div");
  if (cls) d.className = cls;
  if (text != null) d.textContent = text;
  if (color) d.style.color = color;
  return d;
}
function _socBtn(cls, label, onClick, style) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls || "btn-text-small";
  b.textContent = label;
  if (style) b.setAttribute("style", style);
  b.addEventListener("click", onClick);
  return b;
}
function _socOpen(url) { try { window.open(url, "_blank", "noopener"); } catch (e) {} }
function _socDownload(name, text) {
  try {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 120);
    showToast(t("soc_ck_exported"));
  } catch (e) { showToast(t("err_008")); }
}
function _socCopyText(text, okToast) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast(okToast); }, function () { showToast(t("toast_copy_failed")); });
    } else { showToast(t("toast_copy_failed")); }
  } catch (e) { showToast(t("toast_copy_failed")); }
}

// Sub-tabs
function _socSwitchSub(name) {
  document.querySelectorAll(".soc-subtab").forEach(function (b) { b.classList.toggle("active", b.dataset.socSub === name); });
  document.querySelectorAll(".soc-subpanel").forEach(function (p) { p.classList.toggle("active", p.id === "soc-sub-" + name); });
}

onReady(function () {
  document.querySelectorAll(".soc-subtab").forEach(function (b) {
    b.addEventListener("click", function () { _socSwitchSub(b.dataset.socSub); });
  });
  const bindToggle = function (id, set) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", function () { set(!!el.checked); socSaveSettings(); });
  };
  bindToggle("soc-fb-typing", function (v) { socState.fb.typing = v; });
  bindToggle("soc-fb-seen", function (v) { socState.fb.seen = v; });
  bindToggle("soc-fb-online", function (v) { socState.fb.online = v; });
  bindToggle("soc-zalo-typing", function (v) { socState.zalo.typing = v; });
  bindToggle("soc-zalo-seen", function (v) { socState.zalo.seen = v; });
  bindToggle("soc-zalo-online", function (v) { socState.zalo.online = v; });
  bindToggle("soc-ig-typing", function (v) { socState.ig.typing = v; });
  bindToggle("soc-ig-seen", function (v) { socState.ig.seen = v; });
  bindToggle("soc-ig-activity", function (v) { socState.ig.activity = v; });
  bindToggle("soc-wa-shield", function (v) { socState.shield.wa = v; });
  bindToggle("soc-tt-shield", function (v) { socState.shield.tt = v; });
  bindToggle("soc-dc-shield", function (v) { socState.shield.dc = v; });
  bindToggle("soc-x-shield", function (v) { socState.shield.x = v; });
  bindToggle("soc-tg-shield", function (v) { socState.shield.tg = v; });
  socLoadSettings();
  try {
    const api = (typeof chrome !== "undefined" && chrome.tabs ? chrome.tabs : typeof browser !== "undefined" && browser.tabs ? browser.tabs : null);
    if (api && api.onActivated && api.onActivated.addListener) api.onActivated.addListener(function () { socUpdateActiveHost(socUpdateUI); });
  } catch (e2) {}
});
