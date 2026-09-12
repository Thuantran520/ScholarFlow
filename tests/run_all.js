// ---------------------------------------------------------------------------
// tests/run_all.js
//
// Runs every *.test.js in tests/ as its own node child so an early
// process.exit() in one suite cannot mask failures in the others.
// Exit code is 0 only when every suite passed.
//
// Run with: npm test   (node tests/run_all.js)
// ---------------------------------------------------------------------------

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const testDir = __dirname;
const files = fs.readdirSync(testDir)
  .filter((f) => f.endsWith(".test.js"))
  .sort();

if (files.length === 0) {
  console.error("No *.test.js files found in tests/");
  process.exit(1);
}

const sep = "\n" + "=".repeat(72);
let failed = 0;

for (const file of files) {
  console.log(sep);
  console.log(`  RUN  ${file}`);
  console.log("=".repeat(72));
  const r = spawnSync(process.execPath, [path.join(testDir, file)], {
    stdio: "inherit",
    cwd: path.join(testDir, ".."),
    timeout: 120000
  });
  if (r.error) {
    console.error(`  ERROR ${file}: ${r.error.message}`);
    failed++;
  } else if (r.status !== 0) {
    console.error(`  FAIL ${file} (exit ${r.status})`);
    failed++;
  } else {
    console.log(`  OK   ${file}`);
  }
}

console.log(sep);
console.log(`${files.length - failed}/${files.length} suites passed`);
process.exit(failed === 0 ? 0 : 1);