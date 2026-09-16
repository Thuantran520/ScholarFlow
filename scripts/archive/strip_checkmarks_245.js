/* One-off (v2.4.5 part 8): remove ✓ checkmarks from model select hint + statuses */
const fs = require("fs");
const HINT = {
  vi: "Model màu xanh lá là khả dụng cho key.",
  en: "Green models are available for the key.",
  zh: "绿色显示的模型对该 Key 可用。",
  ru: "Модели зелёным — доступны для ключа.",
  ja: "緑のモデルはそのキーで利用可能です。"
};
for (const lang of ["vi", "en", "zh", "ru", "ja"]) {
  const f = "OS/locales/" + lang + ".js";
  let c = fs.readFileSync(f, "utf8");
  const before = c;
  c = c.replace(/"(sec_trust_official|ai_key_connected|ai_key_entered|soc_vt_created|soc_vt_saved|soc_vt_copied|soc_rp_copied)":\s*"✓\s+/g, '"$1": "');
  // hint: replace whole value
  const hintRe = /"ai_model_hint":\s*"[^"]*"/;
  if (hintRe.test(c)) c = c.replace(hintRe, JSON.stringify("ai_model_hint") + ": " + JSON.stringify(HINT[lang]));
  else console.log(lang + ": ai_model_hint key missing!");
  fs.writeFileSync(f, c);
  console.log(f + ": changed=" + (c !== before));
}
// HTML default text inside data-i18n="ai_model_hint" elements
for (const f of ["OS/html/sidebar.html", "OS/html/popup.html", "OS/html/partials/tabs/ai.html"]) {
  try {
    let c = fs.readFileSync(f, "utf8");
    const re = /(data-i18n="ai_model_hint">)[^<]*(<)/;
    if (!re.test(c)) { console.log(f + ": hint element missing"); continue; }
    c = c.replace(re, "$1Model màu xanh lá là khả dụng cho key.$2");
    fs.writeFileSync(f, c);
    console.log(f + ": hint default updated");
  } catch (e) { console.log(f + " skip:", e.message); }
}
console.log("DONE");
