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
  socVaultInit();
});
