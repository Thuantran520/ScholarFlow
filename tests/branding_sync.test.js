// Enterprise Branding & Integrity Test Suite for Panadolce
const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("Panadolce enterprise branding & consistency test:");

// 1. Package.json checks
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));
assert.strictEqual(pkg.name, "panadolce", "package.json name must be 'panadolce'");
assert.strictEqual(pkg.author, "Panadolce", "package.json author must be 'Panadolce'");
console.log("  [PASS] package.json metadata strictly aligned to Panadolce");

// 2. Manifest files checks
const manifests = [
  "manifest.json",
  "manifest_firefox.json",
  "manifest_chrome.json"
];
for (const mFile of manifests) {
  const m = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", mFile), "utf8"));
  assert(m.name.includes("Panadolce"), `${mFile} name must contain 'Panadolce'`);
  assert(m.description.includes("Panadolce"), `${mFile} description must contain 'Panadolce'`);
  if (m.action) {
    assert(m.action.default_title.includes("Panadolce"), `${mFile} action.default_title must contain 'Panadolce'`);
  }
}
console.log("  [PASS] all 3 manifests (root, firefox, chrome) strictly verified for Panadolce branding");

// 3. Locales checks across all 5 languages (vi, en, zh, ru, ja)
const locales = ["vi", "en", "zh", "ru", "ja"];
for (const loc of locales) {
  const content = fs.readFileSync(path.resolve(__dirname, `../OS/locales/${loc}.js`), "utf8");
  const count = (content.match(/ScholarFlow/gi) || []).length;
  assert.strictEqual(count, 0, `OS/locales/${loc}.js must contain 0 occurrences of 'ScholarFlow', found ${count}`);
}
console.log("  [PASS] all 5 locales (vi, en, zh, ru, ja) have 0 legacy ScholarFlow references");

// 4. HTML main entrypoints
const htmlFiles = [
  "OS/html/sidebar.html",
  "OS/html/popup.html",
  "OS/html/privacy.html"
];
for (const hFile of htmlFiles) {
  const content = fs.readFileSync(path.resolve(__dirname, "..", hFile), "utf8");
  assert(content.includes("Panadolce"), `${hFile} must include 'Panadolce'`);
}
console.log("  [PASS] primary HTML entrypoints (sidebar, popup, privacy) verified");

console.log("\nALL BRANDING CHECKS PASSED!");
process.exit(0);

