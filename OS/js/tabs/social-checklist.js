// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/social-checklist.js
// 10-point defense checklist with persisted progress + export (uses
// _socWzText from social-recovery.js for the bundled guide).
// ---------------------------------------------------------------------------
const SOC_CHECKLIST_KEYS = [
  "soc_ck_i1", "soc_ck_i2", "soc_ck_i3", "soc_ck_i4", "soc_ck_i5",
  "soc_ck_i6", "soc_ck_i7", "soc_ck_i8", "soc_ck_i9", "soc_ck_i10"
];
let socChecklist = {};
function socCkLoad() {
  storGet("sf_social_checklist", function (res) {
    socChecklist = (res && res.sf_social_checklist) || {};
    socCkRender();
  });
}
function socCkRender() {
  const list = document.getElementById("soc-ck-list");
  const prog = document.getElementById("soc-ck-progress");
  if (!list) return;
  _socClearBox(list);
  let done = 0;
  SOC_CHECKLIST_KEYS.forEach(function (key, idx) {
    if (socChecklist[key]) done++;
    const row = document.createElement("label");
    row.className = "soc-ck-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!socChecklist[key];
    cb.addEventListener("change", function () {
      socChecklist[key] = cb.checked;
      storSet({ sf_social_checklist: socChecklist }, function () { socCkRender(); });
    });
    row.appendChild(cb);
    row.appendChild(_socDiv("soc-ck-text", (idx + 1) + ". " + t(key)));
    list.appendChild(row);
  });
  if (prog) {
    prog.textContent = t("soc_ck_progress").replace("{done}", String(done)).replace("{total}", String(SOC_CHECKLIST_KEYS.length));
    prog.style.color = done === SOC_CHECKLIST_KEYS.length ? "#34d399" : "#fbbf24";
  }
  const socScoreFn = window.socScoreRefresh;
  if (socScoreFn) socScoreFn();
}
function socCkExport() {
  const lines = ["ScholarFlow — " + t("soc_ck_title"), ""];
  SOC_CHECKLIST_KEYS.forEach(function (key, idx) {
    lines.push("[" + (socChecklist[key] ? "x" : " ") + "] " + (idx + 1) + ". " + t(key));
  });
  lines.push("");
  lines.push(_socWzText());
  _socDownload("scholarflow-security-checklist.txt", lines.join("\n"));
}
function socCkReset() {
  socChecklist = {};
  storSet({ sf_social_checklist: socChecklist }, function () { socCkRender(); });
}

onReady(function () {
  const btnCkExport = document.getElementById("btn-soc-ck-export");
  if (btnCkExport) btnCkExport.addEventListener("click", socCkExport);
  const btnCkReset = document.getElementById("btn-soc-ck-reset");
  if (btnCkReset) btnCkReset.addEventListener("click", socCkReset);
  socCkLoad();
});
