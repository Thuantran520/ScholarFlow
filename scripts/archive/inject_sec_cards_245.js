/* One-off (v2.4.5 part 5): inject cookie-reject toggle + trust card + cookie-audit card
   into tab-security markup (sidebar, popup, partial mirror) + add sec_trust_title key. */
const fs = require("fs");

const TOGGLE_SNIPPET = [
  '      <label class="switch-row" for="sec-toggle-cookiereject">',
  '        <div class="switch-row-left">',
  '          <span class="switch-row-title" data-i18n="sec_toggle_cookiereject">Tự từ chối banner Cookie</span>',
  '          <span class="switch-row-desc" data-i18n="sec_toggle_cookiereject_desc">Tự bấm \'Từ chối / Necessary only\' khi popup cookie xuất hiện — không bao giờ bấm Đồng ý thay bạn</span>',
  '        </div>',
  '        <span class="custom-switch"><input type="checkbox" id="sec-toggle-cookiereject"><span class="switch-slider"></span></span>',
  '      </label>'
].join("\n");

const CARDS = [
  '    <div class="feature-card" style="padding:10px 12px; margin-top:8px; border-left:3px solid #38bdf8;">',
  '      <div class="feature-title" style="margin-bottom:6px;" data-i18n="sec_trust_title">Đánh giá độ tin cậy trang web</div>',
  '      <div style="display:flex; gap:6px;">',
  '        <button id="btn-sec-trust" class="btn-text-small" style="background:rgba(56,189,248,0.08); border-color:rgba(56,189,248,0.25); color:#38bdf8;" data-i18n="sec_trust_btn">Đánh giá độ tin cậy trang này</button>',
  '      </div>',
  '      <div id="sec-trust-out" style="margin-top:6px; display:flex; flex-direction:column; gap:4px;"></div>',
  '    </div>',
  '    <div class="feature-card" style="padding:10px 12px; margin-top:8px; border-left:3px solid #a78bfa;">',
  '      <div class="feature-title" style="margin-bottom:6px;" data-i18n="sec_ca_title">Kiểm tra an toàn cookie (domain hiện tại)</div>',
  '      <div style="display:flex; gap:6px; flex-wrap:wrap;">',
  '        <button id="btn-sec-cookie-audit" class="btn-text-small" style="background:rgba(167,139,250,0.1); border-color:rgba(167,139,250,0.3); color:#a78bfa;" data-i18n="sec_ca_btn">Audit cookie</button>',
  '        <button id="btn-sec-cookie-delall" class="btn-text-small" style="background:rgba(249,115,22,0.1); border-color:rgba(249,115,22,0.3); color:#fb923c;" data-i18n="sec_ca_del_all">Xóa hết tracker/analytics</button>',
  '      </div>',
  '      <div id="sec-cookie-out" style="margin-top:6px; display:flex; flex-direction:column; gap:4px;"></div>',
  '    </div>'
].join("\n");

const MARK_ANCHOR = '<input type="checkbox" id="sec-toggle-autoblock">';
const SCAN_ANCHOR = 'id="sec-scan-out"';
const PW_ANCHOR = 'sec-toggle-pasteguard';

for (const file of ["OS/html/sidebar.html", "OS/html/popup.html", "OS/html/partials/tabs/security.html"]) {
  let c = fs.readFileSync(file, "utf8");
  if (c.includes("sec-toggle-cookiereject")) { console.log(file + " already"); continue; }
  // 1) toggle after autoblock label
  const i1 = c.indexOf(MARK_ANCHOR);
  if (i1 < 0) throw new Error(file + ": autoblock anchor missing");
  const labelClose = c.indexOf("      </label>", i1);
  if (labelClose < 0) throw new Error(file + ": label close missing");
  const at = labelClose + "      </label>".length;
  c = c.slice(0, at) + "\n" + TOGGLE_SNIPPET + c.slice(at);
  // 2) cards: right before the pw card (which was appended earlier after sec-scan-out)
  const i2 = c.indexOf(PW_ANCHOR);
  if (i2 < 0) throw new Error(file + ": pasteguard card anchor missing");
  const cardStart = c.lastIndexOf("    <div class=\"feature-card\"", i2);
  if (cardStart < 0) throw new Error(file + ": feature-card start missing");
  c = c.slice(0, cardStart) + CARDS + "\n" + c.slice(cardStart);
  fs.writeFileSync(file, c);
  console.log(file + ": inserted");
}

// sec_trust_title key in all 5 locales (insert before marker)
const MARKER = "/* i18n: content_* block start - generated, do not edit */";
const T = {
  vi: "Đánh giá độ tin cậy trang web", en: "Site trust report", zh: "网站可信度评估",
  ru: "Отчёт доверия сайта", ja: "サイト信頼性レポート"
};
for (const lang of ["vi", "en", "zh", "ru", "ja"]) {
  const f = "OS/locales/" + lang + ".js";
  let c = fs.readFileSync(f, "utf8");
  if (c.includes('"sec_trust_title"')) continue;
  c = c.replace(MARKER, '    "sec_trust_title": ' + JSON.stringify(T[lang]) + ",\n    " + MARKER);
  fs.writeFileSync(f, c);
  console.log(f + ": +sec_trust_title");
}
console.log("ALL GOOD");
