# ---------------------------------------------------------------------------
# scripts/build_browser.ps1
#
# Builds the standalone Panadolce Browser (Gecko Portable Edition)
# Self-contained, zero-install, zero-telemetry, USB/Cloud portable.
# ---------------------------------------------------------------------------

param(
    [switch]$SkipZip,
    [switch]$CopyGecko
)

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$distDir = Join-Path $rootDir "dist"
$browserDir = Join-Path $distDir "Panadolce_Browser"
$appDir = Join-Path $browserDir "App"
$firefoxAppDir = Join-Path $appDir "Firefox64"
$distributionDir = Join-Path $firefoxAppDir "distribution"
$dataDir = Join-Path $browserDir "Data"
$profileDir = Join-Path $dataDir "profile"
$chromeDir = Join-Path $profileDir "chrome"
$extensionsDir = Join-Path $profileDir "extensions"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  BUILDING PANADOLCE BROWSER (GECKO PORTABLE EDITION)   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Clean & create directory structure
if (Test-Path $browserDir) {
    Remove-Item -Path $browserDir -Recurse -Force
}
New-Item -ItemType Directory -Path $browserDir -Force | Out-Null
New-Item -ItemType Directory -Path $firefoxAppDir -Force | Out-Null
New-Item -ItemType Directory -Path $distributionDir -Force | Out-Null
New-Item -ItemType Directory -Path $chromeDir -Force | Out-Null
New-Item -ItemType Directory -Path $extensionsDir -Force | Out-Null

Write-Host ">> [1/6] Initialized browser folder structure at: $browserDir" -ForegroundColor Green

# 2. Configure userChrome.css & browser aesthetics
$userChromeCss = @"
/* ==========================================================================
   Panadolce Browser — Native Gecko Theme & Split Workspace
   ========================================================================== */

:root {
  --panadolce-bg: #0b0f19;
  --panadolce-accent: #38bdf8;
  --panadolce-border: rgba(255, 255, 255, 0.08);
}

/* Dark Minimal Titlebar & Tabs */
#TabsToolbar {
  background: var(--panadolce-bg) !important;
  color: #f1f5f9 !important;
}

.tab-background {
  border-radius: 8px 8px 0 0 !important;
}

.tab-background[selected="true"] {
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%) !important;
  border-top: 2px solid var(--panadolce-accent) !important;
}

/* Clean URL Bar */
#urlbar-background {
  background: rgba(15, 23, 42, 0.6) !important;
  border: 1px solid var(--panadolce-border) !important;
  border-radius: 8px !important;
}

/* Native Bottom Dock Container for Media Shelf */
#panadolce-dock {
  min-height: 48px;
  background: rgba(11, 15, 25, 0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--panadolce-border);
}
"@
Set-Content -Path (Join-Path $chromeDir "userChrome.css") -Value $userChromeCss -Encoding UTF8
Write-Host ">> [2/6] Injected userChrome.css theme engine" -ForegroundColor Green

# 3. Configure user.js (Hardened Privacy & Local Engine)
$userJs = @"
// Panadolce Browser Core Configuration (Zero Telemetry & Custom Stylesheets)
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref("browser.tabs.warnOnClose", false);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("datareporting.healthreport.uploadEnabled", false);
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("toolkit.telemetry.enabled", false);
user_pref("toolkit.telemetry.unified", false);
user_pref("toolkit.telemetry.archive.enabled", false);
user_pref("experiments.activeExperiment", false);
user_pref("experiments.supported", false);
user_pref("network.cookie.cookieBehavior", 1);
user_pref("privacy.donottrackheader.enabled", true);
user_pref("xpinstall.signatures.required", false);
user_pref("extensions.autoDisableScopes", 0);
user_pref("extensions.enabledScopes", 15);
"@
Set-Content -Path (Join-Path $profileDir "user.js") -Value $userJs -Encoding UTF8

# Enterprise policies.json
$policiesJson = @"
{
  "policies": {
    "DisableTelemetry": true,
    "DisableFirefoxStudies": true,
    "DisablePocket": true,
    "DisableFeedbackCommands": true,
    "DontCheckDefaultBrowser": true,
    "OverrideFirstRunPage": "",
    "OverridePostUpdatePage": ""
  }
}
"@
Set-Content -Path (Join-Path $distributionDir "policies.json") -Value $policiesJson -Encoding UTF8
Write-Host ">> [3/6] Configured user.js hardened privacy and distribution policies" -ForegroundColor Green

# 4. Stage Panadolce Extension into Profile Extensions
$extTargetDir = Join-Path $extensionsDir "panadolce-dev@thuantran520.local"
$firefoxStaging = Join-Path $distDir "load_unpacked_firefox"
if (-not (Test-Path $firefoxStaging)) {
    & (Join-Path $PSScriptRoot "sync_dist.ps1") -Firefox
}
Copy-Item -Path $firefoxStaging -Destination $extTargetDir -Recurse -Force
Write-Host ">> [4/6] Embedded Panadolce Native Workspace extension into profile" -ForegroundColor Green

# 5. Compile Native Panadolce.exe and Launchers
# Ensure icon.ico exists
$iconIco = Join-Path $rootDir "icon.ico"
if (-not (Test-Path $iconIco)) {
    Add-Type -AssemblyName System.Drawing
    $bmp = [System.Drawing.Bitmap]::FromFile((Join-Path $rootDir "icon128.png"))
    $iconHandle = $bmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($iconHandle)
    $fs = [System.IO.File]::Create($iconIco)
    $icon.Save($fs)
    $fs.Close()
    $bmp.Dispose()
}

$csSource = @'
using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;

class Program {
    [STAThread]
    static void Main(string[] args) {
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string exePath = Path.Combine(baseDir, "App\\Firefox64\\firefox.exe");
        string profilePath = Path.Combine(baseDir, "Data\\profile");

        if (!File.Exists(exePath)) {
            MessageBox.Show(
                "Không tìm thấy nhân trình duyệt Gecko tại:\n" + exePath + "\n\nVui lòng sao chép Firefox vào thư mục App\\Firefox64 hoặc chạy scripts/build_browser.ps1 -CopyGecko.",
                "Panadolce Browser",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning
            );
            return;
        }

        ProcessStartInfo psi = new ProcessStartInfo();
        psi.FileName = exePath;
        psi.Arguments = "-profile \"" + profilePath + "\" -no-remote";
        psi.WorkingDirectory = baseDir;
        psi.UseShellExecute = false;

        try {
            Process.Start(psi);
        } catch (Exception ex) {
            MessageBox.Show("Lỗi khởi chạy Panadolce Browser:\n" + ex.Message, "Panadolce Browser", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
'@

$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$launcherCs = Join-Path $browserDir "Launcher.cs"
$launcherExe = Join-Path $browserDir "Panadolce.exe"

Set-Content -Path $launcherCs -Value $csSource -Encoding UTF8
if (Test-Path $cscPath) {
    & $cscPath /nologo /target:winexe /win32icon:$iconIco /out:$launcherExe $launcherCs
    Remove-Item $launcherCs -Force
}

$batContent = @"
@echo off
title Panadolce Browser
cd /d "%~dp0"

set FIREFOX_EXE=App\Firefox64\firefox.exe
if not exist "%FIREFOX_EXE%" (
    echo [Panadolce Browser] Gecko runtime not found in App\Firefox64\
    echo Please ensure firefox.exe is present in App\Firefox64\
    echo Alternatively, run: pwsh scripts/build_browser.ps1 -CopyGecko
    pause
    exit /b 1
)

start "" "%FIREFOX_EXE%" -profile "%~dp0Data\profile" -no-remote
"@
Set-Content -Path (Join-Path $browserDir "Panadolce.bat") -Value $batContent -Encoding ASCII

$vbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
strCurDir = WshShell.CurrentDirectory
strExe = "App\Firefox64\firefox.exe"
Set fso = CreateObject("Scripting.FileSystemObject")

If Not fso.FileExists(strExe) Then
    MsgBox "Gecko runtime not found in App\Firefox64\" & vbCrLf & "Please copy Firefox into App\Firefox64\ directory.", vbExclamation, "Panadolce Browser"
Else
    WshShell.Run """" & strExe & """ -profile """ & strCurDir & "\Data\profile"" -no-remote", 0, False
End If
"@
Set-Content -Path (Join-Path $browserDir "Panadolce.vbs") -Value $vbsContent -Encoding ASCII

# Copy icon
$iconSvg = Join-Path $rootDir "icon.svg"
if (Test-Path $iconSvg) {
    Copy-Item $iconSvg (Join-Path $browserDir "Panadolce.svg") -Force
}

$readme = @"
# Panadolce Browser (Portable Edition)

Trình duyệt độc lập dựa trên nhân Mozilla Firefox Gecko.
- 100% Local-first, Zero Telemetry.
- Tích hợp sẵn máy phát đĩa than, khay đa tab Vinyl Shelf và Panadolce Workspace.
- Chạy trực tiếp từ thư mục hoặc USB, không lưu registry, chuyển máy giữ nguyên 100% dữ liệu.

## Cách chạy:
1. Đảm bảo thư mục App\Firefox64\ chứa file firefox.exe (hoặc build với cờ -CopyGecko).
2. Chạy `Panadolce.exe`, `Panadolce.bat` hoặc `Panadolce.vbs`.
"@
Set-Content -Path (Join-Path $browserDir "README.md") -Value $readme -Encoding UTF8

Write-Host ">> [5/6] Created Panadolce native executable & standalone launchers" -ForegroundColor Green

# Optional: Copy Gecko runtime
if ($CopyGecko) {
    $sysFirefox = "C:\Program Files\Mozilla Firefox"
    if (Test-Path $sysFirefox) {
        Write-Host ">> Copying Gecko runtime from $sysFirefox to $firefoxAppDir..." -ForegroundColor Yellow
        Copy-Item -Path "$sysFirefox\*" -Destination $firefoxAppDir -Recurse -Force
        # Ensure distribution folder remains with our custom policies
        New-Item -ItemType Directory -Path $distributionDir -Force | Out-Null
        Set-Content -Path (Join-Path $distributionDir "policies.json") -Value $policiesJson -Encoding UTF8
        Write-Host ">> [GECKO] Runtime copied successfully!" -ForegroundColor Green
    }
}

# 6. Create Zip Archive if not skipped
if (-not $SkipZip -and -not $CopyGecko) {
    $zipPath = Join-Path $distDir "Panadolce_Browser_Portable.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($browserDir, $zipPath)
    $zipSize = [math]::Round((Get-Item $zipPath).Length / 1024, 2)
    Write-Host ">> [6/6] [ZIP] Created dist\Panadolce_Browser_Portable.zip ($zipSize KB)" -ForegroundColor Green
} else {
    Write-Host ">> [6/6] Skipped zip packaging (runtime included or -SkipZip specified)" -ForegroundColor Gray
}

Write-Host ""
Write-Host ">> Panadolce Browser build completed successfully!" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
