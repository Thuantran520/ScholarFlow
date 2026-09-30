// ---------------------------------------------------------------------------
// ScholarFlow JS syntax checker (cross-platform)
// Replaces the `node --check` loop inside scripts/check_store.ps1 so the same
// gate runs on Windows, macOS and Linux (e.g. AI-assisted development on any OS).
// ---------------------------------------------------------------------------

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const DIRS = [path.join(ROOT, "OS", "js")];

// Files loaded with background.type = "module" are real ES modules, so they must
// be parsed as such. `new vm.Script` only understands classic scripts, and
// `node --check` on a .js file assumes CommonJS, so modules are piped through
// `node --check --input-type=module` instead.
const MODULE_FILES = new Set([
  path.join("OS", "js", "background.js"),
  path.join("OS", "js", "userscripts_bg.js")
]);

let checked = 0;
let failed = 0;

function isModule(file) {
  return MODULE_FILES.has(path.relative(ROOT, file).split(path.sep).join(path.sep));
}

function checkModule(file, code) {
  const r = spawnSync(process.execPath, ["--check", "--input-type=module"], {
    input: code,
    encoding: "utf8"
  });
  if (r.status === 0) return true;
  const msg = String((r.stderr || r.stdout || "parse failed")).split("\n").find((l) => /Error/.test(l)) || "parse failed";
  return { error: msg };
}

function walk(file) {
  const st = fs.statSync(file);
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(file)) walk(path.join(file, e));
    return;
  }
  if (!file.endsWith(".js")) return;
  checked++;
  const code = fs.readFileSync(file, "utf8");
  if (isModule(file)) {
    const res = checkModule(file, code);
    if (res === true) return;
    failed++;
    console.error(`  [FAIL] ${path.relative(ROOT, file)} -> ${res.error}`);
    return;
  }
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
