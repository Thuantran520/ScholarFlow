// ---------------------------------------------------------------------------
// ScholarFlow JS syntax checker (cross-platform)
// Replaces the `node --check` loop inside scripts/check_store.ps1 so the same
// gate runs on Windows, macOS and Linux (e.g. AI-assisted development on any OS).
// ---------------------------------------------------------------------------

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const DIRS = [path.join(ROOT, "OS", "js")];

let checked = 0;
let failed = 0;

function walk(file) {
  const st = fs.statSync(file);
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(file)) walk(path.join(file, e));
    return;
  }
  if (!file.endsWith(".js")) return;
  checked++;
  const code = fs.readFileSync(file, "utf8");
  try {
    new vm.Script(code, { filename: path.relative(ROOT, file) });
  } catch (e) {
    failed++;
    console.error(`  [FAIL] ${path.relative(ROOT, file)} -> ${e.message.split("\n")[0]}`);
  }
}

for (const d of DIRS) walk(d);

console.log(`JS syntax: ${checked - failed}/${checked} files parse`);
if (failed > 0) {
  console.error(`JS syntax: ${failed} file(s) failed`);
  process.exit(1);
}
process.exit(0);
