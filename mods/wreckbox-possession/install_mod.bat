@echo off
setlocal
cd /d "%~dp0"
echo WreckboxMP - Vselenие mod installer
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_mod.ps1"
if errorlevel 1 (
  echo Installation failed. Read the error above.
  pause
  exit /b 1
)
echo Installation finished. Restart WreckboxMP to load the mod.
pause
