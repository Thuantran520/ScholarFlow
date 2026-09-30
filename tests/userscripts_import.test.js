// ---------------------------------------------------------------------------
// tests/userscripts_import.test.js
//
// Covers "install from URL": resolving a script-hosting page to the real
// .user.js, the metadata the shared parser must survive, the batch limits, and
// the review-before-install dialogs. The background is loaded as a real ES
// module (it is one at runtime) with fetch stubbed, so this exercises the same
// code path the sidebar drives.
//
// The last section drives the real sidebar page end to end, because the bug
// that matters most here is not a wrong field value - it is installing a script
// that silently *replaces* an unrelated one instead of creating a new record.
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { makeChromeStub, check, finish, loadPage } = require("./helpers");

const REPO_ROOT = path.join(__dirname, "..");
const GREASY_FIXTURE = fs.readFileSync(
  path.join(REPO_ROOT, "tests", "fixtures", "greasyfork-script-page.html"), "utf8"
);

const SCRIPT_MIN = [
  "// ==UserScript==",
  "// @name         Minimal",
  "// @namespace    test",
  "// @version      2.0",
  "// @match        https://example.com/*",
  "// @run-at       document-start",
  "// @grant        GM_setValue",
  "// @connect      example.org",
  "// @updateURL    https://cdn.example.com/min.meta.js",
  "// ==/UserScript==",
  "console.log('hi');"
].join("\n");

// Greasy Fork scripts routinely ship localized tags. The base one has to win.
const SCRIPT_LOCALIZED = [
  "// ==UserScript==",
  "// @name         Base Name",
  "// @name:vi      Tên tiếng Việt",
  "// @name:ja      日本語の名前",
  "// @description  Base description",
  "// @description:vi  Mô tả tiếng Việt",
  "// @include      https://*.youtube.com/*",
  "// @include      https://x.com/*",
  "// @grant        unsafeWindow",
  "// ==/UserScript==",
  "void 0;"
].join("\n");

// A real @include-only script must still get a registrable scope.
const SCRIPT_INCLUDE_ONLY = SCRIPT_LOCALIZED;

function noop() {}
function evt() {
  const fns = [];
  return { fns, addListener: (f) => fns.push(f), removeListener: noop, hasListener: () => false };
}

(async function main() {
  // -----------------------------------------------------------------------
  // 1. The shared metadata parser
  // -----------------------------------------------------------------------
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    runScripts: "outside-only", url: "https://example.com/p"
  });
  dom.window.eval(fs.readFileSync(path.join(REPO_ROOT, "OS/js/core/userscript-meta.js"), "utf8"));
  const META = dom.window.SF_US_META;

  console.log("userscript-meta: localized tags");
  const loc = META.fieldsOf({ code: SCRIPT_LOCALIZED });
  check(loc.name === "Base Name", "base @name wins over @name:vi / @name:ja (got " + JSON.stringify(loc.name) + ")");
  check(loc.description === "Base description", "base @description wins over @description:vi");

  console.log("userscript-meta: @include-only scope");
  check(loc.matches.length === 2, "@include-only script exposes 2 match patterns");
  check(loc.matches.indexOf("https://*.youtube.com/*") > -1, "@include promoted to a match pattern");
  check(loc.includes.length === 2, "raw includes are preserved too");
  const scoped = META.fieldsOf({ code: SCRIPT_INCLUDE_ONLY });
  check(scoped.explicitMatches.length === 2, "explicitMatches derived from @include, not empty");
  check(META.matchesUrl(scoped, "https://www.youtube.com/watch?v=1"), "@include scope actually matches a URL");
  check(!META.matchesUrl(scoped, "https://example.com/"), "@include scope does not widen to every site");

  console.log("userscript-meta: a script with no scope at all");
  const bare = META.fieldsOf({ code: "// ==UserScript==\n// @name Bare\n// ==/UserScript==" });
  check(bare.explicitMatches.length === 0, "no @match/@include means no registrable scope");
  check(bare.matches.length === 1 && bare.matches[0] === "<all_urls>", "display default stays <all_urls>");

  console.log("userscript-meta: @connect / @updateURL");
  const min = META.parse(SCRIPT_MIN);
  check(Array.isArray(min.connects) && min.connects.length === 1 && min.connects[0] === "example.org",
    "@connect is collected as an array");
  check(min.updateURL === "https://cdn.example.com/min.meta.js", "@updateURL keeps its tag casing");
  check(min.runAt === "document-start", "@run-at is parsed");

  // -----------------------------------------------------------------------
  // 2. The background fetcher, driven through its real message handler
  // -----------------------------------------------------------------------
  console.log("US_FETCH_SCRIPTS: URL resolution");
  const routes = {
    "https://greasyfork.org/en/scripts/563321-something": { body: GREASY_FIXTURE },
    "https://cdn.example.com/min.user.js": { body: SCRIPT_MIN },
    "https://cdn.example.com/plain.txt": { body: "just some text, no header" },
    "https://empty.example.com/": { body: "<!doctype html><html><body>nothing here</body></html>" }
  };
  const fetched = [];
  globalThis.fetch = async function (url) {
    const u = String(url);
    fetched.push(u);
    // Whatever absolute install link the fixture hides, serve it as a real
    // script - that second hop is the whole point of the resolver.
    if (u.indexOf("update.greasyfork.org/scripts/") > -1) {
      return { ok: true, status: 200, statusText: "OK", headers: { forEach: noop }, text: async () => SCRIPT_MIN };
    }
    const hit = routes[u];
    if (!hit) return { ok: false, status: 404, statusText: "Not Found", text: async () => "" };
    return {
      ok: true, status: 200, statusText: "OK",
      headers: { forEach: noop },
      text: async () => hit.body
    };
  };

  const stub = makeChromeStub({});
  stub.runtime.getURL = (p) => "chrome-extension://test/" + (p || "");
  stub.runtime.getManifest = () => ({ version: "2.5.5", manifest_version: 3 });
  const listeners = [];
  stub.runtime.onMessage.addListener = (fn) => listeners.push(fn);
  globalThis.chrome = stub;
  globalThis.browser = undefined;
  globalThis.window = globalThis;

  await import("../OS/js/userscripts_bg.js");
  check(listeners.length === 1, "background registered exactly one onMessage listener");

  const call = (urls) => new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    listeners[0]({ action: "US_FETCH_SCRIPTS", urls: urls }, { tab: { id: 1, url: "https://example.com/" } }, done);
    setTimeout(() => done({ items: [{ ok: false, url: "", error: "handler timeout" }] }), 10000);
  });

  const pageUrl = "https://greasyfork.org/en/scripts/563321-something";
  const pageRes = await call([pageUrl]);
  const pageItem = pageRes.items[0];
  check(pageItem.ok === true, "a Greasy Fork page URL resolves to a script" + (pageItem.ok ? "" : " (" + pageItem.error + ")"));
  if (pageItem.ok) {
    check(/\.user\.js/.test(pageItem.sourceUrl) && pageItem.sourceUrl !== pageUrl,
      "the real .user.js behind the page is what gets fetched");
    check(fetched.length === 2 && fetched[1].indexOf("update.greasyfork.org") > -1,
      "the page is fetched first, then the install link");
  }

  const directRes = await call(["https://cdn.example.com/min.user.js"]);
  const direct = directRes.items[0];
  check(direct.ok === true, "a direct .user.js URL is accepted");
  check(direct.name === "Minimal" && direct.version === "2.0", "name/version come from the header");
  check(direct.runAt === "document_start", "@run-at is honoured, not hardcoded to document_idle");
  check(direct.matches.length === 1 && direct.matches[0] === "https://example.com/*", "scope from @match");
  check(direct.grants.length === 1 && direct.grants[0] === "GM_setValue", "grants reported for review");
  check(direct.connects.length === 1 && direct.connects[0] === "example.org", "connects reported for review");
  check(direct.updateUrl === "https://cdn.example.com/min.meta.js", "updateUrl reported for review");
  check(direct.code === SCRIPT_MIN, "the full source is handed over for review");

  console.log("US_FETCH_SCRIPTS: rejections");
  const blankSkipped = await call(["", "   "]);
  check(blankSkipped.items.length === 0, "blank lines in a paste are skipped, not fetched");
  const bad = (await call([
    "javascript:alert(1)", "chrome://extensions", "not a url",
    "https://empty.example.com/", "https://cdn.example.com/plain.txt", "https://missing.example.com/x.user.js"
  ])).items;
  check(bad.length === 6, "every non-empty input gets its own result");
  for (let i = 0; i < 3; i++) check(bad[i].ok === false, "rejects unsafe/invalid input #" + i);
  check(/no \.user\.js link/.test(bad[3].error), "an HTML page with no script link says so");
  check(/no ==UserScript== header/.test(bad[4].error), "a file with no metadata block says so");
  check(bad[5].ok === false, "HTTP 404 is reported as a failure, not an empty script");

  console.log("US_FETCH_SCRIPTS: batch");
  const before = fetched.length;
  const batch = (await call([pageUrl, "https://cdn.example.com/min.user.js", "chrome://x"])).items;
  check(batch.length === 3, "a mixed batch returns one result per input");
  check(batch[0].ok && batch[1].ok && !batch[2].ok, "mixed batch keeps per-URL outcomes");
  check(fetched.length === before + 3, "only the two real URLs were actually requested");

  const many = await call(Array.from({ length: 40 }, (_, i) => "https://cdn.example.com/min.user.js?i=" + i));
  check(many.items.length <= 20, "a huge paste is capped (got " + many.items.length + ")");

  const empty = await call([]);
  check(empty.items.length === 0, "an empty request does not fetch anything");

  // -----------------------------------------------------------------------
  // 3. The review dialogs
  // -----------------------------------------------------------------------
  console.log("review dialogs");
  const dom2 = new JSDOM("<!doctype html><html><body></body></html>", { runScripts: "outside-only", url: "https://example.com/p" });
  dom2.window.eval(fs.readFileSync(path.join(REPO_ROOT, "OS/js/core/userscript-sync.js"), "utf8"));
  const SYNC = dom2.window.SF_US_SYNC;
  check(!!SYNC, "userscript-sync.js exposes the dialog helpers");

  const split = SYNC.partitionImport([directItem(), { ok: false, url: "https://x/", error: "boom" }]);
  check(split.ok.length === 1 && split.failed.length === 1, "partitionImport separates results from failures");
  check(split.failed[0].error === "boom", "the failure reason survives");

  function directItem() {
    return {
      ok: true, name: "Minimal", version: "2.0", author: "test", code: SCRIPT_MIN,
      matches: ["https://example.com/*"], includes: [], excludeMatches: [], excludes: [],
      requires: [], grants: ["GM_setValue"], connects: ["example.org"],
      updateUrl: "https://cdn.example.com/min.meta.js", sourceUrl: "https://cdn.example.com/min.user.js",
      warning: "", isUpdateOf: "Old Minimal", runAt: "document-start"
    };
  }

  const promptDone = SYNC.showImportPrompt();
  const overlay = dom2.window.document.querySelector(".sfus-cf-overlay");
  check(!!overlay, "the import dialog opens");
  const area = overlay.querySelector("textarea");
  check(!!area, "the import dialog takes a textarea");
  area.value = "https://a.example.com/1.user.js\nhttps://b.example.com/2.user.js, https://a.example.com/1.user.js";
  overlay.querySelectorAll("button")[1].click();
  const gotUrls = await promptDone;
  check(gotUrls.length === 2, "paste is split per line/comma and de-duplicated (got " + JSON.stringify(gotUrls) + ")");
  check(!dom2.window.document.querySelector(".sfus-cf-overlay"), "the dialog closes after use");

  const cancelDone = SYNC.showImportPrompt();
  const ov2 = dom2.window.document.querySelector(".sfus-cf-overlay");
  ov2.querySelectorAll("button")[0].click();
  check((await cancelDone).length === 0, "cancelling yields no URLs");

  const reviewDone = SYNC.showScriptReview([directItem()]);
  const ov3 = dom2.window.document.querySelector(".sfus-cf-overlay");
  const text = ov3.textContent;
  check(text.indexOf("Minimal") > -1, "the review names the script");
  check(text.indexOf("https://example.com/*") > -1, "the review shows the scope");
  check(text.indexOf("GM_setValue") > -1, "the review lists the API permissions asked for");
  check(text.indexOf("example.org") > -1, "the review lists reachable hosts");
  check(text.indexOf("Old Minimal") > -1, "the review says it replaces an installed copy");
  check(!!ov3.querySelector("pre") && ov3.querySelector("pre").textContent === SCRIPT_MIN,
    "the full source is shown before installing");
  check(ov3.querySelectorAll("input[type=checkbox]").length === 1, "each script gets a checkbox");

  const chosen = await (function () {
    const boxes = ov3.querySelectorAll("input[type=checkbox]");
    boxes[0].checked = false; // user deselects it
    ov3.querySelectorAll("button")[1].click();
    return reviewDone;
  })();
  check(chosen.length === 0, "an unticked script is not installed");

  const manyScopes = directItem();
  manyScopes.matches = Array.from({ length: 12 }, (_, i) => "https://site" + i + ".example/*");
  const longScopeReview = SYNC.showScriptReview([manyScopes]);
  const ovLong = dom2.window.document.querySelector(".sfus-cf-overlay");
  const scopeDetails = ovLong.querySelector(".sfus-imp-meta > details.sfus-imp-more");
  check(!!scopeDetails, "a long @match list is collapsed in the review");
  check(scopeDetails && /\(12\)/.test(scopeDetails.querySelector("summary").textContent),
    "the collapsed scope summary reports the number of matched sites");
  ovLong.querySelectorAll("button")[0].click();
  await longScopeReview;

  const review2 = SYNC.showScriptReview([directItem()]);
  const ov4 = dom2.window.document.querySelector(".sfus-cf-overlay");
  ov4.querySelectorAll("button")[1].click();
  check((await review2).length === 1, "a ticked script is returned for install");

  console.log("review dialogs: no dynamic HTML");
  const src = fs.readFileSync(path.join(REPO_ROOT, "OS/js/core/userscript-sync.js"), "utf8");
  const start = src.indexOf("function showImportPrompt");
  const reviewSrc = src.slice(start, src.indexOf("function planRemoteChange"));
  check(!/\.innerHTML|insertAdjacentHTML|createContextualFragment|document\.write/.test(reviewSrc),
    "the import dialogs build DOM without innerHTML");

  // -------------------------------------------------------------------------
  // End to end through the real sidebar page.
  //
  // Everything above unit-tests the pieces. What actually shipped as "install
  // overwrites my script" only shows up when the button, the review dialog and
  // the save path run in sequence, so drive exactly that.
  // -------------------------------------------------------------------------
  console.log("sidebar end-to-end: install creates, never replaces");

  // An async click handler that throws becomes an unhandled rejection, which
  // node treats as fatal. Trap it so a thrown handler fails the assertion
  // instead of killing the run.
  const asyncFaults = [];
  const onRejection = (r) => asyncFaults.push(String((r && r.stack) || r));
  process.on("unhandledRejection", onRejection);

  const scriptFor = (name, updateUrl) => [
    "// ==UserScript==",
    "// @name         " + name,
    "// @namespace    test",
    "// @version      1.0.0",
    "// @include      https://*.example.com/*",
    updateUrl ? "// @updateURL    " + updateUrl : null,
    "// @grant        GM_openInTab",
    "// ==/UserScript==",
    "console.log(" + JSON.stringify(name) + ");"
  ].filter(Boolean).join("\n");

  const fetchItem = (name, updateUrl) => ({
    ok: true,
    url: "https://cdn.example.com/" + name.toLowerCase() + ".user.js",
    sourceUrl: "https://cdn.example.com/" + name.toLowerCase() + ".user.js",
    updateUrl: updateUrl || "",
    name: name,
    namespace: "test",
    version: "1.0.0",
    description: "",
    author: "tester",
    homepage: "",
    code: scriptFor(name, updateUrl),
    matches: [],
    includes: ["https://*.example.com/*"],
    excludeMatches: [],
    excludes: [],
    grants: ["GM_openInTab"],
    connects: [],
    requires: [],
    resources: [],
    runAt: "document_idle",
    noframes: false,
    world: "MAIN"
  });

  // A profile that already has scripts, including the id-less records older
  // versions wrote, because a fresh install would never catch an id collision.
  const seeded = [
    { name: "Legacy One", matches: ["*://*/*"], code: "console.log(1)", active: true },
    { name: "Legacy Two", matches: ["*://*/*"], code: "console.log(2)", active: true },
    { id: "script_1700000000000_aaa", name: "Modern Three", matches: ["*://*/*"], code: "console.log(3)", active: true }
  ];

  const { window: win, errors: pageErrors } = await loadPage("sidebar.html", {
    storeInit: { sf_custom_scripts: seeded },
    settleMs: 200
  });
  const doc = win.document;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const stored = async () => {
    const r = await win.browser.storage.local.get("sf_custom_scripts");
    return (r && r.sf_custom_scripts) || [];
  };
  const liveOverlay = () => doc.querySelector(".sfus-cf-overlay");

  let pending = [];
  win.browser.runtime.sendMessage = async (msg) =>
    (msg && msg.action === "US_FETCH_SCRIPTS") ? { items: pending } : { ok: true };

  const installViaUrl = async (items) => {
    pending = items;
    doc.getElementById("btn-us-import-url").click();
    await wait(120);
    const prompt = liveOverlay();
    check(!!prompt, "the URL prompt opens");
    prompt.querySelector(".sfus-imp-input").value = items.map((i) => i.url).join("\n");
    prompt.querySelector(".sfus-cf-foot .is-primary").click();
    await wait(250);
    const review = liveOverlay();
    check(!!review, "the review dialog opens");
    review.querySelector(".sfus-cf-foot .is-primary").click();
    await wait(250);
  };

  const addViaEditor = async (name, code) => {
    doc.getElementById("btn-us-add").click();
    doc.getElementById("us-edit-name").value = name;
    doc.getElementById("us-edit-code").value = code;
    doc.getElementById("btn-us-save").click();
    await wait(250);
  };

  // 1. One paste, two different scripts -> two new records.
  await installViaUrl([
    fetchItem("Alpha", "https://cdn.example.com/alpha.meta.js"),
    fetchItem("Beta", "https://cdn.example.com/beta.meta.js")
  ]);
  let list = await stored();
  check(list.length === 5, "two scripts in one paste add two records (got " + list.length + ")");
  const alpha = list.find((s) => s.name === "Alpha");
  const beta = list.find((s) => s.name === "Beta");
  check(!!alpha && !!beta, "both pasted scripts are present");
  check(!!(alpha && beta && alpha.id !== beta.id), "the two new scripts get distinct ids");
  check(list.slice(0, 3).every((s, i) => s.name === seeded[i].name),
    "the pre-existing scripts are left alone");
  check(!!(alpha && (alpha.includes || []).indexOf("https://*.example.com/*") !== -1),
    "an @include-only script keeps its scope instead of collapsing to *://*/*");

  // 2. The same @updateURL again -> update in place, no second copy.
  await installViaUrl([fetchItem("Alpha", "https://cdn.example.com/alpha.meta.js")]);
  list = await stored();
  check(list.length === 5, "re-importing a known @updateURL does not add a record (got " + list.length + ")");
  check(list.filter((s) => s.name === "Alpha").length === 1, "Alpha is still a single record");
  check((list.find((s) => s.name === "Alpha") || {}).id === (alpha || {}).id,
    "Alpha kept its id, so it was updated rather than replaced");

  // 3. A script with no @updateURL -> a new record.
  await installViaUrl([fetchItem("Gamma", "")]);
  list = await stored();
  check(list.length === 6, "a script with no @updateURL is added (got " + list.length + ")");
  check(!!list.find((s) => s.name === "Gamma"), "Gamma is present");

  // 4. The editor's "add" button -> also a new record, never a replacement.
  await addViaEditor("Delta", "console.log('delta')");
  list = await stored();
  check(list.length === 7, "add-new creates a record (got " + list.length + ")");
  check(!!list.find((s) => s.name === "Delta"), "Delta is present");
  check(list.filter((s) => s.name === "Legacy One").length === 1,
    "the id-less legacy records are neither duplicated nor overwritten");
  check((list.find((s) => s.name === "Legacy One") || {}).code === "console.log(1)",
    "a legacy record keeps its own code");

  // 5. Two consecutive adds must not collapse into one.
  await addViaEditor("Epsilon", "console.log('eps')");
  await addViaEditor("Zeta", "console.log('zeta')");
  list = await stored();
  check(list.length === 9, "two more adds add two records (got " + list.length + ")");
  const ids = list.map((s) => s.id).filter((v) => typeof v === "string");
  check(new Set(ids).size === ids.length, "every id-ed record has a unique id");

  check(asyncFaults.length === 0,
    "no install path throws (the handler used to end in a ReferenceError)");
  if (asyncFaults.length) console.log("  fault: " + asyncFaults[0].split("\n")[0]);
  check(pageErrors.length === 0, "the sidebar logs no page errors");
  process.removeListener("unhandledRejection", onRejection);

  // The file import needs the shared parser at runtime, not just on disk.
  check(!!win.SF_US_META, "sidebar.html loads core/userscript-meta.js");
  check(!!(win.SF_US_META && typeof win.SF_US_META.fieldsOf === "function"),
    "SF_US_META.fieldsOf is callable in the sidebar");
  const fileFields = win.SF_US_META.fieldsOf({ code: scriptFor("FileOnly", "") });
  check(fileFields.name === "FileOnly", "the file import reads @name (got " + fileFields.name + ")");
  const noHeaderName = win.SF_US_META.fieldsOf({ code: "console.log('x');" });
  check(noHeaderName.name === "", "a script with no @name yields no name to fall back from");
  check((fileFields.includes || []).indexOf("https://*.example.com/*") !== -1,
    "the file import keeps an @include-only scope");
  check(fileFields.grants.indexOf("GM_openInTab") !== -1, "the file import reads @grant");

  // The one function the import handler used to call but which never existed.
  const sidebarSrc = fs.readFileSync(path.join(REPO_ROOT, "OS/js/tabs/userscripts.js"), "utf8");
  check(!/\b_reload\s*\(/.test(sidebarSrc), "the sidebar calls no undefined _reload()");
  const importsFile = sidebarSrc.slice(
    sidebarSrc.indexOf("dom.btnImport.onclick"),
    sidebarSrc.indexOf("dom.btnImportUrl.onclick")
  );
  check(!/\balert\s*\(/.test(importsFile), "the file import no longer uses alert()");
  check(importsFile.indexOf("_commitScript") !== -1, "the file import goes through _commitScript");
  check(importsFile.indexOf("META.fieldsOf") !== -1, "the file import uses the shared meta parser");

  // -------------------------------------------------------------------------
  // Records written before ids existed.
  //
  // Every lookup here is by id, so `list.find(s => s.id === undefined)` returns
  // the first id-less record - an edit, delete or toggle meant for one script
  // lands on a different one, which reads as "a new script overwrote the old".
  // -------------------------------------------------------------------------
  console.log("legacy records without an id");

  const legacy = [
    { name: "No Id One", code: "console.log('one')", matches: ["*://*/*"] },
    { name: "No Id Two", code: "console.log('two')", matches: ["*://*/*"] },
    { id: "script_keepme", name: "Has Id", code: "console.log('keep')", matches: ["*://*/*"] }
  ];
  const SYNC_API = win.SF_US_SYNC;
  check(!!(SYNC_API && typeof SYNC_API.ensureIds === "function"), "SF_US_SYNC.ensureIds is available");

  const fixed = SYNC_API.ensureIds(legacy);
  check(fixed.changed, "ensureIds reports that it changed the list");
  check(fixed.list.length === 3, "ensureIds keeps every record");
  check(fixed.list.every((s) => typeof s.id === "string" && s.id), "ensureIds gives every record an id");
  check(new Set(fixed.list.map((s) => s.id)).size === 3, "the backfilled ids are unique");
  check(fixed.list[2].id === "script_keepme", "an existing id is never rewritten");
  check(fixed.list[0].name === "No Id One" && fixed.list[1].name === "No Id Two",
    "the order is preserved");
  check(!SYNC_API.ensureIds(fixed.list).changed, "ensureIds is a no-op once ids exist");
  check(legacy[0].id === undefined, "ensureIds does not mutate the input");

  // With ids backfilled, the sidebar's own reads persist them, so the ids are
  // stable from then on and each operation can only touch its own record.
  await win.browser.storage.local.set({ sf_custom_scripts: legacy });
  const reread = await SYNC_API.readAllEnsured("sidebar");
  check(reread.every((s) => typeof s.id === "string" && s.id),
    "readAllEnsured backfills ids for the stored list");
  const persisted = (await win.browser.storage.local.get("sf_custom_scripts")).sf_custom_scripts;
  check(persisted.every((s) => typeof s.id === "string" && s.id),
    "the backfilled ids are written back to storage");
  const again = await SYNC_API.readAllEnsured("sidebar");
  check(JSON.stringify(again.map((s) => s.id)) === JSON.stringify(reread.map((s) => s.id)),
    "a second read yields the same ids (no new records appear)");

  // -------------------------------------------------------------------------
  // A write that goes through a stale in-memory list destroys whatever another
  // surface saved in the meantime, and a stale list also makes an unrelated
  // record look like the one being edited.
  // -------------------------------------------------------------------------
  console.log("a stale page never clobbers a concurrent save");

  const KEY = "sf_custom_scripts";
  const stale = await loadPage("sidebar.html", {
    storeInit: { [KEY]: [{ id: "script_existing", name: "Existing", code: "console.log('e')", matches: ["*://*/*"], active: true }] },
    settleMs: 200
  });
  const sdoc = stale.window.document;
  const sRead = async () =>
    (await stale.window.browser.storage.local.get(KEY))[KEY] || [];

  // The Studio (or a second sidebar) saves while our page is already open.
  await stale.window.browser.storage.local.set({
    [KEY]: [
      { id: "script_existing", name: "Existing", code: "console.log('e')", matches: ["*://*/*"], active: true },
      { id: "script_from_studio", name: "From Studio", code: "console.log('s')", matches: ["*://*/*"], active: true }
    ]
  });

  // Now act in the stale page.
  sdoc.getElementById("btn-us-add").click();
  sdoc.getElementById("us-edit-name").value = "Added In Stale Page";
  sdoc.getElementById("us-edit-code").value = "console.log('n')";
  sdoc.getElementById("btn-us-save").click();
  await wait(300);

  let after = await sRead();
  check(after.length === 3, "the concurrent save survives the add (got " + after.length + ": " +
    after.map((s) => s.name).join(", ") + ")");
  ["Existing", "From Studio", "Added In Stale Page"].forEach((n) => {
    check(!!after.find((s) => s.name === n), n + " is still present");
  });

  // The same for a small action, which used to rewrite the whole array.
  const toggle = sdoc.querySelector("#us-list li .us-checkbox");
  check(!!toggle, "the list renders a toggle");
  if (toggle) {
    toggle.click();
    await wait(300);
    after = await sRead();
    check(after.length === 3, "toggling a script does not drop records (got " + after.length + ")");
    check(!!after.find((s) => s.name === "From Studio"), "toggling keeps the other surface's record");
  }

  // A write built from anything other than the current list used to make
  // records vanish. Every caller now re-reads first, and _writeAll() re-attaches
  // anything a write forgot, so a surviving record can no longer disappear
  // because of an unrelated action. The guard cannot be reached through the UI
  // any more - that is the point - so it is asserted structurally.
  console.log("no write can silently drop a record");

  const sidebarSrc2 = fs.readFileSync(path.join(REPO_ROOT, "OS/js/tabs/userscripts.js"), "utf8");
  const writeAllSrc = sidebarSrc2.slice(
    sidebarSrc2.indexOf("async function _writeAll("),
    sidebarSrc2.indexOf("function _onRemoteChange")
  );
  check(writeAllSrc.indexOf("_readFresh()") !== -1,
    "_writeAll re-reads storage before deciding what to keep");
  check(writeAllSrc.indexOf("survivors") !== -1,
    "_writeAll re-attaches records the write did not mention");
  check(writeAllSrc.indexOf("allowDelete") !== -1,
    "only an explicit delete may drop a record");
  const delSrc = sidebarSrc2.slice(sidebarSrc2.indexOf("btnDel.onclick"));
  check(delSrc.slice(0, 400).indexOf("allowDelete: true") !== -1,
    "the delete button is the one caller that opts in");

  // And a confirmed delete is still a delete.
  const del = await loadPage("sidebar.html", {
    storeInit: {
      [KEY]: [
        { id: "script_keep_123", name: "123", code: "console.log('123')", matches: ["*://*/*"], active: true },
        { id: "script_keep_456", name: "456", code: "console.log('456')", matches: ["*://*/*"], active: true }
      ]
    },
    settleMs: 200
  });
  del.window.confirm = () => true;
  const delBtn = del.window.document.querySelector("#us-list li button.us-danger");
  check(!!delBtn, "the list renders a delete button");
  if (delBtn) {
    delBtn.click();
    await wait(300);
    const left = (await del.window.browser.storage.local.get(KEY))[KEY] || [];
    check(left.length === 1, "a confirmed delete still removes exactly one record (got " + left.length + ")");
  }

  // -------------------------------------------------------------------------
  // The list, not the storage.
  //
  // A filtered-out record is indistinguishable from a deleted one: the count on
  // screen simply does not grow, so an install looks exactly like an overwrite.
  // -------------------------------------------------------------------------
  console.log("the rendered list always shows what is stored");

  const vis = await loadPage("sidebar.html", {
    storeInit: { [KEY]: [{ id: "script_v1", name: "123", code: "console.log('1')", matches: ["*://*/*"], active: true }] },
    settleMs: 250
  });
  const vdoc = vis.window.document;
  const vStored = async () => (await vis.window.browser.storage.local.get(KEY))[KEY] || [];
  const vRows = () => vdoc.querySelectorAll("#us-list li:not(.us-hidden-note)").length;
  const vVisible = () => Array.from(vdoc.querySelectorAll("#us-list .us-item-title")).map((e) => e.textContent);

  check(vRows() === 1 && vVisible()[0] === "123", "one script renders one row");

  const vSearch = vdoc.getElementById("us-search");
  check(!!vSearch, "the sidebar has a search box");
  if (vSearch) {
    vSearch.value = "123";
    vSearch.dispatchEvent(new vis.window.Event("input", { bubbles: true }));
    await wait(150);
    check(vRows() === 1, "the filter keeps showing the matching script");

    // Add while the filter is active: this is what used to look like an
    // overwrite, because the list did not grow.
    vdoc.getElementById("btn-us-add").click();
    vdoc.getElementById("us-edit-name").value = "456";
    vdoc.getElementById("us-edit-code").value = "console.log('2')";
    vdoc.getElementById("btn-us-save").click();
    await wait(300);

    const storedNow = await vStored();
    check(storedNow.length === 2, "the add stored a second record (got " + storedNow.length + ")");
    check(vRows() === 2, "and the list shows both records (rendered " + vRows() + ")");
    check(vVisible().indexOf("123") !== -1 && vVisible().indexOf("456") !== -1,
      "both script names are on screen: " + vVisible().join("|"));
    check(vSearch.value === "", "the search box is cleared by the install");
  }

  // While a filter hides records, say so instead of hiding them in silence.
  const hid = await loadPage("sidebar.html", {
    storeInit: {
      [KEY]: [
        { id: "script_h1", name: "Alpha", code: "a", matches: ["*://*/*"], active: true },
        { id: "script_h2", name: "Beta", code: "b", matches: ["*://*/*"], active: true }
      ]
    },
    settleMs: 250
  });
  const hdoc = hid.window.document;
  const hSearch = hdoc.getElementById("us-search");
  hSearch.value = "Alpha";
  hSearch.dispatchEvent(new hid.window.Event("input", { bubbles: true }));
  await wait(150);
  const note = hdoc.querySelector("#us-list .us-hidden-note");
  check(!!note, "a filtered-out record is announced instead of silently hidden");
  check(hdoc.querySelectorAll("#us-list .us-item-title").length === 1,
    "only the matching script is listed as a card");
  if (note) {
    const clear = note.querySelector(".us-hidden-clear");
    check(!!clear, "the note offers a way to show everything");
    clear.click();
    await wait(150);
    check(hdoc.querySelectorAll("#us-list .us-item-title").length === 2,
      "clicking it reveals the hidden script");
    check(!hdoc.querySelector("#us-list .us-hidden-note"),
      "the note disappears once nothing is hidden");
  }

  // The count bar makes "not stored" and "stored but not shown" distinguishable
  // without a console, which is the only way to tell those two apart on screen.
  const bar = vdoc.getElementById("us-diag-counts");
  check(!!bar, "the sidebar has a diagnostics count bar");
  if (bar) {
    await wait(200);
    check(/2/.test(bar.textContent) && /:/.test(bar.textContent),
      "the bar reports both counts (got: " + bar.textContent + ")");
    // Locale-agnostic: the key carries both numbers, one for storage, one for
    // what is actually rendered. Both must read 2 after the add.
    const nums = (bar.textContent.match(/\d+/g) || []).map(Number);
    check(nums.length === 2 && nums[0] === 2 && nums[1] === 2,
      "storage and screen agree at 2 (got: " + bar.textContent + ")");
  }
  const dbtn = vdoc.getElementById("us-diag-btn");
  check(!!dbtn, "the sidebar has a diagnostics button");

  // A malformed record used to throw inside the renderer *after* it had already
  // cleared the list, so one bad row made every script look deleted - and the
  // next checkbox click, which re-renders, was enough to trigger it.
  console.log("malformed records cannot blank the list");

  async function loadMalformed(name, seed) {
    const p = await loadPage("sidebar.html", { storeInit: { [KEY]: seed }, settleMs: 300 });
    const d = p.window.document;
    const titles = () => Array.from(d.querySelectorAll("#us-list .us-item-title")).map((e) => e.textContent);
    const toggleFirst = async () => {
      const cb = d.querySelector("#us-list input.us-checkbox");
      if (!cb) return titles();
      cb.checked = !cb.checked;
      cb.dispatchEvent(new p.window.Event("change", { bubbles: true }));
      await wait(300);
      return titles();
    };
    const before = titles();
    const after = await toggleFirst();
    const still = ((await p.window.browser.storage.local.get(KEY))[KEY] || []).length;
    console.log("  " + name + ": " + before.join(" | "));
    check(before.length >= 2, "  renders every record, none dropped: " + before.length);
    check(after.length === before.length,
      "  a checkbox click does not change how many are listed: " + after.length);
    check(still === seed.length, "  storage is untouched by the crash path: " + still);
    check(p.errors.length === 0, "  no page errors: " + p.errors.join(" ; "));
  }

  await loadMalformed("matches stored as a string", [
    { id: "m_ok1", name: "Good", code: "a", matches: ["*://*/*"], active: true },
    { id: "m_bad1", name: "StringMatches", code: "b", matches: "*://*.youtube.com/*", active: true }
  ]);
  await loadMalformed("a null record in the middle", [
    { id: "m_ok2", name: "Good", code: "a", matches: ["*://*/*"], active: true },
    null,
    { id: "m_ok3", name: "Second", code: "c", matches: ["*://*/*"], active: true }
  ]);
  await loadMalformed("wrong-typed fields", [
    { id: "m_ok4", name: "Good", code: "a", matches: ["*://*/*"], active: true },
    { name: "NoFields" },
    { id: "m_bad3", code: 42, matches: 7, active: "yes" }
  ]);
  await loadMalformed("includes only, no matches", [
    { id: "m_ok5", name: "Good", code: "a", matches: ["*://*/*"], active: true },
    { id: "m_gf", name: "AllInOne", code: "c", includes: ["https://*.youtube.com/*"], active: true }
  ]);

  // A status filter that matches nothing used to render a bare "nothing found"
  // line, which reads as total data loss. It must count and offer a way out.
  const filt = await loadPage("sidebar.html", {
    storeInit: { [KEY]: [{ id: "f_1", name: "Alpha", code: "a", matches: ["*://*/*"], active: true }] },
    settleMs: 250
  });
  const filtDoc = filt.window.document;
  const fsSel = filtDoc.getElementById("us-filter-status");
  fsSel.value = "inactive";
  fsSel.dispatchEvent(new filt.window.Event("change", { bubbles: true }));
  await wait(250);
  check(filtDoc.querySelectorAll("#us-list .us-item-card").length === 0, "the filter hides the active script");
  const rescue = filtDoc.querySelector("#us-list .us-hidden-note");
  check(!!rescue, "an all-hidden filter says how many scripts are still stored");
  const emptyText = filtDoc.querySelector("#us-list .us-empty-state");
  check(!!emptyText && /tắt|turned off|停用|выключ|無効/i.test(emptyText.textContent),
    "the message names the filter instead of saying nothing was found: " +
    (emptyText ? emptyText.textContent : "(none)"));
  if (rescue) {
    rescue.querySelector(".us-hidden-clear").click();
    await wait(200);
    check(filtDoc.querySelectorAll("#us-list .us-item-card").length === 1,
      "clicking through reveals the script again");
  }

  // Toggling off under an "active" filter must announce the loss, not hide it.
  const ta = await loadPage("sidebar.html", {
    storeInit: {
      [KEY]: [
        { id: "t_1", name: "Alpha", code: "a", matches: ["*://*/*"], active: true },
        { id: "t_2", name: "Beta", code: "b", matches: ["*://*/*"], active: true }
      ]
    },
    settleMs: 250
  });
  const taDoc = ta.window.document;
  const taSel = taDoc.getElementById("us-filter-status");
  taSel.value = "active";
  taSel.dispatchEvent(new ta.window.Event("change", { bubbles: true }));
  await wait(200);
  const taCb = taDoc.querySelector("#us-list input.us-checkbox");
  taCb.checked = false;
  taCb.dispatchEvent(new ta.window.Event("change", { bubbles: true }));
  await wait(300);
  const taCards = taDoc.querySelectorAll("#us-list .us-item-card").length;
  check(taCards === 1, "the switched-off script leaves an 'active' filter (shown " + taCards + ")");
  check(!!taDoc.querySelector("#us-list .us-hidden-note"),
    "and the list says one script is merely filtered out, not deleted");
  const taStored = (await ta.window.browser.storage.local.get(KEY))[KEY] || [];
  check(taStored.length === 2, "and it is still in storage (records " + taStored.length + ")");

  process.exit(finish());
})().catch((e) => {
  console.error("userscripts_import crashed: " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
