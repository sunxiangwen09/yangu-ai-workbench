@echo off
setlocal DisableDelayedExpansion
set "PATH=%~dp0runtime\windows-x64;%PATH%"
cd /d "%~dp0app"
echo Yangu AI development shell. Portable Node and npm are on PATH.
echo Main app: node server.mjs
echo Tests: node --test test/server.test.mjs
echo Original hosted project source is in ..\source\web-v1 (requires its own dependencies and cloud setup).
cmd /k
