param()

# ---------------------------------------------------------------------------
# ScholarFlow - locale / i18n integrity check (wrapper)
# Uses node to verify the locale dumps are complete, consistent across all
# 5 languages, in sync with the content-script artifact, and that every HTML
# data-i18n reference and static JS t() key actually resolves.
# Usage: pwsh -NoProfile -ExecutionPolicy Bypass -File scripts\i18n\check_locales.ps1
# Exit code 0 = all checks passed, 1 = at least one FAIL.
# ---------------------------------------------------------------------------

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "[check_locales] FAIL: node not found on PATH" -ForegroundColor Red
    exit 1
}

& $node.Source (Join-Path $PSScriptRoot "check_locales.js")
exit $LASTEXITCODE