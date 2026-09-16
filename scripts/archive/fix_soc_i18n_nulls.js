/* One-off fix: replace null values in en.js (bug from add_soc_i18n_245.js) + cosmetic ja fix. */
const fs = require("fs");
const path = require("path");
const EN = {
  soc_st_protect: "Protect", soc_st_recover: "Recover", soc_st_vault: "Vault", soc_st_checklist: "Checklist", soc_st_tools: "Tools",
  soc_sh_more: "Other platforms privacy shield", soc_sh_desc: "Turn on to auto-hide typing/online on that platform's web app (best-effort, refreshed on reload).",
  soc_protect_note: "Note: best-effort CSS — when platforms change their UI, selectors may need updates.",
  soc_wz_title: "Account Recovery Wizard", soc_wz_plat: "Platform", soc_wz_scene: "Your situation",
  soc_wz_btn_start: "Start guide", soc_wz_export: "Download guide (.txt)",
  soc_wz_opt_active_session: "A device/session is still logged in", soc_wz_opt_still_pw: "I can still access the linked email/phone",
  soc_wz_opt_email_lost: "The hacker changed my email", soc_wz_opt_phone_lost: "The hacker changed my phone",
  soc_wz_opt_both_lost: "Lost both email and phone", soc_wz_opt_twofa: "Locked out by 2FA",
  soc_wz_opt_whatsapp: "WhatsApp 2-step PIN attack", soc_wz_opt_sim: "SIM takeover (SIM swap)",
  soc_link_recovery: "Official recovery page", soc_link_sessions: "Security / sessions", soc_link_contact: "Contact support", soc_link_help: "Help center",
  soc_rp_title: "Report hacker / scam unlock services", soc_rp_phish: "Report phishing (Google)", soc_rp_meta: "Report compromised account", soc_rp_copy: "Copy evidence template",
  soc_rp_hint: "Paste the evidence template (with screenshots) into your cyber-police report and the Meta form.",
  soc_rp_opened: "Report page opened", soc_rp_copied: "✓ Evidence template copied!",
  soc_vt_title: "Recovery Info Vault", soc_vt_desc: "AES-256-GCM encrypted on your device with a master password. Lose the master password = lose the data (no backdoor).",
  soc_vt_pw: "Master password", soc_vt_pw2: "Repeat master password", soc_vt_create: "Create vault", soc_vt_unlock: "Unlock",
  soc_vt_f_email: "Backup email", soc_vt_f_phone: "Backup phone", soc_vt_f_contacts: "Trusted contacts (name + link)",
  soc_vt_f_codes: "2FA recovery codes (one per line)", soc_vt_f_notes: "Account notes (username, creation date...)",
  soc_vt_save: "Save & lock", soc_vt_copy: "Copy all", soc_vt_lock: "Lock", soc_vt_clear: "Delete vault",
  soc_vt_weak: "⚠️ Master password needs 8+ characters", soc_vt_mismatch: "⚠️ Passwords do not match", soc_vt_wrong_pw: "⚠️ Wrong master password",
  soc_vt_saved: "✓ Vault saved & locked", soc_vt_created: "✓ Vault created", soc_vt_locked: "🔒 Vault locked",
  soc_vt_no_vault: "⚠️ No vault yet — click 'Create vault'", soc_vt_err: "⚠️ Encryption error, try again",
  soc_vt_copied: "✓ Recovery info copied!", soc_vt_saved_at: "Saved at:",
  soc_vt_confirm_clear: "Delete the entire vault? Cannot be recovered!", soc_vt_cleared: "✓ Vault deleted",
  soc_ck_title: "Defense Checklist", soc_ck_desc: "Complete these 10 items TODAY while you still have account access. Progress saves automatically.",
  soc_ck_progress: "{done}/{total} items", soc_ck_export: "Download checklist", soc_ck_reset: "Reset", soc_ck_exported: "📥 Guide file downloaded!",
  soc_ck_i1: "Enable 2FA with an authenticator app (not SMS) for every important account",
  soc_ck_i2: "Store the 10 2FA recovery codes on paper / in a password manager",
  soc_ck_i3: "Add a backup email nobody knows (e.g. ProtonMail)",
  soc_ck_i4: "Add a backup phone not used for SMS 2FA",
  soc_ck_i5: "Set up 3-5 Trusted Contacts on Facebook",
  soc_ck_i6: "Turn on Login Alerts for all platforms",
  soc_ck_i7: "Review 'Where you're logged in' weekly and log out unknown devices",
  soc_ck_i8: "WhatsApp: enable 2-step PIN + recovery email RIGHT NOW",
  soc_ck_i9: "Gmail: create a filter so Facebook security mail never lands in Spam",
  soc_ck_i10: "Never use 'unlock services', never give anyone remote access",
  soc_tl_phish: "Phishing link checker", soc_tl_phish_ph: "https://...", soc_tl_phish_btn: "Check",
  soc_ss_title: "Browser login sessions", soc_ss_desc: "Check which platforms you're still logged into on THIS browser → this device is your lifeline when hacked.",
  soc_ss_btn: "Check now", soc_ss_logged: "logged in", soc_ss_none: "not logged in", soc_ss_noapi: "⚠️ Browser blocks cookie access",
  soc_ss_note: "If any platform still has a live session: open its security settings NOW, log out all other devices, change the password.",
  soc_tl_unread: "Unread inbox quick links",
  soc_unlock_session: "Open security page", soc_unlock_done: "✓ Security page opened",
  soc_clean_working: "⏳ Clearing tracking cookies...", soc_clean_noapi: "⚠️ No permission to remove cookies",
  soc_ph_empty: "⚠️ Paste a link to check first!", soc_ph_badurl: "❌ Invalid link", soc_ph_nohost: "❌ No host found",
  soc_ph_safe: "✓ Looks safe (official brand host)", soc_ph_suspect: "⚠️ SUSPICIOUS — verify before clicking", soc_ph_danger: "❌ DANGEROUS — phishing signs found",
  soc_ph_reasons: "Reasons", soc_ph_brand_fake: "fake brand hostname", soc_ph_http: "no HTTPS", soc_ph_ip: "raw IP address",
  soc_ph_puny: "punycode/homograph", soc_ph_tld: "cheap TLD", soc_ph_longsub: "unusual subdomain chain",
  soc_ph_hyphen: "brand+hyphen in domain", soc_ph_path: "bait keywords in path", soc_ph_creds: "credentials embedded in URL"
};
const ef = path.join(__dirname, "..", "..", "OS", "locales", "en.js");
let c = fs.readFileSync(ef, "utf8");
let n = 0;
for (const k in EN) {
  const re = new RegExp('"' + k + '": null,');
  if (re.test(c)) { c = c.replace(re, JSON.stringify(k) + ": " + JSON.stringify(EN[k]) + ","); n++; }
}
if (/": null/.test(c)) {
  const leftover = (c.match(/"[^"]+": null/g) || []).join(", ");
  console.log("LEFTOVER nulls:", leftover);
  process.exit(1);
}
fs.writeFileSync(ef, c, "utf8");
console.log("en fixed " + n + " nulls");
const jf = path.join(__dirname, "..", "..", "OS", "locales", "ja.js");
let j = fs.readFileSync(jf, "utf8");
j = j.replace("URLにクレカ情報埋め込み", "URL内に認証情報が埋め込み");
fs.writeFileSync(jf, j, "utf8");
console.log("ja cosmetic fixed");
