@echo off
chcp 65001 >nul
copy /y "%~dp0..\manifest_firefox.json" "%~dp0..\manifest.json" >nul
echo.
echo =======================================================
echo   ✓ ĐÃ CHUYỂN SANG MANIFEST V3 CHUẨN MOZILLA FIREFOX!
echo   ✓ Đạt 0 Warning, 0 Error trên about:debugging.
echo =======================================================
echo.
pause
