@echo off
setlocal DisableDelayedExpansion
chcp 65001 >nul
title Yangu AI Workbench
if not exist "%~dp0runtime\windows-x64\node.exe" (
  echo Runtime not found. Extract the complete folder first.
  pause
  exit /b 1
)
if not exist "%~dp0app\server.mjs" (
  echo App source not found. Extract the complete folder first.
  pause
  exit /b 1
)
"%~dp0runtime\windows-x64\node.exe" "%~dp0app\server.mjs"
if errorlevel 1 pause
