@echo off
setlocal DisableDelayedExpansion
chcp 65001 >nul
title Yangu AI - Local check
if not exist "%~dp0runtime\windows-x64\node.exe" (
  echo Extract the complete folder before running this check.
  pause
  exit /b 1
)
"%~dp0runtime\windows-x64\node.exe" "%~dp0app\self-check.mjs"
pause
