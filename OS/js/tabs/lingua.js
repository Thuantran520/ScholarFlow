// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/lingua.js
// Lingua P0: language-learning tab built on SLA consensus methods —
// comprehensible input from ANY page (sentence mining via selection),
// SM-2 spaced repetition + active recall, L2->L2 cards (no translation
// pairs), output practice (writing box), targeted corrective feedback
// (grammar coach -> per-category Error Ledger -> drill cards), and an
// academic linking-words bank with cloze drills. TTS listening uses local
// speechSynthesis voices. AI calls are user-triggered only and reuse the
// existing AI client (Gemini/OpenAI/Claude/custom Ollama = 100% local).
// 100% local storage: chrome.storage.local, no telemetry.
// ---------------------------------------------------------------------------

// ── SM-2 (pure, golden-testable) ───────────────────────────────────────────
function lingSm2(srs, q) {
  const s = Object.assign({ e: 2.5, i: 0, r: 0, due: 0 }, srs || {});
  q = Math.max(0, Math.min(5, Number(q) || 0));
  if (q < 3) {
    s.r = 0; s.i = 1;
  } else {
    s.r += 1;
    if (s.r === 1) s.i = 1;
    else if (s.r === 2) s.i = 6;
    else s.i = Math.round(s.i * s.e);
    s.e = Math.max(1.3, s.e + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }
  s.due = Date.now() + s.i * 864e5;
  return s;
}

// ── helpers (pure) ─────────────────────────────────────────────────────────
function lingJsonParse(txt) {
  try {
    let s = String(txt || "");
    const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(s);
    if (fence) s = fence[1];
    const a = s.indexOf("{"); const b = s.lastIndexOf("}");
    if (a === -1 || b <= a) return null;
    return JSON.parse(s.slice(a, b + 1));
  } catch (e) { return null; }
}
function lingNormAnswer(s) {
  return String(s || "").toLowerCase().trim()
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"')
    .replace(/[.!?,;\s]+$/g, "").replace(/\s+/g, " ");
}
const LING_ERR_CATS = {
  linking: "linking", connectors: "linking", "linking words": "linking", connector: "linking",
  article: "article", articles: "article", a_an: "article",
  preposition: "preposition", prepositions: "preposition",
  tense: "tense", verb_tense: "tense",
  agreement: "agreement", "subject-verb": "agreement", s_v: "agreement",
  collocation: "collocation", word_choice: "collocation", "word choice": "collocation", diction: "collocation",
  spelling: "spelling", spelling_mistake: "spelling",
  punctuation: "punctuation",
  register: "register", tone: "register"
};
function lingErrCat(cat) {
  const k = String(cat || "").toLowerCase().trim();
  return LING_ERR_CATS[k] || (LING_ERR_CATS[k.replace(/[\s-]+/g, "_")] || "other");
}

// ── academic linking-words bank (target=en; data, not UI strings) ──────────
const LINGUA_BANK = {
  en: [
    { w: "however", cat: "contrast", ex: "The results were promising; ___, the sample size was small." },
    { w: "whereas", cat: "contrast", ex: "Method A is fast, ___ method B is more accurate." },
    { w: "nonetheless", cat: "contrast", ex: "The pilot study was small; ___, its findings were robust." },
    { w: "by contrast", cat: "contrast", ex: "Qualitative data explore meaning. ___, quantitative data measure frequency." },
    { w: "even though", cat: "concession", ex: "___ the evidence is limited, the trend is consistent." },
    { w: "although", cat: "concession", ex: "___ the two models agree, their assumptions differ." },
    { w: "despite", cat: "concession", ex: "___ the initial setbacks, the experiment succeeded." },
    { w: "nevertheless", cat: "concession", ex: "The critique is valid; ___, it overlooks the sample bias." },
    { w: "therefore", cat: "result", ex: "The p-value fell below 0.05; ___, the effect was significant." },
    { w: "thus", cat: "result", ex: "The dataset was cleaned, ___ reducing noise substantially." },
    { w: "consequently", cat: "result", ex: "Traffic doubled; ___, the servers required scaling." },
    { w: "hence", cat: "result", ex: "The variables are correlated, ___ the need for caution." },
    { w: "as a result", cat: "result", ex: "The reagent degraded, and ___ the assay failed." },
    { w: "moreover", cat: "addition", ex: "The method is cheap; ___, it scales well." },
    { w: "furthermore", cat: "addition", ex: "The study lacks controls; ___, its sample is biased." },
    { w: "in addition", cat: "addition", ex: "We coded the transcripts. ___, we triangulated sources." },
    { w: "likewise", cat: "addition", ex: "Group A improved; group B did ___." },
    { w: "similarly", cat: "addition", ex: "The first trial showed fatigue; the second was ___ affected." },
    { w: "first", cat: "sequence", ex: "___, the samples were weighed; then, they were dried." },
    { w: "subsequently", cat: "sequence", ex: "The data were normalized and ___ plotted." },
    { w: "meanwhile", cat: "sequence", ex: "The control group rested; ___, the test group trained." },
    { w: "finally", cat: "sequence", ex: "___, the conclusions were verified against the raw logs." },
    { w: "unless", cat: "condition", ex: "The claim stands ___ new evidence contradicts it." },
    { w: "provided that", cat: "condition", ex: "The model generalizes, ___ that the input remains in-distribution." },
    { w: "in order to", cat: "purpose", ex: "We replicated the study ___ rule out confounders." },
    { w: "so as to", cat: "purpose", ex: "The survey was anonymized ___ protect participants." },
    { w: "for instance", cat: "exemplify", ex: "Several biases exist; ___, selection bias and confirmation bias." },
    { w: "namely", cat: "exemplify", ex: "Two factors matter, ___, temperature and humidity." },
    { w: "in conclusion", cat: "conclude", ex: "___, the evidence supports a modest but real effect." },
    { w: "overall", cat: "conclude", ex: "___, the replication rate improved after preregistration." }
  ]
};
const LINGUA_CAT_ICON = { contrast: "\u21c4", result: "\u2192", addition: "+", concession: "\u2691", sequence: "\u21bb", condition: "\u2261", purpose: "\u25b6", exemplify: "\u2022", conclude: "\u2211" };

// ── state ──────────────────────────────────────────────────────────────────
let lngProfile = { target: "en", level: "B1", dailyGoal: 10 };
let lngCards = [];
let lngErrors = { counts: {}, samples: [] };
let lngLog = {};
let lngQueue = [];
let lngPos = 0;
let lngRevealed = false;
let lngDrillIdx = -1;

function lngKey(k) { return "sf_lingua_" + k + "_" + lngProfile.target; }
function lngSave(k, obj, cb) { storSet({ [lngKey(k)]: obj }, cb || function () {}); }
function lngLoad() {
  storGet("sf_lingua_profile", function (res) {
    const p = res && res.sf_lingua_profile;
    if (p && p.target) { lngProfile = Object.assign({ target: "en", level: "B1", dailyGoal: 10 }, p); }
    const sel = document.getElementById("lng-target");
    const lvl = document.getElementById("lng-level");
    if (sel) sel.value = lngProfile.target;
    if (lvl) lvl.value = lngProfile.level;
    storGet([lngKey("cards"), lngKey("errors"), "sf_lingua_log"], function (r2) {
      lngCards = (r2 && r2[lngKey("cards")]) || [];
      lngErrors = (r2 && r2[lngKey("errors")]) || { counts: {}, samples: [] };
      lngLog = (r2 && r2.sf_lingua_log) || {};
      lngRenderAll();
    });
  });
}
function lngPersistProfile() { storSet({ sf_lingua_profile: lngProfile }, function () {}); }
function lngToday() { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function lngStreak() {
  let n = 0; const d = new Date();
  if (!lngLog[lngToday()]) d.setDate(d.getDate() - 1);
  for (;;) {
    const key = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    if (lngLog[key]) { n++; d.setDate(d.getDate() - 1); } else break;
  }
  return n;
}
function lngDue() { const now = Date.now(); return lngCards.filter(c => !c.srs || !c.srs.due || c.srs.due <= now); }
function lngAddLog() { lngLog[lngToday()] = (lngLog[lngToday()] || 0) + 1; storSet({ sf_lingua_log: lngLog }, function () {}); }

function lngNativeName() {
  const l = (window.i18n && window.i18n.getCurrentLanguage) ? window.i18n.getCurrentLanguage() : "vi";
  return ({ vi: "Vietnamese", en: "English", zh: "Chinese", ru: "Russian", ja: "Japanese" })[l] || "Vietnamese";
}

// ── AI bridge (reuses the AI module; user-triggered only) ─────────────────
async function lngAi(prompt) {
  if (typeof aiProvider === "undefined" || typeof aiHasKey !== "function" || !aiHasKey(aiProvider)) {
    showToast(t("lng_need_ai")); return null;
  }
  try { return await aiCallProvider(aiProvider, prompt, aiKeys[aiProvider], null, null, null); }
  catch (e) { showToast(t("lng_ai_fail")); return null; }
}

// ── mining ────────────────────────────────────────────────────────────────
function lngMiningPrompt(raw) {
  const L2 = lngProfile.target.toUpperCase(); const L1 = lngProfile.level;
  return "You are a language tutor. Target language: " + L2 + " (learner CEFR ~" + L1 + "), learner's native language: " + (lngProfile.native || lngNativeName()) + ". " +
    "For the material below, return STRICT JSON only, exactly these keys:\n" +
    '{"term":"short word/phrase","def":"meaning explained in ' + L2 + ' ITSELF, max 20 words, NEVER the native language",' +
    '"ex":["natural ' + L2 + ' example sentence 1","example 2"],' +
    '"cloze":{"q":"one of the examples with the term replaced by ____","a":"the exact term"},' +
    '"collocations":["2-3 common word partners in ' + L2 + '"],' +
    '"tags":["cefr:B1","pos:noun"]}\n' +
    "MATERIAL: " + raw;
}
async function lngCreateCard() {
  const box = document.getElementById("lng-mine-input");
  const raw = box && box.value ? box.value.trim() : "";
  if (!raw) { showToast(t("lng_no_input")); return; }
  const out = document.getElementById("lng-mine-preview");
  if (out) { out.textContent = t("lng_ai_working"); }
  const txt = await lngAi(lngMiningPrompt(raw));
  if (!txt) { if (out) out.textContent = ""; return; }
  const j = lingJsonParse(txt);
  if (!j || !j.term) { if (out) out.textContent = t("lng_bad_ai"); return; }
  lngPending = {
    kind: "lex", term: String(j.term).slice(0, 120),
    def: String(j.def || ""), ex: Array.isArray(j.ex) ? j.ex.slice(0, 2).map(String) : [],
    cloze: (j.cloze && j.cloze.q) ? { q: String(j.cloze.q), a: String(j.cloze.a || j.term) } : null,
    col: Array.isArray(j.collocations) ? j.collocations.slice(0, 3).map(String) : [],
    src: raw.slice(0, 300)
  };
  if (out) {
    out.textContent = "";
    const h = document.createElement("div");
    h.style.cssText = "font-weight:700;color:#38bdf8;margin-bottom:2px;";
    h.textContent = lngPending.term;
    out.appendChild(h);
    const d = document.createElement("div"); d.textContent = lngPending.def; out.appendChild(d);
    lngPending.ex.forEach((s) => { const e = document.createElement("div"); e.style.cssText = "font-style:italic;color:#94a3b8;margin-top:2px;"; e.textContent = "\u2022 " + s; out.appendChild(e); });
    const add = document.createElement("button");
    add.type = "button"; add.className = "btn-text-small"; add.style.marginTop = "6px";
    add.textContent = t("lng_add_card");
    add.addEventListener("click", function () { lngAddPending(); });
    out.appendChild(add);
  }
}
let lngPending = null;
function lngAddPending() {
  if (!lngPending) return;
  lngCards.push(Object.assign({ id: Date.now(), srs: null, created: Date.now() }, lngPending));
  lngPending = null;
  lngSave("cards", lngCards.slice(-2000));
  showToast(t("lng_card_saved"));
  lngRenderStats(); lngRenderReview();
}

// ── review engine ─────────────────────────────────────────────────────────
function lngRenderReview() {
  const area = document.getElementById("lng-review-area");
  if (!area) return;
  lngQueue = lngDue().sort((a, b) => ((a.srs && a.srs.due) || 0) - ((b.srs && b.srs.due) || 0));
  if (lngPos >= lngQueue.length) lngPos = 0;
  lngRevealed = false;
  area.textContent = "";
  if (!lngQueue.length) {
    const empty = document.createElement("div");
    empty.style.cssText = "font-size:11.5px;color:#34d399;padding:14px 2px;";
    empty.textContent = lngCards.length ? t("lng_no_due") : t("lng_deck_empty");
    area.appendChild(empty);
    lngRenderStats();
    return;
  }
  const card = lngQueue[lngPos];
  const head = document.createElement("div");
  head.style.cssText = "font-size:10px;color:#64748b;margin-bottom:4px;";
  head.textContent = (lngPos + 1) + " / " + lngQueue.length + (card.kind === "gram" ? " \u00b7 \u270e" : " \u00b7 \u25b8");
  area.appendChild(head);

  const front = document.createElement("div");
  front.style.cssText = "font-size:14px;font-weight:800;color:#f8fafc;margin-bottom:4px;";
  front.textContent = card.kind === "gram" ? card.wrong : card.term;
  area.appendChild(front);
  if (card.kind === "cloze" && card.q) {
    const q = document.createElement("div"); q.style.cssText = "font-size:12px;color:#cbd5e1;margin-bottom:6px;"; q.textContent = card.q;
    area.appendChild(q);
  } else if (card.ex && card.ex.length) {
    const x = document.createElement("div"); x.style.cssText = "font-size:11.5px;color:#94a3b8;font-style:italic;margin-bottom:6px;"; x.textContent = card.ex[0];
    area.appendChild(x);
  }

  const speak = document.createElement("button");
  speak.type = "button"; speak.className = "btn-text-small"; speak.textContent = "\ud83d\udd0a Listen";
  speak.style.marginRight = "6px";
  speak.addEventListener("click", function () { lngSpeak((card.term || "") + ". " + ((card.ex && card.ex[0]) || card.q || "")); });
  area.appendChild(speak);

  if (!lngRevealed) {
    const inp = document.createElement("input");
    inp.type = "text"; inp.className = "form-control"; inp.id = "lng-answer";
    inp.placeholder = t("lng_answer_ph");
    inp.style.cssText = "font-size:11.5px;padding:5px 8px;margin:6px 0;";
    area.appendChild(inp);
    const chk = document.createElement("button");
    chk.type = "button"; chk.className = "btn-text-small"; chk.textContent = t("lng_check");
    chk.style.marginTop = "4px";
    chk.addEventListener("click", function () { lngReveal(chk.parentElement, inp.value); });
    area.appendChild(chk);
  } else {
    lngRenderAnswerKey(area, card);
    const gradeRow = document.createElement("div");
    gradeRow.style.cssText = "display:flex;gap:6px;margin-top:8px;";
    [["again", 1, "#f87171"], ["good", 4, "#fbbf24"], ["easy", 5, "#34d399"]].forEach(function (g) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn-text-small";
      b.textContent = t("lng_g_" + g[0]); b.style.borderColor = g[2]; b.style.color = g[2];
      b.addEventListener("click", function () { lngGrade(card, g[1]); });
      gradeRow.appendChild(b);
    });
    area.appendChild(gradeRow);
  }
  const inp0 = document.getElementById("lng-answer");
  if (inp0) inp0.addEventListener("keydown", function (e) { if (e.key === "Enter") lngReveal(area, inp0.value); });
}
function lngRenderAnswerKey(area, card) {
  const key = document.createElement("div");
  key.style.cssText = "background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.3);border-radius:8px;padding:7px 9px;font-size:11.5px;color:#d1fae5;margin-top:6px;white-space:pre-wrap;";
  if (card.kind === "lex") {
    let s = (card.def || "") + (card.cloze ? "\n" + card.cloze.q : "") + (card.col && card.col.length ? "\n\u25b8 " + card.col.join(" \u00b7 ") : "");
    key.textContent = s;
  } else if (card.kind === "gram") {
    key.textContent = card.fixed + (card.note ? "\n\u21b3 " + card.note : "");
  } else {
    key.textContent = card.a || "";
  }
  area.appendChild(key);
}
function lngReveal(area, typed) {
  const card = lngQueue[lngPos];
  if (card && (card.kind === "cloze" || card.a)) {
    const ans = card.kind === "cloze" ? card.a : card.a;
    const good = lngNormAnswer(typed) === lngNormAnswer(ans) ||
      (card.syn && card.syn.some(function (s2) { return lngNormAnswer(typed) === lngNormAnswer(s2); }));
    card._auto = good ? 3 : 1;
    const v = document.createElement("div");
    v.style.cssText = "font-size:10.5px;color:" + (good ? "#34d399" : "#f87171") + ";margin-top:4px;";
    v.textContent = good ? t("lng_correct") : t("lng_wrong");
    area.appendChild(v);
  }
  lngRevealed = true;
  lngRenderReview();
}
function lngGrade(card, q) {
  card.srs = lingSm2(card.srs, q);
  if (q < 3) { card.srs.due = Date.now() + 10 * 60 * 1000; }
  lngAddLog();
  lngSave("cards", lngCards.slice(-2000), function () {});
  lngQueue.splice(lngPos, 1);
  if (lngPos >= lngQueue.length) lngPos = 0;
  lngRevealed = false;
  lngRenderReview();
}

// ── writing coach → error ledger ──────────────────────────────────────────
function lngGradePrompt(text) {
  const L2 = lngProfile.target.toUpperCase();
  return "You are a writing coach for a " + L2 + " learner (CEFR ~" + lngProfile.level + ", native " + (lngProfile.native || lngNativeName()) + "). " +
    "Return STRICT JSON: {\"corrections\":[{\"o\":\"original fragment\",\"f\":\"fixed fragment\",\"c\":\"category from: linking|article|preposition|tense|agreement|collocation|spelling|punctuation|register|other\",\"n\":\"max 12-word why, in " + L2 + "\"}]}. " +
    "At most 10 items, focus on real errors (grammar, word choice, linking). If none, return {\"corrections\":[]}.\nTEXT: " + text;
}
async function lngCheckWriting() {
  const inp = document.getElementById("lng-write-input");
  const out = document.getElementById("lng-write-out");
  if (!inp || !out || !inp.value.trim()) { showToast(t("lng_no_input")); return; }
  out.textContent = t("lng_ai_working");
  const txt = await lngAi(lngGradePrompt(inp.value.trim()));
  if (!txt) { out.textContent = ""; return; }
  const j = lingJsonParse(txt);
  out.textContent = "";
  const list = j && Array.isArray(j.corrections) ? j.corrections : null;
  if (!list) { out.textContent = t("lng_bad_ai"); return; }
  if (!list.length) {
    const ok = document.createElement("div");
    ok.style.cssText = "color:#34d399;font-weight:700;font-size:12px;padding:6px 0;";
    ok.textContent = "\u2713 " + t("lng_no_err");
    out.appendChild(ok);
    return;
  }
  list.forEach(function (c) {
    const cat = lingErrCat(c.c);
    lngErrors.counts[cat] = (lngErrors.counts[cat] || 0) + 1;
    if (lngErrors.samples.length < 200) lngErrors.samples.push({ cat: cat, o: String(c.o || "").slice(0, 300), f: String(c.f || "").slice(0, 300), n: String(c.n || "").slice(0, 200), d: lngToday() });
    const row = document.createElement("div");
    row.style.cssText = "border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:6px 8px;margin-bottom:6px;font-size:11px;";
    const w0 = document.createElement("div"); w0.style.color = "#f87171"; w0.textContent = "\u2716 " + (c.o || ""); row.appendChild(w0);
    const w1 = document.createElement("div"); w1.style.color = "#34d399"; w1.textContent = "\u2714 " + (c.f || ""); row.appendChild(w1);
    const w2 = document.createElement("div"); w2.style.color = "#94a3b8"; w2.textContent = "[" + cat + "] " + (c.n || ""); row.appendChild(w2);
    const addB = document.createElement("button");
    addB.type = "button"; addB.className = "btn-text-small"; addB.style.marginTop = "4px";
    addB.textContent = t("lng_drill_this");
    addB.addEventListener("click", function () {
      lngCards.push({ id: Date.now(), kind: "gram", wrong: String(c.o || ""), fixed: String(c.f || ""), note: String(c.n || ""), cat: cat, srs: null, created: Date.now() });
      lngSave("cards", lngCards.slice(-2000));
      showToast(t("lng_card_saved"));
      lngRenderStats();
    });
    row.appendChild(addB);
    out.appendChild(row);
  });
  lngSave("errors", lngErrors);
  lngRenderErr();
}

// ── connectors bank + drill ───────────────────────────────────────────────
function lngRenderConn() {
  const list = document.getElementById("lng-conn-list");
  if (!list) return;
  list.textContent = "";
  const bank = LINGUA_BANK[lngProfile.target];
  if (!bank) {
    const n = document.createElement("div"); n.style.cssText = "font-size:11px;color:#94a3b8;"; n.textContent = t("lng_conn_none");
    list.appendChild(n);
    return;
  }
  bank.forEach(function (it) {
    const chip = document.createElement("div");
    chip.style.cssText = "display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:99px;padding:3px 9px;margin:0 4px 4px 0;font-size:11px;color:#e2e8f0;";
    chip.title = it.cat;
    chip.appendChild(document.createTextNode((LINGUA_CAT_ICON[it.cat] || "\u00b7") + " " + it.w));
    list.appendChild(chip);
  });
}
function lngConnDrill() {
  const bank = LINGUA_BANK[lngProfile.target];
  const area = document.getElementById("lng-conn-drill");
  if (!bank || !area) return;
  lngDrillIdx = Math.floor(Math.random() * bank.length);
  const it = bank[lngDrillIdx];
  area.textContent = "";
  const q = document.createElement("div");
  q.style.cssText = "font-size:12px;color:#e2e8f0;margin-bottom:6px;";
  q.textContent = it.ex.replace("____", "\u2192 ______ \u2190");
  area.appendChild(q);
  const inp = document.createElement("input");
  inp.type = "text"; inp.className = "form-control";
  inp.placeholder = t("lng_conn_ph"); inp.style.cssText = "font-size:11.5px;padding:5px 8px;margin-bottom:6px;";
  area.appendChild(inp);
  const chk = document.createElement("button");
  chk.type = "button"; chk.className = "btn-text-small"; chk.textContent = t("lng_check");
  chk.addEventListener("click", function () {
    const ok = String(inp.value).toLowerCase().trim().replace(/[.,;]/g, "") === it.w;
    const v = document.createElement("div");
    v.style.cssText = "font-size:11px;margin-top:4px;color:" + (ok ? "#34d399" : "#f87171") + ";";
    v.textContent = (ok ? "\u2713 " + t("lng_correct") : "\u2716 " + it.w) + " \u2014 [" + it.cat + "]";
    area.appendChild(v);
    if (ok) { lngLog[lngToday()] = (lngLog[lngToday()] || 0) + 1; storSet({ sf_lingua_log: lngLog }, function () {}); }
  });
  area.appendChild(chk);
  const next = document.createElement("button");
  next.type = "button"; next.className = "btn-text-small"; next.style.marginLeft = "6px";
  next.textContent = t("lng_conn_next");
  next.addEventListener("click", lngConnDrill);
  area.appendChild(next);
}

// ── ledger + stats ────────────────────────────────────────────────────────
function lngRenderErr() {
  const area = document.getElementById("lng-err-list");
  if (!area) return;
  area.textContent = "";
  const cats = Object.keys(lngErrors.counts || {});
  if (!cats.length) { const n = document.createElement("div"); n.style.cssText = "font-size:11px;color:#94a3b8;"; n.textContent = t("lng_err_none"); area.appendChild(n); return; }
  cats.sort((a, b) => lngErrors.counts[b] - lngErrors.counts[a]).forEach(function (c) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);";
    const l = document.createElement("span"); l.textContent = c; l.style.color = "#cbd5e1";
    const v = document.createElement("span"); v.textContent = "\u00d7" + lngErrors.counts[c]; v.style.color = "#f87171"; v.style.fontWeight = "700";
    row.appendChild(l); row.appendChild(v);
    area.appendChild(row);
  });
  const last = (lngErrors.samples || []).slice(-5).reverse();
  last.forEach(function (s) {
    const it = document.createElement("div");
    it.style.cssText = "font-size:10.5px;color:#64748b;margin-top:3px;";
    it.textContent = s.d + " \u00b7 [" + s.cat + "] " + (s.o || "") + " \u2192 " + (s.f || "");
    area.appendChild(it);
  });
}
function lngRenderStats() {
  const s = document.getElementById("lng-streak");
  if (s) s.textContent = t("lng_streak").replace("{0}", String(lngStreak()));
  const line = document.getElementById("lng-stats-line");
  if (line) line.textContent = t("lng_stats").replace("{0}", String(lngCards.length)).replace("{1}", String(lngDue().length));
  const prog = document.getElementById("lng-today");
  if (prog) prog.textContent = t("lng_today").replace("{0}", String(lngLog[lngToday()] || 0)).replace("{1}", String(lngProfile.dailyGoal));
}
function lngSpeak(text, rate) {
  try {
    if (!window.speechSynthesis) { showToast(t("lng_no_tts")); return; }
    const u = new SpeechSynthesisUtterance(String(text || ""));
    u.lang = lngProfile.target; u.rate = rate || 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

// ── P1a: dictation (listening + spelling in one, 100% local) ──────────────
function lingWordDiff(target, typed) {
  const strip = function (s) { return String(s || "").toLowerCase().replace(/[.,;:!?'"\u2018\u2019\u201c\u201d()\[\]]/g, " ").split(/\s+/).filter(Boolean); };
  const T = strip(target); const G = strip(typed);
  const cells = [];
  for (let i = 0; i < Math.max(T.length, G.length); i++) {
    if (i < T.length && i < G.length) cells.push({ w: T[i], got: G[i], ok: T[i] === G[i] });
    else if (i < T.length) cells.push({ w: T[i], got: "", ok: false });
    else cells.push({ w: "", got: G[i], ok: false, extra: true });
  }
  const okc = cells.filter(function (x) { return x.ok; }).length;
  return { cells: cells, score: T.length ? Math.round(okc * 100 / T.length) : 0 };
}
function lngDictSentence() {
  const pool = [];
  lngCards.forEach(function (c) {
    if (c.kind === "gram" && c.fixed) pool.push(c.fixed);
    else if (c.cloze && c.cloze.q) pool.push(String(c.cloze.q).replace("____", c.cloze.a || c.term || "___"));
    else if (c.ex && c.ex[0]) pool.push(c.ex[0]);
  });
  (LINGUA_BANK[lngProfile.target] || []).forEach(function (it) { pool.push(it.ex.replace("____", it.w)); });
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
function lngDictStart(slow) {
  const area = document.getElementById("lng-dict-area");
  if (!area) return;
  const sentence = lngDictSentence();
  if (!sentence) { showToast(t("lng_dict_none")); return; }
  area.textContent = "";
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;";
  const play = document.createElement("button");
  play.type = "button"; play.className = "btn-text-small";
  play.textContent = (slow ? "\ud83d\udca2 " : "\ud83d\udd0a ") + t("lng_dict_play");
  play.addEventListener("click", function () { lngSpeak(sentence, slow ? 0.6 : 0.95); });
  const next = document.createElement("button");
  next.type = "button"; next.className = "btn-text-small"; next.textContent = t("lng_dict_again");
  next.addEventListener("click", function () { lngDictStart(slow); });
  row.appendChild(play); row.appendChild(next);
  area.appendChild(row);
  const inp = document.createElement("input");
  inp.type = "text"; inp.className = "form-control";
  inp.placeholder = t("lng_dict_ph");
  inp.style.cssText = "font-size:11.5px;padding:5px 8px;margin-bottom:6px;width:100%;box-sizing:border-box;";
  area.appendChild(inp);
  const chk = document.createElement("button");
  chk.type = "button"; chk.className = "btn-text-small"; chk.textContent = t("lng_check");
  const finish = function () {
    const d = lingWordDiff(sentence, inp.value);
    const out = document.createElement("div");
    out.style.cssText = "margin-top:6px;font-size:11.5px;line-height:1.8;";
    d.cells.forEach(function (c) {
      const w = document.createElement("span");
      w.style.cssText = "margin-right:6px;padding:1px 4px;border-radius:4px;color:" + (c.ok ? "#34d399" : "#f87171") + ";background:" + (c.ok ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.1)") + ";";
      w.textContent = c.ok ? c.w : (c.extra ? (c.got + "\u2715") : (c.got || "\u2205") + "\u2192" + c.w);
      if (!c.ok && !c.extra) {
        const cat = "spelling";
        lngErrors.counts[cat] = (lngErrors.counts[cat] || 0) + 1;
        if (lngErrors.samples.length < 200) lngErrors.samples.push({ cat: cat, o: c.got, f: c.w, n: "dictation", d: lngToday() });
      }
      out.appendChild(w);
    });
    const sc = document.createElement("div");
    sc.style.cssText = "font-weight:800;margin-top:4px;color:" + (d.score >= 80 ? "#34d399" : "#fbbf24") + ";";
    sc.textContent = t("lng_dict_score").replace("{0}", String(d.score)) + " \u00b7 " + d.cells.length + " \u00b7";
    out.appendChild(sc);
    area.appendChild(out);
    lngSave("errors", lngErrors); lngRenderErr();
    lngAddLog(); lngRenderStats();
    if (d.score < 100) lngSpeak(sentence, 0.85);
  };
  chk.addEventListener("click", finish);
  inp.addEventListener("keydown", function (e) { if (e.key === "Enter") finish(); });
  area.appendChild(chk);
  setTimeout(function () { inp.focus(); lngSpeak(sentence, slow ? 0.6 : 0.95); }, 350);
}

// ── P1b: linking-words rewriter ───────────────────────────────────────────
function lngLinkPrompt(text) {
  const L2 = lngProfile.target.toUpperCase();
  return "You are a writing coach for a " + L2 + " learner (CEFR ~" + lngProfile.level + "). Rewrite the text joining short/choppy sentences with academic linking words. Return STRICT JSON: {\"joins\":[{\"w\":\"the linker used\",\"t\":\"the rewritten text in " + L2 + "\"}]} with 2-4 alternatives, each using DIFFERENT linkers (e.g. however, therefore, although, moreover). Keep meaning identical, do not translate.\nTEXT: " + text;
}
async function lngLinkJoin() {
  const inp = document.getElementById("lng-write-input");
  const out = document.getElementById("lng-link-out");
  if (!inp || !out) return;
  if (!inp.value.trim()) { showToast(t("lng_no_input")); return; }
  out.textContent = t("lng_link_working");
  const txt = await lngAi(lngLinkPrompt(inp.value.trim()));
  const j = txt ? lingJsonParse(txt) : null;
  if (!j || !Array.isArray(j.joins) || !j.joins.length) { out.textContent = t("lng_bad_ai"); return; }
  out.textContent = "";
  j.joins.slice(0, 4).forEach(function (o) {
    const row = document.createElement("div");
    row.style.cssText = "border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:6px 8px;margin-bottom:6px;font-size:11px;";
    const chip = document.createElement("span");
    chip.style.cssText = "background:rgba(56,189,248,0.12);color:#38bdf8;border-radius:99px;padding:1px 8px;font-weight:700;margin-right:6px;";
    chip.textContent = String(o.w || "").slice(0, 30);
    row.appendChild(chip);
    const body = document.createElement("span");
    body.style.cssText = "color:#cbd5e1;white-space:pre-wrap;";
    body.textContent = String(o.t || "").slice(0, 800);
    row.appendChild(body);
    const use = document.createElement("button");
    use.type = "button"; use.className = "btn-text-small"; use.style.cssText = "display:block;margin-top:4px;";
    use.textContent = t("lng_link_use");
    use.addEventListener("click", function () { inp.value = o.t; showToast(t("lng_applied")); });
    row.appendChild(use);
    out.appendChild(row);
  });
}

// ── P1c: in-page writing assistant backend (content/lingua.js asks here) ──
function lngStartWriteBridge() {
  try {
    const rt = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime
      : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null);
    if (!rt || !rt.onMessage || !rt.onMessage.addListener) return;
    rt.onMessage.addListener(function (msg, sender, sendResponse) {
      if (!msg || msg.action !== "LINGUA_WRITE_CHECK") return;
      (async function () {
        try {
          if (typeof aiHasKey !== "function" || typeof aiProvider === "undefined" || !aiHasKey(aiProvider)) {
            try { sendResponse({ ok: false, reason: "noai" }); } catch (e) {}
            return;
          }
          const raw = await lngAi(lngGradePrompt(String(msg.text || "").slice(0, 2000)));
          const j = raw ? lingJsonParse(raw) : null;
          if (!j || !Array.isArray(j.corrections)) {
            try { sendResponse({ ok: false, reason: "bad" }); } catch (e) {}
            return;
          }
          const clean = j.corrections.slice(0, 10).map(function (c) {
            const cat = lingErrCat(c.c);
            lngErrors.counts[cat] = (lngErrors.counts[cat] || 0) + 1;
            if (lngErrors.samples.length < 200) lngErrors.samples.push({ cat: cat, o: String(c.o || "").slice(0, 300), f: String(c.f || "").slice(0, 300), n: String(c.n || "").slice(0, 200), d: lngToday() });
            return { o: String(c.o || ""), f: String(c.f || ""), c: cat };
          });
          lngSave("errors", lngErrors);
          lngRenderErr();
          try { sendResponse({ ok: true, corrections: clean }); } catch (e) {}
        } catch (e) {
          try { sendResponse({ ok: false, reason: "bad" }); } catch (e2) {}
        }
      })();
      return true;
    });
  } catch (e) {}
}
function lngRenderAll() {
  lngRenderStats(); lngRenderReview(); lngRenderConn(); lngRenderErr();
}
function lngSwitchSub(name) {
  document.querySelectorAll("#tab-lingua .lng-subtab").forEach(function (b) { b.classList.toggle("active", b.dataset.lngSub === name); });
  document.querySelectorAll("#tab-lingua .lng-subpanel").forEach(function (p) { p.classList.toggle("active", p.id === "lng-sub-" + name); });
}

onReady(function () {
  const tgt = document.getElementById("lng-target");
  if (tgt) tgt.addEventListener("change", function () { lngProfile.target = tgt.value || "en"; lngPersistProfile(); lngLoad(); });
  const lvl = document.getElementById("lng-level");
  if (lvl) lvl.addEventListener("change", function () { lngProfile.level = lvl.value || "B1"; lngPersistProfile(); });
  document.querySelectorAll("#tab-lingua .lng-subtab").forEach(function (b) {
    b.addEventListener("click", function () { lngSwitchSub(b.dataset.lngSub); });
  });
  const grabBtn = document.getElementById("btn-lng-grab");
  if (grabBtn) grabBtn.addEventListener("click", function () {
    try {
      sendTabMessage({ action: "GET_SELECTION_TEXT" }, function (res) {
        const sel = res && res.text ? res.text : (res && res.selection ? res.selection : "");
        const box = document.getElementById("lng-mine-input");
        if (box && sel) { box.value = sel.slice(0, 500); }
        else showToast(t("lng_no_selection"));
      });
    } catch (e) { showToast(t("lng_no_selection")); }
  });
  const mineBtn = document.getElementById("btn-lng-create");
  if (mineBtn) mineBtn.addEventListener("click", function () { lngCreateCard(); });
  const gradeBtn = document.getElementById("btn-lng-grade");
  if (gradeBtn) gradeBtn.addEventListener("click", function () { lngCheckWriting(); });
  const drillBtn = document.getElementById("btn-lng-drill");
  if (drillBtn) drillBtn.addEventListener("click", lngConnDrill);
  const clearBtn = document.getElementById("btn-lng-clear-err");
  if (clearBtn) clearBtn.addEventListener("click", function () {
    lngErrors = { counts: {}, samples: [] };
    lngSave("errors", lngErrors, function () { lngRenderErr(); });
  });
  const dictBtn = document.getElementById("btn-lng-dict");
  if (dictBtn) dictBtn.addEventListener("click", function () { lngDictStart(false); });
  const dictSlowBtn = document.getElementById("btn-lng-dict-slow");
  if (dictSlowBtn) dictSlowBtn.addEventListener("click", function () { lngDictStart(true); });
  const linkBtn = document.getElementById("btn-lng-link");
  if (linkBtn) linkBtn.addEventListener("click", function () { lngLinkJoin(); });
  lngStartWriteBridge();
  lngLoad();
});
