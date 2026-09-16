// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/social-recovery.js
// Recovery Wizard (per-platform scenarios: hacked/lost email/phone/2FA/
// WhatsApp PIN/SIM swap), evidence template, friend-guide export,
// hacker/scam-report shortcuts. Relies on globals from social-protection.js.
// ---------------------------------------------------------------------------
function _socWzRender() {
  const plat = (document.getElementById("soc-wz-platform") || {}).value || "facebook";
  const sc = (document.getElementById("soc-wz-scenario") || {}).value || "both_lost";
  const out = document.getElementById("soc-wz-out");
  if (!out) return;
  _socClearBox(out);
  const card = _socDiv("soc-wz-card");
  card.appendChild(_socDiv("soc-wz-step-title", t(SOC_WIZ_TITLES[sc]), "#f87171"));
  for (let i = 1; i <= 4; i++) {
    const key = "soc_wz_" + sc + "_" + i;
    const txt = t(key);
    if (txt === key) continue;
    const row = _socDiv("soc-wz-step");
    row.appendChild(_socDiv("soc-wz-step-num", String(i)));
    row.appendChild(_socDiv("soc-wz-step-body", txt));
    card.appendChild(row);
  }
  const warnKey = "soc_wz_" + sc + "_w";
  const warn = t(warnKey);
  if (warn !== warnKey) card.appendChild(_socDiv("soc-wz-warn", warn, "#fbbf24"));
  const links = SOC_PLAT_LINKS[plat] || [];
  if (links.length) {
    const wrap = document.createElement("div");
    wrap.className = "soc-wz-links";
    links.forEach(function (l) {
      wrap.appendChild(_socBtn("soc-wz-link-btn", t(l.label), function () { _socOpen(l.url); },
        "background:rgba(56,189,248,0.08); border-color:rgba(56,189,248,0.25); color:#38bdf8;"));
    });
    card.appendChild(wrap);
  }
  out.appendChild(card);
}
function _socEvidenceTemplate() {
  return [
    "== EVIDENCE TEMPLATE / MAU BANG KE ==" ,
    "1. Thoi diem phat hien bi hack: ...(gio/ngay)...",
    "2. Dau hieu: (doi email/SĐT/2FA / dang nhap la / gui tin nhan spam / ...)",
    "3. Tai khoan bi anh huong: facebook / instagram / zalo / ...",
    "4. Thiet bi + trinh duyet su dung truoc do: ...",
    "5. Da thao tac: luu screenshot toan bo email bao mat cua Facebook, thong bao dang nhap la, tin nhan spam.",
    "6. Yeu cau: Khoa tai khoan tam thoi + ho tro xac minh danh tinh.",
    "Email lien he: ...  SDT: ..."
  ].join("\n");
}
function _socWzText() {
  const plat = (document.getElementById("soc-wz-platform") || {}).value || "facebook";
  const sc = (document.getElementById("soc-wz-scenario") || {}).value || "both_lost";
  const lines = [];
  lines.push("ScholarFlow — " + t("soc_wz_title") + " — " + plat.toUpperCase());
  lines.push("== " + t(SOC_WIZ_TITLES[sc]) + " ==");
  for (let i = 1; i <= 4; i++) {
    const key = "soc_wz_" + sc + "_" + i;
    const txt = t(key);
    if (txt !== key) lines.push(i + ") " + txt);
  }
  const warn = t("soc_wz_" + sc + "_w");
  if (warn !== "soc_wz_" + sc + "_w") lines.push("!! " + warn);
  (SOC_PLAT_LINKS[plat] || []).forEach(function (l) { lines.push("- " + t(l.label) + ": " + l.url); });
  lines.push("");
  lines.push(_socEvidenceTemplate());
  return lines.join("\n");
}
function socReportPhish() {
  const url = ((document.getElementById("soc-ph-url") || {}).value || "").trim();
  _socOpen("https://safebrowsing.google.com/safebrowsing/report_phish/?url=" + encodeURIComponent(url));
  showToast(t("soc_rp_opened"));
}
function socReportMeta() { _socOpen("https://www.facebook.com/hacked"); showToast(t("soc_rp_opened")); }
function socCopyEvidence() { _socCopyText(_socEvidenceTemplate(), t("soc_rp_copied")); }

onReady(function () {
  const wzPlat = document.getElementById("soc-wz-platform");
  const wzSc = document.getElementById("soc-wz-scenario");
  if (wzPlat) wzPlat.addEventListener("change", _socWzRender);
  if (wzSc) wzSc.addEventListener("change", _socWzRender);
  const btnWzStart = document.getElementById("btn-soc-wz-start");
  if (btnWzStart) btnWzStart.addEventListener("click", _socWzRender);
  const btnWzExport = document.getElementById("btn-soc-wz-export");
  if (btnWzExport) btnWzExport.addEventListener("click", function () { _socDownload("scholarflow-recovery-guide.txt", _socWzText()); });
  const btnRpPhish = document.getElementById("btn-soc-rp-phish");
  if (btnRpPhish) btnRpPhish.addEventListener("click", socReportPhish);
  const btnRpMeta = document.getElementById("btn-soc-rp-meta");
  if (btnRpMeta) btnRpMeta.addEventListener("click", socReportMeta);
  const btnRpCopy = document.getElementById("btn-soc-rp-copy");
  if (btnRpCopy) btnRpCopy.addEventListener("click", socCopyEvidence);
});
