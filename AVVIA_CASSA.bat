@echo off
title Cassa Oratorio

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

if not exist "%PS%" (
    echo PowerShell non trovato.
    pause
    exit /b 1
)

echo Avvio Cassa Oratorio...

"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0CassaOratorio.ps1"

echo.
echo Cassa spenta.
exit
