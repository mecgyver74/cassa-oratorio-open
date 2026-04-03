@echo off
title Test PocketBase diretto

echo.
echo  === TEST POCKETBASE DIRETTO ===
echo.
echo  Avvio pocketbase.exe nella finestra del prompt.
echo  Vedrai direttamente gli errori se ci sono.
echo.
echo  Per uscire premi CTRL+C
echo.

cd /d "%~dp0app"

if not exist "pocketbase.exe" (
    echo  ERRORE: pocketbase.exe non trovato in %~dp0app
    pause
    exit /b 1
)

echo  Avvio: pocketbase.exe serve --http=127.0.0.1:8090
echo  ------------------------------------------------
pocketbase.exe serve --http=127.0.0.1:8090

echo  ------------------------------------------------
echo  PocketBase si e' fermato.
pause
