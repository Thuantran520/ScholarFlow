/* One-off: rebuild tab-social into sidebar.html & popup.html (v2.4.5). */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const block = fs.readFileSync(path.join(__dirname, "soc_block_245.html"), "utf8").replace(/\r\n/g, "\n");

function apply(file) {
  let c = fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
  if (c.includes('id="tab-social"')) { console.log(file + ": tab-social already present, skipping"); return; }
  // 1. CSS link after security.css
  if (!c.includes("social-protection.css")) {
    const cssLine = '  <link rel="stylesheet" href="../css/tabs/security.css">';
    if (!c.includes(cssLine)) throw new Error(file + ": security.css line not found");
    c = c.replace(cssLine, cssLine + '\n  <link rel="stylesheet" href="../css/tabs/social-protection.css">');
  }
  // 2. Script tag after security.js
  if (!c.includes("social-protection.js")) {
    const jsLine = '  <script src="../js/tabs/security.js"></script>';
    if (!c.includes(jsLine)) throw new Error(file + ": security.js line not found");
    c = c.replace(jsLine, jsLine + '\n  <script src="../js/tabs/social-protection.js"></script>');
  }
  // 3. Version display bump
  c = c.split("v2.4.4_beta").join("v2.4.5_beta");
  // 4. Insert block before the footer bar (first occurrence only)
  const foot = '  <div class="footer-trust-bar">';
  const idx = c.indexOf(foot);
  if (idx < 0) throw new Error(file + ": footer not found");
  c = c.slice(0, idx) + block + c.slice(idx);
  fs.writeFileSync(path.join(ROOT, file), c, "utf8");
  const n = (c.match(/id="tab-social"/g) || []).length;
  if (n !== 1) throw new Error(file + ": tab-social count=" + n);
  console.log(file + ": OK, size=" + c.length);
}
apply("OS/html/sidebar.html");
apply("OS/html/popup.html");
console.log("ALL GOOD");
