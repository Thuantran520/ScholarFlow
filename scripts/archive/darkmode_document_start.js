/* One-off (v2.4.5 part 16b): move darkmode.js from idle js-list to its own
   document_start content_scripts entry (all 3 manifests, CRLF-safe). */
const fs = require("fs");
const ENTRY_LINES = [
  "    {",
  '      "matches": [',
  '        "<all_urls>"',
  "      ],",
  '      "js": [',
  '        "OS/js/content/darkmode.js"',
  "      ],",
  '      "run_at": "document_start"',
  "    },"
];
for (const m of ["manifest.json", "manifest_firefox.json", "manifest_chrome.json"]) {
  let c = fs.readFileSync(m, "utf8");
  const eol = c.includes("\r\n") ? "\r\n" : "\n";
  // remove whole line: (indent)"OS/js/content/darkmode.js", (keep prior newline)
  const lineRe = /[ \t]*"OS\/js\/content\/darkmode\.js",[\r\n]+/;
  if (lineRe.test(c)) { c = c.replace(lineRe, ""); console.log(m + ": removed from idle list"); }
  if (c.includes('"document_start"')) { console.log(m + ": entry exists"); fs.writeFileSync(m, c); continue; }
  const anchor = c.indexOf("music.youtube.com");
  if (anchor < 0) throw new Error(m + ": pomo anchor missing");
  const brace = c.lastIndexOf("    {", anchor);
  const text = ENTRY_LINES.join(eol) + eol;
  c = c.slice(0, brace) + text + c.slice(brace);
  const parsed = JSON.parse(c);
  const entry = parsed.content_scripts.find(function (x) { return x.run_at === "document_start"; });
  if (!entry) throw new Error(m + ": entry not parsed");
  fs.writeFileSync(m, c);
  console.log(m + ": document_start entry OK");
}
const a = fs.readFileSync("manifest.json"), b = fs.readFileSync("manifest_firefox.json");
console.log("root==ff:", a.equals(b));
