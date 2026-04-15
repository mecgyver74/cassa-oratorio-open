@echo off
title Importa Dati - Cassa Dalila

echo.
echo  Importo famiglie, magazzini e prodotti in PocketBase...
echo  (AVVIA_CASSA.bat deve essere in esecuzione)
echo.

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0IMPORTA_DATI.ps1"

pause
