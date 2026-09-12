$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Dev loader for Firefox (unpacked temporary add-on).
# The repo ROOT already ships a Firefox-flavored manifest.json, so you can load
# the source tree directly - no staging needed. This script just opens the
# about:debugging page and prints the two manual steps.
#
#   1. about:debugging#/runtime/this-firefox
#   2. "Load Temporary Add-on..." -> choose $root\manifest.json
#
# Reload with the 'Reload' button after edits. DevTools breakpoints work via
#   3. Inspect -> Debugger (or F12 on the sidebar/popup page).
# ---------------------------------------------------------------------------

$rootDir = Split-Path -Parent $PSScriptRoot

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "  SCHOLARFLOW DEV LOADER - Firefox (temporary add-on)" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. In the window that opens, go to:  about:debugging#/runtime/this-firefox"
Write-Host "  2. Click 'Load Temporary Add-on...' and pick:"
Write-Host "       $rootDir\manifest.json"
Write-Host "  3. To debug: click the add-on's 'Inspect' button (or open the"
Write-Host "     popup/sidebar and press F12). Set breakpoints + reload."
Write-Host "     Reload the add-on with the 'Reload' button after editing files."
Write-Host ""
Write-Host "  Tip: append '?debug=1' to the popup/side panel URL to enable the"
Write-Host "       sfDebug helpers (storage.onChanged / runtime.onMessage logs)."
Write-Host ""

$candidates = @(
    (Join-Path ${env:ProgramFiles(x86)} "Mozilla Firefox\firefox.exe"),
    (Join-Path $env:ProgramFiles "Mozilla Firefox\firefox.exe"),
    (Join-Path $env:LOCALAPPDATA "Mozilla Firefox\firefox.exe")
)
$firefox = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $firefox -and (Get-Command firefox.exe -ErrorAction SilentlyContinue)) {
    $firefox = (Get-Command firefox.exe).Source
}
if (-not $firefox) {
    Write-Host "!! firefox.exe not found - open about:debugging manually." -ForegroundColor Yellow
    return
}

& $firefox "about:debugging#/runtime/this-firefox"