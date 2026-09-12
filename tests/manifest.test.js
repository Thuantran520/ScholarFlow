// ---------------------------------------------------------------------------
// tests/manifest.test.js
//
// Manifest sanity checks across the three flavors:
//   manifest.json           - Firefox dev root (sidebar_action + gecko id)
//   manifest_firefox.json   - shipped Firefox build slice (should match root)
//   manifest_chrome.json    - Chrome MV3 (sidePanel + service_worker)
//
// Run with: node tests/manifest.test.js
// ---------------------------------------------------------------------------

const { check, finish, REPO_ROOT } = require("./helpers");
const fs = require("fs");
const path = require("path");

const ROOT = REPO_ROOT;
const FILES = {
  ffRoot: path.join(ROOT, "manifest.json"),
  ffShip: path.join(ROOT, "manifest_firefox.json"),
  chrome: path.join(ROOT, "manifest_chrome.json")
};

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const exists = (p) => fs.existsSync(path.join(ROOT, p));

function manifestFilePaths(m) {
  const out = [];
  (m.content_scripts || []).forEach((cs) => {
    (cs.js || []).forEach((p) => out.push(p));
    (cs.css || []).forEach((p) => out.push(p));
  });
  if (m.action) {
    if (m.action.default_popup) out.push(m.action.default_popup);
    Object.values(m.action.default_icon || {}).forEach((p) => out.push(p));
  }
  if (m.side_panel && m.side_panel.default_path) out.push(m.side_panel.default_path);
  if (m.sidebar_action && m.sidebar_action.default_panel) {
    out.push(m.sidebar_action.default_panel);
    if (m.sidebar_action.default_icon) out.push(m.sidebar_action.default_icon);
  }
  if (m.background) {
    if (typeof m.background.service_worker === "string") out.push(m.background.service_worker);
    (m.background.scripts || []).forEach((p) => out.push(p));
  }
  Object.values(m.icons || {}).forEach((p) => out.push(p));
  return [...new Set(out)];
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

  let ffRoot;
  try {
    ffRoot = readJson(FILES.ffRoot);
    check(true, "manifest.json parses as JSON");
  } catch (e) { check(false, "manifest.json parses as JSON -> " + e.message); }

  let ffShip;
  try {
    ffShip = readJson(FILES.ffShip);
    check(true, "manifest_firefox.json parses as JSON");
  } catch (e) { check(false, "manifest_firefox.json parses as JSON -> " + e.message); }

  let chrome;
  try {
    chrome = readJson(FILES.chrome);
    check(true, "manifest_chrome.json parses as JSON");
  } catch (e) { check(false, "manifest_chrome.json parses as JSON -> " + e.message); }

  if (!ffRoot || !ffShip || !chrome) {
    check(false, "all three manifests loaded");
    finish("manifest.test.js");
    return;
  }

  console.log("Version parity:");
  check([ffRoot, ffShip, chrome].every((m) => m.version === pkg.version),
    `all manifests carry package version 2.4.2 (pkg=${pkg.version})`);
  check([ffRoot, ffShip, chrome].every((m) => m.manifest_version === 3), "all manifests are MV3");
  check([ffRoot, ffShip, chrome].every((m) => m.name === ffRoot.name && m.description === ffRoot.description),
    "name/description identical across flavors");

  console.log("Firefox vs Chrome flavor:");
  check(ffRoot.background && Array.isArray(ffRoot.background.scripts) && ffRoot.background.scripts.length === 1,
    "FF manifest uses background.scripts[] (not service_worker)");
  check(chrome.background && typeof chrome.background.service_worker === "string",
    "Chrome manifest uses background.service_worker");
  check(chrome.permissions.includes("sidePanel") && chrome.side_panel && chrome.side_panel.default_path === "OS/html/sidebar.html",
    "Chrome manifest has sidePanel permission + side_panel.default_path");
  check(!ffRoot.permissions.includes("sidePanel"), "FF manifest does NOT request sidePanel permission");
  check(Boolean(ffRoot.sidebar_action && ffRoot.sidebar_action.default_panel === "OS/html/sidebar.html"),
    "FF manifest uses sidebar_action.default_panel = OS/html/sidebar.html");
  check(!chrome.sidebar_action && !chrome.browser_specific_settings,
    "Chrome manifest has no sidebar_action / browser_specific_settings");
  check(Boolean(ffRoot.browser_specific_settings && ffRoot.browser_specific_settings.gecko &&
    /^[\w.-]+@[\w.-]+$/.test(ffRoot.browser_specific_settings.gecko.id || "")),
    "FF manifest ships a valid gecko extension id");

  check(JSON.stringify(ffShip) === JSON.stringify(ffRoot),
    "manifest_firefox.json is byte-identical to root manifest.json");

  const ffPerms = (ffRoot.permissions || []).slice().sort();
  const chPerms = (chrome.permissions || []).slice().sort();
  const extra = chPerms.filter((p) => !ffPerms.includes(p));
  const missing = ffPerms.filter((p) => !chPerms.includes(p));
  check(extra.length === 1 && extra[0] === "sidePanel" && missing.length === 0,
    `Chrome permissions == FF + [sidePanel] (extra=${JSON.stringify(extra)}, missing=${JSON.stringify(missing)})`);

  console.log("Referenced paths exist:");
  const paths = [...new Set([...manifestFilePaths(ffRoot), ...manifestFilePaths(chrome)])];
  const bad = paths.filter((p) => !exists(p)).slice(0, 6);
  check(bad.length === 0, `all ${paths.length} manifest-referenced files exist on disk` +
    (bad.length ? ` -> missing ${JSON.stringify(bad)}` : ""));

  check(exists("OS/html/sidebar.html") && exists("OS/css/content.css") &&
    ["icon16.png", "icon48.png", "icon128.png"].every(exists),
    "key assets exist (sidebar.html, content.css, icon16/48/128)");

  finish("manifest.test.js");
}

main().catch((e) => {
  console.error("FATAL:", (e && e.stack) || e);
  process.exit(1);
});