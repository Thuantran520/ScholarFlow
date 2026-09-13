// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/pomodoro.js
// Research Pomodoro module - focus timer with session logging
// Replaces the removed Flashcards module (b4a35f5 - removed on request).
// ----------------------------------------------------------------------------
// Research Pomodoro: timer + daily stats + auto todo log on focus completion
// ----------------------------------------------------------------------------
const PM_KEY = "sf_pomodoro";
const PM_MODE_I18N_MAP = { focus: "pm_mode_focus", short: "pm_mode_short", long: "pm_mode_long" };
let pmData = { sessions: [], settings: { focus: 25, long: 50, short: 5 } };
let pmState = { mode: "focus", totalSec: 25 * 60, leftSec: 25 * 60, running: false, endAt: 0, intervalId: null };

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
}

function pmRenderModeLabel() {
  const el = document.getElementById("pm-mode-label");
  if (!el) return;
  const key = PM_MODE_I18N_MAP[pmState.mode] || "pm_mode_focus";
  el.textContent = getI18nText(key) || pmState.mode;
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
}

function pmLoad() {
  storGet(PM_KEY, (res) => {
    const data = res && res[PM_KEY] ? res[PM_KEY] : {};
    pmData.sessions = Array.isArray(data.sessions) ? data.sessions : [];
    pmData.settings = Object.assign({ focus: 25, long: 50, short: 5 }, data.settings || {});
    pmSetMode(pmState.mode);
    pmRenderToday();
    pmBind();
  });
}

window.pmIsRunning = () => pmState.running;
window.pmCompleteSession = pmCompleteSession;

pmLoad();