// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/security.js
// Security UI: phishing+typo-squat, anti-clickjacking auto-block, unlock per-site
// ---------------------------------------------------------------------------
let secState = { phishing: true, clickjack: true, autoBlock: true, unlockSites: {}, lastScan: null };
let _secCurrentHost = "";

function secLoadSettings() {
  storGet("sf_security_settings", function (res) {
    const s = res && res.sf_security_settings;
    if (s) {
      secState.phishing = s.phishing !== false;
      secState.clickjack = s.clickjack !== false;
      secState.autoBlock = s.autoBlock !== false;
      secState.unlockSites = s.unlockSites || (s.unlock ? { _legacy: true } : {});
      // migrate legacy global unlock
      if (s.unlock && !s.unlockSites) {
        // keep global as object with flag, will be treated as per-site for current host on next save
      }
      secState.lastScan = s.lastScan || null;
    }
    secUpdateActiveHost(function () { secUpdateUI(); });
  });
}
function secSaveSettings() {
  storSet({ sf_security_settings: { phishing: secState.phishing, clickjack: secState.clickjack, autoBlock: !!secState.autoBlock, unlockSites: secState.unlockSites, lastScan: secState.lastScan } }, function () {
    secUpdateUI();
    secPushToActiveTab();
  });
}
function secUpdateActiveHost(cb) {
  try {
    ensureActiveTab().then(function (tab) {
      try { _secCurrentHost = tab && tab.url ? new URL(tab.url).hostname.toLowerCase() : ""; } catch (e) { _secCurrentHost = ""; }
      if (cb) cb();
    }).catch(function () { _secCurrentHost = ""; if (cb) cb(); });
  } catch (e) { _secCurrentHost = ""; if (cb) cb(); }
}
function secUpdateUI() {
  const p = document.getElementById("sec-toggle-phishing");
  const c = document.getElementById("sec-toggle-clickjack");
  const a = document.getElementById("sec-toggle-autoblock");
  const u = document.getElementById("sec-toggle-unlock");
  if (p) p.checked = !!secState.phishing;
  if (c) c.checked = !!secState.clickjack;
  if (a) a.checked = !!secState.autoBlock;
  const host = _secCurrentHost || "";
  const unlockOn = !!(host && secState.unlockSites[host]) || !!secState.unlockSites._legacy;
  if (u) u.checked = unlockOn;
  const label = document.getElementById("sec-unlock-label");
  if (label) label.textContent = host ? t("sec_toggle_unlock") + " (" + host + ")" : t("sec_toggle_unlock");
  const st = document.getElementById("sec-status");
  if (st) {
    const parts = [];
    parts.push((secState.phishing ? "● " : "○ ") + t("sec_status_phishing") + (secState.phishing ? " ON" : " OFF"));
    parts.push((secState.clickjack ? "● " : "○ ") + t("sec_status_clickjack") + (secState.clickjack ? " ON" : " OFF"));
    parts.push((secState.autoBlock ? "● " : "○ ") + t("sec_status_autoblock") + (secState.autoBlock ? " ON" : " OFF"));
    parts.push((unlockOn ? "● " : "○ ") + t("sec_status_unlock") + (unlockOn ? " ON" : " OFF"));
    st.textContent = parts.join(" • ");
  }
}
function secPushToActiveTab() {
  // push unlock per-site if needed
  const host = _secCurrentHost;
  const shouldUnlock = !!(host && secState.unlockSites[host]) || !!secState.unlockSites._legacy;
  if (shouldUnlock) secSendToActive({ action: "SEC_UNLOCK", perSite: true }, function () {});
  else secSendToActive({ action: "SEC_UNLOCK", lock: true }, function () {});
}
function secSendToActive(msg, cb) {
  try {
    ensureActiveTab().then(function (tab) {
      if (!tab || !tab.id) { if (cb) cb(null); return; }
      sendTabMessage(msg, function (res) { if (cb) cb(res); });
    }).catch(function () { if (cb) cb(null); });
  } catch (e) { if (cb) cb(null); }
}
function secScanPhishing() {
  secSendToActive({ action: "SEC_SCAN_PHISHING" }, function (res) {
    const out = document.getElementById("sec-scan-out");
    if (!out) return;
    while (out.firstChild) out.removeChild(out.firstChild);
    const row = document.createElement("div");
    row.className = "sec-result-row";
    if (res && res.phishing && res.info) {
      let msg = t("sec_result_phishing_yes");
      if (res.info.type === "typo") msg = t("sec_result_typo_yes").replace("{0}", res.info.host).replace("{1}", res.info.typo);
      else if (res.info.type === "punycode") msg = t("sec_result_punycode_yes").replace("{0}", res.info.host);
      row.textContent = msg;
      row.style.color = "#f87171";
    } else if (res && res.phishing) {
      row.textContent = t("sec_result_phishing_yes");
      row.style.color = "#f87171";
    } else if (res) {
      row.textContent = t("sec_result_phishing_no");
      row.style.color = "#34d399";
    } else {
      row.textContent = t("sec_result_err");
      row.style.color = "#94a3b8";
    }
    out.appendChild(row);
    secState.lastScan = new Date().toISOString();
    storSet({ sf_security_settings: { phishing: secState.phishing, clickjack: secState.clickjack, autoBlock: secState.autoBlock, unlockSites: secState.unlockSites, lastScan: secState.lastScan } }, function () {});
  });
}
function secScanClickjack() {
  secSendToActive({ action: "SEC_SCAN_CLICKJACK", autoBlock: !!secState.autoBlock }, function (res) {
    const out = document.getElementById("sec-scan-out");
    if (!out) return;
    while (out.firstChild) out.removeChild(out.firstChild);
    const row = document.createElement("div");
    row.className = "sec-result-row";
    const n = res && typeof res.count === "number" ? res.count : -1;
    if (n > 0) {
      row.textContent = (secState.autoBlock ? t("sec_result_clickjack_blocked") : t("sec_result_clickjack_yes")).replace("{0}", String(n));
      row.style.color = "#f87171";
    } else if (n === 0) {
      row.textContent = t("sec_result_clickjack_no");
      row.style.color = "#34d399";
    } else {
      row.textContent = t("sec_result_err");
      row.style.color = "#94a3b8";
    }
    out.appendChild(row);
  });
}
function secToggleUnlockPerSite() {
  const u = document.getElementById("sec-toggle-unlock");
  if (!u) return;
  secUpdateActiveHost(function () {
    const host = _secCurrentHost;
    if (!host) { showToast(t("sec_toast_no_host")); return; }
    if (u.checked) secState.unlockSites[host] = true;
    else delete secState.unlockSites[host];
    // clear legacy flag if present
    if (secState.unlockSites._legacy) delete secState.unlockSites._legacy;
    secSaveSettings();
    // immediately apply
    if (u.checked) secSendToActive({ action: "SEC_UNLOCK", perSite: true }, function (res) { showToast(res && res.ok ? t("sec_toast_unlocked") + " (" + host + ")" : t("sec_toast_unlock_err")); });
    else secSendToActive({ action: "SEC_UNLOCK", lock: true }, function (res) { showToast(t("sec_toast_locked") + " (" + host + ")"); });
    secUpdateUI();
  });
}
function secUnlockNow() {
  secSendToActive({ action: "SEC_UNLOCK", perSite: true }, function (res) {
    const out = document.getElementById("sec-scan-out");
    if (!out) return;
    while (out.firstChild) out.removeChild(out.firstChild);
    const row = document.createElement("div");
    row.className = "sec-result-row";
    row.textContent = res && res.ok ? t("sec_result_unlock_ok") : t("sec_result_err");
    row.style.color = res && res.ok ? "#34d399" : "#f87171";
    out.appendChild(row);
    showToast(res && res.ok ? t("sec_toast_unlocked") : t("sec_toast_unlock_err"));
  });
}

onReady(function () {
  const p = document.getElementById("sec-toggle-phishing");
  const c = document.getElementById("sec-toggle-clickjack");
  const a = document.getElementById("sec-toggle-autoblock");
  const u = document.getElementById("sec-toggle-unlock");
  if (p) p.addEventListener("change", function () { secState.phishing = !!p.checked; secSaveSettings(); });
  if (c) c.addEventListener("change", function () { secState.clickjack = !!c.checked; secSaveSettings(); });
  if (a) a.addEventListener("change", function () { secState.autoBlock = !!a.checked; secSaveSettings(); });
  if (u) u.addEventListener("change", secToggleUnlockPerSite);
  const btnPhish = document.getElementById("btn-sec-scan-phishing");
  if (btnPhish) btnPhish.addEventListener("click", secScanPhishing);
  const btnJack = document.getElementById("btn-sec-scan-clickjack");
  if (btnJack) btnJack.addEventListener("click", secScanClickjack);
  const btnUnlock = document.getElementById("btn-sec-unlock-now");
  if (btnUnlock) btnUnlock.addEventListener("click", secUnlockNow);
  secLoadSettings();
  // refresh host when tab changes
  try {
    const api = (typeof chrome !== "undefined" && chrome.tabs ? chrome.tabs : typeof browser !== "undefined" && browser.tabs ? browser.tabs : null);
    if (api && api.onActivated && api.onActivated.addListener) api.onActivated.addListener(function () { secUpdateActiveHost(secUpdateUI); });
  } catch (e2) {}
});
