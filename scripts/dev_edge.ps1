param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Dev loader for Microsoft Edge (unpacked extension).
# Builds a staging tree into dist/load_unpacked_edge, then launches Edge with
# a temporary isolated profile and the extension loaded.
# ---------------------------------------------------------------------------

$rootDir = Split-Path -Parent $PSScriptRoot
$staging = Join-Path $rootDir "dist\load_unpacked_edge"

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "  SCHOLARFLOW DEV LOADER - Microsoft Edge (unpacked)" -ForegroundColor Cyan
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

# Locate Edge
$candidates = @(
    (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $env:LOCALAPPDATA "Microsoft\Edge\Application\msedge.exe")
)
$edge = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge -and (Get-Command msedge.exe -ErrorAction SilentlyContinue)) {
    $edge = (Get-Command msedge.exe).Source
}
if (-not $edge) {
    Write-Host "!! msedge.exe not found. Install Microsoft Edge or set a PATH entry, then re-run." -ForegroundColor Red
    exit 1
}

$profile = Join-Path $env:TEMP "scholarflow-dev-edge-profile"
if (Test-Path $profile) { Remove-Item $profile -Recurse -Force }
New-Item -ItemType Directory -Path $profile | Out-Null

Write-Host ""
Write-Host ">> Launching Microsoft Edge (throwaway profile)..." -ForegroundColor Green
Write-Host "   Edge Staging Path: $staging" -ForegroundColor Yellow
Write-Host "   Manage Extensions: edge://extensions"
Write-Host ""

& $edge `
    --user-data-dir=$profile `
    --no-first-run `
    --no-default-browser-check `
    --disable-features=Translate `
    --load-extension=$staging `
    "edge://extensions"

