@echo off
setlocal
cd /d "%~dp0"
echo WreckboxMP Zombie Menu Mod - uninstaller
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall_mod.ps1"
if errorlevel 1 (
  echo Uninstall failed. Read the error above.
  pause
  exit /b 1
)
pause
