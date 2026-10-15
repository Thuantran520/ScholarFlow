// ---------------------------------------------------------------------------
// tests/security.test.js
//
// Static security gates (Node mirror of the PowerShell store checks, plus the
// extra checks the wrapper does not cover):
//   1. No hardcoded secrets anywhere in the repo.
//   2. No eval / new Function / document.write in shipped code.
//   3. No *dynamic* innerHTML / insertAdjacentHTML assignments.
//   4. HTML pages: no inline <script>, no inline event handlers, no remote
//      (http/https) resource URLs.
//   5. DOM-clobbering guard: element id/name never collide with dangerous
//      window properties.
//   6. Network allowlist: every literal "https://host/..." in OS/ points at a
//      known scholarly/user-triggered host, and never plain http://.
//
// Run with: node tests/security.test.js
// ---------------------------------------------------------------------------

const { check, finish, REPO_ROOT } = require("./helpers");
const fs = require("fs");
const path = require("path");

const ROOT = REPO_ROOT;
const SKIP_DIRS = new Set(["node_modules", ".git", "build", "tests", ".vscode", "scripts", "dist"]);
// Vendored third-party bundle (@mlc-ai/web-llm). It embeds a base64 WASM binary
// and third-party docs/URLs, so it is exempt from the *content* scans below
// (secret patterns, eval/new Function, dynamic innerHTML, URL allowlist) — those
// produce false positives on the embedded binary. First-party code is fully
// scanned; the vendor file itself is still syntax-checked by scripts/check_syntax.js.
const VENDOR_DIR = path.join(ROOT, "OS", "js", "libs", "webllm");
const isVendor = (p) => p.startsWith(VENDOR_DIR + path.sep);
const ALLOWED_HOSTS = new Set([
  "doi.org",
  "export.arxiv.org",
  "arxiv.org",
    "api.deepseek.com",
  "www.youtube.com",
  "music.youtube.com",
  "img.youtube.com",
  "video.google.com",
  "api.duckduckgo.com",
  "html.duckduckgo.com",
  "vi.wikipedia.org",
  "peerjs.com",
  "drive.google.com",
  "docs.google.com",
  "github.com",
  "gist.githubusercontent.com",
  "opencollective.com",
  "0.peerjs.com",
  "unpkg.com",
  "cdnjs.cloudflare.com",
  "en.wikipedia.org",
  "api.openalex.org",
  "api.crossref.org",
  "www.google.com",
  "www.bing.com",
  "www.duckduckgo.com",
  "html.duckduckgo.com",
  "scholar.google.com",
  "calendar.google.com",
  "api.open-meteo.com",
  "search.crossref.org",
  "generativelanguage.googleapis.com",
  "api.openai.com",
  "api.anthropic.com",
  "aistudio.google.com",
  "ai.google.dev",
  "platform.openai.com",
  "console.anthropic.com",
  "docs.anthropic.com",
  "your-api.example.com",
  "example.com",
  "gemini.google.com",
  "chatgpt.com",
  "claude.ai",
  "openrouter.ai",
  "www.facebook.com",
  "zalo.me",
  "www.instagram.com",
  "www.messenger.com",
  "faq.whatsapp.com",
  "accounts.google.com",
  "support.google.com",
  "safebrowsing.google.com",
  "www.tiktok.com",
  "support.tiktok.com",
  "discord.com",
  "support.discord.com",
  "x.com",
  "help.x.com",
  "my.telegram.org",
  "web.telegram.org",
  "haveibeenpwned.com",
  "browserleaks.com",
  "www.dnsleaktest.com",
  "returnyoutubedislikeapi.com",
"update.greasyfork.org",
   // Greasy Fork script pages, so "import from URL" accepts a page link and
   // resolves the real .user.js behind it.
   "greasyfork.org",
   "translate.googleapis.com",
   "meet.google.com",
   "zoom.us",
   "teams.microsoft.com",
   "discord.gg",
   "ipwho.is",
   "freeipapi.com",
   "www.youtube-nocookie.com",
   "player.vimeo.com",
   "tts.mediacdn.vn"
   ]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

async function main() {
  const allFiles = walk(ROOT);
  const jsFiles = allFiles.filter((p) => p.endsWith(".js") && p.includes(`${path.sep}OS${path.sep}`));
  const htmlFiles = allFiles.filter((p) => p.endsWith(".html") && p.includes(`${path.sep}OS${path.sep}`));

  // --- 1. Secrets -----------------------------------------------------------
  console.log("Secret scan:");
  const secretPats = [
    [/AIza[0-9A-Za-z_-]{20,}/, "Google API key (AIza...)"],
    [/AKIA[0-9A-Z]{16,}/, "AWS Access Key (AKIA...)"],
    [/ghp_[0-9A-Za-z]{20,}/, "GitHub PAT (ghp_...)"],
    [/sk-[A-Za-z0-9]{20,}/, "API key (sk-...)"],
    [/-----BEGIN (RSA |OPENSSH )?PRIVATE KEY/, "embedded private key"]
  ];
  const secretHits = [];
  for (const f of allFiles) {
    if (isVendor(f)) continue;
    const s = fs.readFileSync(f, "utf8");
    for (const [re, label] of secretPats) {
      const m = s.match(re);
      if (m) secretHits.push(`${path.relative(ROOT, f)}: ${label}`);
    }
  }
  check(secretHits.length === 0, `no secrets across ${allFiles.length} scanned files` +
    (secretHits.length ? ` -> ${secretHits.slice(0, 5).join(" | ")}` : ""));

  // The vendor exemption must point at a real, non-trivial file.
  const vendorFile = path.join(VENDOR_DIR, "webllm.js");
  check(fs.existsSync(vendorFile) && fs.statSync(vendorFile).size > 1000000,
    "vendored webllm bundle present (>1MB)");

  // --- 2. eval / new Function / document.write ------------------------------
  console.log("Code-injection surface:");
  const patterns = [
    [/(?<![.\w])eval\s*\(/, "eval()"],
    [/new\s+Function\s*\(/, "new Function()"],
    [/document\.write\s*\(/, "document.write()"]
  ];
  for (const [re, label] of patterns) {
    const hits = jsFiles.filter((f) => !isVendor(f) && re.test(fs.readFileSync(f, "utf8")));
    check(hits.length === 0, `no ${label} in OS/js` + (hits.length ? ` -> ${hits.map((h) => path.basename(h)).join(", ")}` : ""));
  }

  // --- 3. Dynamic innerHTML -----------------------------------------------
  console.log("Dynamic DOM sinks:");
  const dyn = [];
  for (const f of jsFiles) {
    if (isVendor(f)) continue;
    const lines = fs.readFileSync(f, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/\.(?:innerHTML|outerHTML|insertAdjacentHTML)\s*=\s*(.+)$/);
      if (m) {
        const rhs = m[1].replace(/;\s*$/, "").trim();
        const startQ = /^(['"])/.exec(rhs);
        if (!startQ) dyn.push(`${path.basename(f)}:${i + 1}: ${lines[i].trim()}`);
      }
    }
  }
  check(dyn.length === 0, "no dynamic innerHTML/outerHTML/insertAdjacentHTML writes" +
    (dyn.length ? ` -> ${dyn.slice(0, 4).map((d) => d.split(":")[0] + ":" + d.split(":")[1]).join(", ")}` : ""));

  // --- 4. HTML inline / remote resource audit ------------------------------
  console.log("HTML safety:");
  for (const f of htmlFiles) {
    const s = fs.readFileSync(f, "utf8");
    const name = path.relative(ROOT, f);
    const inlineScripts = (s.match(/<script(?![\s>][^>]*\bsrc\s*=|[\s>])/g) || []).length;
    const handlers = s.match(/\son[a-z]+\s*=\s*["']/g) || [];
    const remote = [...s.matchAll(/(?:src|href)\s*=\s*["'](?:https?:\/\/)/g)].length;
    check(inlineScripts === 0 && handlers.length === 0 && remote === 0,
      `${name}: no inline script (${inlineScripts}), no inline handlers (${handlers.length}), no remote src/href (${remote})`);
  }

  // --- 5. DOM clobbering ----------------------------------------------------
  console.log("DOM clobbering guard:");
  const dangerous = new Set([
    "status", "location", "top", "parent", "self", "opener", "name",
    "length", "origin", "defaultStatus", "frames", "history", "closed", "customElements"
  ]);
  const clobber = [];
  for (const f of htmlFiles) {
    const s = fs.readFileSync(f, "utf8");
    for (const m of s.matchAll(/(?:id|name)\s*=\s*"([^"]+)"/g)) {
      if (dangerous.has(m[1])) clobber.push(`${path.basename(f)}: id/name="${m[1]}"`);
    }
  }
  check(clobber.length === 0, "element id/name do not collide with dangerous window globals" +
    (clobber.length ? ` -> ${clobber.join(", ")}` : ""));

  // --- 6. Network allowlist ------------------------------------------------
  console.log("Network allowlist:");
  const netMiss = [];
  let plainHttp = 0;
  for (const f of [...jsFiles, ...htmlFiles]) {
    if (isVendor(f)) continue;
    const s = fs.readFileSync(f, "utf8");
    for (const m of s.matchAll(/["'`](https?:\/\/[^"'`]*?)["'`]/g)) {
      const u = m[1];
      const host = u.replace(/^https?:\/\//, "").split(/[/?#]/)[0];
      if (!host) continue;
      if (host.startsWith("...") || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(host)) continue; // e.g. "https://.../calendar.ics"
      if (u.startsWith("http://www.w3.org/")) continue; // XML namespace identifier
      if (u.startsWith("http://") || host === "http") { plainHttp++; continue; }
      if (!ALLOWED_HOSTS.has(host)) netMiss.push(`${path.basename(f)}: ${host}`);
    }
  }
  check(netMiss.length === 0, "every literal https:// host is on the allowlist" +
    (netMiss.length ? ` -> ${netMiss.slice(0, 6).join(", ")}` : ""));
  check(plainHttp === 0, "no plain http:// (unencrypted) URL references in OS/" +
    (plainHttp ? ` -> ${plainHttp}` : ""));

  // --- 7. MV3 CSP: no remotely-loaded or eval-able policy --------------------
  console.log("MV3 CSP policy:");
  const manifestFiles = ["manifest.json", "manifest_firefox.json", "manifest_chrome.json"]
    .filter((m) => fs.existsSync(path.join(ROOT, m)));
  for (const mf of manifestFiles) {
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, mf), "utf8"));
    const csp = m.content_security_policy || null;
    const cspStr = csp ? JSON.stringify(csp) : "";
    // 'wasm-unsafe-eval' is required for WebAssembly instantiation (WebLLM) and is
    // explicitly allowed in MV3 — only plain unsafe-eval/unsafe-inline are banned.
    const bad = cspStr && /(?<!wasm-)unsafe-eval|unsafe-inline/.test(cspStr);
    const hasWasmToken = /'wasm-unsafe-eval'/.test(cspStr);
    check(!bad, `${mf}: no content_security_policy with unsafe-eval/unsafe-inline` +
      (bad ? ` -> ${cspStr}` : ""));
    check(hasWasmToken, `${mf}: CSP grants 'wasm-unsafe-eval' (WebLLM WebAssembly)`);
  }

  // --- 8. Reader mode: the article is rebuilt, not innerHTML'd ---------------
  console.log("Reader mode sanitiser:");
  const readerFile = path.join(ROOT, "OS", "js", "content", "reader.js");
  if (fs.existsSync(readerFile)) {
    const readerSrc = fs.readFileSync(readerFile, "utf8");
    check(!/\.innerHTML\s*=/.test(readerSrc), "reader.js assigns no innerHTML");
    check(!/insertAdjacentHTML/.test(readerSrc), "reader.js calls no insertAdjacentHTML");

    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(
      `<!doctype html><html><body>
         <article id="hostile">
           <h1>A perfectly ordinary heading</h1>
           <p onclick="window.__pwned=1">Body copy that is definitely long enough to pass the filter.</p>
           <script>window.__pwned = 1;<\/script>
           <img src="javascript:window.__pwned=1" onerror="window.__pwned=1">
           <a href="javascript:window.__pwned=1">click</a>
           <iframe src="https://evil.example/"></iframe>
         </article>
       </body></html>`,
      { runScripts: "outside-only", url: "https://news.example/story" }
    );
    const { window } = dom;
    window.chrome = { runtime: { onMessage: { addListener() {} } } };
    // jsdom reports zero-size rects; the reader's own filter needs real ones.
    window.Element.prototype.getBoundingClientRect = function () {
      return { width: 800, height: 400, top: 0, left: 0, right: 800, bottom: 400 };
    };
    window.eval(readerSrc);
    window.toggleReaderMode();

    const out = window.document.getElementById("sf-cyber-reader");
    check(!!out, "reader mode renders its container");
    const html = out ? out.innerHTML : "";
    check(!/__pwned/.test(html), "no handler or script text survives into the reader output");
    check(!window.__pwned, "no page-supplied code executed");
    check(out.querySelector("script") === null, "script elements are stripped");
    check(out.querySelector("iframe") === null, "iframes are stripped");
    check(!/onerror|onclick=/.test(html), "inline event attributes are stripped");
    check(!/<[a-z]+[^>]*\son[a-z]+\s*=/i.test(html), "no element carries an inline on* handler");
    check(!/javascript:/i.test(html), "javascript: URLs are stripped");
    check(/A perfectly ordinary heading/.test(html), "the real article text is preserved");
    check(!!window.document.getElementById("sf-close-reader"), "the close button is still built");

    // Sentence splitting regression checks (dates, abbreviations, initials, decimals, titles)
    const splitFn = window.splitTextIntoSentences;
    check(typeof splitFn === "function", "splitTextIntoSentences exposed on window");
    if (typeof splitFn === "function") {
      const s1 = splitFn("Oct. 1, 2025. School protests continue across the district.");
      check(s1.length === 2 && s1[0] === "Oct. 1, 2025." && s1[1] === "School protests continue across the district.",
        `Date abbreviation Oct. 1, 2025 not prematurely split -> got ${JSON.stringify(s1)}`);

      const s2 = splitFn("Dr. Smith met with Mr. Johnson at 10 a.m. in Washington. They discussed AI.");
      check(s2.length === 2 && s2[0] === "Dr. Smith met with Mr. Johnson at 10 a.m. in Washington." && s2[1] === "They discussed AI.",
        `Titles & Latin abbreviations not split -> got ${JSON.stringify(s2)}`);

      const s3 = splitFn("TP. HCM là trung tâm kinh tế lớn. GS. TS. Nguyễn Văn A đã phát biểu.");
      check(s3.length === 2 && s3[0] === "TP. HCM là trung tâm kinh tế lớn." && s3[1] === "GS. TS. Nguyễn Văn A đã phát biểu.",
        `Vietnamese administrative & academic titles preserved -> got ${JSON.stringify(s3)}`);

      const s4 = splitFn("The constant is 3.14. Please use version 2.5.7 in production.");
      check(s4.length === 2 && s4[0] === "The constant is 3.14." && s4[1] === "Please use version 2.5.7 in production.",
        `Decimals and version numbers not split -> got ${JSON.stringify(s4)}`);

      const s5 = splitFn('He said, "Goodbye." Then he left. "Wait!" she cried.');
      check(s5.length === 3 && s5[0] === 'He said, "Goodbye."' && s5[1] === 'Then he left.' && s5[2] === '"Wait!" she cried.',
        `Sentences ending with quotation marks split cleanly -> got ${JSON.stringify(s5)}`);

      const s6 = splitFn("这是第一句。这是第二句！第三句？");
      check(s6.length === 3 && s6[0] === "这是第一句。" && s6[1] === "这是第二句！" && s6[2] === "第三句？",
        `Asian CJK fullwidth punctuation split cleanly -> got ${JSON.stringify(s6)}`);

      const s7 = splitFn("1. First point. 2. Second point.");
      check(s7.length === 2 && s7[0] === "1. First point." && s7[1] === "2. Second point.",
        `Numbered list items preserve item marker -> got ${JSON.stringify(s7)}`);
    }

    const prepSpeechFn = window.prepareTextForSpeech;
    check(typeof prepSpeechFn === "function", "prepareTextForSpeech exposed on window");
    if (typeof prepSpeechFn === "function") {
      const sp1 = prepSpeechFn("Study [1, 2] on Oct. 1, 2025 by Dr. Smith.", "en");
      check(!sp1.includes("[1, 2]") && sp1.includes("October") && sp1.includes("first") && sp1.includes("Doctor Smith"),
        `Speech preparation expands October and Doctor, removes citations -> got ${sp1}`);

      const sp2 = prepSpeechFn("UBND TP. HCM đã phê duyệt kế hoạch [3].", "vi");
      check(!sp2.includes("[3]") && sp2.includes("Ủy ban nhân dân") && sp2.includes("Thành phố Hồ Chí Minh"),
        `Vietnamese speech preparation expands UBND and TP. HCM -> got ${sp2}`);

      const spTime = prepSpeechFn("The lecture begins at 10:30 a.m. today.", "en");
      check(spTime.includes("ten") || spTime.includes("half past"),
        `Time spoken naturally (ten thirty / half past ten) -> got ${spTime}`);

      const spPhone = prepSpeechFn("Please call (555) 234-5678 immediately.", "en");
      check(spPhone.includes("five") && spPhone.includes("two") && spPhone.includes("three"),
        `Phone numbers spoken digit-by-digit -> got ${spPhone}`);

      const spAddr = prepSpeechFn("The office is at 10 Downing St. and Apt. 4B.", "en");
      check(spAddr.includes("Downing Street") && (spAddr.includes("apartment") || spAddr.includes("flat")),
        `Address abbreviations expanded (Street, apartment/flat) -> got ${spAddr}`);

      const spMoney = prepSpeechFn("The book costs $15.50 on sale.", "en");
      check(spMoney.includes("fifteen") && spMoney.includes("fifty"),
        `Currency spoken naturally (fifteen dollars fifty cents / fifteen fifty) -> got ${spMoney}`);
    }
  }

  finish("security.test.js");
}

main().catch((e) => {
  console.error("FATAL:", (e && e.stack) || e);
  process.exit(1);
});
