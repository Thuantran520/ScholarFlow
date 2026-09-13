// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/pomo-window.js
// Standalone floating mirror for the Research Pomodoro timer.
// Lives in its own popup window (chrome/browser windows.create) and keeps in
// sync with the sidebar via the shared storage snapshot key sf_pomodoro_active.
// Control buttons only write intents (sf_pomodoro_ctl) consumed by the sidebar.
// ---------------------------------------------------------------------------
const PW_KEY = "sf_pomodoro_active";
const PW_CTL_KEY = "sf_pomodoro_ctl";
const PW_C = 2 * Math.PI * 81;
const PW_SIZE_KEY = "sf_pomo_win";
const PW_SIZES = { s: { w: 240, h: 340 }, m: { w: 320, h: 440 }, l: { w: 420, h: 560 } };
const PW_MINI = { w: 240, h: 150 };
const PW_COLORS = { focus: "#f97316", short: "#10b981", long: "#8b5cf6" };
const PW_MODE_I18N = { focus: "pm_mode_focus", short: "pm_mode_short", long: "pm_mode_long" };
let pwSnap = {};
let pwNormalSize = { w: PW_SIZES.m.w, h: PW_SIZES.m.h };
let pwMini = false;

function pwWindowsApi() {
  return (typeof chrome !== "undefined" && chrome.windows) ? chrome.windows
    : (typeof browser !== "undefined" && browser.windows ? browser.windows : null);
}

function pwApplySize(w, h, remember) {
  const size = { w: Math.round(w), h: Math.round(h) };
  if (remember !== false) pwNormalSize = size;
  const win = pwWindowsApi();
  if (!win || !win.getCurrent || !win.update) return;
  win.getCurrent()
    .then((winInfo) => {
      if (winInfo && winInfo.id != null) {
        win.update(winInfo.id, { width: size.w, height: size.h }).catch(() => {});
      }
    })
    .catch(() => {});
}

function pwPersistSize() {
  storSet({ [PW_SIZE_KEY]: { w: pwNormalSize.w, h: pwNormalSize.h, mini: pwMini } });
}

function pwSetMini(yes) {
  pwMini = !!yes;
  if (document.body) document.body.classList.toggle("pw-mini", pwMini);
  pwApplySize(pwMini ? PW_MINI.w : pwNormalSize.w, pwMini ? PW_MINI.h : pwNormalSize.h, !pwMini);
  pwPersistSize();
}

function pwSetPreset(key, btnEl) {
  const s = PW_SIZES[key] || PW_SIZES.m;
  pwMini = false;
  if (document.body) document.body.classList.remove("pw-mini");
  pwApplySize(s.w, s.h, true);
  pwPersistSize();
  document.querySelectorAll("[data-size]").forEach((b) => {
    b.classList.toggle("on", b === btnEl);
  });
}

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
  if (document.body) {
    document.body.classList.toggle("pw-running", !!s.running);
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

function pwLoadSize() {
  storGet(PW_SIZE_KEY, (res) => {
    const saved = res && res[PW_SIZE_KEY];
    if (saved) {
      if (typeof saved.w === "number" && typeof saved.h === "number") {
        pwNormalSize = { w: saved.w, h: saved.h };
      }
      const wantMini = !!saved.mini;
      if (wantMini !== pwMini) {
        pwMini = wantMini;
        if (document.body) document.body.classList.toggle("pw-mini", pwMini);
      }
    }
    pwApplySize(pwMini ? PW_MINI.w : pwNormalSize.w, pwMini ? PW_MINI.h : pwNormalSize.h, false);
    pwRenderActiveSize();
  });
}

function pwRenderActiveSize() {
  const cur = pwMini ? null : pwNormalSize;
  document.querySelectorAll("[data-size]").forEach((b) => {
    const s = PW_SIZES[b.getAttribute("data-size")];
    const on = !pwMini && cur && s && s.w === cur.w && s.h === cur.h;
    b.classList.toggle("on", !!on);
  });
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
  document.querySelectorAll("[data-size]").forEach((btn) => {
    btn.addEventListener("click", () => pwSetPreset(btn.getAttribute("data-size"), btn));
  });
  const miniEl = document.getElementById("pw-mini-toggle");
  if (miniEl) {
    miniEl.addEventListener("click", () => pwSetMini(!pwMini));
  }
  const win = pwWindowsApi();
  if (win && win.onBoundsChanged && win.onBoundsChanged.addListener) {
    win.onBoundsChanged.addListener((bounds) => {
      if (!bounds || bounds.id == null) return;
      pwNormalSize = { w: Math.round(bounds.width) || pwNormalSize.w, h: Math.round(bounds.height) || pwNormalSize.h };
      pwRenderActiveSize();
      if (!pwMini) pwPersistSize();
    });
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
pwLoadSize();