// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/flashcards.js
// Flashcards with spaced repetition, generated from the citation library.
// Self-contained: binds its own DOM listeners after the page is ready.
// Model: sf_flashcards = [{ id, front, back, libId, created, due, ease,
//                          intervalDays, reps, lapses, lastReviewed }]
// ---------------------------------------------------------------------------
const FC_STORAGE_KEY = "sf_flashcards";
const FC_DAY_MS = 24 * 60 * 60 * 1000;
const FC_MIN_MS = 60 * 1000;

let flashcardList = [];
let fcReviewQueue = [];
let fcReviewIndex = 0;

const fcTr = (key) => (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;

// Pure scheduler (SM-2 inspired). Returns a NEW card, never mutates input.
// grade: 1 = again, 2 = hard, 3 = good, 4 = easy.
function flashcardScheduler(grade, card, nowMs) {
  const t = typeof nowMs === "number" ? nowMs : Date.now();
  const base = card && typeof card === "object" ? card : {};
  const ease = typeof base.ease === "number" ? base.ease : 2.5;
  const interval = typeof base.intervalDays === "number" ? base.intervalDays : 0;
  const reps = typeof base.reps === "number" ? base.reps : 0;
  const lapses = typeof base.lapses === "number" ? base.lapses : 0;

  let next = { ...base };
  const g = Math.max(1, Math.min(4, Math.round(grade) || 3));

  if (g === 1) {
    next.ease = Math.round((Math.max(1.3, ease - 0.2)) * 100) / 100;
    next.intervalDays = 0;
    next.lapses = lapses + 1;
    next.reps = Math.max(0, reps - 1);
    next.due = t + 10 * FC_MIN_MS;
  } else if (g === 2) {
    next.ease = Math.round((Math.max(1.3, ease - 0.15)) * 100) / 100;
    next.intervalDays = reps === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
    next.reps = reps + 1;
    next.due = t + next.intervalDays * FC_DAY_MS;
  } else if (g === 3) {
    next.ease = ease;
    next.intervalDays = reps === 0 ? 1 : Math.max(1, Math.round(interval * ease));
    next.reps = reps + 1;
    next.due = t + next.intervalDays * FC_DAY_MS;
  } else {
    next.ease = Math.min(3, ease + 0.15);
    next.intervalDays = reps === 0 ? 3 : Math.max(1, Math.round(interval * ease * 1.3));
    next.reps = reps + 1;
    next.due = t + next.intervalDays * FC_DAY_MS;
  }
  next.ease = Math.round(next.ease * 100) / 100;
  next.lastReviewed = t;
  return next;
}

// Count cards whose due date passed (now included).
function flashcardsDueCount(cards, nowMs) {
  const t = typeof nowMs === "number" ? nowMs : Date.now();
  return (Array.isArray(cards) ? cards : []).filter(c => !c || typeof c.due !== "number" || c.due <= t).length;
}

function fcSaveAll(cb) {
  try {
    storSet({ [FC_STORAGE_KEY]: flashcardList }, () => {
      if (typeof cb === "function") cb();
    });
  } catch (e) {
    if (typeof cb === "function") cb();
  }
}

function fcLoad(cb) {
  storGet(FC_STORAGE_KEY, (res) => {
    flashcardList = Array.isArray(res && res[FC_STORAGE_KEY]) ? res[FC_STORAGE_KEY] : [];
    if (typeof cb === "function") cb();
  });
}

function fcRenderList() {
  const listEl = document.getElementById("fc-list");
  const badge = document.getElementById("fc-badge");
  const dueEl = document.getElementById("fc-due-count");
  if (!listEl) return;
  listEl.textContent = "";
  badge.textContent = flashcardList.length;
  const dueN = flashcardsDueCount(flashcardList);
  if (dueEl) {
    dueEl.textContent = dueN > 0 ? fcTr("fc_due_badge") + " " + dueN : "";
  }

  if (flashcardList.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "color:#64748b; font-size:11px; text-align:center; padding:10px 0;";
    empty.textContent = fcTr("fc_no_cards");
    listEl.appendChild(empty);
    return;
  }

  flashcardList.forEach((card, idx) => {
    const row = document.createElement("div");
    row.style.cssText = "background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.15); border-radius:6px; padding:6px 8px; display:flex; flex-direction:column; gap:2px;";
    const front = document.createElement("div");
    front.style.cssText = "font-size:11.5px; font-weight:700; color:#fde68a; white-space:pre-wrap; word-break:break-word;";
    front.textContent = card.front || "(?)";
    row.appendChild(front);
    if (card.back) {
      const back = document.createElement("div");
      back.style.cssText = "font-size:10.5px; color:#94a3b8; white-space:pre-wrap; word-break:break-word;";
      back.textContent = card.back;
      row.appendChild(back);
    }
    const meta = document.createElement("div");
    meta.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-top:2px;";
    const dueTxt = document.createElement("span");
    dueTxt.style.cssText = "font-size:10px; color:#64748b;";
    dueTxt.textContent = (typeof card.due === "number" && card.due <= Date.now()) ? fcTr("fc_due_now") : "";
    meta.appendChild(dueTxt);
    const delBtn = document.createElement("button");
    delBtn.className = "btn-text-small";
    delBtn.textContent = "✕";
    delBtn.title = fcTr("fc_delete");
    delBtn.style.cssText = "font-size:10px; color:#f87171; background:rgba(248,113,113,0.12); border:1px solid rgba(248,113,113,0.3); border-radius:4px; cursor:pointer; padding:1px 6px;";
    delBtn.addEventListener("click", () => {
      flashcardList = flashcardList.filter((_, i) => i !== idx);
      fcSaveAll(fcRenderList);
    });
    meta.appendChild(delBtn);
    row.appendChild(meta);
    listEl.appendChild(row);
  });
}

function fcOpenReview() {
  fcReviewQueue = flashcardList
    .filter(c => typeof c.due !== "number" || c.due <= Date.now())
    .slice()
    .sort((a, b) => (a.due || 0) - (b.due || 0));
  fcReviewIndex = 0;
  if (fcReviewQueue.length === 0) {
    showToast("fc_nothing_due", "info");
    return;
  }
  fcShowReviewCard();
}

function fcShowReviewCard() {
  const panel = document.getElementById("fc-review");
  const frontEl = document.getElementById("fc-rfront");
  const backEl = document.getElementById("fc-rback");
  const revealBtn = document.getElementById("btn-fc-reveal");
  const gradeRow = document.getElementById("fc-grade-row");
  if (!panel || !frontEl) return;
  panel.style.display = "block";

  if (fcReviewIndex >= fcReviewQueue.length) {
    frontEl.textContent = fcTr("fc_review_done");
    backEl.textContent = "";
    if (backEl) backEl.style.display = "none";
    if (revealBtn) revealBtn.style.display = "none";
    if (gradeRow) gradeRow.style.display = "none";
    return;
  }
  const card = fcReviewQueue[fcReviewIndex];
  frontEl.textContent = card.front || "?";
  backEl.textContent = card.back || "";
  backEl.style.display = "none";
  gradeRow.style.display = "none";
  revealBtn.style.display = "";
}

function fcGradeCurrent(grade) {
  if (fcReviewIndex >= fcReviewQueue.length) return;
  const card = fcReviewQueue[fcReviewIndex];
  const updated = flashcardScheduler(grade, card);
  const idx = flashcardList.findIndex(c => c.id === card.id);
  if (idx !== -1) flashcardList[idx] = updated;
  else flashcardList.push(updated);
  fcReviewIndex++;
  fcSaveAll(() => {
    fcRenderList();
    fcShowReviewCard();
  });
}

function fcInit() {
  const addForm = document.getElementById("fc-add-form");
  const libRow = document.getElementById("fc-lib-row");
  const reviewPanel = document.getElementById("fc-review");

  document.getElementById("btn-fc-add")?.addEventListener("click", () => {
    if (addForm) addForm.style.display = addForm.style.display === "none" ? "block" : "none";
    if (libRow) libRow.style.display = "none";
  });

  document.getElementById("btn-fc-from-lib")?.addEventListener("click", () => {
    if (libRow) libRow.style.display = libRow.style.display === "none" ? "flex" : "none";
    if (addForm) addForm.style.display = "none";
    const sel = document.getElementById("fc-lib-select");
    if (sel) {
      sel.textContent = "";
      let lib = [];
      try {
        storGet("saved_bibliographies", (res) => {
          lib = Array.isArray(res && res.saved_bibliographies) ? res.saved_bibliographies : [];
          const existingLibIds = flashcardList.map(c => c.libId).filter(Boolean);
          const fresh = lib.filter(item => item && item.id && !existingLibIds.includes(item.id));
          if (fresh.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = fcTr("fc_empty_lib");
            opt.disabled = true;
            opt.selected = true;
            sel.appendChild(opt);
            return;
          }
          fresh.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item.id;
            const t = String((item.meta && item.meta.title) || "").trim() || fcTr("fc_untitled");
            const a = String((item.meta && item.meta.authors) || "").trim();
            opt.textContent = (a ? a + " — " : "") + t.slice(0, 60);
            sel.appendChild(opt);
          });
        });
      } catch (e) { /* storage unavailable */ }
    }
  });

  document.getElementById("btn-fc-generate")?.addEventListener("click", () => {
    const sel = document.getElementById("fc-lib-select");
    const chosen = sel && sel.value ? sel.value : null;
    storGet("saved_bibliographies", (res) => {
      const lib = Array.isArray(res && res.saved_bibliographies) ? res.saved_bibliographies : [];
      const pick = chosen ? lib.filter(x => x.id === chosen) : lib;
      const existingLibIds = flashcardList.map(c => c.libId).filter(Boolean);
      const fresh = pick.filter(item => item && item.id && !existingLibIds.includes(item.id));
      fresh.forEach(item => {
        const meta = item.meta || {};
        const title = String(meta.title || "").trim() || fcTr("fc_untitled");
        const authors = String(meta.authors || "").trim();
        const ext = meta.doi ? "doi: " + meta.doi : "";
        flashcardList.push({
          id: "fc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
          front: title + (authors ? "\n" + authors : ""),
          back: [meta.container, meta.date, ext].filter(Boolean).join("\n"),
          libId: item.id,
          created: Date.now(),
          due: Date.now(),
          ease: 2.5,
          intervalDays: 0,
          reps: 0,
          lapses: 0
        });
      });
      fcSaveAll(() => {
        fcRenderList();
        showToast(fresh.length > 0 ? "fc_generated" : "fc_already",
          fresh.length > 0 ? "success" : "info", fresh.length > 0 ? [fresh.length] : null);
      });
      if (libRow) libRow.style.display = "none";
    });
  });

  document.getElementById("btn-fc-save")?.addEventListener("click", () => {
    const frontEl = document.getElementById("fc-front");
    const backEl = document.getElementById("fc-back");
    const front = frontEl ? frontEl.value.trim() : "";
    const back = backEl ? backEl.value.trim() : "";
    if (!front) {
      showToast("fc_need_front", "error");
      return;
    }
    flashcardList.push({
      id: "fc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      front: front,
      back: back,
      libId: null,
      created: Date.now(),
      due: Date.now(),
      ease: 2.5,
      intervalDays: 0,
      reps: 0,
      lapses: 0
    });
    if (frontEl) frontEl.value = "";
    if (backEl) backEl.value = "";
    if (addForm) addForm.style.display = "none";
    fcSaveAll(fcRenderList);
    showToast("fc_created", "success");
  });

  document.getElementById("btn-fc-cancel")?.addEventListener("click", () => {
    if (addForm) addForm.style.display = "none";
  });

  document.getElementById("btn-fc-review")?.addEventListener("click", () => {
    fcOpenReview();
  });

  document.getElementById("btn-fc-reveal")?.addEventListener("click", () => {
    const backEl = document.getElementById("fc-rback");
    const gradeRow = document.getElementById("fc-grade-row");
    if (backEl) backEl.style.display = "block";
    if (gradeRow) gradeRow.style.display = "flex";
  });

  const grades = [
    ["fc-g-again", 1],
    ["fc-g-hard", 2],
    ["fc-g-good", 3],
    ["fc-g-easy", 4]
  ];
  grades.forEach(([id, g]) => {
    document.getElementById(id)?.addEventListener("click", () => fcGradeCurrent(g));
  });

  document.getElementById("btn-fc-end")?.addEventListener("click", () => {
    fcReviewIndex = fcReviewQueue.length;
    if (reviewPanel) reviewPanel.style.display = "none";
  });

  fcLoad(fcRenderList);
}

if (document.readyState !== "loading") {
  fcInit();
} else {
  document.addEventListener("DOMContentLoaded", fcInit);
}

// Test hooks
window.flashcardScheduler = flashcardScheduler;
window.flashcardsDueCount = flashcardsDueCount;
window.fcRenderList = fcRenderList;
window.fcInit = fcInit;