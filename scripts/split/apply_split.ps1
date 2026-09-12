# ---------------------------------------------------------------------------
# ScholarFlow - sidebar.js Module Splitter
#
# Splits the monolithic OS/js/sidebar.js into the feature modules declared in
# scripts/split/split_manifest.json. The split is verifiable:
#   * every source line is assigned to exactly one module (no gaps/overlaps)
#   * concatenating the extracted module bodies in load order reproduces the
#     original file byte-for-byte
#
# Usage:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File scripts\split\apply_split.ps1
#   pwsh ... -File scripts\split\apply_split.ps1 -VerifyOnly
#
# Exit code 0 = success, 1 = validation failure.
# ---------------------------------------------------------------------------

param(
    [string]$Manifest = "",
    [string]$Source = "",
    [string]$BackupDir = "",
    [switch]$VerifyOnly,
    [switch]$NoHeader
)

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
$root = Split-Path -Parent (Split-Path -Parent $scriptDir)

if (-not $Manifest)   { $Manifest = Join-Path $scriptDir "split_manifest.json" }
if (-not $Source)     { $Source = Join-Path $root "OS\js\sidebar.js" }
if (-not $BackupDir)  { $BackupDir = Join-Path $scriptDir "backup" }
$manifestPath = $Manifest
$sourcePath = $Source

if (-not (Test-Path -LiteralPath $manifestPath)) {
    Write-Host "[split] FAIL manifest not found: $manifestPath" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path -LiteralPath $sourcePath)) {
    Write-Host "[split] FAIL source not found: $sourcePath" -ForegroundColor Red
    exit 1
}

$spec = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$modules = @($spec.modules)

# Read source and split into physical lines, keeping each line terminator
# attached to its line so that concatenation is byte-exact.
$bytes = [System.IO.File]::ReadAllBytes($sourcePath)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$lines = [System.Text.RegularExpressions.Regex]::Split($text, "(?<=\n)")
# Drop a trailing empty element produced when the file ends with a newline.
if ($lines.Count -gt 0 -and $lines[$lines.Count - 1] -eq "") {
    $lines = $lines[0..($lines.Count - 2)]
}
$total = $lines.Count

# ---------------------------------------------------------------------------
# 1. Validate coverage: every line belongs to exactly one module
# ---------------------------------------------------------------------------
$owner = New-Object 'int[]' $total
for ($i = 0; $i -lt $total; $i++) { $owner[$i] = -1 }

$errors = [System.Collections.Generic.List[string]]::new()
$seenFirstLine = @{}
for ($m = 0; $m -lt $modules.Count; $m++) {
    $mod = $modules[$m]
    $ranges = @($mod.ranges)
    $prevEnd = 0
    foreach ($range in $ranges) {
        $start = [int]$range[0]
        $end = [int]$range[1]
        if ($start -lt 1 -or $end -gt $total) {
            $errors.Add("$($mod.file): range [$start,$end] outside 1..$total")
            continue
        }
        if ($start -gt $end) {
            $errors.Add("$($mod.file): inverted range [$start,$end]")
            continue
        }
        if ($start -le $prevEnd) {
            $errors.Add("$($mod.file): ranges not strictly increasing at [$start,$end]")
        }
        $prevEnd = $end
        for ($ln = $start; $ln -le $end; $ln++) {
            if ($owner[$ln - 1] -ne -1) {
                $errors.Add("line $ln assigned to both '$($modules[$owner[$ln - 1]].file)' and '$($mod.file)'")
            }
            else {
                $owner[$ln - 1] = $m
            }
        }
    }
    if (-not $seenFirstLine.ContainsKey($mod.file)) { $seenFirstLine[$mod.file] = $true }
}

$missing = for ($ln = 0; $ln -lt $total; $ln++) { if ($owner[$ln] -eq -1) { $ln + 1 } }
if ($missing) {
    $errors.Add("$($missing.Count) source line(s) not assigned to any module: " + (($missing | Select-Object -First 20) -join ", "))
}

if ($errors.Count -gt 0) {
    Write-Host "[split] FAIL manifest coverage" -ForegroundColor Red
    foreach ($e in $errors) { Write-Host "        - $e" -ForegroundColor Red }
    exit 1
}

# ---------------------------------------------------------------------------
# 2. Load order is defined by each module's lowest source line
# ---------------------------------------------------------------------------
$ordered = $modules | Sort-Object { ($_.ranges | ForEach-Object { [int]$_[0] } | Measure-Object -Minimum).Minimum }

# ---------------------------------------------------------------------------
# 3. Build module bodies and write files
# ---------------------------------------------------------------------------
$bodies = [ordered]@{}
$written = [System.Collections.Generic.List[string]]::new()

foreach ($mod in $ordered) {
    $sb = [System.Text.StringBuilder]::new()
    foreach ($range in @($mod.ranges)) {
        for ($ln = [int]$range[0]; $ln -le [int]$range[1]; $ln++) {
            [void]$sb.Append($lines[$ln - 1])
        }
    }
    $body = $sb.ToString()
    $bodies[$mod.file] = $body

    if (-not $VerifyOnly) {
        $target = Join-Path $root ($mod.file -replace '/', '\')
        $targetDir = Split-Path -Parent $target
        if (-not (Test-Path -LiteralPath $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        $content = $body
        if (-not $NoHeader) {
            $firstLine = ($mod.ranges | ForEach-Object { [int]$_[0] } | Measure-Object -Minimum).Minimum
            $lastLine = ($mod.ranges | ForEach-Object { [int]$_[1] } | Measure-Object -Maximum).Maximum
            $nl = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
            $header = @(
                "// ---------------------------------------------------------------------------",
                "// ScholarFlow module: $($mod.file)",
                "// $($mod.note)",
                "// Extracted from js/sidebar.js (lines $firstLine-$lastLine) - load order matters.",
                "// Generated by scripts/split/apply_split.ps1 - do not edit line order.",
                "// ---------------------------------------------------------------------------",
                ""
            ) -join $nl
            $content = $header + $body
        }
        [System.IO.File]::WriteAllText($target, $content, (New-Object System.Text.UTF8Encoding($false)))
        $written.Add($mod.file)
    }
}

# ---------------------------------------------------------------------------
# 4. Backup + reassembly verification
# ---------------------------------------------------------------------------
if (-not $VerifyOnly) {
    if (-not (Test-Path -LiteralPath $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    $backupFile = Join-Path $BackupDir "sidebar.original.js"
    if (-not (Test-Path -LiteralPath $backupFile)) {
        Copy-Item -LiteralPath $sourcePath -Destination $backupFile
    }
}

$reassembled = ($ordered | ForEach-Object { $bodies[$_.file] }) -join ""
if ($reassembled -ne $text) {
    Write-Host "[split] FAIL reassembly does not match the original file" -ForegroundColor Red
    exit 1
}

Write-Host "[split] PASS  $($ordered.Count) modules, $total lines, byte-exact reassembly" -ForegroundColor Green
if (-not $VerifyOnly) {
    foreach ($f in $written) {
        $target = Join-Path $root ($f -replace '/', '\')
        $len = (Get-Item -LiteralPath $target).Length
        Write-Host ("        {0,-34} {1,7} bytes" -f $f, $len)
    }
}
exit 0
