// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/pomodoro.js
// Research Pomodoro module - focus timer with smart break planning + stats
// Replaces the removed Flashcards module (b4a35f5 - removed on request).
// ----------------------------------------------------------------------------
// Research Pomodoro: ring timer + break planner + daily/weekly stats + todo log
// ----------------------------------------------------------------------------
const PM_KEY = "sf_pomodoro";
const PM_MODE_I18N_MAP = { focus: "pm_mode_focus", short: "pm_mode_short", long: "pm_mode_long" };
const PM_RING_C = 2 * Math.PI * 49;
const PM_RING_COLORS = { focus: "#f97316", short: "#10b981", long: "#8b5cf6" };
const PM_PLAN_SHORT = 5;
const PM_PLAN_LONG = 15;
const PM_SESSION_GOAL = 8;
let pmData = { sessions: [], settings: { focus: 25, long: 50, short: 5 } };
let pmState = { mode: "focus", totalSec: 25 * 60, leftSec: 25 * 60, running: false, endAt: 0, intervalId: null };
let pmPlan = null;

function pomodoroFormatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return (m < 10 ? "0" + m : "" + m) + ":" + (r < 10 ? "0" + r : "" + r);
}

function pomodoroDailyStats(sessions, nowMs) {
  if (!Array.isArray(sessions)) return { count: 0, minutes: 0 };
  const d = new Date(nowMs || Date.now());
  const y = d.getFullYear(), mo = d.getMonth(), da = d.getDate();
  let count = 0, minutes = 0;
  sessions.forEach(s => {
    if (!s || !s.ts) return;
    const t = new Date(s.ts);
    if (t.getFullYear() === y && t.getMonth() === mo && t.getDate() === da) {
      count += 1;
      minutes += (typeof s.minutes === "number" ? s.minutes : 0);
    }
  });
  return { count, minutes };
}

function pomodoroWeekStats(sessions, nowMs) {
  const arr = [];
  const now = new Date(nowMs || Date.now());
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    let minutes = 0;
    if (Array.isArray(sessions)) {
      sessions.forEach(s => {
        if (!s || !s.ts) return;
        const t = new Date(s.ts);
        if (t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate()) {
          minutes += (typeof s.minutes === "number" ? s.minutes : 0);
        }
      });
    }
    arr.push({ date: d, label: String(d.getDate()), minutes: minutes });
  }
  return arr;
}

function pomodoroPlan(total, focus, longEvery) {
  total = Math.max(1, Math.round(total || 0));
  focus = Math.max(1, Math.round(focus || 25));
  longEvery = Math.max(2, Math.round(longEvery || 4));
  function breaksFor(n) {
    let sum = 0, long = 0;
    for (let p = 1; p <= n - 1; p++) {
      if (p % longEvery === 0) { sum += PM_PLAN_LONG; long += 1; } else { sum += PM_PLAN_SHORT; }
    }
    return { sum: sum, long: long };
  }
  if (total < focus) {
    return { blocks: 1, focusMinutes: total, shortBreaks: 0, longBreaks: 0, breakMinutes: 0, totalMinutes: total, leftover: 0, focusLength: focus, longEvery: longEvery };
  }
  let blocks = 1;
  while (true) {
    const n2 = blocks + 1;
    const br = breaksFor(n2);
    if (n2 * focus + br.sum <= total) blocks = n2; else break;
  }
  let br = breaksFor(blocks);
  let breakMinutes = br.sum;
  let longBreaks = br.long;
  let shortBreaks = (blocks - 1) - br.long;
  let spaceLeft = total - blocks * focus - breakMinutes;
  if (spaceLeft >= PM_PLAN_SHORT) {
    breakMinutes += PM_PLAN_SHORT;
    shortBreaks += 1;
    spaceLeft -= PM_PLAN_SHORT;
  }
  return {
    blocks: blocks,
    focusMinutes: blocks * focus,
    shortBreaks: shortBreaks,
    longBreaks: longBreaks,
    breakMinutes: breakMinutes,
    totalMinutes: blocks * focus + breakMinutes,
    leftover: spaceLeft,
    focusLength: focus,
    longEvery: longEvery
  };
}

function pomodoroNextMode(mode) {
  if (mode === "focus") return "short";
  if (mode === "short") return "focus";
  if (mode === "long") return "focus";
  return "focus";
}

function pmSetMode(mode) {
  pmStopTimer();
  pmState.mode = mode;
  pmState.totalSec = (pmData.settings[mode] || 25) * 60;
  pmState.leftSec = pmState.totalSec;
  pmRenderTime();
  pmRenderModeLabel();
  pmRenderToggle();
}

function pmStopTimer() {
  if (pmState.intervalId) {
    clearInterval(pmState.intervalId);
    pmState.intervalId = null;
  }
  pmState.running = false;
}

function pmRenderTime() {
  const el = document.getElementById("pm-time");
  if (el) el.textContent = pomodoroFormatTime(pmState.leftSec);
  pmRenderRing();
}

function pmRenderRing() {
  const fg = document.getElementById("pm-ring-fg");
  if (!fg) return;
  const ratio = pmState.totalSec > 0 ? (pmState.leftSec / pmState.totalSec) : 0;
  fg.setAttribute("stroke-dashoffset", String(PM_RING_C * (1 - ratio)));
  fg.setAttribute("stroke", PM_RING_COLORS[pmState.mode] || "#f97316");
}

function pmRenderModeLabel() {
  const el = document.getElementById("pm-mode-label");
  if (!el) return;
  const key = PM_MODE_I18N_MAP[pmState.mode] || "pm_mode_focus";
  el.textContent = getI18nText(key) || pmState.mode;
  el.style.color = PM_RING_COLORS[pmState.mode] || "#f97316";
}

function pmRenderToggle() {
  const btn = document.getElementById("btn-pm-toggle");
  if (!btn) return;
  const span = btn.querySelector("[data-i18n]");
  const label = pmState.running
    ? (getI18nText("pm_pause") || "Tạm dừng")
    : (getI18nText("pm_start") || "Bắt đầu");
  if (span) {
    span.textContent = label;
    span.setAttribute("data-i18n", pmState.running ? "pm_pause" : "pm_start");
  } else {
    btn.textContent = (pmState.running ? "⏸ " : "▶ ") + label;
  }
}

function pmRenderToday() {
  const el = document.getElementById("pm-today-stats");
  if (!el) return;
  const st = pomodoroDailyStats(pmData.sessions, Date.now());
  el.textContent = getI18nText("pm_today") + " " + st.count + " · " + st.minutes + "′";
}

function pmRenderSessionDots() {
  const el = document.getElementById("pm-session-dots");
  if (!el) return;
  el.textContent = "";
  const count = pomodoroDailyStats(pmData.sessions, Date.now()).count;
  const title = getI18nText("pm_session_dot") || "Phiên tập trung hôm nay";
  for (let i = 0; i < PM_SESSION_GOAL; i++) {
    const dot = document.createElement("span");
    dot.style.width = "10px";
    dot.style.height = "10px";
    dot.style.borderRadius = "50%";
    dot.style.display = "inline-block";
    dot.style.background = i < count ? "#10b981" : "rgba(255,255,255,0.12)";
    dot.style.border = i < count ? "1px solid rgba(16,185,129,0.6)" : "1px solid rgba(255,255,255,0.15)";
    if (i === count - 1) dot.style.boxShadow = "0 0 6px rgba(16,185,129,0.7)";
    if (i === count) dot.title = title;
    el.appendChild(dot);
  }
}

function pmRenderNote(text) {
  const el = document.getElementById("pm-note");
  if (!el) return;
  if (text) {
    el.textContent = text;
    el.style.display = "block";
  } else {
    el.textContent = "";
    el.style.display = "none";
  }
}

function pmPersist(cb) {
  storSet({ [PM_KEY]: pmData }, cb);
}

function pmLogSessionTodo(minutes) {
  storGet("sf_todos", (res) => {
    const todos = (res && Array.isArray(res.sf_todos)) ? [...res.sf_todos] : [];
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    todos.unshift({
      id: Date.now().toString(),
      text: "🍅 " + (getI18nText("pm_log_todo") || "Phiên tập trung") + " " + minutes + " phút",
      detail: timeStr,
      priority: "normal",
      done: false,
      createdAt: timeStr,
      kind: "pomodoro"
    });
    storSet({ sf_todos: todos });
    window.dispatchEvent(new CustomEvent("sf:todos-changed"));
  });
}

function pmCompleteSession() {
  pmStopTimer();
  if (pmState.mode === "focus") {
    const minutes = pmData.settings.focus || 25;
    pmData.sessions.push({ ts: Date.now(), minutes: minutes, mode: "focus" });
    pmPersist();
    pmRenderToday();
    pmRenderSessionDots();
    pmRenderWeek();
    pmLogSessionTodo(minutes);
    pmRenderNote("✅ " + (getI18nText("pm_done_focus") || "Đã xong 1 phiên tập trung!") + " " + minutes + "′");
    showToast("pm_done_focus", "success", [String(minutes)]);
  } else {
    pmRenderNote("☕ " + (getI18nText("pm_done_break") || "Nghỉ xong, quay lại nhé!"));
  }
  pmSetMode(pomodoroNextMode(pmState.mode));
}

function pmTick() {
  if (!pmState.running || !pmState.endAt) return;
  pmState.leftSec = Math.max(0, Math.ceil((pmState.endAt - Date.now()) / 1000));
  pmRenderTime();
  if (pmState.leftSec <= 0) pmCompleteSession();
}

function pmStartPause() {
  if (pmState.running) {
    pmStopTimer();
  } else {
    pmState.endAt = Date.now() + pmState.leftSec * 1000;
    pmState.running = true;
    pmState.intervalId = setInterval(pmTick, 1000);
  }
  pmRenderToggle();
}

function pmReset() {
  pmStopTimer();
  pmState.totalSec = (pmData.settings[pmState.mode] || 25) * 60;
  pmState.leftSec = pmState.totalSec;
  pmRenderTime();
  pmRenderToggle();
}

function pmPreset(mode) {
  pmSetMode(mode);
  pmRenderNote(null);
}

function pmApplyFocusLen(min) {
  const n = Math.max(1, Math.min(180, Math.round(min || 25)));
  pmData.settings.focus = n;
  pmPersist();
  pmSetMode("focus");
  pmRenderNote(null);
  showToast("pm_done_focus_saved_len", "success", [String(n)]);
}

function pmRunPlanCalc() {
  const totalEl = document.getElementById("pm-plan-work");
  const focusEl = document.getElementById("pm-plan-focus");
  const total = parseInt((totalEl ? totalEl.value : "90"), 10);
  const focus = parseInt((focusEl ? focusEl.value : "25"), 10);
  if (!total || total < 1) {
    pmRenderNote((getI18nText("pm_need_work_time") || "Vui lòng nhập tổng thời gian hợp lệ."));
    return;
  }
  pmPlan = pomodoroPlan(total, focus, 4);
  const sumEl = document.getElementById("pm-plan-summary");
  if (sumEl) {
    sumEl.textContent = getI18nText("pm_plan_summary", [pmPlan.blocks, pmPlan.focusLength, pmPlan.shortBreaks, pmPlan.longBreaks, pmPlan.totalMinutes]);
  }
  pmBuildTimeline(pmPlan);
  const leftEl = document.getElementById("pm-plan-leftover");
  if (leftEl) {
    leftEl.textContent = pmPlan.leftover > 0 ? (getI18nText("pm_plan_leftover", [String(pmPlan.leftover)]) || "") : "";
  }
  const resEl = document.getElementById("pm-plan-result");
  if (resEl) resEl.style.display = "block";
}

function pmBuildTimeline(plan) {
  const el = document.getElementById("pm-plan-timeline");
  if (!el) return;
  el.textContent = "";
  for (let i = 0; i < plan.blocks; i++) {
    el.appendChild(pmMakeChip(getI18nText("pm_plan_badge_focus", [String(plan.focusLength)]), "#f97316"));
    if (i < plan.blocks - 1) {
      const breakIdx = i + 1;
      if (breakIdx % plan.longEvery === 0) {
        el.appendChild(pmMakeChip(getI18nText("pm_plan_badge_long"), "#8b5cf6"));
      } else {
        el.appendChild(pmMakeChip(getI18nText("pm_plan_badge_short"), "#10b981"));
      }
    }
  }
}

function pmMakeChip(label, color) {
  const s = document.createElement("span");
  s.textContent = label || "";
  s.style.display = "inline-block";
  s.style.padding = "3px 8px";
  s.style.borderRadius = "6px";
  s.style.fontSize = "10.5px";
  s.style.fontWeight = "700";
  s.style.color = color;
  s.style.background = "rgba(15,23,42,0.6)";
  s.style.border = "1px solid " + color;
  return s;
}

function pmPlanApply() {
  if (!pmPlan) return;
  pmData.settings.focus = pmPlan.focusLength;
  pmPersist();
  pmSetMode("focus");
  pmRenderNote(null);
  showToast("pm_plan_applied", "success", [String(pmPlan.focusLength)]);
}

function pmRenderWeek() {
  const el = document.getElementById("pm-week-bars");
  if (!el) return;
  el.textContent = "";
  const week = pomodoroWeekStats(pmData.sessions, Date.now());
  const max = Math.max.apply(null, week.map(d => d.minutes).concat([1]));
  const unit = getI18nText("pm_week_min") || "phút";
  week.forEach(d => {
    const col = document.createElement("div");
    col.style.flex = "1";
    col.style.display = "flex";
    col.style.flexDirection = "column";
    col.style.alignItems = "center";
    col.style.justifyContent = "flex-end";
    col.style.gap = "3px";
    const bar = document.createElement("div");
    bar.style.width = "100%";
    bar.style.maxWidth = "26px";
    bar.style.height = String(Math.max(3, Math.round((d.minutes / max) * 62))) + "px";
    bar.style.borderRadius = "5px 5px 0 0";
    bar.style.background = d.minutes > 0 ? "linear-gradient(180deg, #fbbf24, #f97316)" : "rgba(255,255,255,0.08)";
    bar.setAttribute("title", unit + " " + d.minutes);
    const label = document.createElement("div");
    label.textContent = d.label;
    label.style.fontSize = "10px";
    label.style.color = d.minutes > 0 ? "#fbbf24" : "#64748b";
    label.style.fontWeight = "700";
    col.appendChild(bar);
    col.appendChild(label);
    el.appendChild(col);
  });
}

function pmBind() {
  const elToggle = document.getElementById("btn-pm-toggle");
  if (elToggle) elToggle.addEventListener("click", pmStartPause);
  const elReset = document.getElementById("btn-pm-reset");
  if (elReset) elReset.addEventListener("click", pmReset);
  const btnFocus = document.getElementById("pm-preset-focus");
  if (btnFocus) btnFocus.addEventListener("click", () => pmPreset("focus"));
  const btnLong = document.getElementById("pm-preset-long");
  if (btnLong) btnLong.addEventListener("click", () => pmPreset("long"));
  const btnShort = document.getElementById("pm-preset-short");
  if (btnShort) btnShort.addEventListener("click", () => pmPreset("short"));
  const btnApplyCustom = document.getElementById("btn-pm-apply-custom");
  if (btnApplyCustom) btnApplyCustom.addEventListener("click", () => {
    const inp = document.getElementById("pm-focus-custom");
    pmApplyFocusLen(inp ? parseInt(inp.value, 10) : 25);
  });
  const btnCalc = document.getElementById("btn-pm-plan-calc");
  if (btnCalc) btnCalc.addEventListener("click", pmRunPlanCalc);
  const btnPlanApply = document.getElementById("btn-pm-plan-apply");
  if (btnPlanApply) btnPlanApply.addEventListener("click", pmPlanApply);
}

function pmLoad() {
  storGet(PM_KEY, (res) => {
    const data = res && res[PM_KEY] ? res[PM_KEY] : {};
    pmData.sessions = Array.isArray(data.sessions) ? data.sessions : [];
    pmData.settings = Object.assign({ focus: 25, long: 50, short: 5 }, data.settings || {});
    pmSetMode(pmState.mode);
    pmRenderToday();
    pmRenderSessionDots();
    pmRenderWeek();
    pmBind();
  });
}

window.pmIsRunning = () => pmState.running;
window.pmCompleteSession = pmCompleteSession;

pmLoad();