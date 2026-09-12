param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Dev loader for Google Chrome (unpacked extension).
# Builds a staging tree (root manifest.json is Firefox-flavored, so Chrome gets
# manifest_chrome.json renamed to manifest.json) into build/dev-chrome, then
# launches Chrome with a throwaway profile and --remote-debugging-port=9222.
#
#   VS Code: run "Attach to Chrome via DevTools (port 9222)" or open
#            chrome://extensions and click "Inspect" on the record
#            (popup / service worker) to get a real DevTools window.
#   Reload:  hit Ctrl+R on chrome://extensions after editing OS code, or
#            press Ctrl+Shift+R inside an open popup/side panel for hot reload.
#
# Firefox dev is simpler: load the repo ROOT directly as a Temporary Add-on
# (manifest.json at the root is already Firefox-flavored):
#   firefox.exe about:debugging#/runtime/this-firefox  ->  Load Temporary Add-on
# ---------------------------------------------------------------------------

$rootDir = Split-Path -Parent $PSScriptRoot
$staging = Join-Path $rootDir "build\dev-chrome"

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "  SCHOLARFLOW DEV LOADER - Google Chrome (unpacked)" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan

if (-not $SkipBuild) {
    Write-Host ">> Staging unpacked extension at $staging" -ForegroundColor DarkGray
    if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
    New-Item -ItemType Directory -Path $staging | Out-Null

    Copy-Item (Join-Path $rootDir "manifest_chrome.json") (Join-Path $staging "manifest.json")
    foreach ($icon in @("icon16.png", "icon48.png", "icon128.png", "icon.png", "icon.svg")) {
        $src = Join-Path $rootDir $icon
        if (Test-Path $src) { Copy-Item $src $staging -Force }
    }
    Copy-Item (Join-Path $rootDir "OS") (Join-Path $staging "OS") -Recurse -Force
    Write-Host ">> Staging done." -ForegroundColor Green
} else {
    Write-Host ">> -SkipBuild: using existing $staging" -ForegroundColor DarkGray
}

# Locate Chrome
$candidates = @(
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
)
$chrome = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome -and (Get-Command chrome.exe -ErrorAction SilentlyContinue)) {
    $chrome = (Get-Command chrome.exe).Source
}
if (-not $chrome) {
    Write-Host "!! chrome.exe not found. Install Chrome or set a PATH entry, then re-run." -ForegroundColor Red
    exit 1
}

$profile = Join-Path $env:TEMP "scholarflow-dev-chrome-profile"
if (Test-Path $profile) { Remove-Item $profile -Recurse -Force }
New-Item -ItemType Directory -Path $profile | Out-Null

Write-Host ""
Write-Host ">> Launching Chrome on port 9222 (throwaway profile)..." -ForegroundColor Green
Write-Host ""
Write-Host "   DevTools:   chrome://extensions -> ScholarFlow -> 'Inspect views'"
Write-Host "   VS Code:    Attach config on port 9222"
Write-Host "   Tip:        add '?debug=1' to sidebar/popup URL, then run the"
Write-Host "               'as sfDebug: set/dumpState/watch' helpers in DevTools."
Write-Host ""

& $chrome `
    --user-data-dir=$profile `
    --load-extension=$staging `
    --remote-debugging-port=9222 `
    --no-first-run `
    --no-default-browser-check `
    "chrome://extensions/"