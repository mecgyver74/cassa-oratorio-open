@echo off
chcp 65001 >nul 2>&1
title Prepara Chiavetta - Cassa Dalila

echo.
echo  ============================================
echo   PREPARA CHIAVETTA - Cassa Dalila
echo   Esegui questo script dal PC, non dalla
echo   chiavetta. Poi copia il risultato.
echo  ============================================
echo.

:: Verifica Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERRORE: Node.js non trovato!
    echo  Scarica da: https://nodejs.org
    pause & exit /b 1
)

:: Trova la cartella frontend accanto a questo script
set "ROOT=%~dp0"
set "FRONTDIR="
if exist "%ROOT%frontend-src\package.json" set "FRONTDIR=%ROOT%frontend-src"
if exist "%ROOT%frontend\package.json"     set "FRONTDIR=%ROOT%frontend"

if "%FRONTDIR%"=="" (
    echo  ERRORE: cartella frontend non trovata
    pause & exit /b 1
)

:: Cartella di lavoro SEMPRE sul disco C (locale, veloce)
set "WORKDIR=C:\Temp\CassaOratorio_Build"
if exist "%WORKDIR%" rmdir /s /q "%WORKDIR%"
mkdir "%WORKDIR%"

echo  Copio i sorgenti in %WORKDIR% ...
:: Copia tutto tranne node_modules e dist
robocopy "%FRONTDIR%" "%WORKDIR%" /e /xd node_modules dist /xf .env >nul 2>&1
echo  OK

echo.
echo  Installo dipendenze (sul PC locale)...
cd /d "%WORKDIR%"
call npm install --prefer-offline
if %errorlevel% neq 0 ( echo  ERRORE npm install && pause && exit /b 1 )

:: URL vuoto = usa automaticamente lo stesso host da cui si apre la pagina
echo VITE_PB_URL=> .env

echo.
echo  Compilo...
call npm run build
if %errorlevel% neq 0 ( echo  ERRORE build && pause && exit /b 1 )

:: Crea la cartella di output accanto allo script
set "OUTDIR=%ROOT%app\pb_public"
if not exist "%ROOT%app" mkdir "%ROOT%app"
if exist "%OUTDIR%" rmdir /s /q "%OUTDIR%"
mkdir "%OUTDIR%"

echo.
echo  Copio il risultato in app\pb_public ...
robocopy "%WORKDIR%\dist" "%OUTDIR%" /e /njh /njs >nul 2>&1
echo  OK

:: Pulizia
rmdir /s /q "%WORKDIR%"

echo.
echo  ============================================
echo   Fatto! Ora copia TUTTA la cartella
echo   "%ROOT%"
echo   sulla chiavetta USB.
echo.
echo   Sulla chiavetta usa solo AVVIA_CASSA.bat
echo   (Node.js non serve piu')
echo  ============================================
echo.
pause
