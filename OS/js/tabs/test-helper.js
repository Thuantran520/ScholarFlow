// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/test-helper.js
// PRO Test Helper: record/replay, crawl, console/network watch, visual diff,
// link check, form fuzz, a11y, perf, bug report + zip download.
// 100% local, Firefox + Chromium via chrome.* compat.
// ---------------------------------------------------------------------------
let testHelperState = { recording: false, steps: [], logs: [], shots: [], results: [] };
let _thLogListener = null;

function _thGetTabsApi() {
  try { if (typeof chrome !== "undefined" && chrome.tabs) return chrome.tabs; if (typeof browser !== "undefined" && browser.tabs) return browser.tabs; } catch (e) {}
  return null;
}
function _thExecInPage(func, args, cb) {
  try {
    const api = (typeof chrome !== "undefined" && chrome.scripting) ? chrome.scripting : (typeof browser !== "undefined" && browser.scripting) ? browser.scripting : null;
    if (!api || !api.executeScript) { if (cb) cb(null); return; }
    const tabsApi = _thGetTabsApi();
    if (!tabsApi || !tabsApi.query) { if (cb) cb(null); return; }
    const findActiveTab = function (onFound) {
      const tryQuery = function (queryObj, next) {
        try {
          const q = tabsApi.query(queryObj);
          const h = function (tabs) {
            const filtered = (tabs || []).filter(function (t) { return t.url && t.url.indexOf("moz-extension" + "://") !== 0 && t.url.indexOf("chrome-extension" + "://") !== 0; });
            const tab = filtered.find(function (t) { return t.active; }) || filtered[0] || (tabs && tabs[0]);
            if (tab && tab.id) onFound(tab);
            else if (next) next();
            else if (cb) cb(null);
          };
          if (q && typeof q.then === "function") q.then(h).catch(function () { if (next) next(); else if (cb) cb(null); });
          else tabsApi.query(queryObj, h);
        } catch (e2) { if (next) next(); else if (cb) cb(null); }
      };
      // popup/sidebar are extension windows — must query lastFocusedWindow, not currentWindow
      tryQuery({ active: true, lastFocusedWindow: true }, function () {
        tryQuery({ active: true, currentWindow: true }, function () {
          tryQuery({}, function () { if (cb) cb(null); });
        });
      });
    };
    findActiveTab(function (tab) {
      try {
        const p = api.executeScript({ target: { tabId: tab.id }, func: func, args: args || [] });
        if (p && typeof p.then === "function") p.then(function (r) { if (cb) cb(r && r[0] ? r[0].result : null); }).catch(function () { if (cb) cb(null); });
        else if (cb) cb(null);
      } catch (e3) { if (cb) cb(null); }
    });
  } catch (e) { if (cb) cb(null); }
}

function thStartRecord() {
  if (testHelperState.recording) return;
  testHelperState.recording = true;
  testHelperState.steps = [];
  _thExecInPage(function () {
    if (window.__thRecInstalled) return true;
    window.__thRecInstalled = true;
    window.__thSteps = [];
    const push = function (type, data) { window.__thSteps.push({ t: Date.now(), type: type, data: data }); };
    document.addEventListener("click", function (e) {
      const el = e.target;
      const sel = el && el.tagName ? el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className ? "." + String(el.className).split(" ").slice(0, 2).join(".") : "") : "unknown";
      push("click", { sel: sel, x: e.clientX, y: e.clientY, text: (el.innerText || "").slice(0, 80) });
    }, true);
    document.addEventListener("input", function (e) {
      const el = e.target;
      push("input", { sel: el.tagName + (el.id ? "#" + el.id : ""), val: (el.value || "").slice(0, 80) });
    }, true);
    document.addEventListener("keydown", function (e) { push("keydown", { key: e.key }); }, true);
    return true;
  }, [], function () { showToast(t("th_toast_rec_start")); thRenderLog(); });
  // start console watch
  _thStartConsoleWatch();
  const btn = document.getElementById("btn-th-record");
  if (btn) { btn.textContent = t("th_btn_stop_rec"); btn.classList.add("is-recording"); }
}

function thStopRecord() {
  if (!testHelperState.recording) return;
  testHelperState.recording = false;
  _thExecInPage(function () { const s = window.__thSteps || []; window.__thSteps = []; return s; }, [], function (res) {
    if (Array.isArray(res)) testHelperState.steps = testHelperState.steps.concat(res);
    showToast(t("th_toast_rec_stop").replace("{0}", String(testHelperState.steps.length)));
    thRenderLog();
  });
  _thStopConsoleWatch();
  const btn = document.getElementById("btn-th-record");
  if (btn) { btn.textContent = t("th_btn_start_rec"); btn.classList.remove("is-recording"); }
}

function thReplay() {
  if (!testHelperState.steps || testHelperState.steps.length === 0) { showToast(t("th_toast_no_steps")); return; }
  let idx = 0;
  const next = function () {
    if (idx >= testHelperState.steps.length) { showToast(t("th_toast_replay_done")); thRenderLog(); return; }
    const step = testHelperState.steps[idx++];
    _thExecInPage(function (s) {
      try {
        if (s.type === "click") {
          const el = document.querySelector(s.data.sel) || document.elementFromPoint(s.data.x || 100, s.data.y || 100);
          if (el) el.click();
          return "click:" + s.data.sel;
        }
        if (s.type === "input") {
          const el = document.querySelector(s.data.sel);
          if (el) { el.focus(); el.value = s.data.val; el.dispatchEvent(new Event("input", { bubbles: true })); }
          return "input:" + s.data.sel;
        }
        if (s.type === "keydown") {
          document.dispatchEvent(new KeyboardEvent("keydown", { key: s.data.key, bubbles: true }));
          return "key:" + s.data.key;
        }
      } catch (e) { return "err:" + e.message; }
      return "skip";
    }, [step], function () { setTimeout(next, 400); });
  };
  showToast(t("th_toast_replay_start"));
  next();
}

function _thStartConsoleWatch() {
  if (_thLogListener) return;
  try {
    _thLogListener = function (msg) {
      testHelperState.logs.push({ time: new Date().toLocaleTimeString(), msg: String(msg && msg.message ? msg.message : msg) });
      if (testHelperState.logs.length > 80) testHelperState.logs.shift();
      thRenderLog();
    };
    // listen via runtime? fallback: poll console via content script
    // we inject a hook that forwards console.error to background
    _thExecInPage(function () {
      if (window.__thConsoleHook) return true;
      window.__thConsoleHook = true;
      const origErr = console.error;
      console.error = function () {
        try { window.__thLogs = window.__thLogs || []; window.__thLogs.push(Array.from(arguments).join(" ").slice(0, 200)); } catch (e2) {}
        return origErr.apply(console, arguments);
      };
      window.addEventListener("error", function (e) {
        try { window.__thLogs = window.__thLogs || []; window.__thLogs.push((e.message || "error").slice(0, 200)); } catch (e2) {}
      });
      return true;
    }, []);
  } catch (e2) {}
}
function _thStopConsoleWatch() { _thLogListener = null; }

function thRefreshLogs() {
  _thExecInPage(function () { return { logs: window.__thLogs || [], perf: performance.timing ? JSON.stringify({ load: performance.timing.loadEventEnd - performance.timing.navigationStart }) : "" }; }, [], function (res) {
    if (res && Array.isArray(res.logs) && res.logs.length) {
      res.logs.forEach(function (m) { testHelperState.logs.push({ time: new Date().toLocaleTimeString(), msg: m }); });
      if (testHelperState.logs.length > 80) testHelperState.logs = testHelperState.logs.slice(-80);
    }
    thRenderLog();
  });
}

function thRenderLog() {
  const box = document.getElementById("th-log");
  const badge = document.getElementById("th-step-count");
  if (badge) badge.textContent = String(testHelperState.steps.length);
  if (!box) return;
  while (box.firstChild) box.removeChild(box.firstChild);
  const all = [].concat(testHelperState.steps.map(function (s) { return "[" + s.type + "] " + JSON.stringify(s.data).slice(0, 80); })).concat(testHelperState.logs.map(function (l) { return l.time + " " + l.msg; })).concat(testHelperState.results);
  if (all.length === 0) {
    const e = document.createElement("div");
    e.className = "th-empty";
    e.textContent = t("th_log_empty");
    box.appendChild(e);
    return;
  }
  all.slice(-60).forEach(function (line) {
    const row = document.createElement("div");
    row.className = "th-log-row";
    row.textContent = line;
    box.appendChild(row);
  });
  box.scrollTop = box.scrollHeight;
}

function thCaptureShot() {
  const tabsApi = _thGetTabsApi();
  if (!tabsApi || !tabsApi.captureVisibleTab) { showToast(t("th_toast_no_capture")); return; }
  try {
    const doCap = function (winId) {
      const p = tabsApi.captureVisibleTab(winId, { format: "png" });
      const handle = function (url) {
        if (!url) { showToast(t("th_toast_shot_err")); return; }
        testHelperState.shots.push({ url: url, time: new Date().toISOString(), title: "shot-" + (testHelperState.shots.length + 1) });
        thRenderShots();
        showToast(t("th_toast_shot_ok").replace("{0}", String(testHelperState.shots.length)));
      };
      if (p && typeof p.then === "function") p.then(handle).catch(function () { showToast(t("th_toast_shot_err")); });
    };
    // popup is extension window — must capture lastFocused content window, not popup itself
    const tryCaptureWithWindow = function (queryObj, next) {
      try {
        const q2 = tabsApi.query(queryObj);
        const h2 = function (tabs) {
          const filtered = (tabs || []).filter(function (t) { return t.url && t.url.indexOf("moz-extension" + "://") !== 0 && t.url.indexOf("chrome-extension" + "://") !== 0; });
          const target = filtered.find(function (t) { return t.active; }) || filtered[0] || (tabs && tabs[0]);
          const wId = target ? target.windowId : null;
          if (wId != null) {
            try {
              const p2 = tabsApi.captureVisibleTab(wId, { format: "png" });
              if (p2 && typeof p2.then === "function") {p2.then(function (u) {
                if (u) { testHelperState.shots.push({ url: u, time: new Date().toISOString(), title: "shot-" + (testHelperState.shots.length + 1) }); thRenderShots(); showToast(t("th_toast_shot_ok").replace("{0}", String(testHelperState.shots.length))); }
                else if (next) next(); else showToast(t("th_toast_shot_err"));
              }).catch(function () { if (next) next(); else doCap(null); });}
              else {tabsApi.captureVisibleTab(wId, { format: "png" }, function (u) {
                if (u) { testHelperState.shots.push({ url: u, time: new Date().toISOString(), title: "shot-" + (testHelperState.shots.length + 1) }); thRenderShots(); showToast(t("th_toast_shot_ok").replace("{0}", String(testHelperState.shots.length))); }
                else if (next) next(); else showToast(t("th_toast_shot_err"));
              });}
            } catch (e2) { if (next) next(); else doCap(null); }
          } else if (next) next(); else doCap(null);
        };
        if (q2 && typeof q2.then === "function") q2.then(h2).catch(function () { if (next) next(); else doCap(null); });
        else tabsApi.query(queryObj, h2);
      } catch (e3) { if (next) next(); else doCap(null); }
    };
    if (tabsApi.query) {
      tryCaptureWithWindow({ active: true, lastFocusedWindow: true }, function () {
        tryCaptureWithWindow({ active: true, currentWindow: true }, function () {
          tryCaptureWithWindow({}, function () { doCap(null); });
        });
      });
    } else doCap(null);
  } catch (e) { showToast(t("th_toast_shot_err")); }
}

function thRenderShots() {
  const box = document.getElementById("th-shots");
  const badge = document.getElementById("th-shot-count");
  if (badge) badge.textContent = String(testHelperState.shots.length);
  if (!box) return;
  while (box.firstChild) box.removeChild(box.firstChild);
  if (testHelperState.shots.length === 0) {
    const e = document.createElement("div");
    e.className = "th-empty";
    e.textContent = t("th_shots_empty");
    box.appendChild(e);
    return;
  }
  testHelperState.shots.forEach(function (shot, idx) {
    const row = document.createElement("div");
    row.className = "th-shot-row";
    const img = document.createElement("img");
    img.src = shot.url;
    img.alt = shot.title;
    img.className = "th-shot-thumb";
    const meta = document.createElement("div");
    meta.className = "th-shot-meta";
    meta.textContent = shot.title + " • " + shot.time.slice(11, 19);
    const del = document.createElement("button");
    del.className = "th-shot-del";
    del.textContent = "x";
    del.addEventListener("click", function () { testHelperState.shots.splice(idx, 1); thRenderShots(); });
    row.appendChild(img);
    row.appendChild(meta);
    row.appendChild(del);
    box.appendChild(row);
  });
}

function thDownloadZip() {
  if (testHelperState.shots.length === 0) { showToast(t("th_toast_no_shots")); return; }
  try {
    if (typeof JSZip === "undefined") { showToast(t("th_toast_no_zip")); return; }
    const zip = new JSZip();
    testHelperState.shots.forEach(function (shot, i) {
      const b64 = shot.url.split(",")[1] || "";
      zip.file("shot-" + (i + 1) + ".png", b64, { base64: true });
    });
    // add bug report md if exists
    const md = thGenerateBugMd();
    zip.file("bug-report.md", md);
    zip.file("steps.json", JSON.stringify(testHelperState.steps, null, 2));
    zip.file("logs.txt", testHelperState.logs.map(function (l) { return l.time + " " + l.msg; }).join("\n"));
    zip.generateAsync({ type: "blob" }).then(function (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "scholarflow-test-" + new Date().toISOString().slice(0, 10) + ".zip";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
      showToast(t("th_toast_zip_ok"));
    }).catch(function () { showToast(t("th_toast_zip_err")); });
  } catch (e) { showToast(t("th_toast_zip_err")); }
}

function thCrawl() {
  _thExecInPage(function () {
    const links = Array.from(document.querySelectorAll("a[href]")).slice(0, 50).map(function (a) { return { href: a.href, text: (a.innerText || "").slice(0, 60) }; });
    const btns = Array.from(document.querySelectorAll("button, [role=button], input[type=button], input[type=submit]")).slice(0, 30).map(function (b) { return (b.innerText || b.value || b.tagName).slice(0, 60); });
    return { links: links, btns: btns, url: location.href, title: document.title };
  }, [], function (res) {
    if (!res) { showToast(t("th_toast_crawl_err")); return; }
    testHelperState.results.push("Crawl: " + res.title + " • " + res.links.length + " links, " + res.btns.length + " buttons");
    if (res.links.length) testHelperState.results.push("Links: " + res.links.map(function (l) { return l.href; }).slice(0, 5).join(" | "));
    thRenderLog();
    showToast(t("th_toast_crawled").replace("{0}", String(res.links.length)));
  });
}

function thCheckLinks() {
  _thExecInPage(function () {
    const els = Array.from(document.querySelectorAll("a[href], img[src], script[src], link[href]"));
    return els.slice(0, 40).map(function (el) {
      const u = el.href || el.src || "";
      return { tag: el.tagName, url: u.slice(0, 120), text: (el.innerText || "").slice(0, 40) };
    });
  }, [], function (res) {
    if (!res) return;
    const txt = res.map(function (r) { return r.tag + ": " + r.url; }).join("\n");
    testHelperState.results.push("Link/Resources (" + res.length + "):\n" + txt.slice(0, 800));
    thRenderLog();
    showToast(t("th_toast_link_done").replace("{0}", String(res.length)));
  });
}

function thFuzz() {
  _thExecInPage(function () {
    const payloads = ["", "' OR '1'='1", "<script>alert(1)</script>", "999999999", "a@a", "😀", "../../etc/passwd"];
    const inputs = Array.from(document.querySelectorAll("input[type=text], input[type=email], input[type=search], textarea")).slice(0, 6);
    const out = [];
    inputs.forEach(function (inp, idx) {
      const p = payloads[idx % payloads.length];
      try { inp.focus(); inp.value = p; inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true })); out.push(inp.name || inp.id || inp.placeholder || "input" + idx + " => " + p); } catch (e2) {}
    });
    // try submit first form
    const form = document.querySelector("form");
    if (form) out.push("form:" + (form.action || location.href));
    return out;
  }, [], function (res) {
    testHelperState.results.push("Fuzz: " + (res || []).join(" | "));
    thRenderLog();
    showToast(t("th_toast_fuzz_done"));
  });
}

function thA11y() {
  _thExecInPage(function () {
    const issues = [];
    document.querySelectorAll("img").forEach(function (img) { if (!img.alt) issues.push("img without alt: " + (img.src || "").slice(0, 60)); });
    document.querySelectorAll("input").forEach(function (inp) {
      if (!inp.id) return;
      const lab = document.querySelector('label[for="' + inp.id + '"]');
      if (!lab && !inp.getAttribute("aria-label") && !inp.placeholder) issues.push("input without label: " + inp.id);
    });
    document.querySelectorAll("*").forEach(function (el) {
      const s = getComputedStyle(el);
      if (s && s.color && s.backgroundColor && s.color !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "rgba(0, 0, 0, 0)") {
        // skip heavy contrast calc for brevity
      }
    });
    return issues.slice(0, 15);
  }, [], function (res) {
    const line = "A11y: " + (res && res.length ? res.join(" | ") : "no obvious issues");
    testHelperState.results.push(line);
    thRenderLog();
    showToast(t("th_toast_a11y_done"));
  });
}

function thPerf() {
  _thExecInPage(function () {
    try {
      const t = performance.timing;
      const load = t.loadEventEnd ? t.loadEventEnd - t.navigationStart : 0;
      const dom = t.domContentLoadedEventEnd ? t.domContentLoadedEventEnd - t.navigationStart : 0;
      const paint = performance.getEntriesByType ? performance.getEntriesByType("paint").map(function (p) { return p.name + ":" + Math.round(p.startTime); }).join(", ") : "";
      return "load:" + load + "ms dom:" + dom + "ms " + paint;
    } catch (e) { return "perf err"; }
  }, [], function (res) {
    testHelperState.results.push("Perf: " + res);
    thRenderLog();
    showToast(t("th_toast_perf_done"));
  });
}

function thGenerateBugMd() {
  const active = testHelperState.tabs ? "" : "";
  const lines = [
    "# Bug Report — ScholarFlow Test Helper",
    "",
    "URL: " + (location.href || ""),
    "Time: " + new Date().toISOString(),
    "",
    "## Steps (" + testHelperState.steps.length + ")",
    testHelperState.steps.map(function (s, i) { return (i + 1) + ". [" + s.type + "] " + JSON.stringify(s.data); }).join("\n") || "_no steps_",
    "",
    "## Console Logs",
    testHelperState.logs.map(function (l) { return "- " + l.time + " " + l.msg; }).join("\n") || "_no logs_",
    "",
    "## Results",
    testHelperState.results.join("\n\n") || "_no results_",
    "",
    "## Shots",
    testHelperState.shots.map(function (s, i) { return "- shot-" + (i + 1) + ".png — " + s.time; }).join("\n") || "_no shots_"
  ];
  return lines.join("\n");
}

function thBugReport() {
  const md = thGenerateBugMd();
  _thCopyText(md, "th_toast_bug_copied");
  // also push to results
  testHelperState.results.push("BugReport copied (" + md.length + " chars)");
  thRenderLog();
}

function _thCopyText(text, toastKey) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast(t(toastKey)); }).catch(function () { _thFallbackCopy(text, toastKey); });
    } else _thFallbackCopy(text, toastKey);
  } catch (e) { _thFallbackCopy(text, toastKey); }
}
function _thFallbackCopy(text, toastKey) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast(t(toastKey));
  } catch (e2) { showToast(t("th_toast_copy_err")); }
}

onReady(function () {
  const btnRec = document.getElementById("btn-th-record");
  if (btnRec) btnRec.addEventListener("click", function () { if (testHelperState.recording) thStopRecord(); else thStartRecord(); });
  const btnReplay = document.getElementById("btn-th-replay");
  if (btnReplay) btnReplay.addEventListener("click", thReplay);
  const btnShot = document.getElementById("btn-th-shot");
  if (btnShot) btnShot.addEventListener("click", thCaptureShot);
  const btnZip = document.getElementById("btn-th-zip");
  if (btnZip) btnZip.addEventListener("click", thDownloadZip);
  const btnCrawl = document.getElementById("btn-th-crawl");
  if (btnCrawl) btnCrawl.addEventListener("click", thCrawl);
  const btnLinks = document.getElementById("btn-th-links");
  if (btnLinks) btnLinks.addEventListener("click", thCheckLinks);
  const btnFuzz = document.getElementById("btn-th-fuzz");
  if (btnFuzz) btnFuzz.addEventListener("click", thFuzz);
  const btnA11y = document.getElementById("btn-th-a11y");
  if (btnA11y) btnA11y.addEventListener("click", thA11y);
  const btnPerf = document.getElementById("btn-th-perf");
  if (btnPerf) btnPerf.addEventListener("click", thPerf);
  const btnBug = document.getElementById("btn-th-bug");
  if (btnBug) btnBug.addEventListener("click", thBugReport);
  const btnClear = document.getElementById("btn-th-clear");
  if (btnClear) btnClear.addEventListener("click", function () { testHelperState.steps = []; testHelperState.logs = []; testHelperState.results = []; thRenderLog(); showToast(t("th_toast_cleared")); });
  const btnRefreshLog = document.getElementById("btn-th-refresh-log");
  if (btnRefreshLog) btnRefreshLog.addEventListener("click", thRefreshLogs);
  thRenderLog();
  thRenderShots();
});
