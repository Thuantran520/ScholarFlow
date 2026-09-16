/* One-off: insert OS/js/content/social.js after security.js in all 3 manifests. */
const fs = require("fs");
for (const m of ["manifest.json", "manifest_firefox.json", "manifest_chrome.json"]) {
  let c = fs.readFileSync(m, "utf8");
  if (c.includes("content/social.js")) { console.log(m + " already"); continue; }
  const needle = '"OS/js/content/security.js",';
  const idx = c.indexOf(needle);
  if (idx < 0) { console.log("NO security entry " + m); process.exit(1); }
  const lineStart = c.lastIndexOf("\n", idx) + 1;
  const indent = c.slice(lineStart, idx).replace(/\S.*/, "");
  const ins = needle + "\n" + indent + '"OS/js/content/social.js",';
  c = c.slice(0, lineStart) + ins + c.slice(lineStart + idx - lineStart + needle.length);
  JSON.parse(c); // validate
  fs.writeFileSync(m, c);
  console.log(m + " updated");
}
// manifest.json must stay byte-identical to manifest_firefox.json
const a = fs.readFileSync("manifest.json");
const b = fs.readFileSync("manifest_firefox.json");
console.log("ff==root identical:", a.equals(b));
