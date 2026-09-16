/* One-off (v2.4.5 part 7): password-length stepper markup + deep-trust i18n + CSS */
const fs = require("fs");
const STEPPER = [
  '        <div class="sec-pw-stepper" title="Độ dài" data-i18n-title="sec_pw_len" role="group">',
  '          <button type="button" class="sec-pw-step" id="sec-pw-minus" aria-label="-4">−</button>',
  '          <span class="sec-pw-lenval" id="sec-pw-len-val">20</span>',
  '          <button type="button" class="sec-pw-step" id="sec-pw-plus" aria-label="+4">+</button>',
  '        </div>'
].join("\n");
for (const file of ["OS/html/sidebar.html", "OS/html/popup.html", "OS/html/partials/tabs/security.html"]) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const i = lines.findIndex((l) => l.includes('id="sec-pw-len"'));
  if (i < 0) {
    if (lines.some((l) => l.includes('id="sec-pw-minus"'))) { console.log(file + " already steppers"); continue; }
    console.error(file + ": sec-pw-len line not found"); process.exit(1);
  }
  lines.splice(i, 1, STEPPER);
  fs.writeFileSync(file, lines.join("\n"));
  console.log(file + ": stepper inserted");
}

const MARKER = "/* i18n: content_* block start - generated, do not edit */";
const D = {
  vi: {
    sec_trust_score: "Mức rủi ro: {0}/10",
    sec_trust_brand_path: "Tên thương hiệu '{0}' nằm trong đường dẫn URL",
    sec_trust_title_mismatch: "❌ Trang tự xưng '{0}' nhưng tên miền không phải chính chủ",
    sec_trust_pwform: "❌ Có ô nhập mật khẩu trên trang giả '{0}'",
    sec_trust_formaction: "❌ Form gửi dữ liệu tới domain lạ: {0}",
    sec_trust_shortener: "⚠️ Link rút gọn/redirect — chưa thấy đích thật",
    sec_trust_entropy: "⚠️ Domain chuỗi ngẫu nhiên (đăng ký hàng loạt)",
    sec_trust_hyphens: "⚠️ Nhiều dấu gạch ngang trong domain",
    sec_trust_at: "❌ Ký tự @ trong URL (mẹo đánh lừa nhìn domain)",
    sec_trust_port: "⚠️ Cổng bất thường: {0}",
    sec_trust_unicode: "❌ Unicode/punycode trong domain (tấn công đồng hình)"
  },
  en: {
    sec_trust_score: "Risk level: {0}/10",
    sec_trust_brand_path: "Brand '{0}' appears inside the URL path",
    sec_trust_title_mismatch: "❌ Page claims to be '{0}' but the domain isn't official",
    sec_trust_pwform: "❌ Password input on a fake '{0}' page",
    sec_trust_formaction: "❌ Form posts data to a foreign domain: {0}",
    sec_trust_shortener: "⚠️ Shortened/redirect link — real destination hidden",
    sec_trust_entropy: "⚠️ Random-string domain (bulk-registered)",
    sec_trust_hyphens: "⚠️ Many hyphens in the domain",
    sec_trust_at: "❌ '@' in URL (domain-spoofing trick)",
    sec_trust_port: "⚠️ Unusual port: {0}",
    sec_trust_unicode: "❌ Unicode/punycode domain (homograph attack)"
  },
  zh: {
    sec_trust_score: "风险等级：{0}/10",
    sec_trust_brand_path: "品牌「{0}」出现在 URL 路径中",
    sec_trust_title_mismatch: "❌ 页面自称「{0}」但域名非官方",
    sec_trust_pwform: "❌ 假冒「{0}」页面存在密码输入框",
    sec_trust_formaction: "❌ 表单提交到外部域名：{0}",
    sec_trust_shortener: "⚠️ 短链/跳转链接——真实地址未知",
    sec_trust_entropy: "⚠️ 随机字符串域名（批量注册特征）",
    sec_trust_hyphens: "⚠️ 域名含多个连字符",
    sec_trust_at: "❌ URL 内含 @（域名伪装技巧）",
    sec_trust_port: "⚠️ 异常端口：{0}",
    sec_trust_unicode: "❌ Unicode/punycode 域名（同形异义攻击）"
  },
  ru: {
    sec_trust_score: "Уровень риска: {0}/10",
    sec_trust_brand_path: "Бренд «{0}» в пути URL",
    sec_trust_title_mismatch: "❌ Страница выдаёт себя за «{0}», домен не официальный",
    sec_trust_pwform: "❌ Поле пароля на поддельной странице «{0}»",
    sec_trust_formaction: "❌ Форма отправляет данные на чужой домен: {0}",
    sec_trust_shortener: "⚠️ Ссылка-сокращатель — реальное адрес скрыт",
    sec_trust_entropy: "⚠️ Домен из случайных символов (масс-регистрация)",
    sec_trust_hyphens: "⚠️ Много дефисов в домене",
    sec_trust_at: "❌ Символ @ в URL (трюк подмены домена)",
    sec_trust_port: "⚠️ Нестандартный порт: {0}",
    sec_trust_unicode: "❌ Unicode/punycode-домен (омограф-атака)"
  },
  ja: {
    sec_trust_score: "リスク度: {0}/10",
    sec_trust_brand_path: "ブランド「{0}」がURLパス内に存在",
    sec_trust_title_mismatch: "❌ ページは「{0}」を騙るがドメインは公式外",
    sec_trust_pwform: "❌ 偽「{0}」ページにパスワード入力欄あり",
    sec_trust_formaction: "❌ フォームが外部ドメインへ送信: {0}",
    sec_trust_shortener: "⚠️ 短縮/リダイレクトリンク — 実体不明",
    sec_trust_entropy: "⚠️ ランダム文字列ドメイン (大量登録)",
    sec_trust_hyphens: "⚠️ ドメインにハイフン多数",
    sec_trust_at: "❌ URL の @ 表記 (ドメイン偽装手口)",
    sec_trust_port: "⚠️ 異常ポート: {0}",
    sec_trust_unicode: "❌ Unicode/punycode ドメイン (同形異字攻撃)"
  }
};
for (const lang of ["vi", "en", "zh", "ru", "ja"]) {
  const file = "OS/locales/" + lang + ".js";
  let c = fs.readFileSync(file, "utf8");
  if (c.includes('"sec_trust_score"')) continue;
  const dict = D[lang];
  const lines = Object.keys(dict).map((k) => "    " + JSON.stringify(k) + ": " + JSON.stringify(dict[k]) + ",");
  c = c.replace(MARKER, lines.join("\n") + "\n    " + MARKER);
  fs.writeFileSync(file, c);
  console.log(file + ": +" + lines.length + " keys");
}

const css = `
/* Trust meter + password stepper (v2.4.5) */
.sec-trust-meter { height: 6px; border-radius: 4px; background: rgba(148,163,184,0.15); overflow: hidden; margin: 2px 0 4px; }
.sec-trust-meter span { display: block; height: 100%; border-radius: 4px; transition: width 0.25s ease; }
.sec-pw-stepper { display: inline-flex; align-items: center; gap: 2px; background: rgba(15,23,42,0.65); border: 1px solid var(--card-border); border-radius: 999px; padding: 2px; }
.sec-pw-step { width: 22px; height: 22px; border-radius: 50%; border: none; background: rgba(56,189,248,0.12); color: #38bdf8; font-size: 13px; font-weight: 700; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s ease, transform 0.1s ease; }
.sec-pw-step:hover { background: rgba(56,189,248,0.28); }
.sec-pw-step:active { transform: scale(0.9); }
.sec-pw-lenval { min-width: 30px; text-align: center; font-size: 11.5px; font-weight: 700; color: #e2e8f0; font-family: ui-monospace, monospace; }
`;
let scss = fs.readFileSync("OS/css/tabs/security.css", "utf8");
if (!scss.includes("sec-pw-stepper")) { scss = scss.replace(/\s*$/, "\n") + css; fs.writeFileSync("OS/css/tabs/security.css", scss); }
console.log("css ok");
console.log("ALL GOOD");
