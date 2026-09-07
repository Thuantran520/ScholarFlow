@echo off
chcp 65001 >nul
copy /y "%~dp0..\manifest_chrome.json" "%~dp0..\manifest.json" >nul
echo.
echo =======================================================
echo   ✓ ĐÃ CHUYỂN SANG MANIFEST V3 CHUẨN CHROMIUM (CHROME / EDGE / CỐC CỐC)!
echo   ✓ Bật Side Panel thanh bên Native 100%%.
echo =======================================================
echo.
pause
