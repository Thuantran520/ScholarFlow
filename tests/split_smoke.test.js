// ---------------------------------------------------------------------------
// split_smoke.test.js
//
// Loads popup.html and sidebar.html into a jsdom window, evaluates every
// classic script in DOM order (locales, i18n.js, then the 23 split modules),
// and asserts that:
//   * no script throws while evaluating
//   * key globals exposed by the modules are present and callable
//   * popup.html exposes the same 8 tabs / nav buttons as sidebar.html
//
// Run with: npm test
// ---------------------------------------------------------------------------

const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const path = require("path");
const { pathToFileURL, fileURLToPath } = require("url");

const OS_HTML = path.join(__dirname, "..", "OS", "html");
const LOAD_ORDER_MODULES = [
  "core/browser.js",
  "core/constants.js",
  "core/state.js",
  "utils/names.js",
  "citation/state.js",
  "editor/notes.js",
  "citation/authors.js",
  "citation/dates.js",
  "citation/pdf.js",
  "citation/builders.js",
  "citation/ui.js",
  "citation/draft.js",
  "citation/selects.js",
  "citation/biblio.js",
  "verify.js",
  "redact.js",
  "core/active-tab.js",
  "tabs/dual-tabs.js",
  "core/messaging.js",
  "tabs/capture.js",
  "tabs/video.js",
  "init.js",
  "tabs/calendar.js",
  "tabs/pomodoro.js"
];

const KEY_GLOBALS = [
  "storGet", "storSet", "storRemove",
  "normalizeAuthorsString", "removeVietnameseDiacritics",
  "parseAuthorsList", "formatIeeeAuthors",
  "parseComprehensiveDate", "formatCitationDate",
  "getFormattedCitationByStyle", "buildIeeeCitation", "buildApaCitation",
  "buildHarvardCitation", "buildMlaCitation", "buildBibtexCitation",
  "buildIntextCitation",
  "updateCitationDisplay", "updateSourceBadges", "showToast",
  "saveDraft", "checkDraft",
  "initCustomSelects", "syncCustomSelects",
  "renderBiblioModalList", "loadSavedBibliographies", "loadCitationSettings",
  "initSourceVerifier",
  "updateInspectButtonsUI", "updateRedactionVisibilityUI", "renderRedactedList",
  "ensureActiveTab", "sendTabMessage", "safeSendTabMessage",
  "updateDualTabsUI", "populateDualTabDropdown",
  "loadScreenshotSettings", "captureVisibleScreen", "captureFullPageSmart",
  "loadVideoSettings", "startVideoRecording", "stopVideoRecording",
  "renderAutofillList", "renderTodoList", "calRenderCalendar",
  "pomodoroFormatTime", "pomodoroDailyStats", "pomodoroPlan", "pomodoroWeekStats"
];

// Minimal chrome/browser stub (callback + promise styles, resolved promises).
function makeChromeStub(storeInit = {}) {
  const store = { ...storeInit };
  const storageLocal = {
    get(key, cb) {
      let res = {};
      if (typeof key === "string") res[key] = store[key];
      else if (Array.isArray(key)) for (const k of key) if (k in store) res[k] = store[k];
      else if (typeof key === "object" && key != null) {
        for (const k of Object.keys(key)) res[k] = k in store ? store[k] : key[k];
      } else res = Object.assign({}, store);
      const p = Promise.resolve(res);
      if (typeof cb === "function") { p.then(cb); return undefined; }
      return p;
    },
    set(obj, cb) {
      Object.assign(store, obj);
      const p = Promise.resolve();
      if (typeof cb === "function") { p.then(cb); return undefined; }
      return p;
    },
    remove(keys, cb) {
      (Array.isArray(keys) ? keys : [keys]).forEach(k => { delete store[k]; });
      const p = Promise.resolve();
      if (typeof cb === "function") { p.then(cb); return undefined; }
      return p;
    }
  };
  const stub = {
    storage: { local: storageLocal, sync: storageLocal },
    runtime: {
      getManifest: () => ({ name: "ScholarFlow", version: "0.0.0-test", manifest_version: 3 }),
      getURL: (p) => "chrome-extension://test/" + p,
      sendMessage: (...args) => { if (args.length > 1 && typeof args[args.length - 1] === "function") args[args.length - 1]({}); return Promise.resolve({}); },
      onMessage: { addListener: () => {}, removeListener: () => {} },
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} }
    },
    tabs: {
      query: (q) => Promise.resolve([{ id: 1, url: "https://example.com/paper", title: "Paper", active: true, windowId: 1 }]),
      create: (o) => Promise.resolve({ id: 99, url: o && o.url }),
      update: (t, o) => Promise.resolve({}),
      get: (t) => Promise.resolve({ id: Number(t) || 1, url: "https://example.com/paper", title: "Paper" }),
      remove: (t) => Promise.resolve(),
      sendMessage: (t, msg) => Promise.resolve({}),
      onUpdated: { addListener: () => {} },
      onActivated: { addListener: () => {} },
      onRemoved: { addListener: () => {} }
    },
    windows: {
      getCurrent: (o) => Promise.resolve({ id: 1, focused: true }),
      onFocusChanged: { addListener: () => {} }
    },
    scripting: {
      executeScript: (o) => Promise.resolve([{ result: null }])
    },
    commands: { onCommand: { addListener: () => {} } },
    downloads: { download: (o) => Promise.resolve(1) },
    action: { setBadgeText: () => Promise.resolve(), setTitle: () => Promise.resolve() },
    id: { getRandom: () => Math.random().toString(36).slice(2) }
  };
  return stub;
}

async function loadPage(htmlFile, storeInit = {}) {
  const htmlPath = path.join(OS_HTML, htmlFile);
  const html = fs.readFileSync(htmlPath, "utf8");

  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (e) => errors.push(String(e && e.message || e)));

  const dom = new JSDOM(html, {
    url: pathToFileURL(htmlPath).href,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole
  });
  const { window } = dom;
  const chromeStub = makeChromeStub(storeInit);
  window.chrome = chromeStub;
  window.browser = chromeStub;

  window.addEventListener("error", (e) => errors.push(String(e && e.message || e)));

  // Evaluate all <script src> files in DOM order into one shared global scope.
  const chunks = [];
  const scripts = [...window.document.querySelectorAll("script[src]")];
  for (const script of scripts) {
    const abs = fileURLToPath(new URL(script.getAttribute("src"), pathToFileURL(htmlPath).href));
    if (!fs.existsSync(abs)) {
      throw new Error(`${htmlFile}: referenced script does not exist on disk: ${abs}`);
    }
    chunks.push(fs.readFileSync(abs, "utf8"));
  }
  try {
    window.eval(chunks.join("\n;\n"));
  } catch (e) {
    throw new Error(`${htmlFile}: evaluating scripts threw: ${e && e.stack || e}`);
  }

  // Let any DOMContentLoaded / interval-init work run.
  await new Promise((r) => setTimeout(r, 30));

  return { window, errors, htmlFile };
}

let failures = 0;
function check(cond, msg) {
  if (cond) {
    console.log(`  PASS  ${msg}`);
  } else {
    failures++;
    console.error(`  FAIL  ${msg}`);
  }
}

async function main() {
  // 1. Module files must exist and parse (node --check-equivalent via require? just existence+nonempty)
  console.log("Checking module files exist:");
  for (const m of LOAD_ORDER_MODULES) {
    const p = path.join(__dirname, "..", "OS", "js", ...m.split("/"));
    const ok = fs.existsSync(p) && fs.statSync(p).size > 0;
    check(ok, `module file present: js/${m}`);
  }

  for (const htmlFile of ["sidebar.html", "popup.html"]) {
    console.log(`\nLoading ${htmlFile}:`);
    const { window: w, errors } = await loadPage(htmlFile);
    const relevantErrors = errors.filter(e => !/Not implemented:/.test(e));
    check(relevantErrors.length === 0, "no uncaught errors at load" + (relevantErrors.length ? ` -> ${relevantErrors.slice(0, 3).join(" | ")}` : ""));

    for (const g of KEY_GLOBALS) {
      try {
        const type = w.eval(`typeof ${g}`);
        check(type === "function" || type === "object", `global available: ${g} (${type})`);
      } catch (e) {
        failures++;
        console.error(`  FAIL  global ${g} threw on typeof: ${e.message}`);
      }
    }

    const navCount = w.document.querySelectorAll(".main-nav-btn").length;
    const tabCount = w.document.querySelectorAll(".tab-section").length;
    const ids = [...w.document.querySelectorAll(".main-nav-btn")].map(b => b.dataset.target);
    check(navCount === 8, `8 nav buttons (found ${navCount})`);
    check(tabCount === 8, `8 tab sections (found ${tabCount})`);
    check(["tab-cite", "tab-redact", "tab-capture", "tab-cookie", "tab-autofill", "tab-todo", "tab-pomo", "tab-cal"].every(t => ids.includes(t)),
      `all 8 targets present in nav: ${ids.join(",")}`);
  }

  // 2. Unified i18n: upgraded t() supports positional {0} and function fallback
  console.log("\nChecking unified i18n t():");
  {
    const { window: w } = await loadPage("sidebar.html", { app_language: "vi" });
    check(w.i18n.t("toast_capture_countdown", "vi", [5]) === "⏳ Bắt đầu chụp sau 5s...",
      "t() positional substitution (toast_capture_countdown {0}=5)");
    check(w.i18n.t("content_style_blur", "en", [12]) === "Blur (12px)",
      "content_* namespace readable via sidebar locale dump");
    check(w.i18n.t("missing_key_cafe", "en") === "missing_key_cafe",
      "t() unknown key falls back to the key itself");
    const viCount = w.Object.keys(w.I18N_DATA.vi).filter(k => k.startsWith("content_")).length;
    const enCount = w.Object.keys(w.I18N_DATA.en).filter(k => k.startsWith("content_")).length;
    const prCount = w.Object.keys(w.I18N_DATA.vi).filter(k => k.startsWith("privacy_")).length;
    check(viCount === 25 && enCount === 25 && prCount === 43,
      `namespace keys present in locale dumps (content_*=25, privacy_*=43; got ${viCount}/${enCount}/${prCount})`);
  }

  // 3. privacy.html standalone page uses the unified i18n engine
  console.log("\nLoading privacy.html:");
  {
    const { window: w, errors } = await loadPage("privacy.html", { app_language: "en" });
    const relevantErrors = errors.filter(e => !/Not implemented:/.test(e));
    check(relevantErrors.length === 0, "no uncaught errors at load" + (relevantErrors.length ? ` -> ${relevantErrors.slice(0, 3).join(" | ")}` : ""));
    await new Promise((r) => setTimeout(r, 30));
    check(w.document.title === "Privacy Policy – ScholarFlow",
      `privacy page document.title translated (en): "${w.document.title}"`);
    check(w.document.getElementById("select-privacy-lang").value === "en", "privacy language select synced to en");
    check(w.document.getElementById("sec5-title").textContent === "5. Open Source & License",
      `privacy data-i18n translated (sec5-title): "${w.document.getElementById('sec5-title').textContent}"`);
    const allElements = w.document.querySelectorAll("[data-i18n]");
    const untranslated = [...allElements].filter(el => !el.textContent.trim());
    check(allElements.length > 0 && untranslated.length === 0,
      `privacy all ${allElements.length} data-i18n elements translated (empty: ${untranslated.length})`);
  }

  // 4. Content-script regressions (Chromium isolated-world self-shadowing)
  console.log("\nRegressing content scripts (Chromium isolated-world self-shadowing):");
  {
    const dom2 = new JSDOM('<!doctype html><html><body><h1>t</h1></body></html>', {
      url: "https://example.com/",
      runScripts: "outside-only",
      pretendToBeVisual: true
    });
    const w = dom2.window;
    w.chrome = makeChromeStub({ app_language: "vi" });
    w.browser = w.chrome;
    const contentFiles = [
      "OS/js/content/i18n.js", "OS/js/content/inspect.js", "OS/js/content/snip.js",
      "OS/js/content/scroll.js", "OS/js/content/citation.js", "OS/js/content/main.js"
    ];
    let injectErr = "";
    for (const f of contentFiles) {
      const p = path.join(__dirname, "..", f);
      try { w.eval(fs.readFileSync(p, "utf8")); }
      catch (e) { injectErr += `${f}: ${e.message} `; }
    }
    check(!injectErr, "all 6 content scripts evaluated without error" + (injectErr ? ` -> ${injectErr}` : ""));

    // Bug: a 'var tContent' shim in snip.js/inspect.js leaks onto window.tContent in the
    // Chromium isolated world, so tContent calls itself -> RangeError "Maximum call stack
    // size exceeded" exactly when starting element capture.
    const sample = w.tContent("snip_btn_capture");
    check(typeof sample === "string" && sample.length > 0,
      `window.tContent is the real i18n fn (got: ${JSON.stringify(sample)})`);

    try {
      w.startElementCaptureMode();
      const toolbar = !!w.document.querySelector("#super-snip-toolbar");
      const guide = !!w.document.querySelector("#super-snip-guide-pill");
      check(toolbar && guide, "startElementCaptureMode does not overflow the stack; overlay built");
    } catch (e) {
      failures++;
      console.error(`  FAIL  startElementCaptureMode threw: ${e.message}`);
    }
    try {
      w.stopElementCaptureMode();
      check(!w.document.querySelector("#super-snip-toolbar"), "stopElementCaptureMode tears down overlay");
    } catch (e) {
      failures++;
      console.error(`  FAIL  stopElementCaptureMode threw: ${e.message}`);
    }
    dom2.window.close();
  }

  // 4b. Vietnamese metadata extraction (byline patterns, dates, site names)
  console.log("Regressing Vietnamese metadata extraction (content script):");
  {
    const dom3 = new JSDOM(`<!doctype html><html><head>
      <meta name="date" content="2026-09-06">
      <meta property="og:site_name" content="VnExpress">
      <meta name="description" content="meta">
    </head><body>
      <article>
        <h1 class="article-title">Bài báo khoa học mới - VnExpress</h1>
        <p class="author-info">Tác giả: Nguyễn Văn A</p>
        <div class="author">Trần Thị B</div>
        <time class="publish-date">06.09.2026</time>
      </article>
    </body></html>`, {
      url: "https://example.com/doi/10.1234/abcd",
      runScripts: "outside-only",
      pretendToBeVisual: true
    });
    const w = dom3.window;
    w.chrome = makeChromeStub({ app_language: "vi" });
    w.browser = w.chrome;
    for (const f of ["OS/js/content/i18n.js", "OS/js/content/citation.js"]) {
      w.eval(fs.readFileSync(path.join(__dirname, "..", f), "utf8"));
    }
    let meta = null;
    let extractErr = "";
    try {
      meta = w.eval(`extractPageCitationMetadata()`);
    } catch (e) { extractErr = e.message; }
    check(!extractErr, "extractPageCitationMetadata() on VN article runs without throwing" + (extractErr ? ` -> ${extractErr}` : ""));
    check(!!meta && typeof meta.authors === "string",
      `returns a meta object with string authors (got: ${meta ? meta.authors : "none"})`);
    check(!!meta && meta.authors.includes("Nguyễn Văn A"),
      `VN byline 'Tác giả: Nguyễn Văn A' extracted (got: ${meta ? meta.authors : "none"})`);
    check(!!meta && meta.authors.includes("Trần Thị B"),
      `VN byline '.author' extracted (got: ${meta ? meta.authors : "none"})`);
    check(!!meta && meta.title === "Bài báo khoa học mới" &&
      (meta.title || "").includes("- VnExpress") === false,
      `VN site suffix stripped from title (got: ${meta ? meta.title : "none"})`);
    check(!!meta && meta.date === "2026-09-06",
      `VN date '06.09.2026' -> 2026-09-06 (got: ${meta ? meta.date : "none"})`);
    check(!!meta && meta.container === "VnExpress",
      `container from og:site_name (got: ${meta ? meta.container : "none"})`);
    check(!!meta && meta.sourceType === "academic",
      `webpage with doi in URL upgraded to academic (got: ${meta ? meta.sourceType : "none"})`);
    dom3.window.close();
  }

  // 4c. Teleprompter: script rendering, speed/font persistence, play/pause
  console.log("Regressing teleprompter (speed + notes):");
  {
    const scriptText = ["Chào mừng các bạn đến buổi thuyết trình.", "Phần hai: kết quả nghiên cứu chính.", "Kết luận và hướng phát triển."].join("\n\n");
    const { window: w, errors: tpErrors } = await loadPage("prompter.html", {
      super_video_settings: { script: scriptText, prompter_speed: 1.5, prompter_font: 26 }
    });
    const relevantErrors = tpErrors.filter(e => !/Not implemented:/.test(e));
    check(relevantErrors.length === 0, "prompter.html loads without uncaught errors" + (relevantErrors.length ? ` -> ${relevantErrors.slice(0, 3).join(" | ")}` : ""));
    check(w.document.querySelectorAll(".prompter-para").length === 3,
      `script rendered into 3 paragraphs (got ${w.document.querySelectorAll(".prompter-para").length})`);
    check(w.document.querySelectorAll(".prompter-note").length === 3,
      `notes panel rendered 3 notes (got ${w.document.querySelectorAll(".prompter-note").length})`);
    check(w.document.getElementById("prompter-speed").value === "1.5",
      `speed preference restored to 1.5x (got ${w.document.getElementById("prompter-speed").value})`);
    check(w.document.getElementById("prompter-font").value === "26",
      `font preference restored to 26px (got ${w.document.getElementById("prompter-font").value})`);
    check(w.document.querySelector('[data-i18n="prompter_speed"]').textContent === "Tốc độ",
      `data-i18n prompter_speed translated (${w.document.querySelector('[data-i18n="prompter_speed"]').textContent})`);
    check(w.document.getElementById("prompter-toggle").textContent === "Phát",
      `toggle starts in play state (${w.document.getElementById("prompter-toggle").textContent})`);
    w.document.getElementById("prompter-toggle").click();
    check(w.document.getElementById("prompter-toggle").textContent === "Tạm dừng",
      `toggle switches to pause state (${w.document.getElementById("prompter-toggle").textContent})`);
    w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));
    check(w.document.getElementById("prompter-toggle").textContent === "Phát",
      `spacebar toggles back to play state`);
    const speedIn = w.document.getElementById("prompter-speed");
    speedIn.value = "2";
    speedIn.dispatchEvent(new w.Event("input", { bubbles: true }));
    const stored = await w.chrome.storage.local.get("super_video_settings");
    check(stored.super_video_settings && stored.super_video_settings.prompter_speed === 2,
      `speed persisted to super_video_settings (got ${stored.super_video_settings && stored.super_video_settings.prompter_speed})`);
    w.document.getElementById("prompter-notes-toggle").click();
    check(w.document.getElementById("prompter-notes").classList.contains("open"),
      "notes panel toggles open");
    w.document.getElementById("prompter-reset").click();
    check(w.document.getElementById("prompter-stage").scrollTop === 0,
      "reset returns the stage to the top");
  }

  // 4d. Capture stall guard: nested scroll / iframe pages must not loop forever
  console.log("Regressing capture stall guard (nested scroll / iframe):");
  {
    const { window: w } = await loadPage("sidebar.html");
    check(typeof w.captureStallDetector === "function",
      "captureStallDetector available as a module global");
    const sd = w.captureStallDetector(3);
    check(sd.record("r10,20,120") === false,
      "stall guard not triggered on 1st identical slice");
    check(sd.record("r10,20,120") === false,
      "stall guard not triggered on 2nd identical slice");
    check(sd.record("r10,20,120") === true,
      "stall guard triggers after 3 consecutive identical viewport keys");
    sd.reset();
    check(sd.record("a") === false && sd.record("b") === false && sd.record("a") === false,
      "stall guard resets and does not misfire on progressing slices");
  }

  // 4e. Research Pomodoro: timer, smart break planner, daily & weekly stats
  console.log("Regressing research pomodoro (timer + planner):");
  {
    const { window: w } = await loadPage("sidebar.html", {
      sf_pomodoro: {
        sessions: [
          { ts: Date.now(), minutes: 25, mode: "focus" },
          { ts: Date.now() - 2 * 86400000, minutes: 25, mode: "focus" },
          { ts: Date.now() - 6 * 86400000, minutes: 50, mode: "focus" }
        ],
        settings: { focus: 25, long: 50, short: 5 }
      }
    });
    check(w.document.getElementById("pm-ring-fg") !== null,
      "pomodoro tab exposes the SVG progress ring");
    check(typeof w.pomodoroFormatTime === "function" && w.pomodoroFormatTime(1500) === "25:00",
      `pomodoroFormatTime formats seconds (got ${w.pomodoroFormatTime(1500)})`);
    const stats = w.pomodoroDailyStats([
      { ts: Date.now(), minutes: 25, mode: "focus" },
      { ts: Date.now() - 2 * 86400000, minutes: 25, mode: "focus" }
    ], Date.now());
    check(stats.count === 1 && stats.minutes === 25,
      `pomodoroDailyStats counts only today (got ${JSON.stringify(stats)})`);
    const week = w.pomodoroWeekStats([
      { ts: Date.now(), minutes: 25, mode: "focus" },
      { ts: Date.now() - 2 * 86400000, minutes: 25, mode: "focus" },
      { ts: Date.now() - 6 * 86400000, minutes: 50, mode: "focus" }
    ], Date.now());
    check(week.length === 7 && week[6].minutes === 25 && week[0].minutes === 50,
      `pomodoroWeekStats buckets last 7 days (got ${week.map(d => d.minutes).join(",")})`);
    const plan90 = w.pomodoroPlan(90, 25, 4);
    check(plan90.blocks === 3 && plan90.shortBreaks === 3 && plan90.longBreaks === 0 && plan90.breakMinutes === 15,
      `plan(90,25,4) == 3 focus + 3 short breaks (got ${JSON.stringify(plan90)})`);
    const plan120 = w.pomodoroPlan(120, 25, 4);
    check(plan120.blocks === 4 && plan120.focusMinutes === 100 && plan120.shortBreaks === 4,
      `plan(120,25,4) == 4 focus + trailing short break (got ${JSON.stringify(plan120)})`);
    const planBig = w.pomodoroPlan(240, 25, 4);
    check(planBig.longBreaks === 1 && planBig.blocks === 7,
      `plan(240,25,4) inserts a long break every 4 sessions (got ${JSON.stringify(planBig)})`);
    const planTuned = w.pomodoroPlan(90, 25, 4, 10, 25);
    check(planTuned.shortBreaks === 2 && planTuned.breakMinutes === 20 && planTuned.leftover === 20,
      `plan(90,25,4,10,25) honours custom break lengths (got ${JSON.stringify(planTuned)})`);
    const planNoTrail = w.pomodoroPlan(90, 25, 4, 5, 15, false);
    check(planNoTrail.leftover === 5 && planNoTrail.shortBreaks === 2 && planNoTrail.breakMinutes === 10,
      `plan(...,allowTrail=false) skips the trailing break (got ${JSON.stringify(planNoTrail)})`);
    check(w.document.getElementById("pm-time").textContent === "25:00",
      `timer renders focus preset (got "${w.document.getElementById('pm-time').textContent}")`);
    w.document.getElementById("pm-preset-long").click();
    check(w.document.getElementById("pm-time").textContent === "50:00",
      `long preset sets 50:00 (got "${w.document.getElementById('pm-time').textContent}")`);
    w.document.getElementById("pm-preset-short").click();
    check(w.document.getElementById("pm-time").textContent === "05:00",
      `short preset sets 05:00 (got "${w.document.getElementById('pm-time').textContent}")`);
    w.document.getElementById("pm-preset-focus").click();
    check(w.document.querySelectorAll("#pm-session-dots > span").length === 8,
      `session goal dots rendered (got ${w.document.querySelectorAll("#pm-session-dots > span").length})`);
    check([...w.document.querySelectorAll("#pm-session-dots > span")].some(s => s.style.background === "rgb(16, 185, 129)" || s.style.background === "#10b981"),
      "today's completed session fills at least one dot");
    w.document.getElementById("btn-pm-toggle").click();
    check(w.pmIsRunning() === true,
      "toggle starts the timer");
    w.document.getElementById("btn-pm-toggle").click();
    check(w.pmIsRunning() === false,
      "toggle pauses the timer");
    w.document.getElementById("btn-pm-reset").click();
    check(w.document.getElementById("pm-time").textContent === "25:00",
      "reset returns to full focus duration");
    const stepFocus = [...w.document.querySelectorAll("[data-step-for='pm-focus-custom']")];
    check(stepFocus.length === 2,
      `focus stepper exposes two arrow buttons (got ${stepFocus.length})`);
    stepFocus.find(b => b.getAttribute("data-step-delta") === "5").click();
    check(w.document.getElementById("pm-focus-custom").value === "30",
      `focus stepper + bumps the value (got "${w.document.getElementById('pm-focus-custom').value}")`);
    stepFocus.find(b => b.getAttribute("data-step-delta") === "-5").click();
    check(w.document.getElementById("pm-focus-custom").value === "25",
      `focus stepper − bumps the value (got "${w.document.getElementById('pm-focus-custom').value}")`);
    const stepWork = [...w.document.querySelectorAll("[data-step-for='pm-plan-work']")];
    stepWork.find(b => b.getAttribute("data-step-delta") === "5").click();
    check(w.document.getElementById("pm-plan-work").value === "95",
      `plan stepper + bumps the work minutes (got "${w.document.getElementById('pm-plan-work').value}")`);
    const actPaused = (await w.chrome.storage.local.get("sf_pomodoro_active")).sf_pomodoro_active;
    check(actPaused && actPaused.running === false && actPaused.mode === "focus",
      `timer snapshot published after reset/pause (got ${JSON.stringify(actPaused)})`);
    w.document.getElementById("pm-plan-work").value = "90";
    w.document.getElementById("pm-plan-focus").value = "25";
    w.document.getElementById("btn-pm-plan-calc").click();
    check(w.document.getElementById("pm-plan-result").style.display === "block",
      "plan calculator reveals the result card");
    check(w.document.getElementById("pm-plan-summary").textContent.includes("3"),
      "plan calculator shows a 3-round plan for 90 minutes");
    check(w.document.querySelectorAll("#pm-plan-timeline > span").length >= 5,
      `plan timeline renders focus + break chips (got ${w.document.querySelectorAll("#pm-plan-timeline > span").length})`);
    const stepShortLen = [...w.document.querySelectorAll("[data-step-for='pm-plan-short-len']")];
    check(stepShortLen.length === 2,
      `short-break length exposes its own stepper (got ${stepShortLen.length})`);
    stepShortLen.find(b => b.getAttribute("data-step-delta") === "1").click();
    check(w.document.getElementById("pm-plan-short-len").value === "6",
      `short-break stepper bumps by 1 (got "${w.document.getElementById('pm-plan-short-len').value}")`);
    check(w.document.getElementById("pm-plan-long-every") !== null &&
      w.document.getElementById("pm-plan-long-every").options.length === 4,
      "plan calculator exposes a long-break frequency select");
    check(w.document.getElementById("pm-plan-trail-sb") !== null &&
      w.document.getElementById("pm-plan-trail-sb").checked === true,
      "plan calculator exposes the trailing short-break toggle");
    w.document.getElementById("pm-plan-short-len").value = "10";
    w.document.getElementById("pm-plan-work").value = "90";
    w.document.getElementById("pm-plan-focus").value = "25";
    w.document.getElementById("pm-plan-trail-sb").checked = false;
    w.document.getElementById("btn-pm-plan-calc").click();
    check([...w.document.querySelectorAll("#pm-plan-timeline > span")].some(s => s.textContent === "Nghỉ 10'"),
      `timeline chips reflect the tuned break length (got ${[...w.document.querySelectorAll('#pm-plan-timeline > span')].map(s => s.textContent).join(',')})`);
    w.document.getElementById("pm-plan-short-len").value = "5";
    w.document.getElementById("pm-plan-trail-sb").checked = true;
    w.pmCompleteSession();
    await new Promise((r) => setTimeout(r, 40));
    const snap = async () => w.chrome.storage.local.get(["sf_pomodoro", "sf_todos"]);
    const after = await snap();
    check(Array.isArray(after.sf_pomodoro.sessions) && after.sf_pomodoro.sessions.length === 4,
      `focus completion logs a session (got ${after.sf_pomodoro.sessions.length})`);
    check(Array.isArray(after.sf_todos) && after.sf_todos.length === 1 && after.sf_todos[0].text.includes("25"),
      `focus completion creates a todo log entry (got ${JSON.stringify(after.sf_todos)})`);
    check(w.document.getElementById("pm-time").textContent === "05:00",
      "after a focus session the timer switches to short break");
    const actDone = (await w.chrome.storage.local.get("sf_pomodoro_active")).sf_pomodoro_active;
    check(actDone && actDone.mode === "short" && actDone.running === false && actDone.leftSec === 300,
      `floating-window snapshot updated to short break (got ${JSON.stringify(actDone)})`);
    check(w.document.getElementById("pm-music-scene") !== null &&
      w.document.getElementById("pm-music-scene").options.length === 4,
      "break-music scene selector offers multiple styles");
    w.document.getElementById("btn-pm-music-open").click();
    await new Promise((r) => setTimeout(r, 40));
    const musicOn = (await w.chrome.storage.local.get("sf_pomodoro_music")).sf_pomodoro_music;
    check(Array.isArray(musicOn) && musicOn.length === 1,
      `break-music playback tracks the opened tab (got ${JSON.stringify(musicOn)})`);
    w.pmCompleteSession();
    await new Promise((r) => setTimeout(r, 40));
    const musicOff = (await w.chrome.storage.local.get("sf_pomodoro_music")).sf_pomodoro_music;
    check(Array.isArray(musicOff) && musicOff.length === 0,
      `break-music auto-stops when the break ends (got ${JSON.stringify(musicOff)})`);
    check(w.document.getElementById("pm-time").textContent === "25:00",
      "after the break the timer returns to the focus round");
  }

  // 4e2. Pomodoro floating window mirror (pomo-window.html)
  console.log("Regressing pomodoro floating window (pomo-window.html):");
  {
    const endAt = Date.now() + 255000;
    const { window: w } = await loadPage("pomo-window.html", {
      sf_pomodoro_active: {
        sender: "tab", mode: "short", totalSec: 300, leftSec: 300,
        endAt: endAt, running: true, stamp: Date.now()
      }
    });
    check(w.document.getElementById("pw-time").textContent === "04:15",
      `floating window mirrors live remaining time (got "${w.document.getElementById('pw-time').textContent}")`);
    check(w.document.getElementById("pw-mode").textContent.length > 0,
      "floating window renders a mode label");
    check(w.document.getElementById("pw-ring-fg").getAttribute("stroke") === "#10b981",
      `floating window ring uses the short-break color (got "${w.document.getElementById('pw-ring-fg').getAttribute('stroke')}")`);
    check(w.document.getElementById("pw-status").textContent.length > 0,
      "floating window shows a running/paused status line");
    check(w.document.body.classList.contains("pw-running") === true,
      "floating window applies the running pulse state");
    w.document.getElementById("pw-toggle").click();
    const ctl1 = (await w.chrome.storage.local.get("sf_pomodoro_ctl")).sf_pomodoro_ctl;
    check(ctl1 && ctl1.cmd === "pause",
      `floating window pause writes a control intent (got ${JSON.stringify(ctl1)})`);
    w.document.getElementById("pw-reset").click();
    const ctl2 = (await w.chrome.storage.local.get("sf_pomodoro_ctl")).sf_pomodoro_ctl;
    check(ctl2 && ctl2.cmd === "reset",
      `floating window reset writes a control intent (got ${JSON.stringify(ctl2)})`);
    check((await w.chrome.storage.local.get("sf_pomo_win")).sf_pomo_win === undefined,
      "floating window no longer writes a size/mini preset");
    check(w.document.querySelectorAll("[data-size]").length === 0 &&
      w.document.getElementById("pw-mini-toggle") === null,
      "floating window exposes no size/mini controls");
  }

  // 4f. Unified learning flow: citation -> note -> linked todo (goal -> source -> summary -> done)
  console.log("Regressing unified learning flow (citation -> note -> todo):");
  {
    const { window: w } = await loadPage("sidebar.html", {
      sf_todos: [],
      saved_bibliographies: []
    });
    const snap = async () => w.chrome.storage.local.get(["saved_bibliographies", "sf_todos"]);
    const goalSel = w.document.getElementById("f-goal");
    check(goalSel && goalSel.options.length === 5,
      `goal select populated from i18n (got ${goalSel ? goalSel.options.length : 0} options)`);
    const titleIn = w.document.getElementById("f-title");
    const urlIn = w.document.getElementById("f-url");
    titleIn.value = "Test linked paper";
    titleIn.dispatchEvent(new w.Event("input"));
    urlIn.value = "https://example.com/linked-paper";
    urlIn.dispatchEvent(new w.Event("input"));
    goalSel.value = "research";
    w.document.getElementById("f-notes").value = "Tóm tắt: deterministic ML.";
    w.document.getElementById("btn-save-biblio").click();
    await new Promise(r => setTimeout(r, 80));
    const st1 = await snap();
    check(st1.saved_bibliographies.length === 1 && st1.saved_bibliographies[0].goal === "research",
      `biblio stores learning goal (got ${st1.saved_bibliographies.length} item, goal=${st1.saved_bibliographies[0]?.goal})`);
    const todos = st1.sf_todos || [];
    check(todos.length === 1 && todos[0].libId === st1.saved_bibliographies[0].id,
      `linked to-do auto-created with libId (got ${todos.length} todo)`);
    check(todos[0].text.includes("🎯") && todos[0].text.includes("Test linked paper"),
      `todo text shows goal + title (got "${todos[0].text}")`);
    check(w.document.querySelectorAll(".btn-link-source").length === 1,
      "todo row renders a source link button");
    w.document.querySelector(".btn-link-source").click();
    check(w.document.getElementById("biblio-modal").style.display === "block",
      "source button opens the bibliography modal");
    check(!!w.document.getElementById("bib-" + todos[0].libId),
      "bibliography card rendered with matching id");
    check(!!w.document.getElementById("bib-" + todos[0].libId),
      "bibliography card rendered with matching id");
    w.document.getElementById("btn-save-biblio").click();
    await new Promise(r => setTimeout(r, 60));
    const st2 = await snap();
    check((st2.sf_todos || []).length === 1,
      "re-saving the same source does not duplicate the linked to-do");
  }

  // 4g. MathML / MathJax formula recognition (content script) + insert into notes (UI)
  console.log("Regressing MathML formula recognition (content script):");
  {
    const domM = new JSDOM(`<!doctype html><html><head><meta name="description" content="m"></head><body>
      <h1>Análise Matemática paper</h1>
      <math><semantics><mrow><mi>x</mi></mrow><annotation encoding="application/x-tex">x^2+1</annotation></semantics></math>
      <mjx-container data-semantic-tex="\\int_0^1 x\\,dx"><span>x</span></mjx-container>
    </body></html>`, {
      url: "https://example.com/math",
      runScripts: "outside-only",
      pretendToBeVisual: true
    });
    const wM = domM.window;
    wM.chrome = makeChromeStub({ app_language: "vi" });
    wM.browser = wM.chrome;
    for (const f of ["OS/js/content/i18n.js", "OS/js/content/citation.js"]) {
      wM.eval(fs.readFileSync(path.join(__dirname, "..", f), "utf8"));
    }
    let metaM = null;
    let mathErr = "";
    try { metaM = wM.eval(`extractPageCitationMetadata()`); } catch (e) { mathErr = e.message; }
    check(!mathErr, "extractPageCitationMetadata() on math page runs without throwing" + (mathErr ? ` -> ${mathErr}` : ""));
    check(!!metaM && Array.isArray(metaM.math) && metaM.math.length >= 2,
      `recognizes MathML + MathJax formulas (got ${metaM && metaM.math ? metaM.math.length : 0})`);
    check(!!metaM && metaM.math && metaM.math.includes("x^2+1"),
      `MathML TeX annotation captured (got ${JSON.stringify(metaM && metaM.math)})`);
    domM.window.close();
  }
  console.log("Regressing math insert into notes (UI):");
  {
    const { window: w } = await loadPage("sidebar.html", { sf_todos: [], saved_bibliographies: [] });
    check(w.eval(`typeof updateMathInsertButton`) === "function",
      "updateMathInsertButton exposed as global");
    check(w.document.getElementById("btn-insert-math").style.display === "none",
      "math button hidden when no formulas on page");
    w.sfSetMathFormulas(["x^2+1", "\\int_0^1 x", "a^2=b^2+c^2"]);
    check(w.document.getElementById("btn-insert-math").style.display === "inline-flex"
      && w.document.getElementById("btn-insert-math").textContent.includes("3"),
      `math button visible with count (got "${w.document.getElementById('btn-insert-math').textContent}")`);
    w.document.getElementById("btn-insert-math").click();
    const notesVal = w.document.getElementById("f-notes").value;
    check(notesVal.includes("$$") && notesVal.includes("x^2+1"),
      `click inserts fenced LaTeX into notes (got "${notesVal}")`);
  }

  // 4h. Reduced SPA navigation watch weight (event-driven + 2s fallback, no 1s poll)
  console.log("Regressing SPA navigation watch (reduced interval):");
  {
    const domS = new JSDOM('<!doctype html><html><body><h1>t</h1></body></html>', {
      url: "https://example.com/start",
      runScripts: "outside-only",
      pretendToBeVisual: true
    });
    const wS = domS.window;
    wS.chrome = makeChromeStub({ app_language: "vi" });
    wS.browser = wS.chrome;
    const origSetInterval = wS.setInterval;
    let intervalRegistrations = 0;
    wS.setInterval = function (...a) { intervalRegistrations++; return origSetInterval.apply(this, a); };
    for (const f of ["OS/js/content/i18n.js", "OS/js/content/citation.js"]) {
      wS.eval(fs.readFileSync(path.join(__dirname, "..", f), "utf8"));
    }
    const intervals = intervalRegistrations;
    let spaErr = "";
    try {
      wS.history.pushState({}, "", "/step/2");
      wS.window.dispatchEvent(new wS.HashChangeEvent("hashchange"));
      wS.history.replaceState({}, "", "/step/3");
    } catch (e) { spaErr = e.message; }
    check(!spaErr, "pushState/replaceState/hashchange hooks work without throwing" + (spaErr ? ` -> ${spaErr}` : ""));
    check(intervals === 1,
      `content bundle registers exactly 1 slow poll interval (got ${intervals})`);
    domS.window.close();
  }

  console.log("\n" + (failures === 0 ? "ALL TESTS PASSED" : `${failures} CHECK(S) FAILED`));
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL:", e && e.stack || e);
  process.exit(1);
});