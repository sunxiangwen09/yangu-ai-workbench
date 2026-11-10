@echo off
setlocal DisableDelayedExpansion
chcp 65001 >nul
title Yangu AI - Codex setup
if not exist "%~dp0runtime\windows-x64\node.exe" (
  echo Extract the complete folder first.
  pause
  exit /b 1
)
"%~dp0runtime\windows-x64\node.exe" "%~dp0app\install-codex.mjs"
pause
