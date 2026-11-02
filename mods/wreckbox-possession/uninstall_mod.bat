@echo off
setlocal
cd /d "%~dp0"
echo WreckboxMP - Possession mod uninstaller
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall_mod.ps1"
if errorlevel 1 (
  echo Uninstallation failed. Read the error above.
  pause
  exit /b 1
)
pause
