/* One-off (v2.4.5 part 12): Dark Mode gets its OWN tab + plan CSS polish. */
const fs = require("fs");
const MARKER = "/* i18n: content_* block start - generated, do not edit */";
const DM_TAB = fs.readFileSync("scripts/archive/dm_tab_245.html", "utf8").replace(/\r\n/g, "\n");

// old card block inserted in part 11 (exact text)
const OLD_DM_CARD = [
'    <div class="feature-card" style="padding:10px 12px; margin-top:8px; border-left:3px solid #818cf8;">',
'      <label class="switch-row" for="sec-dm-toggle">',
'        <div class="switch-row-left">',
'          <span class="switch-row-title" data-i18n="dm_title">Dark Mode cho trang web</span>',
'          <span class="switch-row-desc" data-i18n="dm_desc">Tối giao diện mọi trang web bằng bộ lọc nghịch đảo màu — dịu mắt ban đêm, chạy 100% cục bộ</span>',
'        </div>',
'        <span class="custom-switch"><input type="checkbox" id="sec-dm-toggle"><span class="switch-slider"></span></span>',
'      </label>',
'      <div style="display:flex; gap:6px; align-items:center; margin-bottom:8px;">',
'        <select class="form-control" id="sec-dm-mode" style="flex:1; font-size:11px; padding:5px 6px;">',
'          <option value="all" data-i18n="dm_mode_all">Tối mọi trang (trừ trang loại trừ)</option>',
'          <option value="selected" data-i18n="dm_mode_selected">Chỉ tối trang được chọn</option>',
'        </select>',
'      </div>',
'      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">',
'        <button id="btn-sec-dm-site" class="btn-text-small" style="background:rgba(129,140,248,0.12); border-color:rgba(129,140,248,0.35); color:#818cf8;" data-i18n="dm_this_on">🌙 Tối trang này</button>',
'        <span id="sec-dm-status" style="font-size:10px; color:var(--text-muted);"></span>',
'      </div>',
'    </div>'
].join("\n");

const NAV_BTN = [
'      <button class="main-nav-btn" data-target="tab-dm" title="Dark Mode cho mọi trang web" data-i18n-title="tip_tab_dm">',
'        <span class="nav-icon" id="icon-tab-dm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg></span>',
'        <span class="nav-label" data-i18n="nav_dm">Dark</span>',
'      </button>'
].join("\n");

// 1) main-nav button (before </div> of nav-wrapper, after social button)
{
  const f = "OS/html/partials/main-nav.html";
  let c = fs.readFileSync(f, "utf8");
  if (!c.includes('data-target="tab-dm"')) {
    const i = c.indexOf('data-target="tab-social"');
    const btnEnd = c.indexOf("</button>", i) + "</button>".length;
    c = c.slice(0, btnEnd) + "\n" + NAV_BTN + c.slice(btnEnd);
    fs.writeFileSync(f, c);
    console.log("main-nav: dm button added");
  }
}

// 2) shells: remove old card, insert tab-dm section before footer, add css link
for (const file of ["OS/html/sidebar.html", "OS/html/popup.html"]) {
  let c = fs.readFileSync(file, "utf8");
  if (c.includes(OLD_DM_CARD)) c = c.split(OLD_DM_CARD + "\n").join("");
  if (!c.includes('id="tab-dm"')) {
    const foot = c.indexOf('  <div class="footer-trust-bar">');
    if (foot < 0) throw new Error(file + ": footer missing");
    c = c.slice(0, foot) + DM_TAB + c.slice(foot);
  }
  if (!c.includes("tabs/darkmode.css")) {
    const cl = '  <link rel="stylesheet" href="../css/tabs/social-protection.css">';
    if (!c.includes(cl)) throw new Error(file + ": css anchor missing");
    c = c.replace(cl, cl + '\n  <link rel="stylesheet" href="../css/tabs/darkmode.css">');
  }
  fs.writeFileSync(file, c);
  console.log(file + ": dm tab installed");
}

// 3) partials: social.html mirror exists; create darkmode.html mirror; strip card from security.html
{
  const inner = DM_TAB.replace(/^  <div id="tab-dm" class="tab-section">\n/, "").replace(/\n  <\/div>\s*\n?$/, "\n");
  fs.writeFileSync("OS/html/partials/tabs/darkmode.html", inner);
  console.log("partials/tabs/darkmode.html written");
  let p = fs.readFileSync("OS/html/partials/tabs/security.html", "utf8");
  if (p.includes(OLD_DM_CARD)) p = p.split(OLD_DM_CARD + "\n").join("").replace(/[\s]+$/, "\n");
  fs.writeFileSync("OS/html/partials/tabs/security.html", p);
  console.log("partials/tabs/security.html cleaned");
}

// 4) CSS module file
fs.writeFileSync("OS/css/tabs/darkmode.css", `/* Dark Mode console tab + plan polish (v2.4.5) */
#tab-dm .dm-card { padding:10px 12px; }
.dm-pill { font-size:10px; font-weight:700; padding:2px 8px; border-radius:12px; border:1px solid var(--card-border); color:#94a3b8; background:rgba(15,23,42,0.5); white-space:nowrap; }
.dm-pill-on { color:#818cf8; border-color:rgba(129,140,248,0.4); background:rgba(129,140,248,0.12); }
.dm-host-row { display:flex; align-items:center; justify-content:space-between; gap:6px; flex-wrap:wrap; }
.dm-host { font-size:11px; font-weight:700; color:#e2e8f0; font-family:ui-monospace, monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px; }
.dm-host-btns { display:flex; gap:6px; }
.btn-text-small:disabled { opacity:0.4; cursor:not-allowed; }
.btn-text-small.is-active { background:rgba(245,158,11,0.18) !important; border-color:rgba(245,158,11,0.45) !important; color:#fbbf24 !important; }
.dm-scope-row { display:flex; gap:6px; }
.dm-scope-row .form-control { flex:1; font-size:11px; padding:5px 8px; min-width:0; }
.dm-bright-row { display:flex; align-items:center; gap:8px; }
.dm-bright-l { font-size:10.5px; color:var(--text-muted); font-weight:600; }
#sec-dm-bright { flex:1; accent-color:#f59e0b; height:4px; cursor:pointer; }
.dm-bright-v { font-size:10.5px; color:#fbbf24; font-weight:700; min-width:34px; text-align:right; font-family:ui-monospace, monospace; }
.dm-excl-list { display:flex; flex-wrap:wrap; gap:6px; }
.dm-chip { font-size:10.5px; color:#cbd5e1; background:rgba(15,23,42,0.6); border:1px solid var(--card-border); border-radius:999px; padding:3px 9px; cursor:pointer; display:inline-flex; align-items:center; transition:border-color 0.15s ease; }
.dm-chip:hover { border-color:#f87171; }
.dm-chip b { font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px; }
.dm-excl-empty { font-size:10.5px; color:#64748b; }

/* --- Smart-plan card visual polish (ids/tests untouched) --- */
.pm-plan-grid { gap:6px; }
.pm-plan-field { background:rgba(15,23,42,0.45); border:1px solid var(--card-border); border-radius:8px; padding:6px 8px; }
.pm-plan-field.pm-plan-check { background:transparent; border:none; padding:2px 2px 0; }
#pm-plan-result { background:linear-gradient(160deg, rgba(56,189,248,0.10), rgba(15,23,42,0.6) 60%) !important; }
#pm-plan-summary { font-size:12.5px; color:#bae6fd; }
#pm-plan-timeline > span { border:1px solid rgba(255,255,255,0.12); box-shadow:0 1px 4px rgba(0,0,0,0.25); border-radius:999px; }
#pm-plan-endclock { display:inline-block; background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.3); border-radius:6px; padding:3px 8px; }
.pm-preset-row { margin-top:2px; }
`);
console.log("css/tabs/darkmode.css written");

// 5) i18n
const K = {
  vi: {
    nav_dm: "Dark", tip_tab_dm: "Dark Mode cho mọi trang web",
    dm_page_desc: "Tối mọi trang web như extension darkmode chuyên nghiệp: tự nhận diện trang đã tối để bỏ qua, ⚡ ép tối trang không hỗ trợ, chỉnh độ sáng & gam màu. 100% cục bộ.",
    dm_master_title: "Bật Dark Mode", dm_master_desc: "Áp dụng bộ lọc nghịch đảo màu lên trang web",
    dm_auto: "Bỏ qua trang đã có nền tối", dm_auto_desc: "Tự phát hiện site dark-native (GitHub, YouTube...) để không invert 2 lần",
    dm_cur_title: "Tab đang mở", dm_appearance: "Gam màu & độ sáng", dm_scope_title: "Phạm vi",
    dm_theme: "Gam màu", dm_theme_std: "Chuẩn", dm_theme_dim: "Dịu mắt", dm_theme_warm: "Ấm áp", dm_theme_contrast: "Rõ nét",
    dm_bright: "Độ sáng", dm_excl_title: "Danh sách loại trừ / đã chọn", dm_excl_empty: "Chưa có trang nào.",
    dm_clear: "Xóa", dm_hint: "Trang nào bị lệch màu sau khi invert? Bấm ☀️ để loại trừ — lưu cục bộ theo hostname.",
    dm_force_on: "⚡ Ép tối", dm_force_off: "⚡ Bỏ ép", dm_host_none: "Tab không phải trang web"
  },
  en: {
    nav_dm: "Dark", tip_tab_dm: "Dark Mode for every website",
    dm_page_desc: "Professional dark mode for all sites: auto-skips already-dark pages, ⚡force-dark for sites without dark support, brightness & color-tone tuning. 100% local.",
    dm_master_title: "Enable Dark Mode", dm_master_desc: "Apply color-inversion filter on websites",
    dm_auto: "Skip already dark sites", dm_auto_desc: "Auto-detects dark-native pages (GitHub, YouTube...) to avoid double inversion",
    dm_cur_title: "Current tab", dm_appearance: "Tone & brightness", dm_scope_title: "Scope",
    dm_theme: "Color tone", dm_theme_std: "Standard", dm_theme_dim: "Dim", dm_theme_warm: "Warm", dm_theme_contrast: "Crisp",
    dm_bright: "Brightness", dm_excl_title: "Exclusions / selected", dm_excl_empty: "No sites yet.",
    dm_clear: "Clear", dm_hint: "Colors look off after inversion? Click ☀️ to exclude a site — saved locally per hostname.",
    dm_force_on: "⚡ Force dark", dm_force_off: "⚡ Unforce", dm_host_none: "Tab is not a web page"
  },
  zh: {
    nav_dm: "深色", tip_tab_dm: "所有网站的深色模式",
    dm_page_desc: "专业级深色模式：自动跳过已深色页面，⚡强制不支持深色的网站变暗，亮度与色调调节。100% 本地。",
    dm_master_title: "启用深色模式", dm_master_desc: "对网站应用颜色反转滤镜",
    dm_auto: "跳过已为深色的网站", dm_auto_desc: "自动识别原生深色站点（GitHub、YouTube 等）避免二次反转",
    dm_cur_title: "当前标签页", dm_appearance: "色调与亮度", dm_scope_title: "范围",
    dm_theme: "色调", dm_theme_std: "标准", dm_theme_dim: "柔和", dm_theme_warm: "暖色", dm_theme_contrast: "清晰",
    dm_bright: "亮度", dm_excl_title: "排除/已选列表", dm_excl_empty: "暂无站点。",
    dm_clear: "清空", dm_hint: "反色后颜色异常？点 ☀️ 排除该站点 — 按主机名本地保存。",
    dm_force_on: "⚡ 强制", dm_force_off: "⚡ 取消强制", dm_host_none: "非网页标签"
  },
  ru: {
    nav_dm: "Тёмн", tip_tab_dm: "Тёмный режим для всех сайтов",
    dm_page_desc: "Профессиональный тёмный режим: автопропуск уже тёмных страниц, ⚡принудительное затемнение сайтов без тёмной темы, яркость и оттенок. 100% локально.",
    dm_master_title: "Включить тёмный режим", dm_master_desc: "Фильтр инверсии цветов для сайтов",
    dm_auto: "Пропускать тёмные сайты", dm_auto_desc: "Автоматически определяет нативные тёмные страницы (GitHub, YouTube) — без двойной инверсии",
    dm_cur_title: "Активная вкладка", dm_appearance: "Тон и яркость", dm_scope_title: "Область",
    dm_theme: "Оттенок", dm_theme_std: "Стандарт", dm_theme_dim: "Приглушённый", dm_theme_warm: "Тёплый", dm_theme_contrast: "Контрастный",
    dm_bright: "Яркость", dm_excl_title: "Исключения / выбор", dm_excl_empty: "Сайтов пока нет.",
    dm_clear: "Очистить", dm_hint: "Искажены цвета после инверсии? Нажмите ☀️ — сайт исключится, хранится локально по hostname.",
    dm_force_on: "⚡ Принуд.", dm_force_off: "⚡ Отменить", dm_host_none: "Вкладка не является сайтом"
  },
  ja: {
    nav_dm: "Dark", tip_tab_dm: "全サイトのダークモード",
    dm_page_desc: "プロ級ダークモード: 暗色サイトは自動スキップ、⚡非対応サイトは強制暗色化、明度・色調調整。完全ローカル。",
    dm_master_title: "ダークモード有効", dm_master_desc: "色反転フィルターをウェブサイトに適用",
    dm_auto: "暗色サイトを自動スキップ", dm_auto_desc: "ネイティブ暗色のページ (GitHub, YouTube...) を検出し二重反転を回避",
    dm_cur_title: "開いているタブ", dm_appearance: "トーン & 明度", dm_scope_title: "適用範囲",
    dm_theme: "色調", dm_theme_std: "標準", dm_theme_dim: "やわらか", dm_theme_warm: "ウォーム", dm_theme_contrast: "くっきり",
    dm_bright: "明度", dm_excl_title: "除外 / 選択リスト", dm_excl_empty: "サイトはまだありません。",
    dm_clear: "クリア", dm_hint: "反転後の色が違和感なら ☀️ で除外 — ホスト名単位でローカル保存。",
    dm_force_on: "⚡ 強制", dm_force_off: "⚡ 解除", dm_host_none: "タブは Web ページではありません"
  }
};
for (const lang of ["vi", "en", "zh", "ru", "ja"]) {
  const f = "OS/locales/" + lang + ".js";
  let c = fs.readFileSync(f, "utf8");
  if (c.includes('"dm_master_title"')) continue;
  const d = K[lang];
  const lines = Object.keys(d).map((k) => "    " + JSON.stringify(k) + ": " + JSON.stringify(d[k]) + ",");
  c = c.replace(MARKER, lines.join("\n") + "\n    " + MARKER);
  fs.writeFileSync(f, c);
  console.log(f + ": +" + lines.length);
}

// 6) tests: 13 -> 14
{
  const f = "tests/split_smoke.test.js";
  let c = fs.readFileSync(f, "utf8");
  c = c.split("`13 nav buttons").join("`14 nav buttons");
  c = c.split("navCount === 13").join("navCount === 14");
  c = c.split("`13 tab sections").join("`14 tab sections");
  c = c.split("tabCount === 13").join("tabCount === 14");
  c = c.replace('"tab-security", "tab-social"]', '"tab-security", "tab-social", "tab-dm"]');
  c = c.split("all 13 targets").join("all 14 targets");
  fs.writeFileSync(f, c);
  console.log("split_smoke: 13->14");
}
console.log("ALL INSTALLED");
