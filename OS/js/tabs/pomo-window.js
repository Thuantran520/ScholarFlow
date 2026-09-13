// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/pomo-window.js
// Standalone floating mirror for the Research Pomodoro timer.
// Lives in its own popup window (chrome/browser windows.create) and keeps in
// sync with the sidebar via the shared storage snapshot key sf_pomodoro_active.
// Control buttons only write intents (sf_pomodoro_ctl) consumed by the sidebar.
// ---------------------------------------------------------------------------
const PW_KEY = "sf_pomodoro_active";
const PW_CTL_KEY = "sf_pomodoro_ctl";
const PW_C = 2 * Math.PI * 66;
const PW_COLORS = { focus: "#f97316", short: "#10b981", long: "#8b5cf6" };
const PW_MODE_I18N = { focus: "pm_mode_focus", short: "pm_mode_short", long: "pm_mode_long" };
let pwSnap = {};

function pwFormatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return (m < 10 ? "0" + m : "" + m) + ":" + (r < 10 ? "0" + r : "" + r);
}

function pwRender() {
  const s = pwSnap || {};
  const mode = s.mode || "focus";
  const totalSec = s.totalSec || 25 * 60;
  let leftSec = typeof s.leftSec === "number" ? s.leftSec : totalSec;
  if (s.running && s.endAt) {
    leftSec = Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000));
  }
  const timeEl = document.getElementById("pw-time");
  if (timeEl) timeEl.textContent = pwFormatTime(leftSec);
  const modeEl = document.getElementById("pw-mode");
  if (modeEl) {
    const label = getI18nText(PW_MODE_I18N[mode] || "pm_mode_focus") || mode;
    modeEl.textContent = label;
    modeEl.style.color = PW_COLORS[mode] || "#f97316";
  }
  const fg = document.getElementById("pw-ring-fg");
  if (fg) {
    const ratio = totalSec > 0 ? leftSec / totalSec : 0;
    fg.setAttribute("stroke-dashoffset", String(PW_C * (1 - ratio)));
    fg.setAttribute("stroke", PW_COLORS[mode] || "#f97316");
  }
  const statusEl = document.getElementById("pw-status");
  if (statusEl) {
    statusEl.textContent = s.running
      ? (getI18nText("pm_running") || "Đang chạy…")
      : (getI18nText("pm_paused") || "Tạm dừng");
  }
  const toggleEl = document.getElementById("pw-toggle");
  if (toggleEl) {
    toggleEl.textContent = s.running ? "⏸" : "▶";
  }
}

function pwLoad() {
  storGet(PW_KEY, (res) => {
    if (res && res[PW_KEY]) pwSnap = res[PW_KEY];
    pwRender();
  });
}

function pwSendCtl(cmd) {
  storSet({ [PW_CTL_KEY]: { cmd: cmd, stamp: Date.now() } });
}

function pwBind() {
  const toggleEl = document.getElementById("pw-toggle");
  if (toggleEl) {
    toggleEl.addEventListener("click", () => {
      pwSendCtl(pwSnap.running ? "pause" : "start");
    });
  }
  const resetEl = document.getElementById("pw-reset");
  if (resetEl) {
    resetEl.addEventListener("click", () => pwSendCtl("reset"));
  }
  const store = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged)
    ? chrome.storage
    : null;
  if (store && store.onChanged && store.onChanged.addListener) {
    store.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      const ch = changes && changes[PW_KEY];
      if (ch && ch.newValue) {
        pwSnap = ch.newValue;
        pwRender();
      }
    });
  }
  setInterval(pwLoad, 1000);
}

pwBind();
pwLoad();