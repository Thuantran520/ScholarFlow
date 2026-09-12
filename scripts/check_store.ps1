param(
    [switch]$Json
)

# ---------------------------------------------------------------------------
# ScholarFlow - Pre-Packaging Store Check
# Runs static tests before building the Chrome / Firefox zip packages.
# Usage:  pwsh -NoProfile -ExecutionPolicy Bypass -File scripts\check_store.ps1
# Exit code 0 = all checks passed, 1 = at least one FAIL (package must abort).
# ---------------------------------------------------------------------------

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$results = [System.Collections.Generic.List[object]]::new()

function Add-Result {
    param(
        [string]$Name,
        [string]$Status,   # PASS | FAIL | WARN
        [string]$Detail = ""
    )
    $script:results.Add([pscustomobject]@{ Name = $Name; Status = $Status; Detail = $Detail })
}

function Read-Utf8 {
    param([string]$Path)
    return Get-Content -Path $Path -Raw -Encoding UTF8
}

function Test-JsonFile {
    param([string]$RelPath)
    $full = Join-Path $root $RelPath
    if (-not (Test-Path -LiteralPath $full)) {
        Add-Result "$RelPath exists" "FAIL" "File missing"
        return $null
    }
    try {
        $obj = Read-Utf8 $full | ConvertFrom-Json
        Add-Result "$RelPath JSON valid" "PASS"
        return $obj
    }
    catch {
        Add-Result "$RelPath JSON valid" "FAIL" $_.Exception.Message
        return $null
    }
}

# ---------------------------------------------------------------------------
# 1. Required files
# ---------------------------------------------------------------------------
$requiredRoot = @("icon16.png", "icon48.png", "icon128.png")
foreach ($f in $requiredRoot) {
    if (Test-Path -LiteralPath (Join-Path $root $f)) { Add-Result "root file $f" "PASS" }
    else { Add-Result "root file $f" "FAIL" "Missing but referenced by manifests" }
}
$iconMain = @("icon.png", "icon.svg") | Where-Object { Test-Path -LiteralPath (Join-Path $root $_) }
if ($iconMain) { Add-Result "root logo (icon.png / icon.svg)" "PASS" }
else { Add-Result "root logo (icon.png / icon.svg)" "WARN" "Missing - optional for packaging" }

$htmlFiles = @("popup.html", "sidebar.html", "privacy.html", "prompter.html")
foreach ($f in $htmlFiles) {
    $p = Join-Path $root ("OS\html\" + $f)
    if (Test-Path -LiteralPath $p) { Add-Result "OS\html\$f" "PASS" }
    else { Add-Result "OS\html\$f" "FAIL" "Missing" }
}

# ---------------------------------------------------------------------------
# 2. Manifests
# ---------------------------------------------------------------------------
$ff = Test-JsonFile "manifest_firefox.json"
$ch = Test-JsonFile "manifest_chrome.json"
$rootM = Test-JsonFile "manifest.json"

if ($ff -and $ch -and $rootM) {
    if ($ff.version -eq $ch.version -and $ch.version -eq $rootM.version) {
        Add-Result "Version consistency (ff/ch/root)" "PASS" "v$($ff.version)"
    }
    else {
        Add-Result "Version consistency (ff/ch/root)" "FAIL" "ff=$($ff.version) ch=$($ch.version) root=$($rootM.version)"
    }
}
else {
    Add-Result "Version consistency (ff/ch/root)" "WARN" "Cannot compare - one manifest failed to parse"
}

if ($ff) {
    if ($ff."browser_specific_settings".gecko.id) { Add-Result "Firefox gecko.id" "PASS" $ff."browser_specific_settings".gecko.id }
    else { Add-Result "Firefox gecko.id" "FAIL" "browser_specific_settings.gecko.id is required by AMO" }
    if ($ff.background.scripts) { Add-Result "Firefox background.scripts" "PASS" }
    else { Add-Result "Firefox background.scripts" "FAIL" "background.scripts missing for Gecko MV3" }
}

if ($ch) {
    if ($ch.background.service_worker) { Add-Result "Chrome background.service_worker" "PASS" }
    else { Add-Result "Chrome background.service_worker" "FAIL" "Chrome MV3 requires a service worker" }
    if ($ch.side_panel."default_path") { Add-Result "Chrome side_panel.path" "PASS" }
    else { Add-Result "Chrome side_panel.path" "WARN" "side_panel not declared" }
    if ($ch."browser_specific_settings") { Add-Result "Chrome no browser_specific_settings" "FAIL" "gecko block must not ship in Chrome build" }
    else { Add-Result "Chrome no browser_specific_settings" "PASS" }
}

# Permission parity (sidePanel is Chrome-only and expected to differ)
if ($ff -and $ch) {
    $ffPerms = @($ff.permissions)
    $chPerms = @($ch.permissions)
    $chOnly = @($chPerms | Where-Object { $_ -notin $ffPerms -and $_ -ne "sidePanel" })
    $ffOnly = @($ffPerms | Where-Object { $_ -notin $chPerms })
    if ($chOnly.Count -eq 0 -and $ffOnly.Count -eq 0) {
        Add-Result "Permission parity (ff <-> ch)" "PASS" "sidePanel is the only Chrome-specific permission"
    }
    else {
        $missing = @()
        if ($chOnly.Count -gt 0) { $missing += "firefox missing: " + ($chOnly -join ",") }
        if ($ffOnly.Count -gt 0) { $missing += "chrome missing: " + ($ffOnly -join ",") }
        Add-Result "Permission parity (ff <-> ch)" "FAIL" ($missing -join " | ")
    }
}

# Referenced file paths inside manifests must exist
function Test-ManifestPaths {
    param($Manifest, [string]$Label)
    $paths = [System.Collections.Generic.List[string]]::new()
    foreach ($cs in @($Manifest.content_scripts)) {
        foreach ($js in @($cs.js)) { $paths.Add($js) }
        foreach ($css in @($cs.css)) { $paths.Add($css) }
    }
    if ($Manifest.background.services) { foreach ($s in @($Manifest.background.services)) { $paths.Add($s) } }
    if ($Manifest.background.scripts) { foreach ($s in @($Manifest.background.scripts)) { $paths.Add($s) } }
    if ($Manifest.background.service_worker) { $paths.Add([string]$Manifest.background.service_worker) }
    if ($Manifest.action."default_popup") { $paths.Add([string]$Manifest.action."default_popup") }
    if ($Manifest.sidebar_action."default_panel") { $paths.Add([string]$Manifest.sidebar_action."default_panel") }
    if ($Manifest.side_panel."default_path") { $paths.Add([string]$Manifest.side_panel."default_path") }

    $bad = $paths | Where-Object { $_ -and -not (Test-Path -LiteralPath (Join-Path $root $_)) }
    if ($bad.Count -eq 0) { Add-Result "$Label referenced paths exist" "PASS" }
    else { Add-Result "$Label referenced paths exist" "FAIL" (($bad | Select-Object -Unique) -join ", ") }
}
if ($ff) { Test-ManifestPaths $ff "Firefox" }
if ($ch) { Test-ManifestPaths $ch "Chrome" }

# ---------------------------------------------------------------------------
# 3. JavaScript syntax (via node --check when available)
# ---------------------------------------------------------------------------
$nodeExe = Get-Command node -ErrorAction SilentlyContinue
$jsFiles = @(Get-ChildItem -Path (Join-Path $root "OS\js") -Recurse -Filter *.js)
$jsTotal = $jsFiles.Count
if ($nodeExe) {
    $jsFail = 0
    foreach ($js in $jsFiles) {
        & $nodeExe.Source --check $js.FullName 2>$null
        if ($LASTEXITCODE -ne 0) {
            $jsFail++
            Add-Result "JS syntax: $($js.FullName.Substring($root.Length + 1))" "FAIL"
        }
    }
    if ($jsFail -eq 0) { Add-Result "JS syntax (node --check, $jsTotal files)" "PASS" }
    else { Add-Result "JS syntax (node --check)" "FAIL" "$jsFail file(s) failed" }
}
else {
    Add-Result "JS syntax (node --check)" "WARN" "node not found on PATH - skipped syntax check"
}

# ---------------------------------------------------------------------------
# 4. Security content scan
# ---------------------------------------------------------------------------
$forbiddenJs = @(
    @{ Pattern = '(?<![.\w])eval\s*\(';               Label = "eval()" },
    @{ Pattern = 'new\s+Function\s*\(';              Label = "new Function()" },
    @{ Pattern = 'document\.write\s*\(';             Label = "document.write()" }
)
$jsAll = $jsFiles | ForEach-Object { Read-Utf8 $_.FullName }
if ($jsAll.Count -gt 0) {
    $joined = $jsAll -join "`n"
    foreach ($rule in $forbiddenJs) {
        $m = [regex]::Matches($joined, $rule.Pattern)
        if ($m.Count -gt 0) { Add-Result "No $($rule.Label)" "FAIL" "$($m.Count) occurrence(s)" }
        else { Add-Result "No $($rule.Label)" "PASS" }
    }

    # Dynamic innerHTML assignment (RHS is not a string literal)
    $dyn = foreach ($js in $jsFiles) {
        $lines = Get-Content -Path $js.FullName -Encoding UTF8
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]
            if ($line -match '\.innerHTML\s*=\s*(.+)$') {
                $rhs = $Matches[1].TrimStart()
                if (-not ($rhs.StartsWith("'") -or $rhs.StartsWith('"'))) {
                    "$($js.Name):$($i + 1): $($line.Trim())"
                }
            }
        }
    }
    if ($dyn.Count -gt 0) { Add-Result "No dynamic innerHTML" "FAIL" ($dyn -join " ; ") }
    else { Add-Result "No dynamic innerHTML" "PASS" }

    # createContextualFragment with dynamic argument is flagged by AMO linter
    $frag = [regex]::Matches($joined, 'createContextualFragment\s*\(').Count
    if ($frag -gt 0) { Add-Result "No createContextualFragment" "FAIL" "$frag occurrence(s) - AMO flags dynamic use" }
    else { Add-Result "No createContextualFragment" "PASS" }

    # Informational: explicit network calls (user-initiated features)
    $netJs = [regex]::Matches($joined, '(?<![.\w])(fetch|XMLHttpRequest)\s*\(').Count
    if ($netJs -gt 0) { Add-Result "Network calls (fetch/XHR)" "WARN" "$netJs call(s) - ensure they are user-triggered" }
    else { Add-Result "Network calls (fetch/XHR)" "PASS" "none" }
}

# ---------------------------------------------------------------------------
# 5. HTML scan (inline scripts / inline event handlers)
# ---------------------------------------------------------------------------
foreach ($html in @(Get-ChildItem -Path (Join-Path $root "OS\html") -Filter *.html)) {
    $content = Read-Utf8 $html.FullName
    $scriptTags = [regex]::Matches($content, '<script').Count
    $scriptWithSrc = [regex]::Matches($content, '<script[^>]*\bsrc\s*=').Count
    $inlineScripts = $scriptTags - $scriptWithSrc
    if ($inlineScripts -gt 0) { Add-Result "$($html.Name) no inline <script>" "FAIL" "$inlineScripts inline block(s)" }
    else { Add-Result "$($html.Name) no inline <script>" "PASS" }

    $handlers = [regex]::Matches($content, '\son[a-z]+\s*=\s*["'']')
    if ($handlers.Count -gt 0) { Add-Result "$($html.Name) no inline event handlers" "FAIL" "$($handlers.Count) handler(s)" }
    else { Add-Result "$($html.Name) no inline event handlers" "PASS" }
}

# ---------------------------------------------------------------------------
# 5.5 I18n integrity (single source of truth = OS/locales/*.js)
# ---------------------------------------------------------------------------
$i18nCheck = Join-Path $PSScriptRoot "i18n\check_locales.ps1"
if (Test-Path -LiteralPath $i18nCheck) {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File $i18nCheck
    if ($LASTEXITCODE -eq 0) { Add-Result "i18n locale integrity" "PASS" }
    else { Add-Result "i18n locale integrity" "FAIL" "scripts\i18n\check_locales.ps1 exited $LASTEXITCODE" }
}
else {
    Add-Result "i18n locale integrity" "WARN" "scripts\i18n\check_locales.ps1 missing"
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
$fail = @($results | Where-Object { $_.Status -eq "FAIL" }).Count
$warn = @($results | Where-Object { $_.Status -eq "WARN" }).Count
$pass = @($results | Where-Object { $_.Status -eq "PASS" }).Count

if ($Json) {
    $results | ForEach-Object { [pscustomobject]@{ name = $_.Name; status = $_.Status; detail = $_.Detail } } | ConvertTo-Json
    exit ($fail -gt 0 ? 1 : 0)
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SCHOLARFLOW PRE-PACKAGING STORE CHECK" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
foreach ($r in $results) {
    $color = switch ($r.Status) { "PASS" { "Green" } "FAIL" { "Red" } "WARN" { "Yellow" } }
    $label = $r.Status.PadRight(4)
    $detail = if ($r.Detail) { "  -> " + $r.Detail } else { "" }
    Write-Host (" [{0}] {1}{2}" -f $label, $r.Name, $detail) -ForegroundColor $color
}
Write-Host "----------------------------------------------------------"
Write-Host (" PASS: {0}   WARN: {1}   FAIL: {2}" -f $pass, $warn, $fail) -ForegroundColor $(if ($fail -gt 0) { "Red" } elseif ($warn -gt 0) { "Yellow" } else { "Green" })
Write-Host "==========================================================" -ForegroundColor Cyan

if ($fail -gt 0) {
    Write-Host "!! Store checks FAILED - packaging was ABORTED." -ForegroundColor Red
    exit 1
}
exit 0