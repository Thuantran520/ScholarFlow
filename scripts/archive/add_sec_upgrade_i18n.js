/* One-off (v2.4.5 part 4): Security upgrades i18n — trust report, cookie auto-reject, cookie audit. */
const fs = require("fs");
const path = require("path");
const MARKER = "/* i18n: content_* block start - generated, do not edit */";
const D = {
  vi: {
    sec_toggle_cookiereject: "Tự từ chối banner Cookie",
    sec_toggle_cookiereject_desc: "Tự bấm 'Từ chối / Necessary only' khi popup cookie xuất hiện — không bao giờ bấm Đồng ý thay bạn",
    sec_trust_btn: "Đánh giá độ tin cậy trang này",
    sec_trust_official: "✓ Domain chính thức: {0}",
    sec_trust_typo: "❌ Giả mạo '{0}' (typo/homograph)",
    sec_trust_puny: "❌ Domain punycode — có thể tấn công đồng hình",
    sec_trust_rule: "❌ Chứa pattern lừa đảo: {0}",
    sec_trust_host: "❌ Nằm trong danh sách host phishing",
    sec_trust_http: "⚠️ HTTP không mã hóa — dễ bị can thiệp",
    sec_trust_unknown: "⚠️ Site lạ, không có tín hiệu giả mạo rõ — vẫn thận trọng",
    sec_ca_title: "Kiểm tra an toàn cookie (domain hiện tại)",
    sec_ca_btn: "Audit cookie",
    sec_ca_none: "Không tìm thấy cookie nào cho domain này.",
    sec_ca_summary: "{n} cookie • {r} rủi ro • {t} theo dõi",
    sec_ca_ad: "quảng cáo/tracker", sec_ca_an: "phân tích", sec_ca_fn: "chức năng/khác",
    sec_ca_risk: "thiếu {0}",
    sec_ca_del: "Xóa", sec_ca_del_all: "Xóa hết tracker/analytics",
    sec_ca_deleted: "✓ Đã xóa {0} cookie",
    sec_ca_ok: "✓ Không có tracker/analytics trong số cookie hiện tại"
  },
  en: {
    sec_toggle_cookiereject: "Auto-reject cookie banners",
    sec_toggle_cookiereject_desc: "Clicks 'Reject / Necessary only' on cookie popups automatically — never clicks Accept for you",
    sec_trust_btn: "Trust report for this page",
    sec_trust_official: "✓ Official domain: {0}",
    sec_trust_typo: "❌ Impersonates '{0}' (typo/homograph)",
    sec_trust_puny: "❌ Punycode domain — possible homograph attack",
    sec_trust_rule: "❌ Contains phishing pattern: {0}",
    sec_trust_host: "❌ Host is in the phishing blocklist",
    sec_trust_http: "⚠️ Unencrypted HTTP — tamper-prone",
    sec_trust_unknown: "⚠️ Unknown site, no obvious impersonation signals — stay careful",
    sec_ca_title: "Cookie safety audit (current domain)",
    sec_ca_btn: "Audit cookies",
    sec_ca_none: "No cookies found for this domain.",
    sec_ca_summary: "{n} cookies • {r} risky • {t} tracking",
    sec_ca_ad: "ads/tracker", sec_ca_an: "analytics", sec_ca_fn: "functional/other",
    sec_ca_risk: "missing {0}",
    sec_ca_del: "Delete", sec_ca_del_all: "Delete all trackers/analytics",
    sec_ca_deleted: "✓ Deleted {0} cookies",
    sec_ca_ok: "✓ No tracker/analytics cookies in the current set"
  },
  zh: {
    sec_toggle_cookiereject: "自动拒绝 Cookie 横幅",
    sec_toggle_cookiereject_desc: "Cookie 弹窗出现时自动点“拒绝/仅必要”——绝不替你点同意",
    sec_trust_btn: "本页可信度评估",
    sec_trust_official: "✓ 官方域名：{0}",
    sec_trust_typo: "❌ 冒充「{0}」（形近域名/同形异义）",
    sec_trust_puny: "❌ Punycode 域名——可能同形攻击",
    sec_trust_rule: "❌ 含钓鱼模式：{0}",
    sec_trust_host: "❌ 域名在钓鱼黑名单",
    sec_trust_http: "⚠️ 未加密 HTTP——易被篡改",
    sec_trust_unknown: "⚠️ 陌生站点，无明显假冒信号——仍需小心",
    sec_ca_title: "Cookie 安全审计（当前域名）",
    sec_ca_btn: "审计 Cookie",
    sec_ca_none: "未发现该域名的 Cookie。",
    sec_ca_summary: "{n} 个 Cookie • {r} 有风险 • {t} 跟踪",
    sec_ca_ad: "广告/跟踪", sec_ca_an: "分析", sec_ca_fn: "功能/其他",
    sec_ca_risk: "缺少 {0}",
    sec_ca_del: "删除", sec_ca_del_all: "删除全部跟踪/分析",
    sec_ca_deleted: "✓ 已删除 {0} 个 Cookie",
    sec_ca_ok: "✓ 当前 Cookie 中无跟踪/分析项"
  },
  ru: {
    sec_toggle_cookiereject: "Автоотказ cookie-баннеров",
    sec_toggle_cookiereject_desc: "Автоматически нажимает «Отклонить / только необходимые» — никогда не нажимает «Принять» за вас",
    sec_trust_btn: "Отчёт доверия для страницы",
    sec_trust_official: "✓ Официальный домен: {0}",
    sec_trust_typo: "❌ Выдаёт себя за «{0}» (опечатка/омограф)",
    sec_trust_puny: "❌ Punycode-домен — возможна омограф-атака",
    sec_trust_rule: "❌ Фишинг-паттерн: {0}",
    sec_trust_host: "❌ Хост в блок-листе фишинга",
    sec_trust_http: "⚠️ Нешифрованный HTTP — риск подмены",
    sec_trust_unknown: "⚠️ Неизвестный сайт, явных признаков подмены нет — будьте осторожны",
    sec_ca_title: "Аудит cookie (текущий домен)",
    sec_ca_btn: "Проверить cookie",
    sec_ca_none: "Cookie для этого домена не найдены.",
    sec_ca_summary: "{n} cookie • {r} рискованных • {t} отслеживающих",
    sec_ca_ad: "реклама/трекер", sec_ca_an: "аналитика", sec_ca_fn: "функциональные/другие",
    sec_ca_risk: "нет {0}",
    sec_ca_del: "Удалить", sec_ca_del_all: "Удалить все трекеры/аналитику",
    sec_ca_deleted: "✓ Удалено {0} cookie",
    sec_ca_ok: "✓ Трекерских/аналитических cookie в наборе нет"
  },
  ja: {
    sec_toggle_cookiereject: "Cookie バナー自動拒否",
    sec_toggle_cookiereject_desc: "Cookie ポップアップで「拒否/必須のみ」を自動クリック — 同意は絶対に押しません",
    sec_trust_btn: "このページの信頼性レポート",
    sec_trust_official: "✓ 公式ドメイン: {0}",
    sec_trust_typo: "❌ 「{0}」の偽装 (タイポ/ホモグラフ)",
    sec_trust_puny: "❌ Punycode ドメイン — ホモグラフ攻撃の可能性",
    sec_trust_rule: "❌ フィッシングパターン: {0}",
    sec_trust_host: "❌ ブロックリスト登録ホスト",
    sec_trust_http: "⚠️ 無暗号化 HTTP — 改ざん危険",
    sec_trust_unknown: "⚠️ 不明サイト、明らかな偽装兆候なし — 注意",
    sec_ca_title: "Cookie 安全監査 (現在のドメイン)",
    sec_ca_btn: "Cookie 監査",
    sec_ca_none: "このドメインの Cookie はありません。",
    sec_ca_summary: "{n} 個 • リスク {r} • トラッキング {t}",
    sec_ca_ad: "広告/トラッカー", sec_ca_an: "アナリティクス", sec_ca_fn: "機能/その他",
    sec_ca_risk: "{0} 無し",
    sec_ca_del: "削除", sec_ca_del_all: "トラッカー類を一括削除",
    sec_ca_deleted: "✓ {0} 個削除",
    sec_ca_ok: "✓ 現在の Cookie にトラッカー/アナリティクスなし"
  }
};
for (const lang of ["vi", "en", "zh", "ru", "ja"]) {
  const dict = D[lang];
  const file = path.join(__dirname, "..", "..", "OS", "locales", lang + ".js");
  let c = fs.readFileSync(file, "utf8");
  const lines = Object.keys(dict).map((k) => "    " + JSON.stringify(k) + ": " + JSON.stringify(dict[k]) + ",");
  c = c.replace(MARKER, lines.join("\n") + "\n    " + MARKER);
  fs.writeFileSync(file, c, "utf8");
  console.log(lang + " +" + lines.length);
}
