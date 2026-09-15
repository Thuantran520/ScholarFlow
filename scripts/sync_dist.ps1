# ---------------------------------------------------------------------------
# ScholarFlow: refresh the unpacked staging copies from source (no packaging).
# Fixes the classic trap: editing OS/ but the browser still loads an old
# dist/load_unpacked_* copy. Run this, then Reload in chrome://extensions.
#
#   pwsh -NoProfile -File scripts/sync_dist.ps1            # Chrome staging only
#   pwsh -NoProfile -File scripts/sync_dist.ps1 -Firefox   # + Firefox staging
# ---------------------------------------------------------------------------
param(
    [switch]$Firefox
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Sync-Flavor($name, $manifestSrc) {
    $staging = Join-Path $root "dist\$name"
    Write-Host ">> Syncing $staging" -ForegroundColor DarkGray
    New-Item -ItemType Directory -Path $staging -Force | Out-Null
    Copy-Item (Join-Path $root $manifestSrc) (Join-Path $staging "manifest.json") -Force
    foreach ($icon in @("icon16.png", "icon48.png", "icon128.png", "icon.png", "icon.svg")) {
        $src = Join-Path $root $icon
        if (Test-Path $src) { Copy-Item $src $staging -Force }
    }
    $osDst = Join-Path $staging "OS"
    if (Test-Path $osDst) { Remove-Item $osDst -Recurse -Force }
    Copy-Item (Join-Path $root "OS") $osDst -Recurse -Force
    # sanity: newest source must be present in staging
    $probe = Join-Path $osDst "js\tabs\ai.js"
    if (-not (Test-Path $probe)) { throw "sanity failed: $probe missing after sync" }
    $ver = (Get-Content (Join-Path $staging "manifest.json") -Raw | ConvertFrom-Json).version
    Write-Host "   OK  $name v$ver staged $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Green
}

Sync-Flavor "load_unpacked_chrome" "manifest_chrome.json"
if ($Firefox) { Sync-Flavor "load_unpacked_firefox" "manifest_firefox.json" }
Write-Host ">> Done. Now click RELOAD on the extension in chrome://extensions / about:addons, then F5 the page." -ForegroundColor Cyan
