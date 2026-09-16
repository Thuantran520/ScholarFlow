/* One-off (v2.4.5 part 10): move cookie-reject out of security.js; register
   cookie_reject.js content script with all_frames:true in all 3 manifests. */
const fs = require("fs");

// 1) content/security.js — drop handler line + whole v2 module tail
{
  const f = "OS/js/content/security.js";
  let c = fs.readFileSync(f, "utf8");
  const h = c.indexOf('        if (msg.action === "SEC_COOKIE_REJECT")');
  if (h >= 0) {
    const e = c.indexOf("\n", h);
    c = c.slice(0, h) + c.slice(e + 1);
    console.log("handler line removed");
  }
  const s = c.indexOf("  // Cookie-banner auto-reject");
  if (s >= 0) {
    const end = c.lastIndexOf("})();");
    c = c.slice(0, s).replace(/\s+$/, "\r\n") + "\r\n})();\r\n";
    console.log("v2 module removed (kept IIFE close)");
  }
  fs.writeFileSync(f, c);
}

// 2) manifests — add dedicated all-frames entry right after the main content_scripts entry
const ENTRY = `    {
      "matches": [
        "<all_urls>"
      ],
      "js": [
        "OS/js/content/cookie_reject.js"
      ],
      "run_at": "document_idle",
      "all_frames": true
    },`;
for (const m of ["manifest.json", "manifest_firefox.json", "manifest_chrome.json"]) {
  let c = fs.readFileSync(m, "utf8");
  if (c.includes("cookie_reject.js")) { console.log(m + " already"); continue; }
  const j = JSON.parse(c); // sanity
  const idx = c.indexOf('"OS/js/content/pomoMusicConfirm.js"');
  if (idx < 0) { console.error(m + ": pomo entry not found"); process.exit(1); }
  // find the start of that object's "matches" → back to the opening { of the entry
  const objStart = c.lastIndexOf("{", c.lastIndexOf(",", idx));
  // safer: locate the line "    {" preceding the pomo block
  let k = idx;
  while (k > 0 && c.slice(k, k + 1) !== "\n") k--;
  let line = c.slice(k);
  const braceIdx = c.lastIndexOf("    {", idx);
  c = c.slice(0, braceIdx) + ENTRY + c.slice(braceIdx);
  JSON.parse(c);
  fs.writeFileSync(m, c);
  console.log(m + ": cookie_reject entry added");
}
// root must stay identical to firefox
const a = fs.readFileSync("manifest.json");
const b = fs.readFileSync("manifest_firefox.json");
console.log("root==ff:", a.equals(b));
