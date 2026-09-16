/* One-off (v2.4.5 part 11): Dark Mode tool + Pomodoro smart-plan redesign. */
const fs = require("fs");
const MARKER = "/* i18n: content_* block start - generated, do not edit */";

// ── 1. i18n keys (15 x 5) ───────────────────────────────────────────────────
const K = {
  vi: {
    dm_title: "Dark Mode cho trang web",
    dm_desc: "Tối giao diện mọi trang web bằng bộ lọc nghịch đảo màu — dịu mắt ban đêm, chạy 100% cục bộ",
    dm_mode_all: "Tối mọi trang (trừ trang loại trừ)",
    dm_mode_selected: "Chỉ tối trang được chọn",
    dm_this_on: "🌙 Tối trang này",
    dm_this_off: "☀️ Trả sáng trang này",
    dm_no_host: "Không xác định được tên miền của tab đang mở",
    dm_status_on: "Đang tối", dm_status_off: "Mặc định (sáng)",
    dm_updated: "✓ Đã cập nhật dark mode: {0}",
    pm_preset_deep: "🔥 Deep 90' · 50/10",
    pm_preset_sprint: "⚡ Sprint 2H · 25/5",
    pm_preset_reading: "📖 Đọc 60' · 45/8",
    pm_preset_light: "🌱 Nhẹ 45' · 25/5",
    pm_plan_end_at: "⏰ Kết thúc khoảng: {0}"
  },
  en: {
    dm_title: "Website Dark Mode",
    dm_desc: "Inverts colors on every site with a local filter — easier on eyes at night, 100% local",
    dm_mode_all: "Dark all sites (except exclusions)",
    dm_mode_selected: "Dark only selected sites",
    dm_this_on: "🌙 Darken this site",
    dm_this_off: "☀️ Restore this site",
    dm_no_host: "Could not resolve the active tab's hostname",
    dm_status_on: "Dark", dm_status_off: "Default (light)",
    dm_updated: "✓ Dark mode updated: {0}",
    pm_preset_deep: "🔥 Deep 90' · 50/10",
    pm_preset_sprint: "⚡ Sprint 2H · 25/5",
    pm_preset_reading: "📖 Read 60' · 45/8",
    pm_preset_light: "🌱 Light 45' · 25/5",
    pm_plan_end_at: "⏰ Done around: {0}"
  },
  zh: {
    dm_title: "网站深色模式",
    dm_desc: "用颜色反转滤镜一键深色化所有网站 — 夜晚护眼，100% 本地运行",
    dm_mode_all: "全部深色（排除名单除外）",
    dm_mode_selected: "仅选中的网站深色",
    dm_this_on: "🌙 此网站深色",
    dm_this_off: "☀️ 此网站还原",
    dm_no_host: "无法识别当前标签页域名",
    dm_status_on: "深色中", dm_status_off: "默认（亮色）",
    dm_updated: "✓ 深色模式已更新：{0}",
    pm_preset_deep: "🔥 深度 90分 · 50/10",
    pm_preset_sprint: "⚡ 冲刺 2时 · 25/5",
    pm_preset_reading: "📖 阅读 60分 · 45/8",
    pm_preset_light: "🌱 轻档 45分 · 25/5",
    pm_plan_end_at: "⏰ 大约结束：{0}"
  },
  ru: {
    dm_title: "Тёмный режим сайтов",
    dm_desc: "Инвертирует цвета всех сайтов локальным фильтром — комфортно ночью, 100% локально",
    dm_mode_all: "Тёмные все сайты (кроме исключений)",
    dm_mode_selected: "Тёмные только выбранные сайты",
    dm_this_on: "🌙 Тёмный для этого сайта",
    dm_this_off: "☀️ Вернуть светлый",
    dm_no_host: "Не удалось определить домен активной вкладки",
    dm_status_on: "Тёмный", dm_status_off: "По умолчанию (светлый)",
    dm_updated: "✓ Тёмный режим обновлён: {0}",
    pm_preset_deep: "🔥 Глубокий 90м · 50/10",
    pm_preset_sprint: "⚡ Спринт 2ч · 25/5",
    pm_preset_reading: "📖 Чтение 60м · 45/8",
    pm_preset_light: "🌱 Лёгкий 45м · 25/5",
    pm_plan_end_at: "⏰ Завершение около: {0}"
  },
  ja: {
    dm_title: "サイト ダークモード",
    dm_desc: "色反転フィルターで全サイトを暗色化 — 夜目に優しく、完全ローカル動作",
    dm_mode_all: "全サイトをダークに (除外サイト除く)",
    dm_mode_selected: "選択サイトのみダーク",
    dm_this_on: "🌙 このサイトを暗く",
    dm_this_off: "☀️ このサイトを戻す",
    dm_no_host: "アクティブタブのドメインを取得できません",
    dm_status_on: "ダーク表示中", dm_status_off: "デフォルト (明)",
    dm_updated: "✓ ダークモード更新: {0}",
    pm_preset_deep: "🔥 ディープ 90分 · 50/10",
    pm_preset_sprint: "⚡ スプリント 2時間 · 25/5",
    pm_preset_reading: "📖 読書 60分 · 45/8",
    pm_preset_light: "🌱 ライト 45分 · 25/5",
    pm_plan_end_at: "⏰ 終了目安: {0}"
  }
};
for (const lang of ["vi", "en", "zh", "ru", "ja"]) {
  const f = "OS/locales/" + lang + ".js";
  let c = fs.readFileSync(f, "utf8");
  if (c.includes('"dm_title"')) { console.log(f + " keys exist"); continue; }
  const d = K[lang];
  const lines = Object.keys(d).map((k) => "    " + JSON.stringify(k) + ": " + JSON.stringify(d[k]) + ",");
  c = c.replace(MARKER, lines.join("\n") + "\n    " + MARKER);
  fs.writeFileSync(f, c);
  console.log(f + ": +" + lines.length);
}

// ── 2. Pomodoro HTML: preset row + end clock (sidebar, popup, partial) ─────
const PRESET_ROW = [
'      <div class="pm-preset-row">',
'        <button type="button" class="pm-preset-chip" id="pm-preset-deep" data-w="90" data-f="50" data-s="10" data-l="20" data-e="2" data-i18n="pm_preset_deep">🔥 Deep 90\' · 50/10</button>',
'        <button type="button" class="pm-preset-chip" id="pm-preset-sprint" data-w="120" data-f="25" data-s="5" data-l="15" data-e="4" data-i18n="pm_preset_sprint">⚡ Sprint 2H · 25/5</button>',
'        <button type="button" class="pm-preset-chip" id="pm-preset-reading" data-w="60" data-f="45" data-s="8" data-l="15" data-e="4" data-i18n="pm_preset_reading">📖 Đọc 60\' · 45/8</button>',
'        <button type="button" class="pm-preset-chip" id="pm-preset-light" data-w="45" data-f="25" data-s="5" data-l="15" data-e="4" data-i18n="pm_preset_light">🌱 Nhẹ 45\' · 25/5</button>',
'      </div>'
].join("\n");
const END_CLOCK = '        <div id="pm-plan-endclock" style="font-size:11px; color:#fbbf24; margin-bottom:8px; display:none;"></div>';
for (const file of ["OS/html/sidebar.html", "OS/html/popup.html", "OS/html/partials/tabs/pomodoro.html"]) {
  let c = fs.readFileSync(file, "utf8");
  if (!c.includes("pm-preset-deep")) {
    const hint = c.indexOf('data-i18n="pm_plan_hint"');
    if (hint < 0) throw new Error(file + ": pm_plan_hint missing");
    const pEnd = c.indexOf("</p>", hint);
    const after = pEnd + 4;
    c = c.slice(0, after) + "\n" + PRESET_ROW + c.slice(after);
  }
  if (!c.includes("pm-plan-endclock")) {
    const lv = c.indexOf('id="pm-plan-leftover"');
    if (lv < 0) throw new Error(file + ": leftover div missing");
    const lvEnd = c.indexOf("</div>", lv) + 6;
    c = c.slice(0, lvEnd) + "\n" + END_CLOCK + c.slice(lvEnd);
  }
  fs.writeFileSync(file, c);
  console.log(file + ": pomodoro plan updated");
}

// ── 3. Dark Mode card in Security tab (sidebar, popup) + partial append ────
const DM_CARD = [
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
for (const file of ["OS/html/sidebar.html", "OS/html/popup.html"]) {
  let c = fs.readFileSync(file, "utf8");
  if (c.includes('id="sec-dm-toggle"')) { console.log(file + " dm card exists"); continue; }
  const anchor = c.indexOf('  <div id="tab-social" class="tab-section">');
  if (anchor < 0) throw new Error(file + ": tab-social anchor missing");
  const close = c.lastIndexOf("  </div>", anchor);
  if (close < 0) throw new Error(file + ": security close div missing");
  c = c.slice(0, close) + DM_CARD + "\n" + c.slice(close);
  fs.writeFileSync(file, c);
  console.log(file + ": dark card inserted");
}
{
  const file = "OS/html/partials/tabs/security.html";
  let c = fs.readFileSync(file, "utf8");
  if (!c.includes('id="sec-dm-toggle"')) {
    c = c.replace(/\s*$/, "\n") + DM_CARD + "\n";
    fs.writeFileSync(file, c);
    console.log(file + ": dark card appended");
  }
}

// ── 4. script tag tabs/darkmode.js ──────────────────────────────────────────
const CREATOR_LINE = '  <script src="../js/tabs/social-creator.js"></script>';
for (const file of ["OS/html/sidebar.html", "OS/html/popup.html", "OS/html/partials/_scripts.html"]) {
  let c = fs.readFileSync(file, "utf8");
  if (c.includes("tabs/darkmode.js")) continue;
  if (!c.includes(CREATOR_LINE)) throw new Error(file + ": social-creator line missing");
  c = c.replace(CREATOR_LINE, CREATOR_LINE + '\n  <script src="../js/tabs/darkmode.js"></script>');
  fs.writeFileSync(file, c);
  console.log(file + ": darkmode.js added");
}

// ── 5. manifest content script: darkmode.js after social.js ────────────────
for (const m of ["manifest.json", "manifest_firefox.json", "manifest_chrome.json"]) {
  let c = fs.readFileSync(m, "utf8");
  if (c.includes("content/darkmode.js")) { console.log(m + " exists"); continue; }
  const a = '"OS/js/content/social.js",';
  const i = c.indexOf(a);
  if (i < 0) throw new Error(m + ": social.js line missing");
  const lineStart = c.lastIndexOf("\n", i) + 1;
  const indent = c.slice(lineStart, i).replace(/\S.*/, "");
  c = c.slice(0, i + a.length) + "\n" + indent + '"OS/js/content/darkmode.js",' + c.slice(i + a.length);
  JSON.parse(c);
  fs.writeFileSync(m, c);
  console.log(m + ": darkmode content script added");
}

// ── 6. pomodoro.js: endclock + presets ─────────────────────────────────────
{
  const f = "OS/js/tabs/pomodoro.js";
  let c = fs.readFileSync(f, "utf8");
  if (!c.includes("pm-plan-endclock")) {
    const anchor = `  const resEl = document.getElementById("pm-plan-result");`;
    if (!c.includes(anchor)) throw new Error("resEl anchor missing");
    const add = anchor + "\n" + [
      '  const endEl = document.getElementById("pm-plan-endclock");',
      '  if (endEl) {',
      '    const endMs = Date.now() + (pmPlan.totalMinutes + (pmPlan.leftover || 0)) * 60000;',
      '    const d = new Date(endMs);',
      '    const hh = ("0" + d.getHours()).slice(-2); const mm = ("0" + d.getMinutes()).slice(-2);',
      '    endEl.textContent = getI18nText("pm_plan_end_at", [hh + ":" + mm]) || ("~" + hh + ":" + mm);',
      '    endEl.style.display = "";',
      '  }'
    ].join("\n");
    c = c.replace(anchor, add);
  }
  if (!c.includes("pm-preset-deep")) {
    const anchor = '  if (btnCalc) btnCalc.addEventListener("click", pmRunPlanCalc);';
    if (!c.includes(anchor)) throw new Error("btnCalc anchor missing");
    const add = anchor + "\n" + [
      '  ["pm-preset-deep", "pm-preset-sprint", "pm-preset-reading", "pm-preset-light"].forEach(function (id) {',
      '    const chip = document.getElementById(id);',
      '    if (!chip) return;',
      '    chip.addEventListener("click", function () {',
      '      const w = document.getElementById("pm-plan-work"); if (w) w.value = chip.getAttribute("data-w");',
      '      const f = document.getElementById("pm-plan-focus"); if (f) f.value = chip.getAttribute("data-f");',
      '      const s = document.getElementById("pm-plan-short-len"); if (s) s.value = chip.getAttribute("data-s");',
      '      const l = document.getElementById("pm-plan-long-len"); if (l) l.value = chip.getAttribute("data-l");',
      '      const e = document.getElementById("pm-plan-long-every"); if (e) e.value = chip.getAttribute("data-e");',
      '      pmRunPlanCalc();',
      '    });',
      '  });'
    ].join("\n");
    c = c.replace(anchor, add);
  }
  fs.writeFileSync(f, c);
  console.log(f + ": logic extended");
}

// ── 7. pomodoro.css ────────────────────────────────────────────────────────
{
  const f = "OS/css/tabs/pomodoro.css";
  let c = fs.readFileSync(f, "utf8");
  if (!c.includes("pm-preset-chip")) {
    c = c.replace(/\s*$/, "\n") + `
/* v2.4.5 smart-plan presets + end clock */
.pm-preset-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.pm-preset-chip { font-size: 10.5px; font-weight: 600; color: #7dd3fc; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 999px; padding: 4px 11px; cursor: pointer; transition: all 0.15s ease; }
.pm-preset-chip:hover { background: rgba(56, 189, 248, 0.2); transform: translateY(-1px); color: #bae6fd; }
#pm-plan-endclock { font-size: 11px; font-weight: 700; color: #fbbf24; }
`;
    fs.writeFileSync(f, c);
    console.log(f + ": styles appended");
  }
}
console.log("ALL INSTALLED");
