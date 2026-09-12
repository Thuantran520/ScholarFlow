@echo off
chcp 65001 >nul
echo.
echo =======================================================
echo   TIẾN HÀNH ĐÓNG GÓI CHO CHROME STORE & MOZILLA AMO...
echo =======================================================
echo.

where pwsh >nul 2>nul
if %ERRORLEVEL% equ 0 (
    pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0package.ps1"
    goto finish
)

where powershell >nul 2>nul
if %ERRORLEVEL% equ 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0package.ps1"
    goto finish
)

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

:finish
echo.
echo Thư mục chứa gói: %~dp0..\dist\
echo Xem tài liệu HUONG_DAN_DANG_STORE.md để biết các bước tải lên.
echo.
pause

