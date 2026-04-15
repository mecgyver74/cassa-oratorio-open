@echo off
chcp 65001 >nul 2>&1
title Cassa Oratorio - Installazione

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

if not exist "%PS%" (
    echo PowerShell non trovato.
    pause
    exit /b 1
)

"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALLA.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERRORE: l'installazione e' terminata con errori ^(codice: %ERRORLEVEL%^)
    echo  Riprova o contatta il supporto.
    echo.
    pause
)
