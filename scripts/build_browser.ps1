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

# 1. Clean & create directory structure (preserve Gecko runtime if present)
if (-not (Test-Path $browserDir)) {
    New-Item -ItemType Directory -Path $browserDir -Force | Out-Null
}
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
  --panadolce-surface: #0f172a;
  --panadolce-accent: #38bdf8;
  --panadolce-accent-glow: rgba(56, 189, 248, 0.4);
  --panadolce-border: rgba(255, 255, 255, 0.08);
  --panadolce-border-cyan: rgba(56, 189, 248, 0.35);
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

/* ==========================================================================
   1. Mini Spinning Vinyl Disc Keyframes
   ========================================================================== */
@keyframes panadolce-vinyl-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* ==========================================================================
   2. Dedicated "Panadolce AI" Button on Tab Bar (#TabsToolbar)
   ========================================================================== */
toolbarbutton#panadolce-dev_thuantran520_local-browser-action,
toolbarbutton[id*="panadolce-dev_thuantran520_local"] {
  appearance: none !important;
  display: inline-flex !important;
  align-items: center !important;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%) !important;
  border: 1px solid var(--panadolce-border-cyan) !important;
  border-radius: 20px !important;
  padding: 3px 12px 3px 8px !important;
  margin: 3px 6px !important;
  cursor: pointer !important;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.2), inset 0 0 6px rgba(56, 189, 248, 0.1) !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

toolbarbutton#panadolce-dev_thuantran520_local-browser-action:hover,
toolbarbutton[id*="panadolce-dev_thuantran520_local"]:hover {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(99, 102, 241, 0.3) 100%) !important;
  border-color: var(--panadolce-accent) !important;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.5), inset 0 0 8px rgba(56, 189, 248, 0.2) !important;
  transform: translateY(-1px) scale(1.02) !important;
}

/* Mini Vinyl Disc icon inside Panadolce AI button */
toolbarbutton#panadolce-dev_thuantran520_local-browser-action .toolbarbutton-icon,
toolbarbutton[id*="panadolce-dev_thuantran520_local"] .toolbarbutton-icon {
  width: 20px !important;
  height: 20px !important;
  min-width: 20px !important;
  min-height: 20px !important;
  border-radius: 50% !important;
  background: radial-gradient(circle at center,
    #0b0f19 0px, #0b0f19 2px,
    #38bdf8 2px, #0284c7 4px,
    #0b0f19 4.5px, #1e293b 5.5px,
    #0b0f19 6px, #334155 7px,
    #0b0f19 7.5px, #475569 8.5px,
    #0b0f19 9px, #38bdf8 9.5px,
    #0f172a 10px
  ) !important;
  box-shadow: 0 0 0 1.5px rgba(56, 189, 248, 0.7), 0 0 10px rgba(56, 189, 248, 0.45) !important;
  animation: panadolce-vinyl-spin 3s linear infinite !important;
  list-style-image: none !important;
  object-fit: contain !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}

toolbarbutton#panadolce-dev_thuantran520_local-browser-action:hover .toolbarbutton-icon,
toolbarbutton[id*="panadolce-dev_thuantran520_local"]:hover .toolbarbutton-icon {
  animation-duration: 1.2s !important;
  box-shadow: 0 0 0 2px #38bdf8, 0 0 16px rgba(56, 189, 248, 0.8) !important;
}

/* Label text inside Panadolce button */
toolbarbutton#panadolce-dev_thuantran520_local-browser-action::after,
toolbarbutton[id*="panadolce-dev_thuantran520_local"]::after {
  content: "✨ Panadolce AI" !important;
  display: inline-block !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  font-size: 11.5px !important;
  font-weight: 700 !important;
  letter-spacing: 0.3px !important;
  color: var(--panadolce-accent) !important;
  text-shadow: 0 0 8px rgba(56, 189, 248, 0.6) !important;
  margin-left: 6px !important;
  margin-right: 2px !important;
  pointer-events: none !important;
  white-space: nowrap !important;
}

/* ==========================================================================
   3. Fallback Mini Spinning Vinyl Disc on Tab Bar (#tabs-newtab-button)
   ========================================================================== */
#TabsToolbar #tabs-newtab-button::after {
  content: "" !important;
  display: inline-flex !important;
  align-self: center !important;
  width: 20px !important;
  height: 20px !important;
  min-width: 20px !important;
  min-height: 20px !important;
  margin-left: 6px !important;
  margin-right: 4px !important;
  border-radius: 50% !important;
  background: radial-gradient(circle at center,
    #0b0f19 0px, #0b0f19 2px,
    #38bdf8 2px, #0284c7 4px,
    #0b0f19 4.5px, #1e293b 5.5px,
    #0b0f19 6px, #334155 7px,
    #0b0f19 7.5px, #475569 8.5px,
    #0b0f19 9px, #38bdf8 9.5px,
    #0f172a 10px
  ) !important;
  box-shadow: 0 0 0 1.5px rgba(56, 189, 248, 0.7), 0 0 10px rgba(56, 189, 248, 0.4) !important;
  animation: panadolce-vinyl-spin 3s linear infinite !important;
  cursor: pointer !important;
}

#TabsToolbar:has(#panadolce-dev_thuantran520_local-browser-action) #tabs-newtab-button::after {
  display: none !important;
}

/* ==========================================================================
   4. Mini Spinning Vinyl Disc on Audio/Video-Playing Tabs
   ========================================================================== */
/* Transform tab audio overlay icon into spinning vinyl record */
.tabbrowser-tab[soundplaying] .tab-icon-overlay,
.tab-icon-overlay[soundplaying] {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  width: 18px !important;
  height: 18px !important;
  min-width: 18px !important;
  min-height: 18px !important;
  border-radius: 50% !important;
  list-style-image: none !important;
  -moz-context-properties: none !important;
  fill: transparent !important;
  stroke: transparent !important;
  mask: none !important;
  -webkit-mask: none !important;
  background: radial-gradient(circle at center,
    #0b0f19 0px, #0b0f19 2px,
    #38bdf8 2px, #0284c7 4px,
    #0b0f19 4.5px, #1e293b 5.5px,
    #0b0f19 6px, #334155 7px,
    #0b0f19 7.5px, #475569 8.5px,
    #0b0f19 9px, #38bdf8 9.5px,
    #0f172a 10px
  ) !important;
  box-shadow: 0 0 0 1.5px rgba(56, 189, 248, 0.7), 0 0 8px rgba(56, 189, 248, 0.6) !important;
  animation: panadolce-vinyl-spin 2s linear infinite !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}

/* Hover on sound-playing tab vinyl disc */
.tabbrowser-tab[soundplaying] .tab-icon-overlay:hover,
.tab-icon-overlay[soundplaying]:hover {
  animation-duration: 1s !important;
  box-shadow: 0 0 0 2px #38bdf8, 0 0 14px rgba(56, 189, 248, 0.85) !important;
}

/* Also add a mini vinyl record badge right next to the tab title */
.tabbrowser-tab[soundplaying] .tab-label-container::after {
  content: "" !important;
  display: inline-block !important;
  width: 14px !important;
  height: 14px !important;
  min-width: 14px !important;
  min-height: 14px !important;
  margin-left: 6px !important;
  vertical-align: middle !important;
  border-radius: 50% !important;
  background: radial-gradient(circle at center,
    #0b0f19 0px, #0b0f19 1.5px,
    #38bdf8 1.5px, #0284c7 3px,
    #0b0f19 3.5px, #1e293b 4.5px,
    #0b0f19 5px, #38bdf8 6px,
    #0f172a 7px
  ) !important;
  box-shadow: 0 0 0 1px #38bdf8, 0 0 6px rgba(56, 189, 248, 0.7) !important;
  animation: panadolce-vinyl-spin 1.8s linear infinite !important;
}

/* Muted tab: pause spin and amber-red hue */
.tabbrowser-tab[muted] .tab-icon-overlay,
.tab-icon-overlay[muted],
.tabbrowser-tab[muted] .tab-label-container::after {
  animation: none !important;
  opacity: 0.6 !important;
  background: radial-gradient(circle at center,
    #0b0f19 0px, #0b0f19 2px,
    #ef4444 2px, #dc2626 4px,
    #0b0f19 4.5px, #334155 7px,
    #0f172a 10px
  ) !important;
  box-shadow: 0 0 0 1px #ef4444, 0 0 6px rgba(239, 68, 68, 0.5) !important;
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
Write-Host ">> [2/6] Injected userChrome.css theme engine with Panadolce AI button and spinning vinyl disc" -ForegroundColor Green

# 3. Configure user.js (Hardened Privacy, Toolbar Placement, & Local Engine)
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
user_pref("browser.uiCustomization.state", "{\"placements\":{\"widget-overflow-fixed-list\":[],\"unified-extensions-area\":[],\"nav-bar\":[\"sidebar-button\",\"back-button\",\"forward-button\",\"stop-reload-button\",\"customizableui-special-spring1\",\"urlbar-container\",\"customizableui-special-spring2\",\"downloads-button\",\"unified-extensions-button\"],\"toolbar-menubar\":[\"menubar-items\"],\"TabsToolbar\":[\"tabbrowser-tabs\",\"new-tab-button\",\"panadolce-dev_thuantran520_local-browser-action\",\"alltabs-button\"],\"vertical-tabs\":[],\"PersonalToolbar\":[\"import-button\",\"personal-bookmarks\"]},\"seen\":[\"panadolce-dev_thuantran520_local-browser-action\"],\"dirtyAreaCache\":[\"nav-bar\",\"TabsToolbar\",\"vertical-tabs\",\"PersonalToolbar\",\"unified-extensions-area\",\"toolbar-menubar\"],\"currentVersion\":26,\"newElementCount\":0}");
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
        psi.Arguments = "-new-instance -profile \"" + profilePath + "\" -no-remote";
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

start "" "%FIREFOX_EXE%" -new-instance -profile "%~dp0Data\profile" -no-remote
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
    WshShell.Run """" & strExe & """ -new-instance -profile """ & strCurDir & "\Data\profile"" -no-remote", 0, False
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

# Ensure Gecko runtime is present (auto-deploy from local system if missing or if -CopyGecko specified)
$firefoxExe = Join-Path $firefoxAppDir "firefox.exe"
if (-not (Test-Path $firefoxExe) -or $CopyGecko) {
    $sysFirefox = "C:\Program Files\Mozilla Firefox"
    if (Test-Path $sysFirefox) {
        Write-Host ">> Deploying Gecko runtime from $sysFirefox to $firefoxAppDir..." -ForegroundColor Yellow
        Copy-Item -Path "$sysFirefox\*" -Destination $firefoxAppDir -Recurse -Force
        # Ensure distribution folder remains with our custom policies
        New-Item -ItemType Directory -Path $distributionDir -Force | Out-Null
        Set-Content -Path (Join-Path $distributionDir "policies.json") -Value $policiesJson -Encoding UTF8
        Write-Host ">> [GECKO] Runtime deployed successfully!" -ForegroundColor Green
    } else {
        Write-Warning "System Firefox not found at $sysFirefox. Please place Gecko binaries in $firefoxAppDir"
    }
}

# Create/Update Desktop Shortcut
$desktopDir = [Environment]::GetFolderPath("Desktop")
if (Test-Path $desktopDir) {
    try {
        $shortcutPath = Join-Path $desktopDir "Panadolce Browser.lnk"
        $wshShell = New-Object -ComObject WScript.Shell
        $shortcut = $wshShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $launcherExe
        $shortcut.WorkingDirectory = $browserDir
        $shortcut.IconLocation = "$iconIco,0"
        $shortcut.Description = "Panadolce Browser - Trợ Lý Học Thuật & Đa Nhiệm"
        $shortcut.Save()
        Write-Host ">> [DESKTOP] Updated shortcut: $shortcutPath" -ForegroundColor Green
    } catch {
        Write-Warning "Could not update desktop shortcut: $_"
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
