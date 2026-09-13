// ---------------------------------------------------------------------------
// split_smoke.test.js
//
// Loads popup.html and sidebar.html into a jsdom window, evaluates every
// classic script in DOM order (locales, i18n.js, then the 23 split modules),
// and asserts that:
//   * no script throws while evaluating
//   * key globals exposed by the modules are present and callable
//   * popup.html exposes the same 7 tabs / nav buttons as sidebar.html
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
  "tabs/flashcards.js"
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
  "renderAutofillList", "renderTodoList", "calRenderCalendar"
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
    check(navCount === 7, `7 nav buttons (found ${navCount})`);
    check(tabCount === 7, `7 tab sections (found ${tabCount})`);
    check(["tab-cite", "tab-redact", "tab-capture", "tab-cookie", "tab-autofill", "tab-todo", "tab-cal"].every(t => ids.includes(t)),
      `all 7 targets present in nav: ${ids.join(",")}`);
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

  // 4e. Flashcards: SM-2 scheduler, due counting, review flow
  console.log("Regressing flashcards (spaced repetition):");
  {
    const dueNow = Date.now();
    const future = dueNow + 10 * 86400000;
    const { window: w } = await loadPage("sidebar.html", {
      sf_flashcards: [
        { id: "c1", front: "Q1", back: "A1", due: dueNow - 1000, ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 },
        { id: "c2", front: "Q2", back: "A2", due: future, ease: 2.5, intervalDays: 7, reps: 3, lapses: 0 }
      ]
    });
    check(typeof w.flashcardScheduler === "function",
      "flashcardScheduler available as module global");
    check(w.flashcardsDueCount([{ due: dueNow - 1 }, { due: dueNow + 99999 }], dueNow) === 1,
      "flashcardsDueCount counts only cards at or past due");
    const fresh = { due: dueNow, ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 };
    const good = w.flashcardScheduler(3, fresh, dueNow);
    check(good.intervalDays === 1 && good.reps === 1 && good.due === dueNow + 86400000,
      "grade Good on new card schedules 1 day out");
    const easy = w.flashcardScheduler(4, good, dueNow);
    check(easy.intervalDays === 3 && easy.ease > 2.5,
      `grade Easy on new card -> 3 days and ease up (got interval ${easy.intervalDays}, ease ${easy.ease})`);
    const again = w.flashcardScheduler(1, fresh, dueNow);
    check(again.intervalDays === 0 && again.lapses === 1 && again.due > dueNow && again.due < dueNow + 60 * 60000,
      "grade Again resets interval, bumps lapses, due in 10 minutes");
    check(w.document.querySelectorAll("#fc-list > div").length === 2,
      `flashcard list rendered from storage (got ${w.document.querySelectorAll("#fc-list > div").length})`);
    const dueEl = w.document.getElementById("fc-due-count");
    check(!!dueEl && dueEl.textContent.includes("1"),
      `due count badge shows 1 (got "${dueEl ? dueEl.textContent : "none"}")`);
    w.document.getElementById("btn-fc-review").click();
    check(w.document.getElementById("fc-review").style.display === "block",
      "review panel opens");
    check(w.document.getElementById("fc-rfront").textContent === "Q1",
      `review shows the due card (got "${w.document.getElementById('fc-rfront').textContent}")`);
    w.document.getElementById("btn-fc-reveal").click();
    check(w.document.getElementById("fc-rback").style.display === "block",
      "reveal shows the answer side");
    w.document.getElementById("fc-g-good").click();
    await new Promise((r) => setTimeout(r, 40));
    check(w.document.getElementById("fc-rfront").textContent.includes("ôn xong"),
      "session completes after grading the only due card");
  }

  // 4f. Unified learning flow: citation -> note -> linked todo (goal -> source -> summary -> done)
  console.log("Regressing unified learning flow (citation -> note -> todo):");
  {
    const { window: w } = await loadPage("sidebar.html", {
      sf_todos: [],
      saved_bibliographies: [],
      sf_flashcards: []
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

  console.log("\n" + (failures === 0 ? "ALL TESTS PASSED" : `${failures} CHECK(S) FAILED`));
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL:", e && e.stack || e);
  process.exit(1);
});