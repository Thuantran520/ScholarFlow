@echo off
copy /Y "%~dp0..\manifest_chrome.json" "%~dp0..\manifest.json" >nul
echo [OK] Da chuyen manifest sang chuan Google Chrome / Edge / Brave / Coc Coc!
echo Vao chrome://extensions hoac edge://extensions de Reload hoac cai dat.
pause
