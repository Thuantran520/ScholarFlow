/* One-off (v2.4.5 part 14): paper-tone palette + typography console */
const fs = require("fs");
const MARKER = "/* i18n: content_* block start - generated, do not edit */";

const CARDS = [
'    <div class="feature-card dm-card" style="margin-bottom:10px; border-left:3px solid #fbbf24;">',
'      <div class="feature-title" style="margin-bottom:6px;" data-i18n="dm_paper_title">Chế độ đọc dịu mắt (màu nền)</div>',
'      <div id="dm-paper-chips" class="dm-paper-chips"></div>',
'      <div class="dm-bright-row" style="margin-top:8px;">',
'        <input type="color" id="dm-paper-custom" value="#f6ecd9" style="width:34px; height:24px; padding:0; border-radius:6px; background:transparent; border:1px solid var(--card-border); cursor:pointer; display:none;">',
'        <span class="dm-bright-l" data-i18n="dm_paper_alpha">Cường độ</span>',
'        <input type="range" id="dm-paper-alpha" min="4" max="60" value="18">',
'        <span id="dm-paper-alpha-val" class="dm-bright-v" style="color:#fbbf24;">18%</span>',
'      </div>',
'      <p style="color:var(--text-muted); font-size:10px; margin:6px 0 0; line-height:1.45;" data-i18n="dm_paper_hint">Phủ màu giấy lên nền trang — chữ &amp; ảnh giữ nguyên, không phá giao diện.</p>',
'    </div>',
'    <div class="feature-card dm-card" style="margin-bottom:10px; border-left:3px solid #22d3ee;">',
'      <label class="switch-row" for="sec-dm-typo">',
'        <div class="switch-row-left">',
'          <span class="switch-row-title" data-i18n="dm_typo_title">Chỉnh font &amp; giãn dòng</span>',
'          <span class="switch-row-desc" data-i18n="dm_typo_desc">Cỡ chữ, font, giãn dòng, khoảng chữ cho mọi trang web</span>',
'        </div>',
'        <span class="custom-switch"><input type="checkbox" id="sec-dm-typo"><span class="switch-slider"></span></span>',
'      </label>',
'      <div class="dm-scope-row" style="margin-bottom:6px;">',
'        <select class="form-control" id="dm-font-family" data-i18n-title="dm_font"></select>',
'      </div>',
'      <div class="dm-bright-row" style="margin-bottom:6px;">',
'        <span class="dm-bright-l" data-i18n="dm_font_size">Cỡ chữ</span>',
'        <input type="range" id="dm-font-size" min="85" max="150" value="100" style="accent-color:#22d3ee;">',
'        <span id="dm-font-size-val" class="dm-bright-v" style="color:#22d3ee;">100%</span>',
'      </div>',
'      <div class="dm-bright-row" style="margin-bottom:6px;">',
'        <span class="dm-bright-l" data-i18n="dm_line">Giãn dòng</span>',
'        <input type="range" id="dm-font-line" min="110" max="240" value="160" style="accent-color:#a78bfa;">',
'        <span id="dm-font-line-val" class="dm-bright-v" style="color:#a78bfa;">1.6×</span>',
'      </div>',
'      <div class="dm-bright-row">',
'        <span class="dm-bright-l" data-i18n="dm_ls">Khoảng chữ</span>',
'        <input type="range" id="dm-font-ls" min="-100" max="300" value="0" style="accent-color:#f472b6;">',
'        <span id="dm-font-ls-val" class="dm-bright-v" style="color:#f472b6;">0px</span>',
'      </div>',
'    </div>'
].join("\n");

const ANCHOR = '    <div class="feature-card dm-card" style="border-left:3px solid #10b981;">';
for (const file of ["OS/html/sidebar.html", "OS/html/popup.html", "OS/html/partials/tabs/darkmode.html"]) {
  let c = fs.readFileSync(file, "utf8");
  if (c.includes('id="dm-paper-chips"')) { console.log(file + " exists"); continue; }
  const i = c.indexOf(ANCHOR);
  if (i < 0) throw new Error(file + ": excl anchor missing");
  c = c.slice(0, i) + CARDS + "\n" + c.slice(i);
  fs.writeFileSync(file, c);
  console.log(file + ": palette+typo cards inserted");
}

// console JS: render + bindings insert
{
  const f = "OS/js/tabs/darkmode.js";
  let c = fs.readFileSync(f, "utf8");
  if (!c.includes("dm-paper-chips")) {
    const anchor = '  const list = document.getElementById("dm-excl-list");';
    if (!c.includes(anchor)) throw new Error(f + ": render anchor missing");
    const ins = [
'  const chips = document.getElementById("dm-paper-chips");',
'  if (chips) {',
'    _socClearBox(chips);',
'    DM_PAPERS.forEach(function (pp) {',
'      const cb = document.createElement("button");',
'      cb.type = "button";',
'      cb.className = "dm-paper-chip" + (dmState.paper.mode === pp.id ? " is-active" : "");',
'      const sw = document.createElement("span");',
'      sw.className = "dm-sw";',
'      if (pp.id === "none") sw.classList.add("dm-sw-none");',
'      else sw.style.background = pp.color === "custom" ? (dmState.paper.custom || "#f6ecd9") : pp.color;',
'      cb.appendChild(sw);',
'      cb.appendChild(document.createTextNode(t(pp.key)));',
'      cb.addEventListener("click", function () { dmState.paper.mode = pp.id; dmSave(); });',
'      chips.appendChild(cb);',
'    });',
'  }',
'  const pcEl = document.getElementById("dm-paper-custom");',
'  if (pcEl) { pcEl.value = dmState.paper.custom || "#f6ecd9"; pcEl.style.display = dmState.paper.mode === "custom" ? "" : "none"; }',
'  const paEl = document.getElementById("dm-paper-alpha");',
'  if (paEl) paEl.value = String(dmState.paper.alpha);',
'  const pavEl = document.getElementById("dm-paper-alpha-val");',
'  if (pavEl) pavEl.textContent = dmState.paper.alpha + "%";',
'  const tglT = document.getElementById("sec-dm-typo");',
'  if (tglT) tglT.checked = !!dmState.typo.on;',
'  const famEl = document.getElementById("dm-font-family");',
'  if (famEl) {',
'    _socClearBox(famEl);',
'    DM_FONTS.forEach(function (op) {',
'      const o = document.createElement("option");',
'      o.value = op.v; o.textContent = t(op.key);',
'      if ((dmState.typo.family || "") === op.v) o.selected = true;',
'      famEl.appendChild(o);',
'    });',
'  }',
'  [["dm-font-size", "size", function (v) { return v + "%"; }], ["dm-font-line", "line", function (v) { return (Math.round(v * 10) / 10).toFixed(1) + "×"; }], ["dm-font-ls", "ls", function (v) { return (v > 0 ? "+" : "") + v.toFixed(2) + "px"; }]].forEach(function (row) {',
'    const el = document.getElementById(row[0]);',
'    const vEl = document.getElementById(row[0] + "-val");',
'    const raw = Math.round(dmState.typo[row[1]] * 100);',
'    if (el) el.value = String(row[1] === "size" ? dmState.typo.size : raw);',
'    if (vEl) vEl.textContent = row[2](row[1] === "size" ? dmState.typo.size : dmState.typo[row[1]]);',
'  });',
''
    ].join("\n");
    c = c.replace(anchor, ins + anchor);
  }
  if (!c.includes("bindPaperTypo")) {
    const bAnchor = '  const clr = document.getElementById("btn-dm-clear-excl");';
    if (!c.includes(bAnchor)) throw new Error(f + ": onReady anchor missing");
    const bIns = [
'  const pc = document.getElementById("dm-paper-custom");',
'  if (pc) pc.addEventListener("input", function () { dmState.paper.custom = pc.value; dmState.paper.mode = "custom"; dmSave(); });',
'  const pa = document.getElementById("dm-paper-alpha");',
'  if (pa) pa.addEventListener("input", function () { const v = document.getElementById("dm-paper-alpha-val"); if (v) v.textContent = pa.value + "%"; });',
'  if (pa) pa.addEventListener("change", function () { dmState.paper.alpha = parseInt(pa.value, 10) || 18; dmSave(); });',
'  const tglT = document.getElementById("sec-dm-typo");',
'  if (tglT) tglT.addEventListener("change", function () { dmState.typo.on = !!tglT.checked; dmSave(); });',
'  const fam = document.getElementById("dm-font-family");',
'  if (fam) fam.addEventListener("change", function () { dmState.typo.family = fam.value; dmSave(); });',
'  [["dm-font-size", "size"], ["dm-font-line", "line"], ["dm-font-ls", "ls"]].forEach(function (row) {',
'    const el = document.getElementById(row[0]);',
'    if (!el) return;',
'    const fmt = row[1] === "size" ? function (x) { return x + "%"; } : row[1] === "line" ? function (x) { return (x / 100).toFixed(1) + "×"; } : function (x) { return (x / 100 > 0 ? "+" : "") + (x / 100).toFixed(2) + "px"; };',
'    el.addEventListener("input", function () { const v = document.getElementById(row[0] + "-val"); if (v) v.textContent = fmt(parseInt(el.value, 10)); });',
'    el.addEventListener("change", function () {',
'      const x = parseInt(el.value, 10);',
'      dmState.typo[row[1]] = row[1] === "size" ? x : x / 100;',
'      dmSave();',
'    });',
'  });',
''
    ].join("\n");
    c = c.replace(bAnchor, bIns + bAnchor);
  }
  fs.writeFileSync(f, c);
  console.log(f + ": render+bindings extended");
}

// CSS
{
  const f = "OS/css/tabs/darkmode.css";
  let c = fs.readFileSync(f, "utf8");
  if (!c.includes("dm-paper-chip")) {
    c = c.replace(/\s*$/, "\n") + `
/* Paper palette + typography (v2.4.5) */
.dm-paper-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dm-paper-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; color: #cbd5e1; background: rgba(15,23,42,0.55); border: 1px solid var(--card-border); border-radius: 999px; padding: 4px 10px; cursor: pointer; transition: all 0.15s ease; }
.dm-paper-chip:hover { border-color: rgba(251,191,36,0.45); transform: translateY(-1px); }
.dm-paper-chip.is-active { border-color: #fbbf24; background: rgba(251,191,36,0.12); color: #fde68a; }
.dm-sw { width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.25); display: inline-block; flex-shrink: 0; }
.dm-sw-none { background: linear-gradient(135deg, #f8fafc 45%, #0f172a 55%); }
#dm-font-family { flex: 1; font-size: 11px; padding: 5px 8px; min-width: 0; }
input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }
input[type="color"]::-webkit-color-swatch { border: none; border-radius: 4px; }
`;
    fs.writeFileSync(f, c);
    console.log("darkmode.css: palette styles");
  }
}

// i18n
const K = {
  vi: {
    dm_paper_title: "Chế độ đọc dịu mắt (màu nền)", dm_paper_hint: "Phủ màu giấy lên nền trang — chữ & ảnh giữ nguyên, không phá giao diện.",
    dm_paper_none: "Không", dm_paper_paper: "Giấy", dm_paper_mint: "Bạc hà", dm_paper_sky: "Xanh dương", dm_paper_amber: "Hổ phách", dm_paper_rose: "Hồng đào", dm_paper_custom: "Tự chọn",
    dm_paper_alpha: "Cường độ", dm_typo_title: "Chỉnh font & giãn dòng", dm_typo_desc: "Cỡ chữ, font, giãn dòng, khoảng chữ cho mọi trang web",
    dm_font: "Font chữ", dm_font_default: "Mặc định của trang", dm_font_serif: "Serif (Georgia)", dm_font_sans: "Sans (Segoe UI)", dm_font_mono: "Monospace", dm_font_lexend: "Dễ đọc (Verdana)",
    dm_font_size: "Cỡ chữ", dm_line: "Giãn dòng", dm_ls: "Khoảng chữ"
  },
  en: {
    dm_paper_title: "Easy-reading tint (background)", dm_paper_hint: "Washes the page background with paper color — text & images stay intact, no layout breakage.",
    dm_paper_none: "None", dm_paper_paper: "Paper", dm_paper_mint: "Mint", dm_paper_sky: "Sky", dm_paper_amber: "Amber", dm_paper_rose: "Rose", dm_paper_custom: "Custom",
    dm_paper_alpha: "Intensity", dm_typo_title: "Font & line spacing", dm_typo_desc: "Font family, size, line-height and letter-spacing for all websites",
    dm_font: "Font", dm_font_default: "Site default", dm_font_serif: "Serif (Georgia)", dm_font_sans: "Sans (Segoe UI)", dm_font_mono: "Monospace", dm_font_lexend: "Readable (Verdana)",
    dm_font_size: "Font size", dm_line: "Line height", dm_ls: "Letter spacing"
  },
  zh: {
    dm_paper_title: "护眼阅读色（背景）", dm_paper_hint: "用纸张色罩住页面背景——文字与图片不变，不破坏布局。",
    dm_paper_none: "无", dm_paper_paper: "纸张", dm_paper_mint: "薄荷", dm_paper_sky: "天蓝", dm_paper_amber: "琥珀", dm_paper_rose: "粉黛", dm_paper_custom: "自定义",
    dm_paper_alpha: "强度", dm_typo_title: "字体与行距", dm_typo_desc: "为所有网站设置字体、字号、行高与字距",
    dm_font: "字体", dm_font_default: "站点默认", dm_font_serif: "衬线 (Georgia)", dm_font_sans: "无衬线 (Segoe UI)", dm_font_mono: "等宽", dm_font_lexend: "易读 (Verdana)",
    dm_font_size: "字号", dm_line: "行高", dm_ls: "字距"
  },
  ru: {
    dm_paper_title: "Бережный режим чтения (фон)", dm_paper_hint: "Бумажная подложка фона страницы — текст и картинки не страдают, вёрстка цела.",
    dm_paper_none: "Нет", dm_paper_paper: "Бумага", dm_paper_mint: "Мята", dm_paper_sky: "Небо", dm_paper_amber: "Янтарь", dm_paper_rose: "Роза", dm_paper_custom: "Свой цвет",
    dm_paper_alpha: "Интенсивность", dm_typo_title: "Шрифт и межстрочный", dm_typo_desc: "Шрифт, размер, высота строки и трекинг для всех сайтов",
    dm_font: "Шрифт", dm_font_default: "Стандарт сайта", dm_font_serif: "Serif (Georgia)", dm_font_sans: "Sans (Segoe UI)", dm_font_mono: "Моноширинный", dm_font_lexend: "Читаемый (Verdana)",
    dm_font_size: "Размер", dm_line: "Высота строки", dm_ls: "Трекинг"
  },
  ja: {
    dm_paper_title: "目にやさしい背景色", dm_paper_hint: "背景に紙色レイヤーを重ねます — 文字と画像は無傷、レイアウト崩れなし。",
    dm_paper_none: "なし", dm_paper_paper: "紙", dm_paper_mint: "ミント", dm_paper_sky: "スカイ", dm_paper_amber: "アンバー", dm_paper_rose: "ローズ", dm_paper_custom: "カスタム",
    dm_paper_alpha: "強さ", dm_typo_title: "フォント & 行間の設定", dm_typo_desc: "全サイトでフォント・サイズ・行間・字間を上書き",
    dm_font: "フォント", dm_font_default: "サイト既定", dm_font_serif: "Serif (Georgia)", dm_font_sans: "Sans (Segoe UI)", dm_font_mono: "Monospace", dm_font_lexend: "読みやすい (Verdana)",
    dm_font_size: "文字サイズ", dm_line: "行間", dm_ls: "文字間隔"
  }
};
for (const lang of ["vi", "en", "zh", "ru", "ja"]) {
  const f = "OS/locales/" + lang + ".js";
  let c = fs.readFileSync(f, "utf8");
  if (c.includes('"dm_paper_title"')) continue;
  const d = K[lang];
  const lines = Object.keys(d).map((k) => "    " + JSON.stringify(k) + ": " + JSON.stringify(d[k]) + ",");
  c = c.replace(MARKER, lines.join("\n") + "\n    " + MARKER);
  fs.writeFileSync(f, c);
  console.log(f + ": +" + lines.length);
}
console.log("ALL INSTALLED");
