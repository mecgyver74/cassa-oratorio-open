@echo off
title Configura Accesso
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0CONFIGURA_ACCESSO.ps1"
pause
