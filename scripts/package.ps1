param(
    [string]$Version = "2.4.1"
)

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$distDir = Join-Path $rootDir "dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir | Out-Null
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Create-ExtensionZip {
    param(
        [string]$ZipPath,
        [string]$ManifestSource
    )

    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force
    }

    $archive = [System.IO.Compression.ZipFile]::Open($ZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        # 1. Add manifest
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $ManifestSource, "manifest.json", [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null

        # 2. Add root icons
        $icons = @("icon16.png", "icon48.png", "icon128.png", "icon.png", "icon.svg")
        foreach ($icon in $icons) {
            $iconPath = Join-Path $rootDir $icon
            if (Test-Path $iconPath) {
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $iconPath, $icon, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
            }
        }

        # 3. Add OS folder
        $osDir = Join-Path $rootDir "OS"
        $files = Get-ChildItem -Path $osDir -Recurse -File
        foreach ($file in $files) {
            $relPath = $file.FullName.Substring($rootDir.Length + 1).Replace("\", "/")
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $relPath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    }
    finally {
        $archive.Dispose()
    }

    $fileInfo = Get-Item $ZipPath
    $sizeKb = [math]::Round($fileInfo.Length / 1024, 2)
    Write-Host " [CREATED] $($fileInfo.Name) ($sizeKb KB)" -ForegroundColor Green
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  TIEN HANH DONG GOI EXTENSION SCHOLARFLOW v$Version" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Firefox Package
$firefoxZip = Join-Path $distDir "ScholarFlow_v$Version`_Firefox.zip"
$manifestFirefox = Join-Path $rootDir "manifest_firefox.json"
Create-ExtensionZip -ZipPath $firefoxZip -ManifestSource $manifestFirefox

# Also create unversioned alias for convenience
$firefoxAlias = Join-Path $distDir "ScholarFlow_Firefox.zip"
Copy-Item $firefoxZip $firefoxAlias -Force

# 2. Chrome Package
$chromeZip = Join-Path $distDir "ScholarFlow_v$Version`_Chrome.zip"
$manifestChrome = Join-Path $rootDir "manifest_chrome.json"
Create-ExtensionZip -ZipPath $chromeZip -ManifestSource $manifestChrome

# Also create unversioned alias for convenience
$chromeAlias = Join-Path $distDir "ScholarFlow_Chrome.zip"
Copy-Item $chromeZip $chromeAlias -Force

Write-Host ""
Write-Host "Hoan tat dong goi trong thu muc: $distDir" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
