@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can cai Node.js de choi LAN.
  pause
  exit /b 1
)
node "dev\server\lan-server.cjs"
pause
