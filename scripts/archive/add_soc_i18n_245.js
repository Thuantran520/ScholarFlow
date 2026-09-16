/* One-off: inject Social Protection i18n keys into the 5 locale files. */
const fs = require("fs");
const path = require("path");
const MARKER = "/* i18n: content_* block start - generated, do not edit */";

const K = {
  soc_st_protect: "Bảo vệ", soc_st_recover: "Khôi phục", soc_st_vault: "Két sắt", soc_st_checklist: "Checklist", soc_st_tools: "Công cụ",
  soc_sh_more: "Khiên riêng tư nền tảng khác", soc_sh_desc: "Bật để tự ẩn typing/online trên web app của nền tảng đó (best-effort, tự cập nhật khi load lại trang).",
  soc_protect_note: "Lưu ý: biện pháp CSS best-effort — nền tảng đổi giao diện có thể cần cập nhật selector.",
  soc_wz_title: "Wizard Khôi phục tài khoản", soc_wz_plat: "Nền tảng", soc_wz_scene: "Tình huống của bạn",
  soc_wz_btn_start: "Bắt đầu hướng dẫn", soc_wz_export: "Tải hướng dẫn (.txt)",
  soc_wz_opt_active_session: "Còn thiết bị/phiên đã đăng nhập", soc_wz_opt_still_pw: "Còn vào được email/SĐT gắn với acc",
  soc_wz_opt_email_lost: "Hacker đã đổi email", soc_wz_opt_phone_lost: "Hacker đã đổi SĐT",
  soc_wz_opt_both_lost: "Mất cả email + SĐT", soc_wz_opt_twofa: "Bị bật 2FA khóa ngoài",
  soc_wz_opt_whatsapp: "WhatsApp bị đặt PIN 2 lớp", soc_wz_opt_sim: "SIM bị chiếm quyền (SIM swap)",
  soc_link_recovery: "Trang khôi phục chính thức", soc_link_sessions: "Cài đặt bảo mật / phiên", soc_link_contact: "Liên hệ hỗ trợ", soc_link_help: "Trung tâm trợ giúp",
  soc_rp_title: "Báo cáo hacker / unlock service lừa đảo", soc_rp_phish: "Báo phishing Google", soc_rp_meta: "Báo tài khoản bị chiếm", soc_rp_copy: "Copy mẫu bằng chứng",
  soc_rp_hint: "Dán mẫu bằng chứng (kèm screenshot) vào đơn trình báo Cảnh sát mạng A05 và form Meta.",
  soc_rp_opened: "Đã mở trang báo cáo", soc_rp_copied: "✓ Đã copy mẫu bằng chứng!",
  soc_vt_title: "Két sắt thông tin khôi phục", soc_vt_desc: "Mã hóa AES-256-GCM ngay trên máy bạn bằng mật khẩu chủ. Quên mật khẩu chủ = mất dữ liệu (không có đường lùi).",
  soc_vt_pw: "Mật khẩu chủ", soc_vt_pw2: "Nhập lại mật khẩu chủ", soc_vt_create: "Tạo két sắt", soc_vt_unlock: "Mở khóa",
  soc_vt_f_email: "Email dự phòng", soc_vt_f_phone: "SĐT dự phòng", soc_vt_f_contacts: "Trusted contacts (tên + link)",
  soc_vt_f_codes: "Recovery codes 2FA (mỗi dòng 1 mã)", soc_vt_f_notes: "Ghi chú tài khoản (user, ngày tạo...)",
  soc_vt_save: "Lưu & khóa", soc_vt_copy: "Copy tất cả", soc_vt_lock: "Khóa lại", soc_vt_clear: "Xóa két",
  soc_vt_weak: "⚠️ Mật khẩu chủ tối thiểu 8 ký tự", soc_vt_mismatch: "⚠️ Hai lần nhập không khớp", soc_vt_wrong_pw: "⚠️ Sai mật khẩu chủ",
  soc_vt_saved: "✓ Đã lưu & khóa két sắt", soc_vt_created: "✓ Đã tạo két sắt", soc_vt_locked: "🔒 Đã khóa két",
  soc_vt_no_vault: "⚠️ Chưa có két sắt — hãy bấm 'Tạo két sắt'", soc_vt_err: "⚠️ Lỗi mã hóa, thử lại",
  soc_vt_copied: "✓ Đã copy thông tin khôi phục!", soc_vt_saved_at: "Lưu lúc:",
  soc_vt_confirm_clear: "Xóa toàn bộ két sắt? Không thể khôi phục!", soc_vt_cleared: "✓ Đã xóa két sắt",
  soc_ck_title: "Checklist phòng thủ", soc_ck_desc: "Làm đủ 10 mục này HÔM NAY, khi còn truy cập được tài khoản. Tiến độ lưu tự động.",
  soc_ck_progress: "{done}/{total} mục", soc_ck_export: "Tải checklist", soc_ck_reset: "Reset", soc_ck_exported: "📥 Đã tải tệp hướng dẫn!",
  soc_ck_i1: "Bật 2FA bằng app Authenticator (không dùng SMS) cho mọi tài khoản quan trọng",
  soc_ck_i2: "Lưu 10 Recovery Codes 2FA ra giấy / két mật khẩu",
  soc_ck_i3: "Thêm email dự phòng ít người biết (vd ProtonMail)",
  soc_ck_i4: "Thêm số điện thoại dự phòng không dùng cho SMS 2FA",
  soc_ck_i5: "Thiết lập 3-5 Trusted Contacts trên Facebook",
  soc_ck_i6: "Bật Login Alerts (cảnh báo đăng nhập) mọi nền tảng",
  soc_ck_i7: "Kiểm tra 'Nơi bạn đã đăng nhập' hằng tuần, logout thiết bị lạ",
  soc_ck_i8: "WhatsApp: bật PIN 2 lớp + email recovery NGAY BÂY GIỜ",
  soc_ck_i9: "Gmail: tạo filter giữ mail bảo mật Facebook không vào Spam",
  soc_ck_i10: "Không dùng 'dịch vụ mở khóa', không cho ai remote máy",
  soc_tl_phish: "Kiểm tra link lừa đảo", soc_tl_phish_ph: "https://...", soc_tl_phish_btn: "Check",
  soc_ss_title: "Phiên đăng nhập của trình duyệt", soc_ss_desc: "Kiểm tra bạn còn đang đăng nhập nền tảng nào trên trình duyệt này → thiết bị này là 'phao cứu sinh' khi bị hack.",
  soc_ss_btn: "Kiểm tra ngay", soc_ss_logged: "Còn phiên đăng nhập", soc_ss_none: "chưa đăng nhập", soc_ss_noapi: "⚠️ Trình duyệt không cho phép đọc cookie",
  soc_ss_note: "Nếu còn phiên ở nền tảng nào: VÀO NGAY settings bảo mật nền tảng đó, logout tất cả thiết bị khác, đổi MK.",
  soc_tl_unread: "Hộp thư chưa đọc (mở đúng chỗ)",
  soc_unlock_session: "Mở trang bảo mật", soc_unlock_done: "✓ Đã mở trang bảo mật",
  soc_clean_working: "⏳ Đang dọn cookie theo dõi...", soc_clean_noapi: "⚠️ Không có quyền xóa cookie",
  soc_ph_empty: "⚠️ Hãy dán link cần kiểm tra trước!", soc_ph_badurl: "❌ Link không hợp lệ", soc_ph_nohost: "❌ Không xác định được máy chủ",
  soc_ph_safe: "✓ Có vẻ an toàn (chủ đề chính thức)", soc_ph_suspect: "⚠️ NGHI NGỜ — kiểm tra kỹ trước khi bấm", soc_ph_danger: "❌ NGUY HIỂM — có dấu hiệu phishing",
  soc_ph_reasons: "Lý do", soc_ph_brand_fake: "mạo tên thương hiệu", soc_ph_http: "không HTTPS", soc_ph_ip: "dùng địa chỉ IP",
  soc_ph_puny: "punycode/homograph", soc_ph_tld: "TLD rẻ tiền", soc_ph_longsub: "subdomain bất thường",
  soc_ph_hyphen: "brand+- trong domain", soc_ph_path: "từ khóa诱导 trong path", soc_ph_creds: "nhúng credentials trong URL"
};
// per-scenario wizard content (vi)
const VI_WIZ = {
  active_session: ["Trường hợp 1: Còn 1 thiết bị đang đăng nhập",
    "Mở Facebook ngay trên thiết bị cũ còn đang đăng nhập → Cài đặt → Bảo mật → 'Nơi bạn đã đăng nhập'.",
    "Bấm 'Đăng xuất khỏi tất cả phiên' — hacker bị đá ra tức thì.",
    "Đổi mật khẩu mới mạnh, bật 2FA bằng app Authenticator, xóa email/SĐT của hacker vừa gắn vào.",
    "Bật Login Alerts và xóa các ứng dụng được ủy quyền lạ.",
    "Làm trong 1 phút sau khi phát hiện — hacker cũng còn phiên sống, bạn chậm là mất lại."],
  still_pw: ["Trường hợp 2: Còn vào được email/SĐT đang gắn với acc",
    "Vào trình duyệt ẩn danh → trang identify khôi phục chính thức của nền tảng, nhập email/SĐT của bạn.",
    "Chọn gửi mã về email/SĐT — nếu nền tảng còn hiển thị email của bạn là dấu hiệu hacker CHƯA gỡ được nó.",
    "Nhập mã 6 số → đổi mật khẩu ngay.",
    "Sau khi vào được: logout mọi phiên, thêm email dự phòng mới, bật 2FA bằng app.",
    "Chỉ nhập mã trên đúng domain chính thức — link lạ hỏi mã là bẫy."],
  email_lost: ["Trường hợp 3: Hacker đã đổi email khôi phục",
    "Vào trang 'bị chiếm quyền' chính thức của nền tảng (xem nút bên dưới).",
    "Khi được hỏi liên hệ: cung cấp email MỚI chưa từng gắn với tài khoản nào.",
    "Nếu còn truy cập được hộp email cũ — làm theo link xác nhận trong email 'email của bạn vừa bị đổi' TRƯỚC KHI hết hạn.",
    "Nếu không: chuẩn bị CMND/CCCD/hộ chiếu + selfie cầm giấy để xác minh.",
    "Tên trên giấy tờ phải khớp tên hồ sơ. Ảnh mờ/cắt góc là lý do fail số 1."],
  phone_lost: ["Trường hợp 4: Hacker đã đổi số điện thoại",
    "Thử đăng nhập bằng email — email có thể hacker chưa kịp đổi.",
    "Không được: dùng trang khôi phục chính thức, nhập SĐT cũ để yêu cầu mã.",
    "Nếu SĐT cũ đã bị gỡ: ra nhà mạng cấp lại SIM chính chủ (mang CMND), khóa bảo vệ SIM.",
    "Lấy lại acc rồi: chuyển 2FA sang app thay vì SMS (SMS chống được SIM swap).",
    "SIM swap thường xảy ra ban đêm — gọi nhà mạng khóa chiều đổi chiều nếu nghi ngờ."],
  both_lost: ["Trường hợp 5: Mất cả email + SĐT (hacker đổi hết)",
    "Khó nhất nhưng lấy lại được 100% nếu hồ sơ dùng tên thật.",
    "Từ trình duyệt ẩn danh → trang 'tài khoản bị xâm nhập' → chọn 'Không còn quyền truy cập các thông tin này'.",
    "Upload 2 mặt CMND/CCCD/hộ chiếu rõ nét + selfie cầm giấy tờ (mặt rõ, nền tối giản).",
    "Chờ 24-72h. Link reset gửi về email MỚI bạn khai. Nếu bị từ chối 1 lần → thử lại bằng hộ chiếu.",
    "Đừng bao giờ gửi giấy tờ cho 'dịch vụ mở khóa' — nền tảng không bao giờ nhận hồ sơ qua trung gian."],
  twofa: ["Trường hợp 6: Bị bật 2FA khóa ngoài",
    "Thử 10 Recovery Codes bạn đã lưu khi bật 2FA (hoặc trong tab Két sắt).",
    "Nếu bạn KHÔNG từng tự bật 2FA → hacker đã đổi MK trước khi bật → xử lý như Trường hợp 5.",
    "Trong lúc xác minh ID: lưu mọi email thông báo làm bằng chứng báo cảnh sát.",
    "Lấy lại acc: bật 2FA app của bạn NGAY + in/tải recovery codes.",
    "Recovery codes là cửa sau duy nhất hợp lệ khi mất authenticator — giữ như mật khẩu."],
  whatsapp: ["Trường hợp 7: WhatsApp bị hacker đặt PIN 2 lớp",
    "ĐỪNG spam đăng ký lại — nếu PIN đã bật mà không có email recovery, chờ đúng 7 ngày WhatsApp tự reset.",
    "Nếu hacker có gắn email recovery: vào hộp thư đó tìm link 'Đặt lại mã PIN' (hacker cũng có thể quên gỡ email).",
    "SIM còn trong máy: đăng ký lại bằng mã SMS, chọn 'Bỏ qua PIN' khi được hỏi, chờ đủ 7 ngày.",
    "Lại được: đặt PIN của bạn + email recovery chỉ bạn biết.",
    "Tuyệt chiêu số 1 của hacker: gọi giả danh 'hỗ trợ' hỏi mã 6 số — không đưa mã cho BẤT KỲ ai."],
  sim: ["Trường hợp 8: SIM bị chiếm quyền (SIM swap / mất sóng đột ngột)",
    "Mất sóng + không gọi được = khả năng cao SIM swap → gọi nhà mạng từ máy khác KHÓA chiều đổi chiều ngay.",
    "Ra quầy nhà mạng mang CMND xin cấp lại SIM chính chủ (thường miễn phí, giữ nguyên số).",
    "Nhận lại SMS: đổi mật khẩu các tài khoản quan trọng — bắt đầu từ email chính.",
    "Yêu cầu nhà mạng bật OTP/chống chuyển SIM tại quầy.",
    "Khi mất SIM, hacker thường chỉ chạm tới các acc dùng SMS — vì email chính còn khóa được thì còn cứu được hết."]
};

const LANGS = ["vi", "en", "zh", "ru", "ja"];
const DESC = {
  vi: "Bảo vệ & khôi phục tài khoản mạng xã hội: Facebook, Zalo, Instagram, WhatsApp, TikTok, Discord, X, Telegram, Google.",
  en: "Protect & recover social accounts: Facebook, Zalo, Instagram, WhatsApp, TikTok, Discord, X, Telegram, Google.",
  zh: "保护与恢复社交账号：Facebook、Zalo、Instagram、WhatsApp、TikTok、Discord、X、Telegram、Google。",
  ru: "Защита и восстановление соцсетей: Facebook, Zalo, Instagram, WhatsApp, TikTok, Discord, X, Telegram, Google.",
  ja: "ソーシャルアカウントの保護と復旧: Facebook、Zalo、Instagram、WhatsApp、TikTok、Discord、X、Telegram、Google。"
};

function wizKeys(vi) {
  const out = {};
  for (const sc in vi) {
    out["soc_wz_" + sc + "_t"] = vi[sc][0];
    out["soc_wz_" + sc + "_1"] = vi[sc][1];
    out["soc_wz_" + sc + "_2"] = vi[sc][2];
    out["soc_wz_" + sc + "_3"] = vi[sc][3];
    out["soc_wz_" + sc + "_4"] = vi[sc][4];
    out["soc_wz_" + sc + "_w"] = vi[sc][5];
  }
  return out;
}
const VI_FULL = Object.assign({}, K, wizKeys(VI_WIZ));

// Translations (same key set) — values per language.
const W = {
  en: {
    active_session: ["Case 1: One device still logged in",
      "Open Facebook right on the old still-logged-in device → Settings → Security → 'Where you're logged in'.",
      "Click 'Log Out of All Sessions' — the hacker is kicked out instantly.",
      "Set a strong new password, enable 2FA with an authenticator app, remove the hacker's email/phone.",
      "Turn on Login Alerts and revoke unknown authorized apps.",
      "Do this within 1 minute of discovery — the hacker also has a live session; if you're slow you lose it again."],
    still_pw: ["Case 2: You can still access the email/phone linked to the account",
      "In an incognito browser, open the platform's official identify/recovery page and enter your email/phone.",
      "Choose to send a code to your email/phone — if the platform still shows YOUR email, the hacker hasn't removed it.",
      "Enter the 6-digit code → change password immediately.",
      "After getting in: log out all sessions, add a NEW backup email, enable app 2FA.",
      "Only enter codes on the official domain — any other link asking for a code is a trap."],
    email_lost: ["Case 3: The hacker changed the recovery email",
      "Open the platform's official 'compromised account' page (button below).",
      "When asked for contact: provide a NEW email never linked to any account.",
      "If you can still access the OLD inbox — use the confirmation link inside the 'your email was changed' email BEFORE it expires.",
      "Otherwise prepare ID card/passport + selfie holding it for verification.",
      "The name on the ID must match the profile name. Blurry/cropped photos are failure reason #1."],
    phone_lost: ["Case 4: The hacker changed the phone number",
      "Try logging in with your email — they may not have changed it yet.",
      "If not: use the official recovery page, enter your OLD number to request a code.",
      "If the old number was removed: go to the carrier with your ID to reissue the SIM (owner only), lock SIM-swap protection.",
      "After recovery: switch 2FA to an app instead of SMS (SMS is vulnerable to SIM swap).",
      "SIM swaps usually happen at night — call your carrier and lock the number immediately if in doubt."],
    both_lost: ["Case 5: Lost both email and phone (everything changed)",
      "The hardest case, but 100% recoverable if the profile uses your real name.",
      "From an incognito browser → 'compromised account' page → choose 'No longer have access to these'.",
      "Upload both sides of your ID card/passport (sharp, uncropped) + a selfie holding the ID.",
      "Wait 24-72h. The reset link goes to the NEW email you provided. If rejected once, retry with a passport.",
      "Never send documents to an 'unlock service' — platforms never accept IDs through middlemen."],
    twofa: ["Case 6: Locked out by 2FA enabled on your account",
      "Try your 10 Recovery Codes saved when enabling 2FA (or stored in the Vault tab).",
      "If you NEVER enabled 2FA yourself → the hacker changed your password first → treat as Case 5.",
      "During ID verification: save every notification email as evidence for a police report.",
      "Once recovered: enable your own 2FA app NOW + print/save the recovery codes.",
      "Recovery codes are the only legitimate backdoor when you lose an authenticator — guard them like passwords."],
    whatsapp: ["Case 7: WhatsApp 2-step PIN set by a hacker",
      "Do NOT spam re-registration — if the PIN is set and no recovery email exists, wait exactly 7 days; WhatsApp resets it automatically.",
      "If the hacker linked a recovery email: check that inbox for a 'reset your PIN' link (they often forget to remove it).",
      "SIM still in your phone: re-register with the SMS code, choose 'Skip PIN' when asked, wait out the 7 days.",
      "Once back in: set YOUR PIN + a recovery email only you know.",
      "Hacker trick #1: a fake 'support' call asking for your 6-digit code — never give codes to anyone."],
    sim: ["Case 8: SIM takeover (SIM swap / sudden signal loss)",
      "Lost signal + can't call = likely SIM swap → call the carrier from another phone to lock port/swap protection NOW.",
      "Go to the carrier counter with your ID to reissue a genuine SIM (free, same number).",
      "Once SMS works again: change passwords for important accounts — start with the primary email.",
      "Ask the carrier to enable OTP/anti-SIM-swap protection at the counter.",
      "With a stolen SIM, hackers usually only reach SMS-based accounts — lock email first, the rest is salvageable."]
  }
};
W.en = wizKeys(W.en);
for (const k in K) W.en[k] = null; // placeholder, filled below manually

const EN_UI = {
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
const EN_FULL = Object.assign({}, EN_UI, W);
delete EN_FULL.en; Object.assign(EN_FULL, W.en);
module.exports = { VI_FULL, EN_FULL };
// Write VI & EN immediately
for (const [lang, dict] of [["vi", VI_FULL], ["en", EN_FULL]]) {
  const file = path.join(__dirname, "..", "..", "OS", "locales", lang + ".js");
  let c = fs.readFileSync(file, "utf8");
  const lines = Object.keys(dict).map(k => "    " + JSON.stringify(k) + ": " + JSON.stringify(dict[k]) + ",");
  const block = lines.join("\n") + "\n    ";
  if (!c.includes(MARKER)) { console.error("MARKER missing in " + lang); process.exit(1); }
  c = c.replace(MARKER, block + MARKER);
  c = c.replace(/"soc_desc": ".*?"/, JSON.stringify("soc_desc") + ": " + JSON.stringify(DESC[lang]));
  fs.writeFileSync(file, c, "utf8");
  console.log("wrote " + lang + " +" + Object.keys(dict).length + " keys");
}
