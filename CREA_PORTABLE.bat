@echo off
title Crea Pacchetto Portable
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
echo Creo pacchetto portable...
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0CREA_PORTABLE.ps1"
