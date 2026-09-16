/* One-off (v2.4.5 part 13): per-site color tuning card + full-width pm-stepper */
const fs = require("fs");
const MARKER = "/* i18n: content_* block start - generated, do not edit */";

const TUNE_CARD = [
'    <div class="feature-card dm-card" style="margin-bottom:10px; border-left:3px solid #f472b6;">',
'      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:6px;">',
'        <span class="feature-title" style="margin-bottom:0;" data-i18n="dm_tune_title">Chỉnh màu riêng cho trang này</span>',
'        <button id="btn-dm-tune-reset" class="btn-text-small" data-i18n="dm_tune_reset">↺ Mặc định</button>',
'      </div>',
'      <div class="dm-bright-row" style="margin-bottom:7px;">',
'        <span class="dm-bright-l" data-i18n="dm_bright">Độ sáng</span>',
'        <input type="range" id="dm-tune-bright" min="60" max="140" value="100">',
'        <span id="dm-tune-bright-val" class="dm-bright-v">100%</span>',
'      </div>',
'      <div class="dm-bright-row" style="margin-bottom:7px;">',
'        <span class="dm-bright-l" data-i18n="dm_tune_contrast">Tương phản</span>',
'        <input type="range" id="dm-tune-contrast" min="60" max="160" value="100">',
'        <span id="dm-tune-contrast-val" class="dm-bright-v" style="color:#38bdf8;">100%</span>',
'      </div>',
'      <div class="dm-bright-row" style="margin-bottom:8px;">',
'        <span class="dm-bright-l" data-i18n="dm_tune_color">Độ màu</span>',
'        <input type="range" id="dm-tune-color" min="0" max="160" value="100" style="accent-color:#f472b6;">',
'        <span id="dm-tune-color-val" class="dm-bright-v" style="color:#f472b6;">100%</span>',
'      </div>',
'      <p style="color:var(--text-muted); font-size:10px; margin:0; line-height:1.45;" data-i18n="dm_tune_hint">Độ màu 0% = đọc kiểu sách xám. ba thanh này chỉ áp dụng cho hostname đang mở và thắng mọi preset bên trên.</p>',
'    </div>'
].join("\n");

const ANCHOR = '    <div class="feature-card dm-card" style="margin-bottom:10px; border-left:3px solid #f59e0b;">';
for (const file of ["OS/html/sidebar.html", "OS/html/popup.html", "OS/html/partials/tabs/darkmode.html"]) {
  let c = fs.readFileSync(file, "utf8");
  if (c.includes('id="dm-tune-bright"')) { console.log(file + " exists"); continue; }
  const i = c.indexOf(ANCHOR);
  if (i < 0) throw new Error(file + ": appearance anchor missing");
  c = c.slice(0, i) + TUNE_CARD + "\n" + c.slice(i);
  fs.writeFileSync(file, c);
  console.log(file + ": tune card inserted");
}

const K = {
  vi: {
    dm_tune_title: "Chỉnh màu riêng cho trang này", dm_tune_reset: "↺ Mặc định",
    dm_tune_contrast: "Tương phản", dm_tune_color: "Độ màu",
    dm_tune_hint: "Độ màu 0% = đọc kiểu sách xám. Ba thanh này chỉ áp dụng cho hostname đang mở và thắng mọi preset bên trên."
  },
  en: {
    dm_tune_title: "Per-site color tuning", dm_tune_reset: "↺ Defaults",
    dm_tune_contrast: "Contrast", dm_tune_color: "Saturation",
    dm_tune_hint: "Saturation 0% = e-reader gray mode. Applies to the current hostname only and overrides all presets above."
  },
  zh: {
    dm_tune_title: "该网站专属调色", dm_tune_reset: "↺ 默认",
    dm_tune_contrast: "对比度", dm_tune_color: "饱和度",
    dm_tune_hint: "饱和度 0% = 灰阶阅读模式。仅对当前主机名生效，并覆盖上方所有预设。"
  },
  ru: {
    dm_tune_title: "Настройка цвета для сайта", dm_tune_reset: "↺ По умолч.",
    dm_tune_contrast: "Контраст", dm_tune_color: "Насыщенность",
    dm_tune_hint: "Насыщенность 0% = режим серой читалки. Действует только для текущего hostname и перекрывает пресеты выше."
  },
  ja: {
    dm_tune_title: "このサイト専用カラー調整", dm_tune_reset: "↺ 初期化",
    dm_tune_contrast: "コントラスト", dm_tune_color: "彩度",
    dm_tune_hint: "彩度 0% = 灰視点読モード。開いているホスト名にのみ適用され、上のプリセットより優先されます。"
  }
};
for (const lang of ["vi", "en", "zh", "ru", "ja"]) {
  const f = "OS/locales/" + lang + ".js";
  let c = fs.readFileSync(f, "utf8");
  if (c.includes('"dm_tune_title"')) continue;
  const d = K[lang];
  const lines = Object.keys(d).map((k) => "    " + JSON.stringify(k) + ": " + JSON.stringify(d[k]) + ",");
  c = c.replace(MARKER, lines.join("\n") + "\n    " + MARKER);
  fs.writeFileSync(f, c);
  console.log(f + ": +" + lines.length);
}

// CSS: fuller steppers in plan grid + tune slider row polish
{
  const f = "OS/css/tabs/pomodoro.css";
  let c = fs.readFileSync(f, "utf8");
  if (!c.includes("pm-stepper full-frame")) {
    c = c.replace(/\s*$/, "\n") + `
/* pm-stepper full-frame (v2.4.5) */
.pm-plan-field .pm-stepper { width: 100%; justify-content: space-between; min-height: 28px; }
.pm-plan-field .pm-stepper input { flex: 1; width: auto; padding: 5px 0; font-size: 12px; }
.pm-plan-field .pm-stepper button { width: 32px; font-size: 15px; background: rgba(255, 255, 255, 0.08); }
.pm-plan-field .pm-stepper button:first-child { border-right: 1px solid rgba(255, 255, 255, 0.12); }
.pm-plan-field .pm-stepper button:last-child { border-left: 1px solid rgba(255, 255, 255, 0.12); }
.pm-plan-field .pm-stepper button:active { background: rgba(56, 189, 248, 0.35); }
.pm-stepper:focus-within { border-color: rgba(56, 189, 248, 0.55); box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.12); }
`;
    fs.writeFileSync(f, c);
    console.log("pomodoro.css: full-frame steppers");
  }
}
console.log("ALL INSTALLED");
