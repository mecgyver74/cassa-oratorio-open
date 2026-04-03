@echo off
title Cassa Oratorio - Diagnostica

echo.
echo  === DIAGNOSTICA CASSA ORATORIO ===
echo.
echo  Questo strumento identifica il problema.
echo  La finestra resta aperta finche' non premi INVIO.
echo.

:: Mostra info sistema
echo  Sistema: %OS%
echo  Windows: %SystemRoot%
echo.

:: Cerca PowerShell
echo  Cerco PowerShell...
set "PS="

if exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
    set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
    echo  TROVATO: %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe
) else (
    echo  NON TROVATO in System32
)

if exist "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" (
    echo  TROVATO in C:\Windows\System32
    if not defined PS set "PS=C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
)

if not defined PS (
    echo.
    echo  ERRORE CRITICO: PowerShell non trovato!
    echo  Installa PowerShell da: https://aka.ms/powershell
    echo.
    pause
    exit /b 1
)

echo.
echo  Verifico versione PowerShell...
"%PS%" -NoProfile -Command "Write-Host ('PS Version: ' + $PSVersionTable.PSVersion.ToString())"
echo.

echo  Verifico ExecutionPolicy...
"%PS%" -NoProfile -Command "Write-Host ('Policy: ' + (Get-ExecutionPolicy))"
echo.

echo  Verifico cartella corrente...
echo  BAT si trova in: %~dp0
echo.

echo  Provo ad avviare lo script principale...
echo  ----------------------------------------
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0CassaOratorio.ps1"
set EXITCODE=%errorlevel%
echo  ----------------------------------------
echo.
echo  Script terminato con codice: %EXITCODE%
echo.
if %EXITCODE% neq 0 (
    echo  ATTENZIONE: Lo script ha restituito un errore.
    echo  Leggi i messaggi sopra per capire il problema.
)

echo.
pause
