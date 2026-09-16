// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/pomodoro.js
// Research Pomodoro module - focus timer with smart break planning + stats
// Replaces the removed Flashcards module (b4a35f5 - removed on request).
// ----------------------------------------------------------------------------
// Research Pomodoro: ring timer + break planner + daily/weekly stats + todo log
// ----------------------------------------------------------------------------
const PM_KEY = "sf_pomodoro";
const PM_ACTIVE_KEY = "sf_pomodoro_active";
const PM_CTL_KEY = "sf_pomodoro_ctl";
const PM_MODE_I18N_MAP = { focus: "pm_mode_focus", short: "pm_mode_short", long: "pm_mode_long" };
const PM_RING_C = 2 * Math.PI * 49;
const PM_RING_COLORS = { focus: "#f97316", short: "#10b981", long: "#8b5cf6" };
const PM_PLAN_SHORT = 5;
const PM_PLAN_LONG = 15;
const PM_SESSION_GOAL = 8;
const PM_MUSIC_KEY = "sf_pomodoro_music";
const PM_MUSIC_URLS = {
  lofi: "https://music.youtube.com/search?q=lofi+study+mix",
  focus: "https://music.youtube.com/search?q=deep+focus+instrumental+work",
  chill: "https://music.youtube.com/search?q=chill+relax+acoustic",
  piano: "https://music.youtube.com/search?q=calm+piano+study"
};
let pmMusicTabs = [];
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

function pomodoroPlan(total, focus, longEvery, shortLen, longLen, allowTrail) {
  total = Math.max(1, Math.round(total || 0));
  focus = Math.max(1, Math.round(focus || 25));
  longEvery = Math.max(2, Math.round(longEvery || 4));
  const short = Math.max(1, Math.min(30, Math.round(shortLen || PM_PLAN_SHORT)));
  const long = Math.max(5, Math.min(45, Math.round(longLen || PM_PLAN_LONG)));
  const trail = allowTrail !== false;
  function breaksFor(n) {
    let sum = 0, longCnt = 0;
    for (let p = 1; p <= n - 1; p++) {
      if (p % longEvery === 0) { sum += long; longCnt += 1; } else { sum += short; }
    }
    return { sum: sum, long: longCnt };
  }
  if (total < focus) {
    return { blocks: 1, focusMinutes: total, shortBreaks: 0, longBreaks: 0, breakMinutes: 0, totalMinutes: total, leftover: 0, focusLength: focus, longEvery: longEvery, shortLen: short, longLen: long };
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
  if (trail && spaceLeft >= short) {
    breakMinutes += short;
    shortBreaks += 1;
    spaceLeft -= short;
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
    longEvery: longEvery,
    shortLen: short,
    longLen: long
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
  pmPublishActive();
}

function pmStopTimer() {
  if (pmState.intervalId) {
    clearInterval(pmState.intervalId);
    pmState.intervalId = null;
  }
  pmState.running = false;
}

function pmPublishActive() {
  storSet({
    [PM_ACTIVE_KEY]: {
      sender: "tab",
      mode: pmState.mode,
      totalSec: pmState.totalSec,
      leftSec: pmState.leftSec,
      endAt: pmState.running ? pmState.endAt : 0,
      running: pmState.running,
      stamp: Date.now()
    }
  });
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
    pmRenderNote(getI18nText("pm_done_focus", [String(minutes)]));
    showToast("pm_done_focus", "success", [String(minutes)]);
  } else {
    pmRenderNote("☕ " + (getI18nText("pm_done_break") || "Nghỉ xong, quay lại nhé!"));
    pmStopMusic(true);
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
  pmPublishActive();
}

function pmReset() {
  pmStopTimer();
  pmState.totalSec = (pmData.settings[pmState.mode] || 25) * 60;
  pmState.leftSec = pmState.totalSec;
  pmRenderTime();
  pmRenderToggle();
  pmPublishActive();
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
  const shortEl = document.getElementById("pm-plan-short-len");
  const longEl = document.getElementById("pm-plan-long-len");
  const everyEl = document.getElementById("pm-plan-long-every");
  const trailEl = document.getElementById("pm-plan-trail-sb");
  const total = parseInt((totalEl ? totalEl.value : "90"), 10);
  const focus = parseInt((focusEl ? focusEl.value : "25"), 10);
  const short = parseInt((shortEl ? shortEl.value : "5"), 10);
  const long = parseInt((longEl ? longEl.value : "15"), 10);
  const every = parseInt((everyEl ? everyEl.value : "4"), 10);
  const allowTrail = trailEl ? trailEl.checked : true;
  if (!total || total < 1) {
    pmRenderNote((getI18nText("pm_need_work_time") || "Vui lòng nhập tổng thời gian hợp lệ."));
    return;
  }
  pmPlan = pomodoroPlan(total, focus, every, short, long, allowTrail);
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
  const endEl = document.getElementById("pm-plan-endclock");
  if (endEl) {
    const endMs = Date.now() + (pmPlan.totalMinutes + (pmPlan.leftover || 0)) * 60000;
    const d = new Date(endMs);
    const hh = ("0" + d.getHours()).slice(-2); const mm = ("0" + d.getMinutes()).slice(-2);
    endEl.textContent = getI18nText("pm_plan_end_at", [hh + ":" + mm]) || ("~" + hh + ":" + mm);
    endEl.style.display = "";
  }
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
        el.appendChild(pmMakeChip(getI18nText("pm_plan_badge_long", [String(plan.longLen)]), "#8b5cf6"));
      } else {
        el.appendChild(pmMakeChip(getI18nText("pm_plan_badge_short", [String(plan.shortLen)]), "#10b981"));
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

function pmBindSteppers() {
  document.querySelectorAll("[data-step-for]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const inp = document.getElementById(btn.getAttribute("data-step-for"));
      if (!inp) return;
      const delta = parseInt(btn.getAttribute("data-step-delta"), 10) || 0;
      const min = parseInt(inp.min, 10);
      const max = parseInt(inp.max, 10);
      let val = parseInt(inp.value, 10);
      if (!val || isNaN(val)) val = parseInt(inp.defaultValue, 10) || 0;
      const lo = isNaN(min) ? 1 : min;
      const hi = isNaN(max) ? 24 * 60 : max;
      inp.value = String(Math.max(lo, Math.min(hi, val + delta)));
    });
  });
}

function pmOpenWindow() {
  const getUrl = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL)
    ? chrome.runtime.getURL
    : (typeof browser !== "undefined" && browser.runtime && browser.runtime.getURL
      ? browser.runtime.getURL
      : null);
  const url = getUrl ? getUrl("OS/html/pomo-window.html") : "OS/html/pomo-window.html";
const wApi = (typeof browser !== "undefined" && browser.windows && browser.windows.create)
    ? browser.windows
    : (typeof chrome !== "undefined" && chrome.windows ? chrome.windows : null);
  if (wApi) {
    wApi.create({ url: url, type: "popup", width: 360, height: 480 });
  } else if (typeof window !== "undefined" && window.open) {
    window.open(url, "_blank", "width=360,height=480");
  }
}

function pmMusicPersist() {
  storSet({ [PM_MUSIC_KEY]: pmMusicTabs });
}

function pmMusicLoad() {
  storGet(PM_MUSIC_KEY, (res) => {
    pmMusicTabs = (res && Array.isArray(res[PM_MUSIC_KEY])) ? res[PM_MUSIC_KEY].slice() : [];
  });
}

function pmOpenMusic() {
  const scene = document.getElementById("pm-music-scene");
  const musicUrl = PM_MUSIC_URLS[scene ? scene.value : "lofi"] || PM_MUSIC_URLS.lofi;
  const tabsApi = (typeof browser !== "undefined" && browser.tabs && browser.tabs.create)
    ? browser.tabs
    : (typeof chrome !== "undefined" && chrome.tabs ? chrome.tabs : null);
  if (tabsApi) {
    tabsApi.create({ url: musicUrl })
      .then((tab) => {
        if (tab && typeof tab.id === "number") {
          pmMusicTabs.push(tab.id);
          pmMusicPersist();
        }
        showToast("pm_music_opened", "success");
      })
      .catch(() => {});
  } else if (typeof window !== "undefined" && window.open) {
    window.open(musicUrl, "_blank");
  }
}

function pmCloseMusicTabs(ids) {
  const tabsApi = (typeof browser !== "undefined" && browser.tabs && browser.tabs.remove)
    ? browser.tabs
    : (typeof chrome !== "undefined" && chrome.tabs ? chrome.tabs : null);
  if (!tabsApi || !Array.isArray(ids) || !ids.length) return;
  const list = ids.slice();
  const fireRemove = () => {
    try {
      const done = tabsApi.remove(list);
      if (done && typeof done.catch === "function") done.catch(() => {});
    } catch (e) {}
  };
  if (!tabsApi.update) {
    setTimeout(fireRemove, 150);
    return;
  }
  let pending = list.length;
  const onDone = () => {
    pending -= 1;
    if (pending <= 0) setTimeout(fireRemove, 150);
  };
  list.forEach((id) => {
    try {
      const p = tabsApi.update(id, { url: "about:blank" });
      if (p && typeof p.then === "function") p.then(onDone).catch(onDone);
      else onDone();
    } catch (e) { onDone(); }
  });
}

function pmStopMusic(quiet, tabs) {
  const ids = (typeof tabs !== "undefined" && tabs !== null) ? tabs : pmMusicTabs;
  const clearTracking = (typeof tabs === "undefined" || tabs === null);
  if (clearTracking) {
    pmMusicTabs = [];
    pmMusicPersist();
  }
  if (clearTracking && !quiet) showToast("pm_music_stopped", "warning");
  if (Array.isArray(ids) && ids.length) {
    if (typeof document !== "undefined") setTimeout(() => pmCloseMusicTabs(ids), 1200);
    else pmCloseMusicTabs(ids);
  }
}

function pmApplyCtl(ctl) {
  if (!ctl || !ctl.cmd) return;
  if (ctl.cmd === "start" && !pmState.running) pmStartPause();
  else if (ctl.cmd === "pause" && pmState.running) pmStartPause();
  else if (ctl.cmd === "reset") pmReset();
}

function pmBindStorageCtl() {
  const store = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged)
    ? chrome.storage
    : null;
  if (store && store.onChanged && store.onChanged.addListener) {
    store.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      const ch = changes && changes[PM_CTL_KEY];
      if (ch && ch.newValue) pmApplyCtl(ch.newValue);
    });
  }
}

function pmBind() {
  const elToggle = document.getElementById("btn-pm-toggle");
  if (elToggle) elToggle.addEventListener("click", pmStartPause);
  const elReset = document.getElementById("btn-pm-reset");
  if (elReset) elReset.addEventListener("click", pmReset);
  const elPopout = document.getElementById("btn-pm-popout");
  if (elPopout) elPopout.addEventListener("click", pmOpenWindow);
  const elMusicOpen = document.getElementById("btn-pm-music-open");
  if (elMusicOpen) elMusicOpen.addEventListener("click", pmOpenMusic);
  const elMusicStop = document.getElementById("btn-pm-music-stop");
  if (elMusicStop) elMusicStop.addEventListener("click", () => pmStopMusic(false));
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
  ["pm-preset-deep", "pm-preset-sprint", "pm-preset-reading", "pm-preset-light"].forEach(function (id) {
    const chip = document.getElementById(id);
    if (!chip) return;
    chip.addEventListener("click", function () {
      const w = document.getElementById("pm-plan-work"); if (w) w.value = chip.getAttribute("data-w");
      const f = document.getElementById("pm-plan-focus"); if (f) f.value = chip.getAttribute("data-f");
      const s = document.getElementById("pm-plan-short-len"); if (s) s.value = chip.getAttribute("data-s");
      const l = document.getElementById("pm-plan-long-len"); if (l) l.value = chip.getAttribute("data-l");
      const e = document.getElementById("pm-plan-long-every"); if (e) e.value = chip.getAttribute("data-e");
      pmRunPlanCalc();
    });
  });
  const btnPlanApply = document.getElementById("btn-pm-plan-apply");
  if (btnPlanApply) btnPlanApply.addEventListener("click", pmPlanApply);
  pmBindSteppers();
  pmBindStorageCtl();
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
    pmMusicLoad();
  });
}

window.pmIsRunning = () => pmState.running;
window.pmCompleteSession = pmCompleteSession;

pmLoad();