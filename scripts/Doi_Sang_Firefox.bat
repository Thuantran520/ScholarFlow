@echo off
copy /Y "%~dp0..\manifest_firefox.json" "%~dp0..\manifest.json" >nul
echo [OK] Da chuyen manifest sang chuan Mozilla Firefox!
echo Vao about:debugging#/runtime/this-firefox -> Reload extension hoac chon manifest.json.
pause
