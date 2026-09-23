// ---------------------------------------------------------------------------
// social-upgrade.test.js
//
// Covers the Social-tab upgrade batch:
//   * dead-code cleanup (SOC_SESSION_COOKIES removed, SOC_TRACKER_COOKIE_DOMAINS kept)
//   * defense score card compute/refresh
//   * quick-open security links per detected platform
//   * quick PIN lock (set -> lock -> wrong pin -> unlock)
//   * tracker block settings propagation + content-side handlers
//   * scam-link heuristic presence + SOC_SCAN_SCAM handler
//   * vault encrypted backup export/import guards
//   * sidebar <-> popup structural mirror for the new controls
//
// Run with: npm test
// ---------------------------------------------------------------------------

const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const OS_HTML = path.join(__dirname, "..", "OS", "html");
const OS_JS = path.join(__dirname, "..", "OS", "js");

let failures = 0;
function check(cond, msg) {
  if (cond) { console.log(`  PASS  ${msg}`); }
  else { failures++; console.error(`  FAIL  ${msg}`); }
}

// Minimal chrome/browser stub (same shape as split_smoke).
function makeChromeStub(storeInit = {}) {
  const store = { ...storeInit };
  const storageLocal = {
    get(key, cb) {
      let res = {};
      if (typeof key === "string") { res[key] = store[key]; }
      else if (Array.isArray(key)) { for (const k of key) if (k in store) res[k] = store[k]; }
      else if (typeof key === "object" && key != null) { for (const k of Object.keys(key)) res[k] = k in store ? store[k] : key[k]; }
      else { res = Object.assign({}, store); }
      const p = Promise.resolve(res);
      if (typeof cb === "function") { p.then(cb); return undefined; }
      return p;
    },
    set(obj, cb) { Object.assign(store, obj); const p = Promise.resolve(); if (typeof cb === "function") { p.then(cb); return undefined; } return p; },
    remove(keys, cb) { (Array.isArray(keys) ? keys : [keys]).forEach(k => { delete store[k]; }); const p = Promise.resolve(); if (typeof cb === "function") { p.then(cb); return undefined; } return p; }
  };
  return {
    storage: { local: storageLocal, sync: storageLocal },
    runtime: {
      getManifest: () => ({ name: "Panadolce", version: "0.0.0-test", manifest_version: 3 }),
      getURL: (p) => "chrome-extension://test/" + p,
      sendMessage: (...args) => { if (args.length > 1 && typeof args[args.length - 1] === "function") args[args.length - 1]({}); return Promise.resolve({}); },
      onMessage: { addListener: () => {}, removeListener: () => {} }
    },
    tabs: {
      query: () => Promise.resolve([{ id: 1, url: "https://facebook.com/feed", title: "FB", active: true, windowId: 1 }]),
      create: (o) => Promise.resolve({ id: 99, url: o && o.url }),
      update: () => Promise.resolve({}),
      get: (t) => Promise.resolve({ id: Number(t) || 1, url: "https://facebook.com/feed", title: "FB" }),
      remove: () => Promise.resolve(),
      reload: () => Promise.resolve({}),
      sendMessage: () => Promise.resolve({}),
      onUpdated: { addListener: () => {}, removeListener: () => {} },
      onActivated: { addListener: () => {}, removeListener: () => {} },
      onRemoved: { addListener: () => {} },
      onCreated: { addListener: () => {} }
    },
    windows: { getCurrent: () => Promise.resolve({ id: 1, focused: true }) },
    scripting: { executeScript: () => Promise.resolve([{ result: null }]) },
    downloads: { download: () => Promise.resolve(1) },
    action: { setBadgeText: () => Promise.resolve() }
  };
}

async function loadPage(htmlFile, storeInit = {}) {
  const htmlPath = path.join(OS_HTML, htmlFile);
  const html = fs.readFileSync(htmlPath, "utf8");
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (e) => errors.push(String(e && e.message || e)));
  const dom = new JSDOM(html, { url: pathToFileURL(htmlPath).href, runScripts: "outside-only", pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  const stub = makeChromeStub(storeInit);
  window.chrome = stub;
  window.browser = stub;
  window.addEventListener("error", (e) => errors.push(String(e && e.message || e)));
  const chunks = [];
  for (const script of window.document.querySelectorAll("script[src]")) {
    const abs = new URL(script.getAttribute("src"), pathToFileURL(htmlPath).href);
    chunks.push(fs.readFileSync(abs, "utf8"));
  }
  window.eval(chunks.join("\n;\n") + ";\nwindow.__socUpgradeProbe = function () { try { if (typeof socState === \"object\" && socState && \"trackerBlockAll\" in socState && \"scamWarn\" in socState && \"trackerBlock\" in socState) return { has: true }; return { has: false }; } catch (e) { return { has: false }; } };");
  await new Promise((r) => setTimeout(r, 40));
  return { window, errors, stub };
}

async function main() {
  const socialProt = fs.readFileSync(path.join(OS_JS, "tabs", "social-protection.js"), "utf8");
  const socialVault = fs.readFileSync(path.join(OS_JS, "tabs", "social-vault.js"), "utf8");
  const contentSocial = fs.readFileSync(path.join(OS_JS, "content", "social.js"), "utf8");

  console.log("\n1. Dead-code cleanup in social-protection.js:");
  check(!/SOC_SESSION_COOKIES/.test(socialProt), "SOC_SESSION_COOKIES constant removed");
  check(/SOC_TRACKER_COOKIE_DOMAINS/.test(socialProt), "SOC_TRACKER_COOKIE_DOMAINS kept for reuse");

  console.log("\n2. Content script capabilities (social.js):");
  check(/trackerBlockAll/.test(contentSocial) && /trackerBlock/.test(contentSocial), "content reads trackerBlockAll/trackerBlock settings");
  check(/trackerStripped/.test(contentSocial), "content tracks a trackerStripped counter");
  check(/function _scanScamLinks/.test(contentSocial), "content defines _scanScamLinks()");
  check(/SOC_SCAN_SCAM/.test(contentSocial), "content handles SOC_SCAN_SCAM message");
  check(/SCAM_TOKEN_RE/.test(contentSocial) && /SCAM_CTX_RE/.test(contentSocial), "scam heuristics (token + context regexes) present");

  console.log("\n3. Vault module upgrade (social-vault.js):");
  check(/function socVaultExport/.test(socialVault), "socVaultExport defined");
  check(/function socVaultImport\(/.test(socialVault) && /function socVaultImportPick/.test(socialVault), "socVaultImport / socVaultImportPick defined");
  check(/function socVaultAutoLock/.test(socialVault), "socVaultAutoLock defined (auto-lock on blur/hide)");

  console.log("\n4. Loading sidebar.html:");
  const { window: w, errors } = await loadPage("sidebar.html", { app_language: "vi" });
  const relevant = errors.filter(e => !/Not implemented:/.test(e));
  check(relevant.length === 0, "no uncaught errors at load" + (relevant.length ? ` -> ${relevant.slice(0, 3).join(" | ")}` : ""));

  const globals = ["socScoreRefresh", "socScoreCompute", "socScoreTier", "socRenderQuickLinks",
    "socPinSet", "socPinLockNow", "socPinUnlock", "socPinAutoLock",
    "socFetchTrackers", "socFetchScamWarn", "socVaultExport", "socVaultImport"];
  for (const g of globals) {
    check(w.eval(`typeof ${g}`) === "function", `global function available: ${g}`);
  }

  check(w.__socUpgradeProbe().has === true, "socState carries new setting fields");

  // --- defense score ---
  console.log("\n5. Defense score:");
  {
    const full = await loadPage("sidebar.html", {
      app_language: "vi",
      sf_social_settings: { inj: true, injMode: "remove", linkClean: true, shopClean: true, gamble: true, trackerBlockAll: true, scamWarn: true },
      sf_social_vault: { v: 1 },
      sf_social_checklist: { "soc_ck_i1": true, "soc_ck_i2": true, "soc_ck_i3": true, "soc_ck_i4": true, "soc_ck_i5": true, "soc_ck_i6": true, "soc_ck_i7": true, "soc_ck_i8": true, "soc_ck_i9": true, "soc_ck_i10": true }
    });
    const pts = await full.window.socScoreCompute();
    check(pts === 100, `fully-configured state scores 100 (got ${pts})`);
    const bare = await loadPage("sidebar.html", { app_language: "vi" });
    const barePts = await bare.window.socScoreCompute();
    check(barePts === 50, `defaults score 50/100 (got ${barePts})`);
    check(full.window.eval(`socScoreTier(95)[0]`) === "soc_score_tier_great" &&
      full.window.eval(`socScoreTier(75)[0]`) === "soc_score_tier_good" &&
      full.window.eval(`socScoreTier(50)[0]`) === "soc_score_tier_weak" &&
      full.window.eval(`socScoreTier(10)[0]`) === "soc_score_tier_risk",
      "score tier mapping (great/good/weak/risk)");
  }

  // --- quick PIN lock round-trip ---
  console.log("\n6. Quick PIN lock (set -> lock -> wrong -> unlock):");
  {
    const pinInput = w.document.getElementById("soc-pin-input");
    const unlockInput = w.document.getElementById("soc-pin-unlock");
    const overlay = w.document.getElementById("soc-pin-overlay");
    check(!!pinInput && !!unlockInput && !!overlay, "PIN inputs + overlay present");
    check(overlay.style.display === "none", "overlay hidden until locked");
    pinInput.value = "1234";
    w.socPinSet();
    await new Promise((r) => setTimeout(r, 30));
    const rec = await w.chrome.storage.local.get("sf_social_pin");
    check(rec.sf_social_pin && rec.sf_social_pin.hash && /^[a-f0-9]{8,64}$/.test(rec.sf_social_pin.hash),
      "PIN stored as salted hash (SHA-256, sync fallback in test env)" + (rec.sf_social_pin ? "" : " — none stored"));
    w.socPinLockNow();
    check(overlay.style.display === "flex", "lock now shows the overlay");
    unlockInput.value = "9999";
    w.socPinUnlock();
    await new Promise((r) => setTimeout(r, 30));
    check(overlay.style.display === "flex", "wrong PIN keeps overlay locked");
    unlockInput.value = "1234";
    w.socPinUnlock();
    await new Promise((r) => setTimeout(r, 30));
    check(overlay.style.display === "none", "correct PIN unlocks the tab");
    const storedBefore = await w.chrome.storage.local.get("sf_social_pin");
    check(!!storedBefore.sf_social_pin, "record present after unlock");
  }

  // --- tracker + scam + quicklinks UI wiring ---
  console.log("\n7. Tracker / scam / quick-links UI wiring:");
  {
    const trAll = w.document.getElementById("soc-tracker-all");
    check(!!trAll, "tracker-all toggle present");
    const scamEl = w.document.getElementById("soc-scam-warn");
    check(!!scamEl && !!w.document.getElementById("soc-scam-out"), "scam toggle + output present");
    check(!!w.document.getElementById("soc-quicklinks"), "quick-links container present");
    const scoreNum = w.document.getElementById("soc-score-num");
    check(!!scoreNum && /\/\s*100/.test(scoreNum.textContent), `score number rendered (got "${scoreNum.textContent}")`);
    // quick links for a facebook active tab should render at least one button
    const qlBtns = w.document.querySelectorAll("#soc-quicklinks .btn-text-small").length;
    check(qlBtns >= 1, `quick-open buttons rendered for facebook host (got ${qlBtns})`);

    // tracker toggle persists to settings payload
    trAll.click();
    await new Promise((r) => setTimeout(r, 30));
    const st = await w.chrome.storage.local.get("sf_social_settings");
    check(st.sf_social_settings && st.sf_social_settings.trackerBlockAll === true,
      "tracker-all toggle persisted to sf_social_settings");
    check(Array.isArray(st.sf_social_settings.trackerBlock), "trackerBlock array in payload");
  }

  // --- gambleAllow survives a settings save (no allowlist wipe on toggle) ---
  console.log("\n7b. gambleAllow preserved across a settings save:");
  {
    await w.chrome.storage.local.set({ sf_social_settings: {
      inj: true, injMode: "remove", linkClean: true, shopClean: false, gamble: true,
      trackerBlockAll: false, trackerBlock: [], scamWarn: true, lastScan: null,
      gambleAllow: { "kubet.net": true, "__casino": true }
    }});
    w.socLoadSettings();
    await new Promise((r) => setTimeout(r, 30));
    const scLink = w.document.getElementById("soc-link-clean");
    scLink.checked = false;
    scLink.dispatchEvent(new w.Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));
    const st2 = await w.chrome.storage.local.get("sf_social_settings");
    check(!!(st2.sf_social_settings && st2.sf_social_settings.gambleAllow &&
      st2.sf_social_settings.gambleAllow["kubet.net"] === true &&
      st2.sf_social_settings.gambleAllow["__casino"] === true),
      `gambleAllow preserved after toggling a switch (got ${JSON.stringify(st2.sf_social_settings && st2.sf_social_settings.gambleAllow)})`);
  }

  // --- vault backup guards ---
  console.log("\n8. Vault backup/restore guards (locked vault):");
  {
    const msg = w.document.getElementById("soc-vt-msg");
    w.socVaultExport();
    await new Promise((r) => setTimeout(r, 10));
    check(msg.textContent.indexOf(w.t("soc_vt_exp_locked")) !== -1,
      `export while locked shows a hint (got "${msg.textContent}")`);
    w.socVaultImport();
    await new Promise((r) => setTimeout(r, 10));
    check(msg.textContent.indexOf(w.t("soc_vt_imp_none")) !== -1,
      `import with no file shows a hint (got "${msg.textContent}")`);
    check(!!w.document.getElementById("btn-soc-vt-export") &&
      !!w.document.getElementById("btn-soc-vt-import") &&
      !!w.document.getElementById("soc-vt-bakfile") &&
      !!w.document.getElementById("soc-vt-bakpw"),
      "backup/restore controls present");
  }

  // --- sidebar <-> popup structural mirror ---
  console.log("\n9. popup.html mirrors the new Social controls:");
  {
    const popupSrc = fs.readFileSync(path.join(OS_HTML, "popup.html"), "utf8");
    const sidebarSrc = fs.readFileSync(path.join(OS_HTML, "sidebar.html"), "utf8");
    const idsIts = ["soc-pin-overlay", "soc-pin-input", "soc-pin-unlock", "soc-tracker-all", "soc-tracker-list", "soc-scam-warn", "soc-scam-out", "soc-score-num", "soc-score-bar", "soc-quicklinks", "btn-soc-score-ck", "soc-vt-bakfile", "soc-vt-bakpw", "soc-vt-imbakpw", "btn-soc-vt-export", "btn-soc-vt-import", "soc-vt-bakname"];
    for (const id of idsIts) {
      const inS = sidebarSrc.includes(`id="${id}"`);
      const inP = popupSrc.includes(`id="${id}"`);
      check(inS && inP, `mirrored control id="${id}" (sidebar=${inS}, popup=${inP})`);
    }
  }

  console.log(failures === 0 ? "\nAll social-upgrade checks passed." : `\n${failures} FAILURES.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });