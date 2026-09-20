// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/social-protection.js
// Social Protection CORE: settings for the single anti-injection shield,
// storage sync, shared constants + DOM helpers. Feature modules
// (recovery/vault/checklist/tools/creator) extend this file via globals —
// keep this module loaded FIRST. 100% local: no network, no telemetry.
// ---------------------------------------------------------------------------
let socState = {
  inj: true,
  injMode: "remove",
  linkClean: true,
  shopClean: false,
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

function socLoadSettings() {
  storGet("sf_social_settings", function (res) {
    const s = res && res.sf_social_settings;
    if (s) {
      socState.inj = s.inj !== false;
      socState.injMode = s.injMode === "warn" ? "warn" : "remove";
      socState.linkClean = s.linkClean !== false;
      socState.shopClean = !!s.shopClean;
      socState.lastScan = s.lastScan || null;
    }
    socUpdateActiveHost(function () { socUpdateUI(); });
  });
}
function socSaveSettings() {
  const payload = {
    inj: socState.inj, injMode: socState.injMode, linkClean: socState.linkClean,
    shopClean: socState.shopClean, lastScan: socState.lastScan
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
  set("soc-inj-shield", socState.inj);
  set("soc-link-clean", socState.linkClean);
  set("soc-shop-clean", socState.shopClean);
  const mode = document.getElementById("soc-inj-mode");
  if (mode) mode.value = socState.injMode;
  const st = document.getElementById("soc-status");
  if (st) st.textContent = socState.inj ? "\u25cf" : "\u25cb";
  socFetchHostStats();
}
function socFetchHostStats() {
  socSendToActive({ action: "SOC_GET_STATS" }, function (res) {
    if (!res || !res.ok) return;
    const st = res.stats || {};
    const injTotal = (st.extScript || 0) + (st.obfScript || 0) + (st.inlineMal || 0) + (st.extIframe || 0) + (st.jsUri || 0);
    const status = document.getElementById("soc-status");
    if (status && socState.inj && injTotal && socState.injMode === "remove") {
      status.textContent = t("soc_status_blocked").replace("{0}", String(injTotal));
    }
    const sl = document.getElementById("soc-inj-stats");
    if (sl) {
      const key = socState.injMode === "warn" ? "soc_inj_stats_warn" : "soc_inj_stats";
      sl.textContent = t(key)
        .replace("{0}", String(injTotal))
        .replace("{1}", String(st.linkCleaned || 0))
        .replace("{2}", String(st.shopLinks || 0));
    }
    const tc = document.getElementById("soc-tracker-count");
    if (tc && res.platform) {
      socSendToActive({ action: "SOC_SCAN_TRACKERS" }, function (r2) {
        if (tc && r2 && Array.isArray(r2.trackers)) tc.textContent = "Trackers: " + r2.trackers.length;
      });
    }
  });
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
  const injEl = document.getElementById("soc-inj-shield");
  if (injEl) {
    injEl.addEventListener("change", function () {
      socState.inj = !!injEl.checked;
      socSaveSettings();
    });
  }
  const modeEl = document.getElementById("soc-inj-mode");
  if (modeEl) {
    modeEl.addEventListener("change", function () {
      socState.injMode = modeEl.value === "warn" ? "warn" : "remove";
      socSaveSettings();
    });
  }
  const linkEl = document.getElementById("soc-link-clean");
  if (linkEl) {
    linkEl.addEventListener("change", function () {
      socState.linkClean = !!linkEl.checked;
      socSaveSettings();
    });
  }
  const shopEl = document.getElementById("soc-shop-clean");
  if (shopEl) {
    shopEl.addEventListener("change", function () {
      socState.shopClean = !!shopEl.checked;
      socSaveSettings();
    });
  }
  const resetBtn = document.getElementById("btn-soc-inj-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      socSendToActive({ action: "SOC_RESET_STATS" }, function () {
        socUpdateUI();
        showToast(t("soc_inj_reset_done"));
      });
    });
  }
  socLoadSettings();
  try {
    const api = (typeof chrome !== "undefined" && chrome.tabs ? chrome.tabs : typeof browser !== "undefined" && browser.tabs ? browser.tabs : null);
    if (api && api.onActivated && api.onActivated.addListener) api.onActivated.addListener(function () { socUpdateActiveHost(socUpdateUI); });
  } catch (e2) {}
});
