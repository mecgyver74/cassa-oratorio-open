@echo off
title Cassa Dalila

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

if not exist "%PS%" (
    echo PowerShell non trovato.
    pause
    exit /b 1
)

:: Rimuovi il blocco "file da internet" da tutti gli script nella cartella.
:: Necessario la prima volta su ogni PC dopo la sincronizzazione da Google Drive.
:: Dal secondo avvio in poi questo comando non ha effetto (file gia' sbloccati).
"%PS%" -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-ChildItem '%~dp0' -File | Where-Object { $_.Extension -in '.bat','.ps1','.exe','.js' } | Unblock-File -EA SilentlyContinue" >nul 2>&1

echo Avvio Cassa Dalila...

"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0CassaOratorio.ps1"

echo.
echo Cassa spenta.
pause
exit
