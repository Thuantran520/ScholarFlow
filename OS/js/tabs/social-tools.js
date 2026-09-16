// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/social-tools.js
// Tools sub-panel: phishing URL scanner (heuristic), browser login-session
// checker (chrome.cookies), social-tracker scan, cookie clean, unread links,
// "open security page" quick action.
// ---------------------------------------------------------------------------
function _socScanPhishUrl(raw) {
  const reasons = [];
  const url = String(raw || "").trim();
  if (!url) return { level: "suspect", msgKey: "soc_ph_empty", reasons: [] };
  let u;
  try { u = new URL(url); } catch (e) { return { level: "danger", msgKey: "soc_ph_badurl", reasons: [] }; }
  const host = (u.hostname || "").toLowerCase();
  if (!host) return { level: "danger", msgKey: "soc_ph_nohost", reasons: [] };
  const official = ["facebook.com", "messenger.com", "instagram.com", "zalo.me", "x.com", "twitter.com",
    "tiktok.com", "discord.com", "telegram.org", "whatsapp.com", "google.com"];
  const brand = ["facebook", "fb", "instagram", "meta", "zalo", "tiktok", "discord", "twitter", "telegram", "whatsapp", "google"];
  let hasBrand = false;
  brand.forEach(function (b) { if (host.indexOf(b) !== -1) hasBrand = true; });
  let isOfficial = false;
  official.forEach(function (o) { if (host === o || host.endsWith("." + o)) isOfficial = true; });
  if (hasBrand && !isOfficial) reasons.push("soc_ph_brand_fake");
  if (u.protocol === "http:") reasons.push("soc_ph_http");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) reasons.push("soc_ph_ip");
  if (host.indexOf("xn--") !== -1) reasons.push("soc_ph_puny");
  const susTld = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".icu", ".buzz"];
  for (let i = 0; i < susTld.length; i++) { if (host.endsWith(susTld[i])) { reasons.push("soc_ph_tld"); break; } }
  const parts = host.split(".");
  if (parts.length > 4) reasons.push("soc_ph_longsub");
  for (let i = 0; i < parts.length; i++) {
    if (/-(facebook|instagram|zalo|meta|google|apple|paypal|discord)/.test(parts[i])) { reasons.push("soc_ph_hyphen"); break; }
  }
  if (/(login|secure|verify|account|update|billing|confirm|password)/i.test(u.pathname) && !isOfficial) reasons.push("soc_ph_path");
  if (u.username || u.password) reasons.push("soc_ph_creds");
  let score = 0;
  reasons.forEach(function (r) { score += (r === "soc_ph_brand_fake" || r === "soc_ph_ip" || r === "soc_ph_puny") ? 3 : 1; });
  const level = score >= 3 ? "danger" : (score > 0 ? "suspect" : "safe");
  return { level: level, msgKey: "", reasons: reasons };
}
function socPhCheck() {
  const input = document.getElementById("soc-ph-url");
  const out = document.getElementById("soc-ph-out");
  if (!out) return;
  _socClearBox(out);
  const res = _socScanPhishUrl((input || {}).value || "");
  const labelKey = res.msgKey || (res.level === "safe" ? "soc_ph_safe" : res.level === "suspect" ? "soc_ph_suspect" : "soc_ph_danger");
  const color = res.level === "safe" ? "#34d399" : res.level === "suspect" ? "#fbbf24" : "#f87171";
  const head = _socDiv("soc-result-row", t(labelKey), color);
  head.style.fontWeight = "700";
  out.appendChild(head);
  if (res.reasons && res.reasons.length) {
    const body = _socDiv("soc-result-row", t("soc_ph_reasons") + ": " + res.reasons.map(function (r) { return t(r); }).join(" • "));
    body.style.marginTop = "4px";
    out.appendChild(body);
  }
}
function socSessionCheck() {
  const out = document.getElementById("soc-ss-out");
  if (!out) return;
  _socClearBox(out);
  const api = (typeof chrome !== "undefined" && chrome.cookies) ? chrome.cookies : null;
  if (!api) { out.appendChild(_socDiv("soc-result-row", t("soc_ss_noapi"), "#f87171")); return; }
  let pending = SOC_SESSION_COOKIES.length;
  const rows = {};
  const finish = function () {
    pending--;
    if (pending > 0) return;
    SOC_SESSION_COOKIES.forEach(function (def) { out.appendChild(rows[def.key]); });
    out.appendChild(_socDiv("soc-result-row", t("soc_ss_note"), "#94a3b8"));
  };
  SOC_SESSION_COOKIES.forEach(function (def) {
    const row = _socDiv("soc-result-row", def.key + ": ...");
    rows[def.key] = row;
    let found = false;
    let domIdx = 0;
    const next = function () {
      if (found) { row.textContent = def.key + ": " + t("soc_ss_logged"); row.style.color = "#22d3ee"; finish(); return; }
      if (domIdx >= def.domains.length) { row.textContent = def.key + ": " + t("soc_ss_none"); row.style.color = "#64748b"; finish(); return; }
      const domain = def.domains[domIdx];
      domIdx++;
      try {
        api.getAll({ domain: domain }, function (cookies) {
          (cookies || []).forEach(function (c) { if (def.names.indexOf(c.name) !== -1) found = true; });
          next();
        });
      } catch (e) { next(); }
    };
    next();
  });
}
function socCleanCookies() {
  const out = document.getElementById("soc-tools-out");
  const api = (typeof chrome !== "undefined" && chrome.cookies) ? chrome.cookies : null;
  if (!out) return;
  _socClearBox(out);
  out.appendChild(_socDiv("soc-result-row", t("soc_clean_working"), "#94a3b8"));
  if (!api) { _socClearBox(out); out.appendChild(_socDiv("soc-result-row", t("soc_clean_noapi"), "#f87171")); return; }
  let cleared = 0, pending = SOC_TRACKER_COOKIE_DOMAINS.length;
  const done = function () {
    pending--;
    if (pending > 0) return;
    _socClearBox(out);
    out.appendChild(_socDiv("soc-result-row", t("soc_clean_done").replace("{0}", String(cleared)), "#fb923c"));
    socState.lastScan = new Date().toISOString();
    socSaveSettings();
  };
  SOC_TRACKER_COOKIE_DOMAINS.forEach(function (domain) {
    try {
      api.getAll({ domain: domain }, function (cookies) {
        (cookies || []).forEach(function (c) {
          try {
            const proto = (c.secure ? "https" : "http") + "://" + (c.domain.replace(/^\./, "")) + (c.path || "/");
            if (chrome.cookies && chrome.cookies.remove) chrome.cookies.remove({ url: proto, name: c.name, storeId: c.storeId }, function () { cleared++; });
          } catch (e) {}
        });
        done();
      });
    } catch (e) { done(); }
  });
}
function socScanTrackers() {
  socSendToActive({ action: "SOC_SCAN_TRACKERS" }, function (res) {
    const out = document.getElementById("soc-tools-out");
    if (!out) return;
    _socClearBox(out);
    if (res && res.trackers && res.trackers.length > 0) {
      out.appendChild(_socDiv("soc-result-row", t("soc_scan_found").replace("{0}", String(res.trackers.length)), "#f87171"));
      out.appendChild(_socDiv("soc-result-row", res.trackers.join(", ")));
    } else if (res) {
      out.appendChild(_socDiv("soc-result-row", t("soc_scan_clean"), "#34d399"));
    } else {
      out.appendChild(_socDiv("soc-result-row", t("sec_result_err"), "#94a3b8"));
    }
    socState.lastScan = new Date().toISOString();
    socSaveSettings();
  });
}
function socOpenSecurityPage() {
  const h = _socCurrentHost || "";
  let url = "https://www.facebook.com/settings?tab=security";
  if (h.indexOf("instagram") !== -1) url = "https://www.instagram.com/accounts/center/";
  else if (h.indexOf("zalo") !== -1) url = "https://zalo.me/settings/security";
  else if (h.indexOf("x.com") !== -1 || h.indexOf("twitter") !== -1) url = "https://x.com/settings/security";
  else if (h.indexOf("tiktok") !== -1) url = "https://www.tiktok.com/settings";
  else if (h.indexOf("discord") !== -1) url = "https://discord.com/settings/authorized-apps";
  _socOpen(url);
  showToast(t("soc_unlock_done"));
}

onReady(function () {
  const btnPh = document.getElementById("btn-soc-ph-check");
  if (btnPh) btnPh.addEventListener("click", socPhCheck);
  const phInput = document.getElementById("soc-ph-url");
  if (phInput) phInput.addEventListener("keydown", function (e) { if (e.key === "Enter") socPhCheck(); });
  const btnSs = document.getElementById("btn-soc-ss-check");
  if (btnSs) btnSs.addEventListener("click", socSessionCheck);
  Object.keys(SOC_UNREAD_LINKS).forEach(function (k) {
    const b = document.getElementById("btn-soc-un-" + k);
    if (b) b.addEventListener("click", function () { _socOpen(SOC_UNREAD_LINKS[k]); });
  });
  const btnScan = document.getElementById("btn-soc-scan-trackers");
  if (btnScan) btnScan.addEventListener("click", socScanTrackers);
  const btnClean = document.getElementById("btn-soc-clean-cookies");
  if (btnClean) btnClean.addEventListener("click", socCleanCookies);
  const btnSec = document.getElementById("btn-soc-unlock-mk");
  if (btnSec) btnSec.addEventListener("click", socOpenSecurityPage);
});
