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
  gamble: true,
  trackerBlockAll: false,
  trackerBlock: [],
  scamWarn: true,
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
const SOC_TRACKER_COOKIE_DOMAINS = [
  "facebook.com", "fbcdn.net", "instagram.com", "tiktok.com", "twitter.com", "x.com",
  "discord.com", "telegram.org", "doubleclick.net", "google-analytics.com", "googletagmanager.com",
  "facebook.net", "linkedin.com", "snapchat.com", "whatsapp.com"
];

function socLoadSettings() {
  storGet("sf_social_settings", function (res) {
    const s = res && res.sf_social_settings;
    if (s) {
      socState.inj = s.inj !== false;
      socState.injMode = s.injMode === "warn" ? "warn" : "remove";
      socState.linkClean = s.linkClean !== false;
      socState.shopClean = !!s.shopClean;
      socState.gamble = s.gamble !== false;
      socState.trackerBlockAll = !!s.trackerBlockAll;
      socState.trackerBlock = Array.isArray(s.trackerBlock) ? s.trackerBlock.slice(0, 50) : [];
      socState.scamWarn = s.scamWarn !== false;
      socState.lastScan = s.lastScan || null;
    }
    socUpdateActiveHost(function () { socUpdateUI(); });
  });
}
function socSaveSettings() {
  const payload = {
    inj: socState.inj, injMode: socState.injMode, linkClean: socState.linkClean,
    shopClean: socState.shopClean, gamble: socState.gamble,
    trackerBlockAll: socState.trackerBlockAll, trackerBlock: socState.trackerBlock.slice(0, 50),
    scamWarn: socState.scamWarn, lastScan: socState.lastScan
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
  set("soc-gamble-block", socState.gamble);
  set("soc-tracker-all", socState.trackerBlockAll);
  set("soc-scam-warn", socState.scamWarn);
  const mode = document.getElementById("soc-inj-mode");
  if (mode) mode.value = socState.injMode;
  const st = document.getElementById("soc-status");
  if (st) st.textContent = socState.inj ? "\u25cf" : "\u25cb";
  socRenderQuickLinks(_socCurrentHost);
  socFetchTrackers();
  socFetchScamWarn();
  socScoreRefresh();
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

// Upgrade: quick open "security page" links per detected platform ----------
function _socPlatformOfHost(host) {
  if (!host) return null;
  const pairs = {
    facebook: ["facebook.com", "messenger.com"],
    instagram: ["instagram.com"],
    zalo: ["zalo.me", "zaloapp.com"],
    whatsapp: ["web.whatsapp.com"],
    tiktok: ["tiktok.com"],
    discord: ["discord.com", "discord.gg"],
    x: ["x.com", "twitter.com"],
    telegram: ["web.telegram.org"],
    google: ["google.com", "googleusercontent.com"]
  };
  for (const k in pairs) {
    const list = pairs[k];
    for (let i = 0; i < list.length; i++) {
      if (host === list[i] || host.endsWith("." + list[i])) return k;
    }
  }
  return null;
}
function socRenderQuickLinks(host) {
  const box = document.getElementById("soc-quicklinks");
  if (!box) return;
  _socClearBox(box);
  const pf = _socPlatformOfHost(host);
  if (!pf || !SOC_PLAT_LINKS[pf]) {
    box.appendChild(_socDiv("", t("soc_ql_hint")));
    return;
  }
  const list = SOC_PLAT_LINKS[pf];
  for (let i = 0; i < list.length; i++) {
    box.appendChild(_socBtn("btn-text-small soc-btn-cyan", t(list[i].label), function (u) { return function () { _socOpen(u); }; }(list[i].url)));
  }
}

// Upgrade: defense score card ----------------------------------------------
// Weights sum to 100: shield(20)+mode(5)+linkClean(10)+shopClean(10)+
// gamble(10)+trackerBlockAll(10)+scamWarn(5)+vault(15)+checklist(15).
function socScoreCompute() {
  return new Promise(function (resolve) {
    let pts = 0;
    if (socState.inj) pts += 20;
    if (socState.injMode === "remove") pts += 5;
    if (socState.linkClean) pts += 10;
    if (socState.shopClean) pts += 10;
    if (socState.gamble) pts += 10;
    if (socState.trackerBlockAll) pts += 10;
    if (socState.scamWarn) pts += 5;
    storGet("sf_social_vault", function (r) {
      if (r && r.sf_social_vault) pts += 15;
      storGet("sf_social_checklist", function (r2) {
        const ck = (r2 && r2.sf_social_checklist) || {};
        let done = 0;
        for (let i = 1; i <= 10; i++) { if (ck["soc_ck_i" + i]) done++; }
        pts += Math.round(done * 1.5);
        resolve(pts);
      });
    });
  });
}
function socScoreTier(pts) {
  if (pts >= 90) return ["soc_score_tier_great", "#10b981"];
  if (pts >= 70) return ["soc_score_tier_good", "#34d399"];
  if (pts >= 40) return ["soc_score_tier_weak", "#fbbf24"];
  return ["soc_score_tier_risk", "#f87171"];
}
function socScoreRefresh() {
  const num = document.getElementById("soc-score-num");
  if (!num) return;
  socScoreCompute().then(function (pts) {
    num.textContent = pts + "/100";
    const bar = document.getElementById("soc-score-bar");
    const tag = socScoreTier(pts);
    if (bar) { bar.style.width = Math.max(2, Math.min(100, pts)) + "%"; bar.style.background = tag[1]; }
    const tier = document.getElementById("soc-score-tier");
    if (tier) { tier.textContent = t(tag[0]); tier.style.color = tag[1]; }
  });
}

// Upgrade: quick PIN lock for the whole Social tab -------------------------
const SOC_PIN_KEY = "sf_social_pin";
let _socPinRecord = null;
let _socPinSession = true;
function socPinGetRecord(cb) {
  storGet(SOC_PIN_KEY, function (r) { cb((r && r[SOC_PIN_KEY]) || null); });
}
function socPinRenderState() {
  socPinGetRecord(function (rec) {
    _socPinRecord = rec && rec.hash ? rec : null;
    const st = document.getElementById("soc-pin-state");
    if (st) {
      st.textContent = t(_socPinRecord ? "soc_pin_state_on" : "soc_pin_state_off");
      st.style.color = _socPinRecord ? "#fbbf24" : "#94a3b8";
    }
    const lockNow = document.getElementById("btn-soc-pin-locknow");
    if (lockNow) lockNow.style.display = _socPinRecord ? "" : "none";
    const off = document.getElementById("btn-soc-pin-off");
    if (off) off.style.display = _socPinRecord ? "" : "none";
    const chg = document.getElementById("btn-soc-pin-change");
    if (chg) chg.style.display = _socPinRecord ? "" : "none";
  });
}
function socPinValidate(v) { return /^\d{4,6}$/.test(String(v || "").trim()); }
function socPinSet() {
  const input = document.getElementById("soc-pin-input");
  const val = ((input && input.value) || "").trim();
  if (!socPinValidate(val)) { showToast(t("soc_pin_bad")); return; }
  const salt = sfRandomSalt();
  sfPinHash(val, salt).then(function (hash) {
    storSet({ [SOC_PIN_KEY]: { enabled: true, salt: salt, hash: hash } }, function () {
      _socPinSession = true;
      if (input) input.value = "";
      socPinRenderState();
      showToast(t("soc_pin_saved"));
    });
  });
}
function socPinOff() {
  if (!window.confirm(t("soc_pin_confirm_off"))) return;
  try { storRemove(SOC_PIN_KEY); } catch (e) {}
  _socPinRecord = null;
  _socPinSession = true;
  socPinHideOverlay();
  socPinRenderState();
  showToast(t("soc_pin_removed"));
}
function socPinGuarded() { return !!(_socPinRecord && _socPinRecord.hash && !_socPinSession); }
function socPinShowOverlay() {
  const ov = document.getElementById("soc-pin-overlay");
  if (ov) ov.style.display = "flex";
  const inp = document.getElementById("soc-pin-unlock");
  if (inp) { inp.value = ""; try { inp.focus(); } catch (e) {} }
  const msg = document.getElementById("soc-pin-msg");
  if (msg) msg.textContent = "";
}
function socPinHideOverlay() {
  const ov = document.getElementById("soc-pin-overlay");
  if (ov) ov.style.display = "none";
}
function socPinUnlock() {
  const input = document.getElementById("soc-pin-unlock");
  const val = ((input && input.value) || "").trim();
  const msg = document.getElementById("soc-pin-msg");
  if (!_socPinRecord) { if (msg) msg.textContent = t("soc_pin_none"); return; }
  if (!socPinValidate(val)) { if (msg) { msg.textContent = t("soc_pin_wrong"); msg.style.color = "#f87171"; } return; }
  sfPinMatches(val, _socPinRecord).then(function (ok) {
    if (!ok) {
      if (msg) { msg.textContent = t("soc_pin_wrong"); msg.style.color = "#f87171"; }
      if (input) input.value = "";
      return;
    }
    _socPinSession = true;
    socPinHideOverlay();
    showToast(t("soc_pin_unlocked"));
  });
}
function socPinAutoLock() {
  if (!_socPinRecord || !_socPinRecord.hash) return;
  _socPinSession = false;
  socPinShowOverlay();
}
function socPinLockNow() { socPinAutoLock(); }
function socPinGuard() {
  socPinRenderState();
  if (socPinGuarded()) socPinShowOverlay();
}

// Upgrade: tracker list + per-domain block ---------------------------------
function socFetchTrackers() {
  const box = document.getElementById("soc-tracker-list");
  const cnt = document.getElementById("soc-tracker-count");
  if (!box) return;
  if (!_socCurrentHost) {
    if (cnt) cnt.textContent = "Trackers: --";
    _socClearBox(box);
    return;
  }
  socSendToActive({ action: "SOC_SCAN_TRACKERS" }, function (r2) {
    if (!r2 || !Array.isArray(r2.trackers)) {
      if (cnt) cnt.textContent = "Trackers: --";
      _socClearBox(box);
      box.appendChild(_socDiv("", t("soc_tr_none")));
      return;
    }
    if (cnt) cnt.textContent = t("soc_tr_count").replace("{0}", String(r2.trackers.length));
    _socClearBox(box);
    if (r2.trackers.length === 0) {
      box.appendChild(_socDiv("", t("soc_tr_none")));
      return;
    }
    r2.trackers.forEach(function (host) {
      const row = document.createElement("label");
      row.className = "soc-tr-row";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = socState.trackerBlock.indexOf(host) !== -1;
      cb.addEventListener("change", function () {
        const i = socState.trackerBlock.indexOf(host);
        if (cb.checked && i === -1) socState.trackerBlock.push(host);
        if (!cb.checked && i !== -1) socState.trackerBlock.splice(i, 1);
        socSaveSettings();
      });
      row.appendChild(cb);
      row.appendChild(_socDiv("soc-tr-host", host));
      box.appendChild(row);
    });
  });
}

// Upgrade: scam "unlock ảo" warnings ---------------------------------------
function socFetchScamWarn() {
  const box = document.getElementById("soc-scam-out");
  if (!box) return;
  _socClearBox(box);
  if (!_socCurrentHost) { box.appendChild(_socDiv("", "—")); return; }
  socSendToActive({ action: "SOC_SCAN_SCAM" }, function (r) {
    if (!r || !r.ok) { box.appendChild(_socDiv("", "—")); return; }
    const n = r.count || 0;
    if (!n) { box.appendChild(_socDiv("", t("soc_sc_none"))); return; }
    box.appendChild(_socDiv("", t("soc_sc_count").replace("{0}", String(n)), "#fbbf24"));
    for (let i = 0; i < (r.samples || []).length && i < 3; i++) {
      const s = r.samples[i];
      const a = document.createElement("a");
      a.href = s.url; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.textContent = (s.text || s.url || "").slice(0, 60);
      a.className = "soc-sc-sample";
      box.appendChild(a);
    }
  });
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
  const gmblEl = document.getElementById("soc-gamble-block");
  if (gmblEl) {
    gmblEl.addEventListener("change", function () {
      socState.gamble = !!gmblEl.checked;
      socSaveSettings();
      showToast(t(gmblEl.checked ? "soc_gamble_on" : "soc_gamble_off"));
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
  const scoreCk = document.getElementById("btn-soc-score-ck");
  if (scoreCk) scoreCk.addEventListener("click", function () { _socSwitchSub("checklist"); });
  const pinSet = document.getElementById("btn-soc-pin-set");
  if (pinSet) pinSet.addEventListener("click", socPinSet);
  const pinChg = document.getElementById("btn-soc-pin-change");
  if (pinChg) pinChg.addEventListener("click", socPinSet);
  const pinOff = document.getElementById("btn-soc-pin-off");
  if (pinOff) pinOff.addEventListener("click", socPinOff);
  const pinLock = document.getElementById("btn-soc-pin-locknow");
  if (pinLock) pinLock.addEventListener("click", socPinLockNow);
  const pinUnlock = document.getElementById("btn-soc-pin-unlock");
  if (pinUnlock) pinUnlock.addEventListener("click", socPinUnlock);
  const pinUnlockIn = document.getElementById("soc-pin-unlock");
  if (pinUnlockIn) pinUnlockIn.addEventListener("keypress", function (e) { if (e.key === "Enter") socPinUnlock(); });
  const trAll = document.getElementById("soc-tracker-all");
  if (trAll) {
    trAll.addEventListener("change", function () {
      socState.trackerBlockAll = !!trAll.checked;
      socSaveSettings();
      showToast(t(trAll.checked ? "soc_tr_all_on" : "soc_tr_all_off"));
    });
  }
  const scamEl = document.getElementById("soc-scam-warn");
  if (scamEl) {
    scamEl.addEventListener("change", function () {
      socState.scamWarn = !!scamEl.checked;
      socSaveSettings();
      socFetchScamWarn();
    });
  }
  const scamBtn = document.getElementById("btn-soc-scam-rescan");
  if (scamBtn) scamBtn.addEventListener("click", socFetchScamWarn);
  socPinGuard();
  try {
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) socPinAutoLock();
    });
  } catch (eAuto) {}
  socLoadSettings();
  try {
    const api = (typeof chrome !== "undefined" && chrome.tabs ? chrome.tabs : typeof browser !== "undefined" && browser.tabs ? browser.tabs : null);
    if (api && api.onActivated && api.onActivated.addListener) api.onActivated.addListener(function () { socUpdateActiveHost(socUpdateUI); });
  } catch (e2) {}
});
