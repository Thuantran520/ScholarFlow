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
const SKIP_DIRS = new Set(["node_modules", ".git", "build", "tests", ".vscode", "scripts"]);
const ALLOWED_HOSTS = new Set([
  "doi.org",
  "export.arxiv.org",
  "arxiv.org",
  "www.youtube.com",
  "img.youtube.com",
  "api.openalex.org",
  "api.crossref.org",
  "www.google.com",
  "scholar.google.com",
  "search.crossref.org"
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
    const s = fs.readFileSync(f, "utf8");
    for (const [re, label] of secretPats) {
      const m = s.match(re);
      if (m) secretHits.push(`${path.relative(ROOT, f)}: ${label}`);
    }
  }
  check(secretHits.length === 0, `no secrets across ${allFiles.length} scanned files` +
    (secretHits.length ? ` -> ${secretHits.slice(0, 5).join(" | ")}` : ""));

  // --- 2. eval / new Function / document.write ------------------------------
  console.log("Code-injection surface:");
  const patterns = [
    [/(?<![.\w])eval\s*\(/, "eval()"],
    [/new\s+Function\s*\(/, "new Function()"],
    [/document\.write\s*\(/, "document.write()"]
  ];
  for (const [re, label] of patterns) {
    const hits = jsFiles.filter((f) => re.test(fs.readFileSync(f, "utf8")));
    check(hits.length === 0, `no ${label} in OS/js` + (hits.length ? ` -> ${hits.map((h) => path.basename(h)).join(", ")}` : ""));
  }

  // --- 3. Dynamic innerHTML -----------------------------------------------
  console.log("Dynamic DOM sinks:");
  const dyn = [];
  for (const f of jsFiles) {
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
    const s = fs.readFileSync(f, "utf8");
    for (const m of s.matchAll(/["'`](https?:\/\/[^"'`]*?)["'`]/g)) {
      const u = m[1];
      const host = u.replace(/^https?:\/\//, "").split(/[/?#]/)[0];
      if (!host) continue;
      if (host.startsWith("...") || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(host)) continue; // e.g. "https://.../calendar.ics"
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
    const csp = (m.content_security_policy && typeof m.content_security_policy === "object") ||
      (m.content_security_policy && String(m.content_security_policy));
    const bad = csp && /unsafe-eval|unsafe-inline/.test(JSON.stringify(csp));
    check(!bad, `${mf}: no content_security_policy with unsafe-eval/unsafe-inline`);
  }

  finish("security.test.js");
}

main().catch((e) => {
  console.error("FATAL:", (e && e.stack) || e);
  process.exit(1);
});