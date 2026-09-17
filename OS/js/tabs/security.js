// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/security.js
// Security UI: phishing+typo-squat, anti-clickjacking auto-block, unlock per-site
// ---------------------------------------------------------------------------
let secState = { phishing: true, clickjack: true, autoBlock: true, cookieReject: false, pasteGuard: false, unlockSites: {}, lastScan: null };
let _secCurrentHost = "";

function secLoadSettings() {
  storGet("sf_security_settings", function (res) {
    const s = res && res.sf_security_settings;
    if (s) {
      secState.phishing = s.phishing !== false;
      secState.clickjack = s.clickjack !== false;
      secState.autoBlock = s.autoBlock !== false;
      secState.cookieReject = s.cookieReject === true;
      secState.pasteGuard = s.pasteGuard === true;
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
  storSet({ sf_security_settings: { phishing: secState.phishing, clickjack: secState.clickjack, autoBlock: !!secState.autoBlock, cookieReject: !!secState.cookieReject, pasteGuard: !!secState.pasteGuard, unlockSites: secState.unlockSites, lastScan: secState.lastScan } }, function () {
    secUpdateUI();
    secPushToActiveTab();
  });
}
let _secCurrentProto = "";

function secUpdateActiveHost(cb) {
  try {
    ensureActiveTab().then(function (tab) {
      try {
        if (tab && tab.url) {
          const u = new URL(tab.url);
          _secCurrentHost = u.hostname.toLowerCase();
          _secCurrentProto = u.protocol.toLowerCase();
        } else {
          _secCurrentHost = "";
          _secCurrentProto = "";
        }
      } catch (e) {
        _secCurrentHost = "";
        _secCurrentProto = "";
      }
      if (cb) cb();
    }).catch(function () { _secCurrentHost = ""; _secCurrentProto = ""; if (cb) cb(); });
  } catch (e) { _secCurrentHost = ""; _secCurrentProto = ""; if (cb) cb(); }
}
function secUpdateUI() {
  const p = document.getElementById("sec-toggle-phishing");
  const c = document.getElementById("sec-toggle-clickjack");
  const a = document.getElementById("sec-toggle-autoblock");
  const u = document.getElementById("sec-toggle-unlock");
  const g = document.getElementById("sec-toggle-pasteguard");
  const r = document.getElementById("sec-toggle-cookiereject");
  if (p) p.checked = !!secState.phishing;
  if (c) c.checked = !!secState.clickjack;
  if (a) a.checked = !!secState.autoBlock;
  if (g) g.checked = !!secState.pasteGuard;
  if (r) r.checked = !!secState.cookieReject;
  const host = _secCurrentHost || "";
  const unlockOn = !!(host && secState.unlockSites[host]) || !!secState.unlockSites._legacy;
  if (u) u.checked = unlockOn;
  const label = document.getElementById("sec-unlock-label");
  if (label) label.textContent = host ? t("sec_toggle_unlock") + " (" + host + ")" : t("sec_toggle_unlock");
  const hostBadge = document.getElementById("sec-host-badge");
  if (hostBadge) hostBadge.textContent = host || t("dm_host_none");
  const protoBadge = document.getElementById("sec-proto-badge");
  if (protoBadge) {
    if (_secCurrentProto === "https:") {
      protoBadge.textContent = "HTTPS";
      protoBadge.className = "sec-pill sec-pill-safe";
      protoBadge.style.color = "";
    } else if (_secCurrentProto === "http:") {
      protoBadge.textContent = "HTTP";
      protoBadge.className = "sec-pill";
      protoBadge.style.color = "#cbd5e1";
    } else {
      protoBadge.textContent = "—";
      protoBadge.className = "sec-pill";
      protoBadge.style.color = "";
    }
  }
  const st = document.getElementById("sec-status");
  if (st) {
    const activeCount = (secState.phishing ? 1 : 0) + (secState.clickjack ? 1 : 0) + (secState.autoBlock ? 1 : 0) + (secState.cookieReject ? 1 : 0) + (secState.pasteGuard ? 1 : 0);
    st.textContent = activeCount > 0 ? (activeCount + "/5 Active") : "Protected";
    st.className = activeCount > 0 ? "sec-pill sec-pill-safe" : "sec-pill";
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
    storSet({ sf_security_settings: { phishing: secState.phishing, clickjack: secState.clickjack, autoBlock: secState.autoBlock, cookieReject: !!secState.cookieReject, pasteGuard: !!secState.pasteGuard, unlockSites: secState.unlockSites, lastScan: secState.lastScan } }, function () {});
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

// ── Upgrades: strong password generator (local crypto) + breach checks ────
function _secOpenExt(url) { try { window.open(url, "_blank", "noopener"); } catch (e) {} }
let secPwLen = 20;
function _secPwShowLen() {
  const el = document.getElementById("sec-pw-len-val");
  if (el) el.textContent = String(secPwLen);
}
function _secPwStep(delta) {
  secPwLen += delta;
  if (secPwLen < 8) secPwLen = 8;
  if (secPwLen > 64) secPwLen = 64;
  _secPwShowLen();
}
function secEvalPassword(pw) {
  const bar = document.getElementById("sec-pw-meter-bar");
  const strLbl = document.getElementById("sec-pw-strength-label");
  const entLbl = document.getElementById("sec-pw-entropy-label");
  if (!pw) {
    if (bar) { bar.style.width = "0%"; bar.style.background = "#64748b"; }
    if (strLbl) strLbl.textContent = "—";
    if (entLbl) entLbl.textContent = "Entropy: ~0 bit";
    return;
  }
  let pool = 0;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 32;
  const entropy = Math.round(pw.length * Math.log2(Math.max(2, pool)));
  if (entLbl) entLbl.textContent = "Entropy: ~" + entropy + " bit";
  let pct = 0, color = "#64748b", text = "";
  if (entropy < 45) {
    pct = 33;
    color = "#f87171";
    text = t("sec_pw_strength_weak");
  } else if (entropy < 75) {
    pct = 66;
    color = "#fbbf24";
    text = t("sec_pw_strength_medium");
  } else {
    pct = 100;
    color = "#34d399";
    text = t("sec_pw_strength_strong");
  }
  if (bar) { bar.style.width = pct + "%"; bar.style.background = color; }
  if (strLbl) { strLbl.textContent = text; strLbl.style.color = color; }
}

function secGenPassword() {
  const useU = (document.getElementById("sec-pw-upper") || {}).checked;
  const useL = (document.getElementById("sec-pw-lower") || {}).checked;
  const useD = (document.getElementById("sec-pw-digit") || {}).checked;
  const useS = (document.getElementById("sec-pw-symbol") || {}).checked;
  let pool = "";
  if (useU) pool += "ABCDEFGHJKLMNPQRSTUVWXYZ";
  if (useL) pool += "abcdefghijkmnopqrstuvwxyz";
  if (useD) pool += "23456789";
  if (useS) pool += "!@#$%^&*()-_=+[]{};:,.?";
  if (!pool) { showToast(t("sec_pw_nochars")); return; }
  const len = secPwLen;
  const rnd = new Uint32Array(len);
  try { window.crypto.getRandomValues(rnd); } catch (e) { return; }
  let pw = "";
  for (let i = 0; i < len; i++) pw += pool[rnd[i] % pool.length];
  const outEl = document.getElementById("sec-pw-out");
  if (outEl) {
    outEl.value = pw;
    secEvalPassword(pw);
  }
}
function secCopyPassword() {
  const outEl = document.getElementById("sec-pw-out");
  const v = outEl ? outEl.value : "";
  if (!v) { showToast(t("sec_pw_nochars")); return; }
  try {
    navigator.clipboard.writeText(v).then(function () { showToast(t("sec_pw_copied")); }, function () { showToast(t("toast_copy_failed")); });
  } catch (e) { showToast(t("toast_copy_failed")); }
}
function secClearUnlockSites() {
  secState.unlockSites = {};
  secSaveSettings();
  showToast(t("sec_breach_cleared"));
}

function secQuickScan() {
  const out = document.getElementById("sec-scan-out");
  if (!out) return;
  out.style.display = "block";
  while (out.firstChild) out.removeChild(out.firstChild);
  out.appendChild(_secRow(t("sec_quick_scanning"), "#94a3b8"));

  let phishRes = null, clickRes = null, trustRes = null;
  let done = 0;
  function checkDone() {
    done++;
    if (done < 3) return;
    while (out.firstChild) out.removeChild(out.firstChild);

    // 1. Protocol
    if (_secCurrentProto === "http:") {
      out.appendChild(_secRow("⚠️ " + t("sec_trust_http"), "#fbbf24"));
    } else if (_secCurrentProto === "https:") {
      out.appendChild(_secRow("🔒 HTTPS Encrypted", "#34d399"));
    }

    // 2. Phishing verdict
    if (phishRes && phishRes.phishing) {
      let msg = t("sec_result_phishing_yes");
      if (phishRes.info && phishRes.info.type === "typo") {
        msg = t("sec_result_typo_yes").replace("{0}", phishRes.info.host).replace("{1}", phishRes.info.typo);
      } else if (phishRes.info && phishRes.info.type === "punycode") {
        msg = t("sec_result_punycode_yes").replace("{0}", phishRes.info.host);
      }
      out.appendChild(_secRow("❌ " + msg, "#f87171"));
    } else if (phishRes) {
      out.appendChild(_secRow("✓ " + t("sec_result_phishing_no"), "#34d399"));
    }

    // 3. Clickjacking verdict
    if (clickRes && typeof clickRes.count === "number") {
      if (clickRes.count > 0) {
        const msg = (secState.autoBlock ? t("sec_result_clickjack_blocked") : t("sec_result_clickjack_yes")).replace("{0}", String(clickRes.count));
        out.appendChild(_secRow("❌ " + msg, "#f87171"));
      } else {
        out.appendChild(_secRow("✓ " + t("sec_result_clickjack_no"), "#34d399"));
      }
    }

    // 4. Trust score & reasons
    if (trustRes && trustRes.ok) {
      if (trustRes.official) {
        out.appendChild(_secRow("✓ " + t("sec_trust_official").replace("{0}", trustRes.official), "#34d399"));
      } else {
        const score = Math.min(10, Math.max(0, trustRes.score || 0));
        const col = score >= 4 ? "#f87171" : score >= 1 ? "#fbbf24" : "#34d399";
        out.appendChild(_secRow("• " + t("sec_trust_score").replace("{0}", String(score)), col));
        (trustRes.reasons || []).slice(0, 2).forEach(function (r) {
          const txt = t(r.k);
          out.appendChild(_secRow("  - " + (r.p ? txt.replace("{0}", r.p) : txt), "#fbbf24"));
        });
      }
    }
  }

  secSendToActive({ action: "SEC_SCAN_PHISHING" }, function (r) { phishRes = r; checkDone(); });
  secSendToActive({ action: "SEC_SCAN_CLICKJACK", autoBlock: !!secState.autoBlock }, function (r) { clickRes = r; checkDone(); });
  secSendToActive({ action: "SEC_TRUST_REPORT" }, function (r) { trustRes = r; checkDone(); });
}

// ── Site trust report (deep heuristics run in content script) ─────────────
function _secRow(text, color) {
  const row = document.createElement("div");
  row.className = "sec-result-row";
  row.textContent = text;
  if (color) row.style.color = color;
  return row;
}
function secTrustReport() {
  secSendToActive({ action: "SEC_TRUST_REPORT" }, function (res) {
    const out = document.getElementById("sec-trust-out");
    if (!out) return;
    while (out.firstChild) out.removeChild(out.firstChild);
    if (!res || !res.ok) { out.appendChild(_secRow(t("sec_result_err"), "#94a3b8")); return; }
    const head = _secRow((res.host || "?") + " — ", "#cbd5e1");
    head.style.fontWeight = "700";
    out.appendChild(head);
    if (res.official) {
      out.appendChild(_secRow(t("sec_trust_official").replace("{0}", res.official), "#34d399"));
      return;
    }
    const score = Math.min(10, Math.max(0, res.score || 0));
    const meter = document.createElement("div");
    meter.className = "sec-trust-meter";
    const fill = document.createElement("span");
    const pct = score * 10;
    fill.style.width = pct + "%";
    fill.style.background = score >= 4 ? "#ef4444" : score >= 1 ? "#f59e0b" : "#10b981";
    meter.appendChild(fill);
    out.appendChild(meter);
    const verdictColor = score >= 4 ? "#f87171" : score >= 1 ? "#fbbf24" : "#94a3b8";
    out.appendChild(_secRow(t("sec_trust_score").replace("{0}", String(score)), verdictColor));
    (res.reasons || []).forEach(function (r) {
      const txt = t(r.k);
      out.appendChild(_secRow("• " + (r.p ? txt.replace("{0}", r.p) : txt), r.k === "sec_trust_http" || r.k.indexOf("trust_unknown") !== -1 || r.k.indexOf("hyphen") !== -1 || r.k.indexOf("entropy") !== -1 || r.k.indexOf("shortener") !== -1 || r.k.indexOf("port") !== -1 || r.k.indexOf("brand_path") !== -1 ? "#fbbf24" : "#f87171"));
    });
  });
}

// ── Cookie audit for current domain ───────────────────────────────────────
const SEC_AD_DOMAINS = ["doubleclick.net", "googletagmanager.com", "google-analytics.com", "facebook.net",
  "connect.facebook", "analytics.tiktok.com", "analytics.twitter.com", "bat.bing.com", "hotjar.com",
  "clarity.ms", "criteo.com", "taboola.com", "outbrain.com", "scorecardresearch.com", "mixpanel.com",
  "segment.", "licdn.com", "ads-twitter.com", "snapchat.com", "tiktok.com"];
const SEC_AN_PREFIX = ["_ga", "_gid", "_fbp", "_gcl", "_tt", "_pk", "_hs", "matomo", "plank", "_ym", "_dcg", "_klaviyo", "mp_", "_mkto"];
function _secCookieCat(c) {
  const d = (c.domain || "").replace(/^\./, "").toLowerCase();
  const n = (c.name || "").toLowerCase();
  for (let i = 0; i < SEC_AD_DOMAINS.length; i++) { if (d.indexOf(SEC_AD_DOMAINS[i].replace(/\.$/, "")) !== -1 || d === SEC_AD_DOMAINS[i]) return "ad"; }
  if (d === "facebook.com" && (n === "fr" || n === "reg_ext_referrer")) return "ad";
  if (d.indexOf("facebook.com") !== -1 && n === "datr") return "tracker";
  for (let i = 0; i < SEC_AN_PREFIX.length; i++) { if (n.indexOf(SEC_AN_PREFIX[i].trim().toLowerCase()) === 0) return "analytics"; }
  return "functional";
}
function _secCookieRisks(c) {
  const r = [];
  if (!c.secure) r.push("Secure");
  if (!c.httpOnly) r.push("HttpOnly");
  if (c.sameSite === "no_restriction") r.push("SameSite");
  return r;
}
function _secCookieProto(c) {
  return (c.secure ? "https://" : "http://") + (c.domain || "").replace(/^\./, "") + (c.path || "/");
}
let _secAudited = [];
function secCookieAudit() {
  const out = document.getElementById("sec-cookie-out");
  if (!out) return;
  while (out.firstChild) out.removeChild(out.firstChild);
  const api = (typeof chrome !== "undefined" && chrome.cookies) ? chrome.cookies : null;
  if (!api) { out.appendChild(_secRow(t("sec_ca_none"), "#f87171")); return; }
  try {
    ensureActiveTab().then(function (tab) {
      let host = "";
      try { host = tab && tab.url ? new URL(tab.url).hostname.replace(/^www\./, "") : ""; } catch (e) {}
      if (!host) { out.appendChild(_secRow(t("sec_result_err"), "#94a3b8")); return; }
      api.getAll({ domain: host }, function (cookies) {
        _secAudited = cookies || [];
        if (!_secAudited.length) { out.appendChild(_secRow(t("sec_ca_none"), "#94a3b8")); return; }
        let risky = 0, track = 0;
        _secAudited.forEach(function (c) {
          const cat = _secCookieCat(c);
          const risks = _secCookieRisks(c);
          if (cat === "ad" || cat === "tracker" || cat === "analytics") track++;
          if (risks.length) risky++;
          const row = document.createElement("div");
          row.className = "sec-ck-row";
          const name = document.createElement("span");
          name.className = "sec-ck-name";
          name.textContent = c.name;
          name.title = c.domain + " • " + (c.expirationDate ? new Date(c.expirationDate * 1000).toISOString().slice(0, 10) : "session");
          row.appendChild(name);
          const catLbl = document.createElement("span");
          catLbl.className = "sec-ck-cat";
          catLbl.textContent = cat === "ad" || cat === "tracker" ? t("sec_ca_ad") : cat === "analytics" ? t("sec_ca_an") : t("sec_ca_fn");
          catLbl.style.color = (cat === "ad" || cat === "tracker") ? "#f87171" : cat === "analytics" ? "#fbbf24" : "#34d399";
          row.appendChild(catLbl);
          if (risks.length) {
            const rk = document.createElement("span");
            rk.className = "sec-ck-risk";
            rk.textContent = t("sec_ca_risk").replace("{0}", risks.join(", "));
            row.appendChild(rk);
          }
          const del = document.createElement("button");
          del.type = "button";
          del.className = "btn-text-small sec-ck-del";
          del.textContent = t("sec_ca_del");
          del.addEventListener("click", function () {
            try {
              api.remove({ url: _secCookieProto(c), name: c.name, storeId: c.storeId }, function () { secCookieAudit(); showToast(t("sec_ca_deleted").replace("{0}", "1")); });
            } catch (e) {}
          });
          row.appendChild(del);
          out.appendChild(row);
        });
        const sum = _secRow(t("sec_ca_summary").replace("{n}", String(_secAudited.length)).replace("{r}", String(risky)).replace("{t}", String(track)), "#94a3b8");
        sum.style.fontWeight = "700";
        out.insertBefore(sum, out.firstChild);
        if (!track) { out.insertBefore(_secRow(t("sec_ca_ok"), "#34d399"), sum.nextSibling); }
      });
    }).catch(function () { out.appendChild(_secRow(t("sec_result_err"), "#f87171")); });
  } catch (e) { out.appendChild(_secRow(t("sec_result_err"), "#f87171")); }
}
function secCookieDelTrackers() {
  const api = (typeof chrome !== "undefined" && chrome.cookies) ? chrome.cookies : null;
  if (!api || !_secAudited.length) return;
  const doomed = _secAudited.filter(function (c) { const cat = _secCookieCat(c); return cat === "ad" || cat === "tracker" || cat === "analytics"; });
  if (!doomed.length) { showToast(t("sec_ca_ok")); return; }
  let n = 0;
  doomed.forEach(function (c) {
    try { api.remove({ url: _secCookieProto(c), name: c.name, storeId: c.storeId }, function () { n++; if (n === doomed.length) { showToast(t("sec_ca_deleted").replace("{0}", String(n))); secCookieAudit(); } }); } catch (e) {}
  });
}

onReady(function () {
  const p = document.getElementById("sec-toggle-phishing");
  const c = document.getElementById("sec-toggle-clickjack");
  const a = document.getElementById("sec-toggle-autoblock");
  const u = document.getElementById("sec-toggle-unlock");
  if (p) p.addEventListener("change", function () {
    secState.phishing = !!p.checked;
    secSaveSettings();
    if (secState.phishing) secScanPhishing();
  });
  if (c) c.addEventListener("change", function () { secState.clickjack = !!c.checked; secSaveSettings(); });
  if (a) a.addEventListener("change", function () { secState.autoBlock = !!a.checked; secSaveSettings(); });
  if (u) u.addEventListener("change", secToggleUnlockPerSite);
  const btnQuick = document.getElementById("btn-sec-quick-scan");
  if (btnQuick) btnQuick.addEventListener("click", secQuickScan);
  const btnPhish = document.getElementById("btn-sec-scan-phishing");
  if (btnPhish) btnPhish.addEventListener("click", secScanPhishing);
  const btnJack = document.getElementById("btn-sec-scan-clickjack");
  if (btnJack) btnJack.addEventListener("click", secScanClickjack);
  const btnUnlock = document.getElementById("btn-sec-unlock-now");
  if (btnUnlock) btnUnlock.addEventListener("click", secUnlockNow);
  const g = document.getElementById("sec-toggle-pasteguard");
  if (g) g.addEventListener("change", function () { secState.pasteGuard = !!g.checked; secSaveSettings(); });
  const r = document.getElementById("sec-toggle-cookiereject");
  if (r) r.addEventListener("change", function () { secState.cookieReject = !!r.checked; secSaveSettings(); });
  const btnTrust = document.getElementById("btn-sec-trust");
  if (btnTrust) btnTrust.addEventListener("click", secTrustReport);
  const btnAudit = document.getElementById("btn-sec-cookie-audit");
  if (btnAudit) btnAudit.addEventListener("click", secCookieAudit);
  const btnDelAll = document.getElementById("btn-sec-cookie-delall");
  if (btnDelAll) btnDelAll.addEventListener("click", secCookieDelTrackers);
  const btnPwGen = document.getElementById("btn-sec-pw-gen");
  if (btnPwGen) btnPwGen.addEventListener("click", secGenPassword);
  const btnPwCopy = document.getElementById("btn-sec-pw-copy");
  if (btnPwCopy) btnPwCopy.addEventListener("click", secCopyPassword);
  const pwOut = document.getElementById("sec-pw-out");
  if (pwOut) {
    pwOut.removeAttribute("readonly");
    pwOut.addEventListener("input", function () { secEvalPassword(pwOut.value); });
  }
  const btnHibp = document.getElementById("btn-sec-hibp");
  if (btnHibp) btnHibp.addEventListener("click", function () { _secOpenExt("https://haveibeenpwned.com/"); });
  const btnWrtc = document.getElementById("btn-sec-webrtc");
  if (btnWrtc) btnWrtc.addEventListener("click", function () { _secOpenExt("https://browserleaks.com/webrtc"); });
  const btnDns = document.getElementById("btn-sec-dns");
  if (btnDns) btnDns.addEventListener("click", function () { _secOpenExt("https://www.dnsleaktest.com/"); });
  const btnClrUnlock = document.getElementById("btn-sec-clear-unlock");
  if (btnClrUnlock) btnClrUnlock.addEventListener("click", secClearUnlockSites);
  const pwMinus = document.getElementById("sec-pw-minus");
  if (pwMinus) pwMinus.addEventListener("click", function () { _secPwStep(-4); });
  const pwPlus = document.getElementById("sec-pw-plus");
  if (pwPlus) pwPlus.addEventListener("click", function () { _secPwStep(4); });
  _secPwShowLen();
  secLoadSettings();
  // refresh host when tab changes
  try {
    const api = (typeof chrome !== "undefined" && chrome.tabs ? chrome.tabs : typeof browser !== "undefined" && browser.tabs ? browser.tabs : null);
    if (api && api.onActivated && api.onActivated.addListener) api.onActivated.addListener(function () { secUpdateActiveHost(secUpdateUI); });
  } catch (e2) {}
});
