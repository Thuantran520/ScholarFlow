/* One-off (v2.4.5 part 2): swap social block to 6-subtab version, split module
   script tags, add security upgrade cards to sidebar/popup/partial + partials. */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const write = (f, c) => fs.writeFileSync(path.join(ROOT, f), c.replace(/\n/g, process.platform === "win32" ? "\n" : "\n"), "utf8");

const socBlock = read("scripts/archive/soc_block_245.html"); // ends with block + trailing blank lines
const secCards = read("scripts/archive/sec_cards_245.html");
const SEC_LINE = '  <script src="../js/tabs/security.js"></script>';
const SOC_SCRIPTS = [
  "  <script src=\"../js/tabs/social-protection.js\"></script>",
  "  <script src=\"../js/tabs/social-recovery.js\"></script>",
  "  <script src=\"../js/tabs/social-vault.js\"></script>",
  "  <script src=\"../js/tabs/social-checklist.js\"></script>",
  "  <script src=\"../js/tabs/social-tools.js\"></script>",
  "  <script src=\"../js/tabs/social-creator.js\"></script>"
].join("\n");
const SEC_SCAN_OUT_RE = /^    <div id="sec-scan-out".*<\/div>$/m;

function rebuildShell(file) {
  let c = read(file);
  // 1) swap tab-social block
  const sStart = c.indexOf('  <div id="tab-social" class="tab-section">');
  const sFoot = c.indexOf('  <div class="footer-trust-bar">', sStart);
  if (sStart < 0 || sFoot < 0) throw new Error(file + ": social block bounds not found");
  c = c.slice(0, sStart) + socBlock + c.slice(sFoot);
  if ((c.match(/id="tab-social"/g) || []).length !== 1) throw new Error(file + ": duplicate tab-social");
  // 2) script split (idempotent)
  if (c.includes('src="../js/tabs/social-creator.js"')) {
    // already split
  } else {
    c = c.replace(SEC_LINE, SEC_LINE + "\n" + SOC_SCRIPTS);
    if (!c.includes("social-creator.js")) throw new Error(file + ": script split failed");
  }
  // 3) security upgrade cards after sec-scan-out (idempotent)
  if (!c.includes("sec-toggle-pasteguard")) {
    const m = SEC_SCAN_OUT_RE.exec(c);
    if (!m) throw new Error(file + ": sec-scan-out line not found");
    const at = m.index + m[0].length;
    c = c.slice(0, at) + "\n" + secCards.replace(/\n$/, "") + c.slice(at);
  }
  write(file, c);
  console.log(file + ": rebuilt (" + c.length + " chars)");
}
function rebuildPartial(file, isSocialMirror) {
  let c = read(file);
  if (isSocialMirror) {
    // partial = inner content of the block (no outer tab-social wrapper)
    let inner = socBlock.replace(/^  <div id="tab-social" class="tab-section">\n/, "").replace(/\n  <\/div>\s*$/, "\n");
    fs.writeFileSync(path.join(ROOT, file), inner, "utf8");
    console.log(file + ": written (" + inner.length + " chars)");
    return;
  }
  if (!c.includes("sec-toggle-pasteguard")) {
    const m = SEC_SCAN_OUT_RE.exec(c);
    if (!m) throw new Error(file + ": sec-scan-out line not found");
    const at = m.index + m[0].length;
    c = c.slice(0, at) + "\n" + secCards.replace(/\n$/, "") + c.slice(at);
    write(file, c);
  }
  console.log(file + ": updated");
}
function scriptsMirror() {
  let c = read("OS/html/partials/_scripts.html");
  if (!c.includes("social-protection.js")) {
    c = c.replace(SEC_LINE, SEC_LINE + "\n" + SOC_SCRIPTS);
  } else if (!c.includes("social-creator.js")) {
    const i = c.indexOf('  <script src="../js/tabs/social-protection.js"></script>');
    const end = c.indexOf('src="../js/debug.js"');
    // replace any existing single-line chain of old social scripts with the new six
    const j = c.lastIndexOf("\n", i) + 1;
    c = c.slice(0, j) + SOC_SCRIPTS + c.slice(c.indexOf("\n", c.indexOf("social-protection.js")) );
  }
  write("OS/html/partials/_scripts.html", c);
  console.log("_scripts.html updated");
}
rebuildShell("OS/html/sidebar.html");
rebuildShell("OS/html/popup.html");
rebuildPartial("OS/html/partials/tabs/social.html", true);
rebuildPartial("OS/html/partials/tabs/security.html", false);
scriptsMirror();
console.log("ALL GOOD");
