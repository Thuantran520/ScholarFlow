const fs = require('fs');
const path = require('path');

global.window = global;
require('../OS/locales/vi.js');
require('../OS/locales/en.js');
require('../OS/locales/zh.js');
require('../OS/locales/ru.js');
require('../OS/locales/ja.js');

const vi = global.I18N_VI;
const en = global.I18N_EN;
const zh = global.I18N_ZH;
const ru = global.I18N_RU;
const ja = global.I18N_JA;

// 1. Fix known buggy keys in ru and en
en["pref_saved"] = "✓ Saved!";
ru["toast_cookie_import_error"] = "⚠️ Недействительный JSON-файл или ошибка импорта cookie!";
ru["toast_cookie_import_success"] = "✓ Успешно импортировано {0}/{1} cookie!";
ru["toast_cookie_export_no_api"] = "⚠️ Браузер не поддерживает Cookie API!";
ru["toast_cookie_export_empty"] = "⚠️ На этой странице нет файлов cookie для экспорта!";
ru["toast_cookie_export_error"] = "⚠️ Ошибка при экспорте cookie!";
ru["toast_cookie_export_success"] = "✓ Экспортировано {0} cookie!";
ru["toast_cookie_export_no_url"] = "⚠️ Не найден URL текущей страницы!";
ru["📸 Đang tối ưu và chụp thẻ đối tượng..."] = "📸 Оптимизация и захват элемента...";
ru["🎯 Hãy rê chuột và click vào bảng hoặc thẻ cần chụp!"] = "🎯 Наведите курсор и нажмите на нужную таблицу или блок!";

// Nav sync improvements
zh["nav_tabmgr"] = "标签页管理";
zh["tabmgr_title"] = "标签页管理";
zh["nav_testhelper"] = "测试助手";
zh["th_title"] = "测试助手 PRO";
zh["nav_security"] = "安全防护";
zh["sec_title"] = "安全中心";
zh["us_editor_studio"] = "用户脚本工作室";

ru["nav_tabmgr"] = "Вкладки";
ru["tabmgr_title"] = "Менеджер вкладок";
ru["nav_testhelper"] = "Помощник тестов";
ru["th_title"] = "Помощник тестов PRO";
ru["nav_security"] = "Безопасность";
ru["sec_title"] = "Безопасность";
ru["us_editor_studio"] = "Студия скриптов";

ja["nav_tabmgr"] = "タブ管理";
ja["tabmgr_title"] = "タブマネージャー";
ja["nav_testhelper"] = "テスト補助";
ja["th_title"] = "テストアシスタント PRO";
ja["nav_security"] = "セキュリティ";
ja["sec_title"] = "セキュリティ";
ja["us_editor_studio"] = "ユーザースクリプト スタジオ";

const EXTRA_KEYS = {
  "us_new_script_default": {
    vi: "Kịch bản mới",
    en: "New Script",
    zh: "新脚本",
    ru: "Новый скрипт",
    ja: "新規スクリプト"
  },
  "us_untitled_default": {
    vi: "Không tên",
    en: "Untitled",
    zh: "未命名",
    ru: "Без названия",
    ja: "無題"
  },
  "us_templates_modal_title": {
    vi: "Chọn mẫu script có sẵn",
    en: "Choose preset template",
    zh: "选择预设脚本模板",
    ru: "Выбрать готовый шаблон",
    ja: "テンプレートを選択"
  },
  "us_tpl_darkmode": {
    vi: "Dark Mode — Tất cả trang",
    en: "Dark Mode — All Pages",
    zh: "全局深色模式",
    ru: "Темная тема — Все сайты",
    ja: "ダークモード — すべてのページ"
  },
  "us_tpl_yt_ads": {
    vi: "Ẩn Quảng cáo YouTube",
    en: "Block YouTube Ads",
    zh: "屏蔽 YouTube 广告",
    ru: "Блокировка рекламы YouTube",
    ja: "YouTube 広告ブロック"
  },
  "us_tpl_yt_dislike": {
    vi: "Return YouTube Dislike (GM_xmlhttpRequest)",
    en: "Return YouTube Dislike (GM_xmlhttpRequest)",
    zh: "恢复 YouTube 不喜欢计数 (GM_xmlhttpRequest)",
    ru: "Возврат дизлайков YouTube (GM_xmlhttpRequest)",
    ja: "YouTube 低評価ボタンを復元 (GM_xmlhttpRequest)"
  },
  "us_tpl_translator": {
    vi: "Dịch văn bản đã chọn (Mini Translator)",
    en: "Selected Text Translator (Mini Translator)",
    zh: "划词翻译 (Mini Translator)",
    ru: "Перевод выделенного текста (Mini Translator)",
    ja: "選択テキスト翻訳 (Mini Translator)"
  },
  "us_tpl_bypass_redirect": {
    vi: "Bỏ qua trang đệm chuyển hướng",
    en: "Bypass Link Redirects",
    zh: "跳过重定向中转页面",
    ru: "Пропуск промежуточных ссылок",
    ja: "リダイレクト中継ページをスキップ"
  },
  "us_tpl_unlock_copy": {
    vi: "Mở khóa Copy & Chuột phải",
    en: "Unlock Copy & Right Click",
    zh: "解除右键与复制限制",
    ru: "Разблокировка копирования и правой кнопки мыши",
    ja: "コピーと右クリックの制限を解除"
  },
  "us_tpl_smooth_scroll": {
    vi: "Cuộn trang mượt hơn",
    en: "Smooth Scrolling",
    zh: "平滑滚动页面",
    ru: "Плавная прокрутка",
    ja: "スムーズスクロール"
  },
  "us_tpl_show_pw": {
    vi: "Hiện mật khẩu đã nhập",
    en: "Show Password Toggle",
    zh: "显示已输入的密码",
    ru: "Показать введенный пароль",
    ja: "入力済みパスワードの表示切替"
  },
  "us_tpl_auto_cookie": {
    vi: "Tự động bấm nút 'Đồng ý Cookie'",
    en: "Auto-Accept Cookie Consent",
    zh: "自动接受 Cookie 弹窗",
    ru: "Авто-принятие согласия на Cookie",
    ja: "Cookie 同意バナーを自動承諾"
  }
};

for (const [k, obj] of Object.entries(EXTRA_KEYS)) {
  vi[k] = obj.vi;
  en[k] = obj.en;
  zh[k] = obj.zh;
  ru[k] = obj.ru;
  ja[k] = obj.ja;
}

function writeLocale(lang, dict, varName) {
  const filePath = path.join(__dirname, '..', 'OS', 'locales', lang + '.js');
  const keys = Object.keys(dict);
  const lines = ['window.' + varName + ' = {'];
  keys.forEach((k, idx) => {
    const comma = idx === keys.length - 1 ? '' : ',';
    lines.push('  ' + JSON.stringify(k) + ': ' + JSON.stringify(dict[k]) + comma);
  });
  lines.push('};');
  lines.push('');
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('Wrote', lang + '.js with', keys.length, 'keys');
}

writeLocale('vi', vi, 'I18N_VI');
writeLocale('en', en, 'I18N_EN');
writeLocale('zh', zh, 'I18N_ZH');
writeLocale('ru', ru, 'I18N_RU');
writeLocale('ja', ja, 'I18N_JA');

