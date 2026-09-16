/* One-off (v2.4.5 part 15): Dark tab v2 layout + global control polish + ws */
const fs = require("fs");
const MARKER = "/* i18n: content_* block start - generated, do not edit */";
const SEC = fs.readFileSync("scripts/archive/dm_tab_v2.html", "utf8").replace(/\r\n/g, "\n");

for (const file of ["OS/html/sidebar.html", "OS/html/popup.html"]) {
  let c = fs.readFileSync(file, "utf8");
  const start = c.indexOf('  <div id="tab-dm" class="tab-section">');
  const foot = c.indexOf('  <div class="footer-trust-bar">', start);
  if (start < 0 || foot < 0) throw new Error(file + ": tab-dm bounds missing");
  c = c.slice(0, start) + SEC + c.slice(foot);
  fs.writeFileSync(file, c);
  console.log(file + ": tab-dm v2 installed");
}
{
  const inner = SEC.replace(/^  <div id="tab-dm" class="tab-section">\n/, "").replace(/\n  <\/div>\s*\n?$/, "\n");
  fs.writeFileSync("OS/html/partials/tabs/darkmode.html", inner);
  console.log("partial mirror updated");
}

// v2 console styles
{
  const f = "OS/css/tabs/darkmode.css";
  let c = fs.readFileSync(f, "utf8");
  if (!c.includes("dm-hero {")) {
    c = c.replace(/\s*$/, "\n") + `
/* ===== Dark Mode Studio v2 layout ===== */
#tab-dm .dm-hero { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
.dm-hero-moon { color:#818cf8; flex-shrink:0; filter:drop-shadow(0 0 6px rgba(129,140,248,0.5)); }
.dm-hero-title { font-size:13px; font-weight:800; color:#e2e8f0; letter-spacing:0.02em; }
#dm-status-pill { margin-left:auto; }
.dm-page-desc { color:var(--text-muted); font-size:10.5px; margin-bottom:8px; line-height:1.4; }
#tab-dm .dm-card { padding:9px 10px; margin-bottom:8px; }
#tab-dm .dm-tight .switch-row { margin-bottom:5px; }
#tab-dm .dm-tight .switch-row-title { font-size:11.5px; }
#tab-dm .dm-tight .switch-row-desc { font-size:9.5px; }
#tab-dm .dm-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:2px; }
#tab-dm .dm-cell { display:flex; flex-direction:column; gap:3px; min-width:0; }
#tab-dm .dm-cell-wide { grid-column:1 / -1; }
#tab-dm .dm-lbl { font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#64748b; margin-bottom:2px; }
#tab-dm .dm-sel { width:100%; font-size:11px; padding:5px 8px; background:rgba(0,0,0,0.3); border:1px solid var(--card-border); border-radius:7px; color:#f8fafc; cursor:pointer; min-width:0; }
#tab-dm .dm-slider { display:flex; align-items:center; gap:8px; margin-top:7px; }
#tab-dm .dm-sl-l { flex:0 0 66px; font-size:10px; color:var(--text-muted); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#tab-dm .dm-slider input[type="range"] { flex:1; min-width:0; accent-color:var(--dm-acc,#38bdf8); }
#tab-dm .dm-sl-v { flex:0 0 auto; min-width:42px; text-align:right; font-family:ui-monospace,monospace; font-size:10px; font-weight:700; color:var(--dm-acc,#94a3b8); background:rgba(15,23,42,0.6); border:1px solid var(--card-border); border-radius:5px; padding:1px 5px; }
#tab-dm .dm-site-row { display:flex; align-items:center; justify-content:space-between; gap:6px; flex-wrap:wrap; margin-bottom:2px; }
#tab-dm .dm-host { font-size:11px; font-weight:700; color:#e2e8f0; font-family:ui-monospace,monospace; background:rgba(15,23,42,0.6); border:1px solid var(--card-border); border-radius:6px; padding:2px 8px; max-width:170px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#tab-dm .dm-host-btns { display:flex; gap:5px; }
#tab-dm .dm-btn { padding:3px 9px; font-size:10px; }
#tab-dm .dm-mini { display:block; margin-top:6px; background:none; border:none; color:#64748b; font-size:9.5px; font-weight:700; cursor:pointer; text-decoration:underline dotted; padding:0; }
#tab-dm .dm-mini:hover { color:#94a3b8; }
#tab-dm .dm-hint { color:var(--text-muted); font-size:9.5px; margin:6px 0 0; line-height:1.45; }
#tab-dm .dm-row-between { display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:6px; }
#tab-dm .dm-bright-row { margin-top:0; }
`;
    fs.writeFileSync(f, c);
    console.log("darkmode.css: v2 layout styles");
  }
}

// global control/scrollbar polish
{
  const f = "OS/css/components/forms.css";
  let c = fs.readFileSync(f, "utf8");
  if (!c.includes("v2.4.5 control polish")) {
    c = c.replace(/\s*$/, "\n") + `
/* v2.4.5 control polish */
input[type="checkbox"],
input[type="radio"] { accent-color:#38bdf8; cursor:pointer; width:14px; height:14px; }
input[type="radio"] { border-radius:50%; }
input[type="range"] { accent-color:#38bdf8; cursor:pointer; }
select option { background:#0f172a; color:#e2e8f0; }
*::-webkit-scrollbar { width:8px; height:8px; }
*::-webkit-scrollbar-track { background:transparent; }
*::-webkit-scrollbar-thumb { background:rgba(148,163,184,0.28); border-radius:8px; }
*::-webkit-scrollbar-thumb:hover { background:rgba(148,163,184,0.5); }
*::-webkit-scrollbar-corner { background:transparent; }
html { scrollbar-width:thin; scrollbar-color:rgba(148,163,184,0.3) transparent; }
`;
    fs.writeFileSync(f, c);
    console.log("forms.css: global polish");
  }
}

// i18n
const K = {
  vi: { dm_hero_title: "Studio Dark Mode", dm_ws: "Từ cách" },
  en: { dm_hero_title: "Dark Mode Studio", dm_ws: "Word spacing" },
  zh: { dm_hero_title: "深色模式工坊", dm_ws: "词距" },
  ru: { dm_hero_title: "Студия тёмного режима", dm_ws: "Интервал слов" },
  ja: { dm_hero_title: "ダークモードスタジオ", dm_ws: "語間" }
};
for (const lang of ["vi", "en", "zh", "ru", "ja"]) {
  const f = "OS/locales/" + lang + ".js";
  let c = fs.readFileSync(f, "utf8");
  if (c.includes('"dm_ws"')) continue;
  const d = K[lang];
  const lines = Object.keys(d).map((k) => "    " + JSON.stringify(k) + ": " + JSON.stringify(d[k]) + ",");
  c = c.replace(MARKER, lines.join("\n") + "\n    " + MARKER);
  fs.writeFileSync(f, c);
  console.log(f + ": +" + lines.length);
}
console.log("ALL INSTALLED");
