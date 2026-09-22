// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/social-vault.js
// Recovery Info Vault: AES-256-GCM encrypted local storage (PBKDF2 key
// derivation, 150k iterations). Master password never leaves the device.
// ---------------------------------------------------------------------------
let _socVaultKey = null;
function _socB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function _socB64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
function _socDeriveKey(pw, saltB64) {
  if (!(window.crypto && window.crypto.subtle)) return Promise.reject(new Error("no-subtle"));
  let salt;
  try { salt = _socB64ToBytes(saltB64); } catch (e) { salt = new Uint8Array(16); }
  return crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"])
    .then(function (base) {
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: 150000, hash: "SHA-256" },
        base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
      );
    });
}
function _socVaultRead(cb) {
  storGet("sf_social_vault", function (res) { cb((res && res.sf_social_vault) || null); });
}
function _socVaultSetLockView(hasVault) {
  const create = document.getElementById("btn-soc-vt-create");
  const unlock = document.getElementById("btn-soc-vt-unlock");
  const pw2wrap = document.getElementById("soc-vt-pw2-wrap");
  if (create) create.style.display = hasVault ? "none" : "";
  if (unlock) unlock.style.display = hasVault ? "" : "none";
  if (pw2wrap) pw2wrap.style.display = hasVault ? "none" : "";
  const lockView = document.getElementById("soc-vt-lockview");
  const editView = document.getElementById("soc-vt-editview");
  if (lockView) lockView.style.display = "";
  if (editView) editView.style.display = "none";
}
function socVaultMsg(text, color) {
  const el = document.getElementById("soc-vt-msg");
  if (el) { el.textContent = text || ""; el.style.color = color || "#94a3b8"; }
}
function socVaultInit() {
  _socVaultRead(function (v) { _socVaultSetLockView(!!v); });
}
function socVaultCreate() {
  const pw = (document.getElementById("soc-vt-pw") || {}).value || "";
  const pw2 = (document.getElementById("soc-vt-pw2") || {}).value || "";
  if (pw.length < 8) { socVaultMsg(t("soc_vt_weak"), "#f87171"); return; }
  if (pw !== pw2) { socVaultMsg(t("soc_vt_mismatch"), "#f87171"); return; }
  if (!(window.crypto && window.crypto.subtle)) { socVaultMsg(t("soc_vt_err"), "#f87171"); return; }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  _socDeriveKey(pw, _socB64(salt.buffer)).then(function (key) {
    _socVaultKey = key;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode(JSON.stringify({ email: "", phone: "", contacts: "", codes: "", notes: "" })))
      .then(function (ct) {
        storSet({ sf_social_vault: { v: 1, salt: _socB64(salt.buffer), iv: _socB64(iv.buffer), ct: _socB64(ct) } }, function () {
          socVaultShowEdit({});
          socVaultMsg(t("soc_vt_created"), "#34d399");
        });
      });
  }).catch(function () { socVaultMsg(t("soc_vt_err"), "#f87171"); });
}
function socVaultUnlock() {
  const pw = (document.getElementById("soc-vt-pw") || {}).value || "";
  _socVaultRead(function (v) {
    if (!v) { socVaultMsg(t("soc_vt_no_vault"), "#f87171"); return; }
    _socDeriveKey(pw, v.salt).then(function (key) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: _socB64ToBytes(v.iv) }, key, _socB64ToBytes(v.ct))
        .then(function (plain) {
          _socVaultKey = key;
          const data = JSON.parse(new TextDecoder().decode(plain));
          socVaultShowEdit(data);
        });
    }).catch(function () { socVaultMsg(t("soc_vt_wrong_pw"), "#f87171"); });
  });
}
function socVaultShowEdit(data) {
  const set = function (id, v) { const el = document.getElementById(id); if (el) el.value = v || ""; };
  set("soc-vt-email", data.email); set("soc-vt-phone", data.phone);
  set("soc-vt-contacts", data.contacts); set("soc-vt-codes", data.codes); set("soc-vt-notes", data.notes);
  const lockView = document.getElementById("soc-vt-lockview");
  const editView = document.getElementById("soc-vt-editview");
  if (lockView) lockView.style.display = "none";
  if (editView) editView.style.display = "";
  const pwEl = document.getElementById("soc-vt-pw"); if (pwEl) pwEl.value = "";
  const pw2El = document.getElementById("soc-vt-pw2"); if (pw2El) pw2El.value = "";
  _socVaultRead(function (v) {
    const el = document.getElementById("soc-vt-savedat");
    if (el) el.textContent = v && v.savedAt ? (t("soc_vt_saved_at") + " " + v.savedAt) : "";
  });
}
function socVaultSave() {
  if (!_socVaultKey) { _socVaultSetLockView(true); return; }
  const get = function (id) { return (document.getElementById(id) || {}).value || ""; };
  const data = { email: get("soc-vt-email"), phone: get("soc-vt-phone"), contacts: get("soc-vt-contacts"), codes: get("soc-vt-codes"), notes: get("soc-vt-notes") };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, _socVaultKey, new TextEncoder().encode(JSON.stringify(data)))
    .then(function (ct) {
      _socVaultRead(function (v) {
        v = v || {};
        v.ct = _socB64(ct); v.iv = _socB64(iv.buffer);
        v.savedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
        storSet({ sf_social_vault: v }, function () {
          _socVaultKey = null;
          _socVaultSetLockView(true);
          socVaultMsg(t("soc_vt_saved"), "#34d399");
        });
      });
    }).catch(function () { socVaultMsg(t("soc_vt_err"), "#f87171"); });
}
function socVaultLock() {
  _socVaultKey = null;
  _socVaultSetLockView(true);
  socVaultMsg(t("soc_vt_locked"), "#94a3b8");
}
function socVaultCopy() {
  const get = function (id) { return (document.getElementById(id) || {}).value || ""; };
  const summary = "Email: " + get("soc-vt-email") + "\nPhone: " + get("soc-vt-phone") +
    "\nContacts: " + get("soc-vt-contacts") + "\nCodes: " + get("soc-vt-codes") + "\nNotes: " + get("soc-vt-notes");
  _socCopyText(summary, t("soc_vt_copied"));
}
function socVaultClear() {
  if (!window.confirm(t("soc_vt_confirm_clear"))) return;
  _socVaultKey = null;
  try { storRemove("sf_social_vault"); } catch (e) {}
  _socVaultSetLockView(false);
  socVaultMsg(t("soc_vt_cleared"), "#34d399");
  const socScoreFn = window.socScoreRefresh;
  if (socScoreFn) socScoreFn();
}
// Backup / restore: encrypted off-device file (independent passphrase).
function socVaultExport() {
  if (!_socVaultKey) { socVaultMsg(t("soc_vt_exp_locked"), "#f87171"); return; }
  if (!(window.crypto && window.crypto.subtle)) { socVaultMsg(t("soc_vt_err"), "#f87171"); return; }
  const bak = (document.getElementById("soc-vt-bakpw") || {}).value || "";
  if (bak.length < 8) { socVaultMsg(t("soc_vt_weak"), "#f87171"); return; }
  const get = function (id) { return (document.getElementById(id) || {}).value || ""; };
  const data = { email: get("soc-vt-email"), phone: get("soc-vt-phone"), contacts: get("soc-vt-contacts"), codes: get("soc-vt-codes"), notes: get("soc-vt-notes") };
  const salt = crypto.getRandomValues(new Uint8Array(16));
  _socDeriveKey(bak, _socB64(salt.buffer)).then(function (key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode(JSON.stringify(data)))
      .then(function (ct) {
        const payload = JSON.stringify({ kind: "scholarflow-vault-backup", v: 1, savedAt: new Date().toISOString(), salt: _socB64(salt.buffer), iv: _socB64(iv.buffer), ct: _socB64(ct) });
        _socDownload("scholarflow-vault-backup.json", payload);
        const pwEl = document.getElementById("soc-vt-bakpw"); if (pwEl) pwEl.value = "";
        socVaultMsg(t("soc_vt_exp_done"), "#34d399");
      });
  }).catch(function () { socVaultMsg(t("soc_vt_err"), "#f87171"); });
}
let _socBackupFile = null;
function socVaultImportPick() {
  const fp = document.getElementById("soc-vt-bakfile");
  if (!fp || !fp.files || !fp.files[0]) return;
  try {
    const reader = new FileReader();
    const name = fp.files[0].name;
    reader.onload = function () {
      try { _socBackupFile = JSON.parse(reader.result); } catch (e) { _socBackupFile = null; }
      const nameEl = document.getElementById("soc-vt-bakname");
      if (nameEl) nameEl.textContent = _socBackupFile ? (name + " \u2014 " + t("soc_vt_imp_file_ok")) : t("soc_vt_imp_file_bad");
    };
    reader.readAsText(fp.files[0]);
  } catch (e) {}
}
function socVaultImport() {
  const pw = (document.getElementById("soc-vt-imbakpw") || {}).value || "";
  const mpw = (document.getElementById("soc-vt-pw") || {}).value || "";
  const mpw2 = (document.getElementById("soc-vt-pw2") || {}).value || "";
  if (!_socBackupFile) { socVaultMsg(t("soc_vt_imp_none"), "#f87171"); return; }
  if (pw.length < 8) { socVaultMsg(t("soc_vt_weak"), "#f87171"); return; }
  if (mpw.length < 8) { socVaultMsg(t("soc_vt_weak"), "#f87171"); return; }
  if (mpw !== mpw2) { socVaultMsg(t("soc_vt_mismatch"), "#f87171"); return; }
  if (!(window.crypto && window.crypto.subtle)) { socVaultMsg(t("soc_vt_err"), "#f87171"); return; }
  _socDeriveKey(pw, _socBackupFile.salt).then(function (key) {
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: _socB64ToBytes(_socBackupFile.iv) }, key, _socB64ToBytes(_socBackupFile.ct))
      .then(function (plain) {
        let data = {};
        try { data = JSON.parse(new TextDecoder().decode(plain)); } catch (e) {}
        const data2 = data && typeof data === "object" ? data : {};
        const salt = crypto.getRandomValues(new Uint8Array(16));
        return _socDeriveKey(mpw, _socB64(salt.buffer)).then(function (nkey) {
          const iv = crypto.getRandomValues(new Uint8Array(12));
          return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, nkey, new TextEncoder().encode(JSON.stringify(data2)))
            .then(function (ct) {
              storSet({ sf_social_vault: { v: 1, salt: _socB64(salt.buffer), iv: _socB64(iv.buffer), ct: _socB64(ct), savedAt: new Date().toISOString().slice(0, 16).replace("T", " ") } }, function () {
                _socVaultKey = null;
                _socBackupFile = null;
                const pwl = document.getElementById("soc-vt-pw"); if (pwl) pwl.value = "";
                const pw2l = document.getElementById("soc-vt-pw2"); if (pw2l) pw2l.value = "";
                const imb = document.getElementById("soc-vt-imbakpw"); if (imb) imb.value = "";
                const fp2 = document.getElementById("soc-vt-bakfile"); if (fp2) fp2.value = "";
                _socVaultSetLockView(true);
                socVaultMsg(t("soc_vt_imp_done"), "#34d399");
                socVaultShowEdit(data2);
                const socScoreFn = window.socScoreRefresh;
                if (socScoreFn) socScoreFn();
              });
            });
        });
      });
  }).catch(function () { socVaultMsg(t("soc_vt_imp_bad"), "#f87171"); });
}
function socVaultAutoLock() {
  if (!_socVaultKey) return;
  const ev = document.getElementById("soc-vt-editview");
  if (ev && ev.style.display !== "none") socVaultLock();
}

onReady(function () {
  const btnVtCreate = document.getElementById("btn-soc-vt-create");
  if (btnVtCreate) btnVtCreate.addEventListener("click", socVaultCreate);
  const btnVtUnlock = document.getElementById("btn-soc-vt-unlock");
  if (btnVtUnlock) btnVtUnlock.addEventListener("click", socVaultUnlock);
  const btnVtSave = document.getElementById("btn-soc-vt-save");
  if (btnVtSave) btnVtSave.addEventListener("click", socVaultSave);
  const btnVtLock = document.getElementById("btn-soc-vt-lock");
  if (btnVtLock) btnVtLock.addEventListener("click", socVaultLock);
  const btnVtCopy = document.getElementById("btn-soc-vt-copy");
  if (btnVtCopy) btnVtCopy.addEventListener("click", socVaultCopy);
  const btnVtClear = document.getElementById("btn-soc-vt-clear");
  if (btnVtClear) btnVtClear.addEventListener("click", socVaultClear);
  const btnVtExp = document.getElementById("btn-soc-vt-export");
  if (btnVtExp) btnVtExp.addEventListener("click", socVaultExport);
  const btnVtImpPick = document.getElementById("btn-soc-vt-importpick");
  if (btnVtImpPick) btnVtImpPick.addEventListener("click", function () {
    const fp = document.getElementById("soc-vt-bakfile");
    if (fp) fp.click();
  });
  const fpIn = document.getElementById("soc-vt-bakfile");
  if (fpIn) fpIn.addEventListener("change", socVaultImportPick);
  const btnVtImp = document.getElementById("btn-soc-vt-import");
  if (btnVtImp) btnVtImp.addEventListener("click", socVaultImport);
  try {
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { setTimeout(socVaultAutoLock, 300); }
    });
    window.addEventListener("blur", function () { setTimeout(socVaultAutoLock, 300); });
  } catch (eAuto) {}
  socVaultInit();
});
