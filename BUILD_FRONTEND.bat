@echo off
chcp 65001 >nul 2>&1
title Build Frontend - Cassa Oratorio

echo.
echo  ============================================
echo   Build Frontend - Cassa Oratorio
echo  ============================================
echo.

:: Cerca la cartella frontend
set "FRONTDIR="
if exist "%~dp0frontend\package.json" set "FRONTDIR=%~dp0frontend"
if exist "%~dp0frontend-src\package.json" set "FRONTDIR=%~dp0frontend-src"

if "%FRONTDIR%"=="" (
    echo  ERRORE: cartella frontend non trovata
    pause
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  Node.js non trovato!
    echo  Scarica da: https://nodejs.org
    pause
    exit /b 1
)

echo  Node.js trovato
echo.

:: ============================================================
:: Se siamo su chiavetta USB o percorso lento, installa
:: node_modules in una cartella temporanea sul PC locale
:: ============================================================
set "DRIVE=%~d0"
set "TMPDIR=%TEMP%\cassa_oratorio_build"

:: Controlla se il drive e' rimovibile (chiavetta)
set "IS_REMOVABLE=0"
for /f "tokens=2 delims==" %%i in ('wmic logicaldisk where "DeviceID='%DRIVE%'" get DriveType /value 2^>nul') do (
    if "%%i"=="2" set "IS_REMOVABLE=1"
)

if "%IS_REMOVABLE%"=="1" (
    echo  Rilevata chiavetta USB - installo dipendenze sul PC per velocita'
    echo  Cartella temporanea: %TMPDIR%
    echo.

    :: Copia i sorgenti nella cartella temp (senza node_modules)
    if exist "%TMPDIR%" rmdir /s /q "%TMPDIR%"
    mkdir "%TMPDIR%"
    xcopy /e /i /q /y "%FRONTDIR%\" "%TMPDIR%\" /exclude:%~dp0BUILD_EXCLUDE.txt >nul 2>&1
    :: Copia manuale escludendo node_modules e dist
    for /d %%d in ("%FRONTDIR%\*") do (
        if /i not "%%~nxd"=="node_modules" if /i not "%%~nxd"=="dist" (
            xcopy /e /i /q /y "%%d" "%TMPDIR%\%%~nxd\" >nul 2>&1
        )
    )
    for %%f in ("%FRONTDIR%\*.*") do (
        copy /y "%%f" "%TMPDIR%\" >nul 2>&1
    )

    set "BUILDDIR=%TMPDIR%"
) else (
    echo  Installazione da disco locale
    set "BUILDDIR=%FRONTDIR%"
)

cd /d "%BUILDDIR%"

echo  Installo dipendenze...
call npm install
if %errorlevel% neq 0 ( echo  Errore npm install && pause && exit /b 1 )

:: Imposta URL PocketBase
:: URL vuoto = usa automaticamente lo stesso host da cui si apre la pagina
echo VITE_PB_URL=> .env

echo.
echo  Compilo il frontend...
call npm run build
if %errorlevel% neq 0 ( echo  Errore build && pause && exit /b 1 )

:: Copia il risultato nella posizione corretta
echo.
echo  Copio nella cartella app...
if not exist "%~dp0app" mkdir "%~dp0app"
if not exist "%~dp0app\pb_public" mkdir "%~dp0app\pb_public"
xcopy /e /i /q /y "%BUILDDIR%\dist" "%~dp0app\pb_public\" >nul
echo  OK copiato in app\pb_public

if not exist "%~dp0frontend-dist" mkdir "%~dp0frontend-dist"
xcopy /e /i /q /y "%BUILDDIR%\dist" "%~dp0frontend-dist\" >nul

:: Pulizia cartella temp se usata
if "%IS_REMOVABLE%"=="1" (
    echo  Pulizia cartella temporanea...
    rmdir /s /q "%TMPDIR%" >nul 2>&1
)

echo.
echo  ============================================
echo   Build completato con successo!
echo   Avvia AVVIA_CASSA.bat per usare la cassa
echo  ============================================
echo.
pause
