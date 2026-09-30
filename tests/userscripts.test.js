// ---------------------------------------------------------------------------
// tests/userscripts.test.js
//
// Covers the Userscripts engine and, above all, the cross-surface sync layer
// that keeps the sidebar and the full-page Studio from clobbering each other.
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { makeChromeStub } = require("./helpers");

const REPO_ROOT = path.join(__dirname, "..");
let failures = 0;
let passed = 0;

function check(cond, msg) {
  if (cond) { passed++; return; }
  failures++;
  console.error("  FAIL: " + msg);
}
function eq(actual, expected, msg) {
  check(actual === expected, msg + " (expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual) + ")");
}

// Load a classic script into its own jsdom realm and return the window.
// runScripts:"outside-only" is required: without it jsdom's window.eval runs in
// the *Node* realm, so every "separate" window would share one globalThis and
// the module's re-entry guard would hand back the same SF_US_SYNC object.
function loadCore(relPath) {
  return newWindow([relPath]);
}

function newWindow(relPaths, stub) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    runScripts: "outside-only",
    url: "https://example.com/paper"
  });
  if (stub) {
    dom.window.chrome = stub;
    dom.window.browser = stub;
  }
  const chunks = relPaths.map((p) => fs.readFileSync(path.join(REPO_ROOT, p), "utf8"));
  dom.window.eval(chunks.join("\n;\n"));
  return dom.window;
}

// ---------------------------------------------------------------------------
// userscript-sync.js — diff engine
// ---------------------------------------------------------------------------
{
  const win = loadCore("OS/js/core/userscript-sync.js");
  const SYNC = win.SF_US_SYNC;
  check(!!SYNC, "userscript-sync.js exposes globalThis.SF_US_SYNC");

  const same = SYNC.makeDiff("a\nb\nc", "a\nb\nc");
  check(same.identical === true, "identical texts report identical");
  eq(same.added, 0, "identical texts add nothing");
  eq(same.removed, 0, "identical texts remove nothing");

  const add = SYNC.makeDiff("a\nb", "a\nb\nc");
  eq(add.added, 1, "one appended line");
  eq(add.removed, 0, "appending removes nothing");

  const del = SYNC.makeDiff("a\nb\nc", "a\nc");
  eq(del.added, 0, "deleting adds nothing");
  eq(del.removed, 1, "one deleted line");

  const repl = SYNC.makeDiff("a\nX\nc", "a\nY\nc");
  eq(repl.added, 1, "replacement adds one");
  eq(repl.removed, 1, "replacement removes one");
  const rows = repl.rows;
  eq(rows.length, 4, "replacement keeps both shared context lines (4 rows)");
  eq(rows[0].type, "ctx", "leading context row");
  eq(rows[1].type, "del", "second row is the deletion");
  eq(rows[1].left, "X", "deletion shows the old line");
  eq(rows[2].type, "add", "third row is the addition");
  eq(rows[2].right, "Y", "addition shows the new line");
  eq(rows[3].type, "ctx", "trailing context row");

  const empty = SYNC.makeDiff("", "new");
  eq(empty.added, 1, "adding to an empty document counts one line");

  const both = SYNC.makeDiff("x", "y");
  eq(both.added, 1, "replace whole doc adds one");
  eq(both.removed, 1, "replace whole doc removes one");

  // A genuinely large *changed* block is required to trip the budget: a single
  // edited line in a long file is trimmed away by the prefix/suffix pass.
  const bigA = Array.from({ length: 2000 }, (_, i) => "old" + i).join("\n");
  const bigB = Array.from({ length: 2000 }, (_, i) => "new" + i).join("\n");
  const big = SYNC.makeDiff(bigA, bigB);
  check(big.coarse === true, "huge diff degrades to the coarse block mode");
  check(big.rows.length > 0, "coarse diff still produces rows");
  eq(big.added, 2000, "coarse diff counts every added line");
  eq(big.removed, 2000, "coarse diff counts every removed line");

  // summarise() must agree with makeDiff().
  const s = SYNC.summarise("a\nb", "a\nb\nc");
  eq(s.added, 1, "summarise agrees with makeDiff on additions");
  check(s.identical === false, "summarise reports non-identical");
}

// ---------------------------------------------------------------------------
// userscript-sync.js — revision bookkeeping
// ---------------------------------------------------------------------------
{
  const SYNC = loadCore("OS/js/core/userscript-sync.js").SF_US_SYNC;

  const rec = { id: "a", code: "x" };
  const v1 = SYNC.stamp(rec, "sidebar:s1");
  eq(v1.rev, 1, "first stamp yields rev 1");
  eq(v1.updatedBy, "sidebar:s1", "stamp records the editor");
  check(typeof v1.updatedAt === "number" && v1.updatedAt > 0, "stamp records a timestamp");
  eq(rec.rev, undefined, "stamp does not mutate the input record");

  const v2 = SYNC.stamp(v1, "studio:s2");
  eq(v2.rev, 2, "second stamp increments rev");
  eq(SYNC.revOf(v2), 2, "revOf reads the revision");
  eq(SYNC.revOf(null), 0, "revOf of null is 0");
  eq(SYNC.revOf({}), 0, "revOf of a legacy record is 0");

  // Each surface must get a distinct session id, otherwise the cross-surface
  // watcher would ignore its own writes as "remote".
  const a = loadCore("OS/js/core/userscript-sync.js").SF_US_SYNC;
  const b = loadCore("OS/js/core/userscript-sync.js").SF_US_SYNC;
  check(a !== b, "two windows get two independent SF_US_SYNC objects");
  check(a.SESSION_ID !== b.SESSION_ID, "two surfaces get different session ids");
}

// ---------------------------------------------------------------------------
// userscript-meta.js — headers, match patterns, run-at
// ---------------------------------------------------------------------------
{
  const META = loadCore("OS/js/core/userscript-meta.js").SF_US_META;
  check(!!META, "userscript-meta.js exposes globalThis.SF_US_META");

  const code = [
    "// ==UserScript==",
    "// @name         Test $& $1 script",
    "// @match        *://*.example.com/*",
    "// @exclude-match *://*.example.com/admin/*",
    "// @grant        GM_getValue",
    "// @run-at       document-start",
    "// ==/UserScript==",
    "console.log(1);"
  ].join("\n");

  const parsed = META.parse(code);
  eq(parsed.name, "Test $& $1 script", "the @name is read verbatim");
  check(Array.isArray(parsed.matches) && parsed.matches[0] === "*://*.example.com/*", "@match is read");

  const fields = META.fieldsOf({ code: code });
  eq(fields.explicitMatches.length, 1, "explicitMatches holds the declared @match");
  eq(fields.excludeMatches[0], "*://*.example.com/admin/*", "@exclude-match becomes excludeMatches");
  eq(fields.runAt, "document_start", "run-at is normalised to the API spelling");

  // $ patterns in the name must survive a header rewrite; a string replacement
  // would treat $& and $1 as substitution tokens and corrupt the header.
  const rewritten = META.applyHeader("console.log(1);", fields);
  const roundTrip = META.parse(rewritten);
  eq(roundTrip.name, "Test $& $1 script", "applyHeader preserves $& / $1 inside @name");
  check(rewritten.indexOf("console.log(1);") !== -1, "applyHeader keeps the body");
  eq((rewritten.match(/@noframes/g) || []).length, 0, "noframes is not emitted twice");

  // The plural keys from fieldsOf() must be mapped back to their header tags,
  // otherwise @match disappears and the engine stops registering the script.
  check(rewritten.indexOf("@match") !== -1, "applyHeader emits the @match lines");
  check(rewritten.indexOf("*://*.example.com/*") !== -1, "the match value survives");
  check(rewritten.indexOf("@exclude-match") !== -1, "applyHeader emits @exclude-match");
  check(rewritten.indexOf("@grant") !== -1, "applyHeader emits @grant");
  const rt2 = META.fieldsOf({ code: rewritten });
  eq(rt2.explicitMatches[0], "*://*.example.com/*", "explicitMatches round-trips");
  eq(rt2.excludeMatches[0], "*://*.example.com/admin/*", "excludeMatches round-trips");
  eq(rt2.grants[0], "GM_getValue", "grants round-trip");

  const withNoFrames = META.applyHeader("x();", { name: "n", matches: ["*://*/*"], noframes: true });
  eq((withNoFrames.match(/@noframes/g) || []).length, 1, "noframes appears exactly once");

  // A script with no @match must not be silently widened to every site.
  const noMatch = META.fieldsOf({ code: "console.log(1)", matches: [] });
  eq(noMatch.explicitMatches.length, 0, "a record without @match has no explicit match");
  eq(noMatch.matches[0], "<all_urls>", "the display list still defaults for the UI");

  eq(META.normalizeRunAt("document-idle"), "document_idle", "hyphenated run-at is accepted");
  eq(META.normalizeRunAt("document_end"), "document_end", "underscored run-at is accepted");
  eq(META.normalizeRunAt("nonsense"), "document_idle", "an unknown run-at falls back");
  check(META.isValidRunAt("document-start"), "isValidRunAt accepts the header spelling");
  check(!META.isValidRunAt("whenever"), "isValidRunAt rejects nonsense");

  check(META.matchesUrl({ matches: ["*://*.example.com/*"] }, "https://example.com/a"),
    "wildcard subdomain matches");
  check(!META.matchesUrl({ matches: ["*://*.example.com/*"] }, "https://other.org/a"),
    "a foreign host does not match");
  check(!META.matchesUrl({ matches: ["*://*/*"], excludes: ["*://*.example.com/admin/*"] },
    "https://example.com/admin/x"), "@exclude-match wins over @match");
  check(META.matchesUrl({ matches: ["*://*/*"], includes: ["*://*.example.com/*"] },
    "https://example.com/a"), "@include can widen the scope");
}

// ---------------------------------------------------------------------------
// planRemoteChange — the one rule both surfaces follow on a remote change
// ---------------------------------------------------------------------------
{
  const stub = makeChromeStub();
  const win = newWindow(["OS/js/core/userscript-sync.js"], stub);
  const plan = win.SF_US_SYNC.planRemoteChange;
  check(typeof plan === "function", "planRemoteChange is exposed by the shared sync module");

  const rec = { id: "s1", code: "v2", rev: 2 };
  const P = (o) => plan(o);

  // The regression: an open, dirty editor must NOT advance its baseline, or the
  // next save compares the fresh revision against itself and overwrites silently.
  eq(P({ incoming: rec, editorOpen: true, dirty: true }).action, "warn",
    "dirty editor -> warn (baseline stays pinned, so save still conflicts)");
  eq(P({ incoming: rec, editorOpen: true, dirty: true }).reason, "concurrent-edit",
    "the dirty case is labelled concurrent-edit");

  // An open but untouched editor is safe to overwrite in place.
  eq(P({ incoming: rec, editorOpen: true, dirty: false }).action, "adopt",
    "untouched editor -> adopt the other side's version");
  eq(P({ incoming: rec, editorOpen: true, dirty: false }).reason, "untouched-editor",
    "the untouched case is labelled");

  // Not open: nothing to protect, so just drop the stale baseline.
  eq(P({ incoming: rec, editorOpen: false, dirty: false }).action, "forget",
    "closed editor -> forget");
  eq(P({ incoming: rec, editorOpen: false, dirty: false }).reason, "not-open",
    "the closed case is labelled");

  // Deleted on the other side.
  eq(P({ incoming: null, editorOpen: true, dirty: true }).action, "warn",
    "deleted under a dirty editor -> warn, so a save cannot silently resurrect it");
  eq(P({ incoming: null, editorOpen: true, dirty: false }).action, "warn",
    "deleted under an open editor -> warn");
  eq(P({ incoming: null, editorOpen: false, dirty: false }).action, "forget",
    "deleted with no editor open -> forget");
  eq(P({ incoming: undefined, editorOpen: false, dirty: false }).reason, "deleted",
    "a missing record is reported as deleted");
}

// ---------------------------------------------------------------------------
// End-to-end: two surfaces editing the same script
//
// Reproduces the reported bug — "I pressed Save in the Studio but the sidebar
// never showed the new code" — and verifies the fix: the second surface is
// told about the first surface's save, and a genuine concurrent edit raises the
// diff prompt instead of silently overwriting.
// ---------------------------------------------------------------------------
{
  const store = { sf_custom_scripts: [{ id: "s1", name: "Demo", matches: ["*://*/*"], code: "v0", rev: 0 }] };
  // One shared stub = one shared extension storage, exactly like the real thing.
  const stub = makeChromeStub(store);

  const sidebar = newWindow(["OS/js/core/userscript-sync.js"], stub);
  const studio = newWindow(["OS/js/core/userscript-sync.js"], stub);
  const A = sidebar.SF_US_SYNC;
  const B = studio.SF_US_SYNC;

  check(A.SESSION_ID !== B.SESSION_ID, "sidebar and Studio are distinct sessions");

  const sidebarEvents = [];
  const studioEvents = [];
  A.watch((i) => sidebarEvents.push(i));
  B.watch((i) => studioEvents.push(i));

  // ---- the sidebar's save flow, mirrored from _commitScript() --------------
  async function saveAs(sync, editorLabel, code) {
    const fresh = await sync.readAll();
    const idx = fresh.findIndex((s) => s.id === "s1");
    const stored = idx > -1 ? fresh[idx] : null;
    const stamped = sync.stamp(
      Object.assign({}, stored || {}, { code }),
      editorLabel,
      sync.SESSION_ID
    );
    const next = fresh.slice();
    if (idx > -1) next[idx] = stamped; else next.push(stamped);
    await sync.writeAll(next);
    return { stamped, baseRevBefore: stored ? sync.revOf(stored) : 0 };
  }

  (async () => {
    // 1. Studio saves v1.
    const r1 = await saveAs(B, "Userscript Studio", "v1");
    eq(r1.baseRevBefore, 0, "Studio started from rev 0");
    eq(r1.stamped.rev, 1, "Studio's save produced rev 1");
    eq(sidebarEvents.length, 1, "the sidebar is notified of the Studio save");
    eq(studioEvents.length, 0, "the Studio does not react to its own save");
    eq(sidebarEvents[0].scripts[0].code, "v1", "the sidebar receives the new body");
    check(sidebarEvents[0].changedIds.indexOf("s1") !== -1, "the notification names the script");

    // 2. The sidebar adopts it: a no-conflict save must go straight through.
    const adopted = (await A.readAll())[0];
    eq(adopted.code, "v1", "the sidebar now reads the Studio's code");
    eq(adopted.rev, 1, "the sidebar sees rev 1");

    // 3. Concurrent edit: the sidebar had v1 open, the Studio moves to v2.
    const r2 = await saveAs(B, "Userscript Studio", "v2");
    eq(r2.stamped.rev, 2, "the second Studio save produced rev 2");

    const storedNow = (await A.readAll())[0];
    check(A.revOf(storedNow) !== 1, "the sidebar's open revision (1) is now stale");
    const diff = A.makeDiff(storedNow.code, "v1-sidebar-edits");
    eq(diff.added, 1, "the diff shows the sidebar's line as the addition");
    eq(diff.removed, 1, "the diff shows the stored line as the removal");

    // 4. Confirming the overwrite lands the sidebar's body at rev 3.
    const r3 = await saveAs(A, "sidebar", "v1-sidebar-edits");
    eq(r3.stamped.rev, 3, "the sidebar's confirming save produced rev 3");
    const after = (await B.readAll())[0];
    eq(after.code, "v1-sidebar-edits", "the Studio now sees the sidebar's code");
    eq(studioEvents.length, 1, "the Studio is told once about the sidebar overwrite");
    eq(studioEvents[0].scripts[0].code, "v1-sidebar-edits", "and receives the sidebar's body");

    // 5. Legacy records (no rev at all) must not be treated as conflicts.
    await stub.storage.local.set({ sf_custom_scripts: [{ id: "s9", code: "legacy" }] });
    const legacyStored = (await A.readAll())[0];
    eq(A.revOf(legacyStored), 0, "a record with no rev reads as rev 0");
    const legacyNext = A.stamp(legacyStored, "sidebar", A.SESSION_ID);
    eq(legacyNext.rev, 1, "the first stamp after migration yields rev 1");

    // The runner-relay block below is the last one to settle and owns finish().
  })().catch((e) => {
    check(false, "cross-surface assertions threw: " + ((e && e.stack) || e));
    finish();
  });
}

// ---------------------------------------------------------------------------
// userscripts_runner.js — the page<->background relay actually answers
//
// The shim blocks on __SF_US_BRIDGE_RES__ / __SF_US_XHR_RES__ keyed by reqId.
// A runner that only sends and forgets leaves every GM_* call hanging until it
// times out, so these checks push real DOM events through the real runner.
// ---------------------------------------------------------------------------
{
  const runnerSrc = fs.readFileSync(
    path.join(REPO_ROOT, "OS", "js", "content", "userscripts_runner.js"), "utf8"
  );

  function boot(background, mode) {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "https://news.example/story",
      runScripts: "outside-only"
    });
    const w = dom.window;
    const sent = [];
    const rt = {
      getURL: (p) => "chrome-extension://abc/" + (p || ""),
      onMessage: { addListener(fn) { w.__onMsg = fn; } }
    };
    if (mode === "reject") {
      rt.sendMessage = () => Promise.reject(new Error("no receiver"));
    } else {
      rt.sendMessage = (msg) => { sent.push(msg); return Promise.resolve(background(msg)); };
    }
    w.chrome = { runtime: rt };
    w.browser = w.chrome;
    w.eval(runnerSrc);
    return { w, sent };
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  (async () => {
    // --- bridge: the reply comes back, carrying the script identity --------
    let captured = null;
    const { w, sent } = boot((msg) => {
      if (msg.action === "US_BRIDGE") { captured = msg; return { ok: true, value: "hello" }; }
      return { ok: true };
    });
    const res = [];
    w.document.addEventListener("__SF_US_BRIDGE_RES__", (e) => res.push(e.detail));
    w.document.dispatchEvent(new w.CustomEvent("__SF_US_BRIDGE_REQ__", {
      detail: { reqId: "br1", scriptId: "s7", name: "Demo", method: "storage.get", payload: { key: "a" } }
    }));
    await wait(20);

    check(!!captured, "the runner forwards the bridge request to the background");
    eq(captured && captured.action, "US_BRIDGE", "the action is US_BRIDGE");
    eq(captured && captured.method, "storage.get", "the method is preserved");
    eq(captured && captured.payload.scriptId, "s7",
      "scriptId is merged into the payload so storage is not shared as 'anon'");
    eq(captured && captured.payload.key, "a", "the original payload fields survive");
    eq(sent.filter((m) => m.action === "US_BRIDGE").length, 1,
      "the bridge request is sent exactly once (not duplicated)");
    eq(res.length, 1, "exactly one bridge response comes back");
    eq(res[0] && res[0].reqId, "br1", "the response is tagged with the request id");
    eq(res[0] && res[0].value, "hello", "the background's value is relayed to the shim");

    // --- a rejected background call must not hang for 15s ------------------
    {
      const { w: w2 } = boot(null, "reject");
      const errRes = [];
      w2.document.addEventListener("__SF_US_BRIDGE_RES__", (e) => errRes.push(e.detail));
      w2.document.dispatchEvent(new w2.CustomEvent("__SF_US_BRIDGE_REQ__", {
        detail: { reqId: "br2", scriptId: "s7", method: "toast", payload: null }
      }));
      await wait(20);
      eq(errRes.length, 1, "a failed bridge call still answers (no 15s hang)");
      eq(errRes[0] && errRes[0].reqId, "br2", "even the error is tagged with the reqId");
      check(errRes[0] && typeof errRes[0].error === "string", "the shim receives an error field");
    }

    // --- GM_xmlhttpRequest relay -------------------------------------------
    {
      let xhrReq = null;
      const { w: w3 } = boot((msg) => {
        if (msg.action === "GM_XHR") {
          xhrReq = msg.req;
          return {
            status: 200, statusText: "OK",
            responseText: '{"ok":true}', finalUrl: "https://api.example/x"
          };
        }
        return { ok: true };
      });
      const xhrRes = [];
      w3.document.addEventListener("__SF_US_XHR_RES__", (e) => xhrRes.push(e.detail));
      w3.document.dispatchEvent(new w3.CustomEvent("__SF_US_XHR_REQ__", {
        detail: {
          reqId: "xhr9", scriptId: "s7", url: "https://api.example/x",
          method: "GET", headers: {}, data: null, timeout: 30000
        }
      }));
      await wait(20);
      check(!!xhrReq, "GM_xmlhttpRequest is forwarded to the background");
      eq(xhrReq && xhrReq.url, "https://api.example/x", "the request URL is preserved");
      eq(xhrRes.length, 1, "the XHR response is relayed back exactly once");
      eq(xhrRes[0] && xhrRes[0].reqId, "xhr9", "the XHR response keeps the reqId");
      eq(xhrRes[0] && xhrRes[0].status, 200, "the status code reaches the shim");
      eq(xhrRes[0] && xhrRes[0].responseText, '{"ok":true}', "the body reaches the shim");
    }

    finish();
  })().catch((err) => {
    check(false, "runner relay assertions threw: " + ((err && err.stack) || err));
    finish();
  });
}

function finish() {
  console.log("  userscripts: " + passed + " passed, " + failures + " failed");
  if (failures > 0) process.exit(1);
  process.exit(0);
}
