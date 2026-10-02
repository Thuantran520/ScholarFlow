// ---------------------------------------------------------------------------
// tests/errors_and_refactor.test.js
//
// Tests for Auto-Guard (Continuous Auto-Check & Auto-Blur on Reload / Feeds),
// Social Media Detection (MXH), and Dynamic Redaction Persistence.
//
// Run with: npm test
// ---------------------------------------------------------------------------

const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const OS_HTML = path.join(__dirname, "..", "OS", "html");
const OS_JS = path.join(__dirname, "..", "OS", "js");

let total = 0;
let passed = 0;

function check(condition, desc) {
  total++;
  if (!condition) {
    console.error(`  FAIL [${total}] ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
  passed++;
  console.log(`  PASS [${total}] ${desc}`);
}

async function run() {
  console.log("Suite: Auto-Guard on Reload & Social Feeds (MXH)");

  // 1. Check HTML markup parity in sidebar.html and popup.html
  for (const pageName of ["sidebar.html", "popup.html"]) {
    const htmlContent = fs.readFileSync(path.join(OS_HTML, pageName), "utf8");
    const dom = new JSDOM(htmlContent);
    const doc = dom.window.document;

    const toggle = doc.getElementById("redact-auto-guard-toggle");
    const dot = doc.getElementById("redact-auto-guard-dot");
    const statusText = doc.getElementById("redact-auto-guard-status-text");
    const mxhBadge = doc.getElementById("redact-mxh-badge");
    const btnNow = doc.getElementById("btn-auto-guard-now");

    check(!!toggle, `${pageName} contains #redact-auto-guard-toggle`);
    check(!!dot, `${pageName} contains #redact-auto-guard-dot`);
    check(!!statusText, `${pageName} contains #redact-auto-guard-status-text`);
    check(!!mxhBadge, `${pageName} contains #redact-mxh-badge`);
    check(!!btnNow, `${pageName} contains #btn-auto-guard-now`);
    check(toggle.getAttribute("type") === "checkbox", `${pageName} toggle is a checkbox input`);
  }

  // 2. Test updateAutoGuardUI in UI context
  {
    const htmlContent = fs.readFileSync(path.join(OS_HTML, "sidebar.html"), "utf8");
    const dom = new JSDOM(htmlContent, { runScripts: "dangerously" });
    const win = dom.window;

    // Load redact.js
    const redactJs = fs.readFileSync(path.join(OS_JS, "redact.js"), "utf8");
    win.eval(redactJs);

    check(typeof win.updateAutoGuardUI === "function", "updateAutoGuardUI is exposed on window");

    // Initially disabled
    win.updateAutoGuardUI(false, false);
    const toggle = win.document.getElementById("redact-auto-guard-toggle");
    const dot = win.document.getElementById("redact-auto-guard-dot");
    const mxhBadge = win.document.getElementById("redact-mxh-badge");

    check(toggle.checked === false, "toggle is unchecked when disabled");
    check(dot.style.background === "rgb(148, 163, 184)" || dot.style.background === "#94a3b8", "dot is grey when disabled");
    check(mxhBadge.style.display === "none", "MXH badge is hidden when not a social site");

    // Enable on a social site
    win.updateAutoGuardUI(true, true);
    check(toggle.checked === true, "toggle is checked when enabled");
    check(dot.style.background === "rgb(16, 185, 129)" || dot.style.background === "#10b981", "dot is emerald green when enabled");
    check(mxhBadge.style.display === "inline-flex", "MXH badge is displayed on social sites");

    // Toggle off on social site
    win.updateAutoGuardUI(false, true);
    check(toggle.checked === false, "toggle is unchecked");
    check(mxhBadge.style.display === "inline-flex", "MXH badge stays visible to indicate platform");
  }

  // 3. Test content script Auto-Guard engine (inspect.js)
  {
    const contentDom = new JSDOM(`<!DOCTYPE html><html><head></head><body>
      <div id="post-1" class="userContentWrapper" role="article">
        <p class="post-text">Liên hệ hợp tác: partner@scholarflow.edu hoặc 0912345678</p>
      </div>
      <div id="post-2" role="feed">
        <div>
          <span>Số CMND/CCCD: 012345678901</span>
        </div>
      </div>
      <div id="post-clean">
        <p>Đây là bài viết học thuật thông thường không có thông tin riêng tư.</p>
      </div>
    </body></html>`, { url: "https://facebook.com/feed", runScripts: "dangerously" });

    const win = contentDom.window;

    // Stub chrome APIs for content script
    const storageStore = {};
    win.chrome = {
      storage: {
        local: {
          get: (key, cb) => {
            let res = {};
            if (typeof key === "string") res[key] = storageStore[key];
            else if (Array.isArray(key)) key.forEach(k => { res[k] = storageStore[k]; });
            else res = { ...storageStore };
            return Promise.resolve(res).then(r => { if (typeof cb === "function") cb(r); return r; });
          },
          set: (obj, cb) => {
            Object.assign(storageStore, obj);
            return Promise.resolve().then(() => { if (typeof cb === "function") cb(); });
          }
        },
        onChanged: { addListener: () => {} }
      },
      runtime: {
        sendMessage: (msg, cb) => { if (typeof cb === "function") cb({}); return Promise.resolve({}); }
      }
    };

    // Load inspect.js into content window
    const inspectCode = fs.readFileSync(path.join(OS_JS, "content", "inspect.js"), "utf8");
    win.eval(inspectCode);

    check(typeof win.sfIsSocialMediaHost === "function", "sfIsSocialMediaHost is exposed");
    check(win.sfIsSocialMediaHost("facebook.com") === true, "identifies facebook.com as social media");
    check(win.sfIsSocialMediaHost("m.facebook.com") === true, "identifies m.facebook.com as social media");
    check(win.sfIsSocialMediaHost("twitter.com") === true, "identifies twitter.com as social media");
    check(win.sfIsSocialMediaHost("x.com") === true, "identifies x.com as social media");
    check(win.sfIsSocialMediaHost("youtube.com") === true, "identifies youtube.com as social media");
    check(win.sfIsSocialMediaHost("tiktok.com") === true, "identifies tiktok.com as social media");
    check(win.sfIsSocialMediaHost("instagram.com") === true, "identifies instagram.com as social media");
    check(win.sfIsSocialMediaHost("reddit.com") === true, "identifies reddit.com as social media");
    check(win.sfIsSocialMediaHost("threads.net") === true, "identifies threads.net as social media");
    check(win.sfIsSocialMediaHost("zalo.me") === true, "identifies zalo.me as social media");
    check(win.sfIsSocialMediaHost("example.com") === false, "rejects example.com");
    check(win.sfIsSocialMediaHost("scholarflow.dev") === false, "rejects scholarflow.dev");

    // Enable Auto-Guard (triggers initial auto-guard check)
    check(typeof win.sfSetAutoGuardState === "function", "sfSetAutoGuardState is exposed");
    win.sfSetAutoGuardState(true);
    check(win.sfAutoGuardEnabled === true, "sfAutoGuardEnabled is set to true");

    // Sensitive elements should already be detected and masked by sfSetAutoGuardState
    const redactedList = win.getRedactedItemsForSidebar();
    check(redactedList.length >= 2, `redactedElementsList registered ${redactedList.length} items`);

    const maskedEls = win.document.querySelectorAll("[data-super-redact-id]");
    check(maskedEls.length >= 2, `DOM elements have data-super-redact-id attribute (found ${maskedEls.length})`);

    // Simulate dynamic feed insertion (Infinite scroll / live post reload)
    const newPost = win.document.createElement("div");
    newPost.className = "tweet";
    newPost.innerHTML = "<p>Gửi mã thẻ qua 0987654321 gấp nhé!</p>";
    win.document.body.appendChild(newPost);

    // Call runAutoGuardCheck again or let observer scan
    const additionalMasked = win.runAutoGuardCheck();
    check(additionalMasked >= 1, `Auto-Guard detected sensitive data in dynamically inserted feed item (found ${additionalMasked})`);

    // Disable Auto-Guard
    win.sfSetAutoGuardState(false);
    check(win.sfAutoGuardEnabled === false, "sfAutoGuardEnabled is set to false");
  }

  // 4. Test message handlers in content main.js
  {
    const contentDom = new JSDOM(`<!DOCTYPE html><html><body><p>Test</p></body></html>`, {
      url: "https://x.com/home",
      runScripts: "dangerously"
    });
    const win = contentDom.window;

    let messageListener = null;
    win.chrome = {
      storage: {
        local: {
          get: () => Promise.resolve({}),
          set: () => Promise.resolve({})
        },
        onChanged: { addListener: () => {} }
      },
      runtime: {
        onMessage: {
          addListener: (fn) => { messageListener = fn; }
        },
        sendMessage: () => Promise.resolve({})
      }
    };

    // Load inspect.js then main.js
    win.eval(fs.readFileSync(path.join(OS_JS, "content", "inspect.js"), "utf8"));
    win.eval(fs.readFileSync(path.join(OS_JS, "content", "main.js"), "utf8"));

    check(typeof messageListener === "function", "main.js registered onMessage listener");

    // Test GET_REDACT_STATUS
    let statusResponse = null;
    messageListener({ action: "GET_REDACT_STATUS" }, {}, (res) => { statusResponse = res; });
    check(!!statusResponse, "GET_REDACT_STATUS responded");
    check("autoGuardEnabled" in statusResponse, "GET_REDACT_STATUS includes autoGuardEnabled field");
    check(statusResponse.isSocialSite === true, "GET_REDACT_STATUS identifies x.com as social site");

    // Test SET_REDACT_AUTO_GUARD
    let setResponse = null;
    messageListener({ action: "SET_REDACT_AUTO_GUARD", enabled: true }, {}, (res) => { setResponse = res; });
    check(!!setResponse && setResponse.success === true, "SET_REDACT_AUTO_GUARD responded success");
    check(setResponse.enabled === true, "SET_REDACT_AUTO_GUARD reports enabled = true");
    check(setResponse.isSocialSite === true, "SET_REDACT_AUTO_GUARD reports isSocialSite = true");

    // Test RUN_AUTO_GUARD_NOW
    let runResponse = null;
    messageListener({ action: "RUN_AUTO_GUARD_NOW" }, {}, (res) => { runResponse = res; });
    check(!!runResponse && runResponse.success === true, "RUN_AUTO_GUARD_NOW responded success");
    check("newCount" in runResponse, "RUN_AUTO_GUARD_NOW reports newCount");
  }

  console.log(`\nAll ${passed}/${total} checks passed in errors_and_refactor.test.js!`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
