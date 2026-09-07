@echo off
chcp 65001 >nul
echo.
echo =======================================================
echo   TIẾN HÀNH ĐÓNG GÓI CHO CHROME STORE & MOZILLA AMO...
echo =======================================================
echo.
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python "%~dp0build_packages.py"
    goto finish
)
where python3 >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python3 "%~dp0build_packages.py"
    goto finish
)

echo [INFO] Python không có sẵn, sử dụng PowerShell để đóng gói...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $dir = (Get-Item '%~dp0..').FullName; $dist = Join-Path $dir 'dist'; if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Path $dist | Out-Null }; $files = @('OS', 'icon16.png', 'icon48.png', 'icon128.png', 'icon.png'); Copy-Item (Join-Path $dir 'manifest_chrome.json') (Join-Path $dir 'manifest.json') -Force; $chromeZip = Join-Path $dist 'ScholarFlow_Chrome.zip'; if (Test-Path $chromeZip) { Remove-Item $chromeZip }; Compress-Archive -Path ($files | ForEach-Object { Join-Path $dir $_ }) + (Join-Path $dir 'manifest.json') -DestinationPath $chromeZip; Copy-Item (Join-Path $dir 'manifest_firefox.json') (Join-Path $dir 'manifest.json') -Force; $firefoxZip = Join-Path $dist 'ScholarFlow_Firefox.zip'; if (Test-Path $firefoxZip) { Remove-Item $firefoxZip }; Compress-Archive -Path ($files | ForEach-Object { Join-Path $dir $_ }) + (Join-Path $dir 'manifest.json') -DestinationPath $firefoxZip; Write-Host '✓ Đã đóng gói thành công vào thư mục dist!/' -ForegroundColor Green }"

:finish
echo.
echo Thư mục chứa gói: %~dp0..\dist\
echo Xem tài liệu HUONG_DAN_DANG_STORE.md để biết các bước tải lên.
echo.
pause
