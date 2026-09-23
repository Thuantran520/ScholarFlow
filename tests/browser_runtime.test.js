// Panadolce Portable Browser Runtime Test Suite
const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("Panadolce Browser Runtime Verification Test:");

const browserDir = path.resolve(__dirname, "../dist/Panadolce_Browser");

// Check directory existence
assert(fs.existsSync(browserDir), "dist/Panadolce_Browser must exist (run scripts/build_browser.ps1 first)");
console.log("  [PASS] Browser root directory verified");

// Check launchers
const batLauncher = path.join(browserDir, "Panadolce.bat");
const vbsLauncher = path.join(browserDir, "Panadolce.vbs");
assert(fs.existsSync(batLauncher), "Panadolce.bat launcher must exist");
assert(fs.existsSync(vbsLauncher), "Panadolce.vbs launcher must exist");
const batContent = fs.readFileSync(batLauncher, "utf8");
assert(batContent.includes("-profile"), "Launcher must invoke firefox with dedicated profile");
assert(batContent.includes("-no-remote"), "Launcher must use -no-remote to avoid hijacking host instances");
console.log("  [PASS] Portable launchers verified (Panadolce.bat & Panadolce.vbs)");

// Check profile user.js
const userJsPath = path.join(browserDir, "Data/profile/user.js");
assert(fs.existsSync(userJsPath), "user.js must exist in Data/profile/");
const userJsContent = fs.readFileSync(userJsPath, "utf8");
assert(userJsContent.includes("toolkit.legacyUserProfileCustomizations.stylesheets"), "user.js must enable custom stylesheets");
assert(userJsContent.includes("toolkit.telemetry.enabled"), "user.js must disable telemetry");
console.log("  [PASS] Hardened user.js privacy & theme configuration verified");

// Check chrome styling
const userChromeCssPath = path.join(browserDir, "Data/profile/chrome/userChrome.css");
assert(fs.existsSync(userChromeCssPath), "userChrome.css must exist in Data/profile/chrome/");
const cssContent = fs.readFileSync(userChromeCssPath, "utf8");
assert(cssContent.includes("--panadolce-bg"), "userChrome.css must contain Panadolce styling variables");
console.log("  [PASS] Native Gecko userChrome.css theme engine verified");

// Check embedded extension
const extDir = path.join(browserDir, "Data/profile/extensions/panadolce-dev@thuantran520.local");
assert(fs.existsSync(extDir), "Embedded Panadolce extension directory must exist");
const extManifestPath = path.join(extDir, "manifest.json");
assert(fs.existsSync(extManifestPath), "Embedded extension manifest.json must exist");
const extManifest = JSON.parse(fs.readFileSync(extManifestPath, "utf8"));
assert(extManifest.name.includes("Panadolce"), "Embedded extension must have Panadolce branding");
console.log("  [PASS] Pre-installed Panadolce Native Workspace extension verified in profile");

console.log("\nALL BROWSER RUNTIME CHECKS PASSED!");
process.exit(0);
