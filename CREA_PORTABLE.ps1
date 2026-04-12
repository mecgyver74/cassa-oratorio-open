# CREA_PORTABLE.ps1
# Crea un pacchetto ZIP completamente autonomo e portable
# Da eseguire DOPO aver compilato il frontend e configurato PocketBase

$ErrorActionPreference = "Continue"
$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir  = Join-Path $Root "app"
$PbExe   = Join-Path $AppDir "pocketbase.exe"
$PbData  = Join-Path $AppDir "pb_data"
$PbMig   = Join-Path $AppDir "pb_migrations"
$PbPub   = Join-Path $AppDir "pb_public"
$FrontDist = Join-Path $Root "frontend-dist"

Write-Host ""
Write-Host "  +=============================================+" -ForegroundColor Yellow
Write-Host "  |   CREA PACCHETTO PORTABLE                  |" -ForegroundColor Yellow
Write-Host "  +=============================================+" -ForegroundColor Yellow
Write-Host ""

# Verifiche preliminari
$ok = $true
if (-not (Test-Path $PbExe)) {
    Write-Host "  ERRORE: pocketbase.exe non trovato in app\" -ForegroundColor Red
    $ok = $false
}
if (-not (Test-Path $PbPub) -and -not (Test-Path $FrontDist)) {
    Write-Host "  ERRORE: frontend non compilato. Esegui prima BUILD_FRONTEND.bat" -ForegroundColor Red
    $ok = $false
}
if (-not $ok) { Read-Host "Premi INVIO per uscire"; exit 1 }

# Cartella di destinazione
$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$destDir   = Join-Path $Root "CassaOratorio_Portable_$timestamp"
$zipFile   = Join-Path $Root "CassaOratorio_Portable_$timestamp.zip"

Write-Host "  Creo pacchetto portable in:" -ForegroundColor Cyan
Write-Host "  $destDir" -ForegroundColor White
Write-Host ""

New-Item -ItemType Directory -Force -Path $destDir | Out-Null
$destApp = Join-Path $destDir "app"
New-Item -ItemType Directory -Force -Path $destApp | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $destApp "pb_data")       | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $destApp "pb_migrations") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $destApp "pb_public")     | Out-Null

# 1. Copia pocketbase.exe
Write-Host "  Copio pocketbase.exe..." -ForegroundColor Cyan
Copy-Item $PbExe (Join-Path $destApp "pocketbase.exe") -Force
Write-Host "  OK pocketbase.exe ($([math]::Round((Get-Item $PbExe).Length/1MB,1)) MB)" -ForegroundColor Green

# 2. Copia migrazioni
Write-Host "  Copio migrazioni database..." -ForegroundColor Cyan
if (Test-Path $PbMig) {
    Copy-Item "$PbMig\*" (Join-Path $destApp "pb_migrations") -Recurse -Force
}
Write-Host "  OK migrazioni" -ForegroundColor Green

# 3. Copia frontend compilato
Write-Host "  Copio frontend compilato..." -ForegroundColor Cyan
$frontSrc = if (Test-Path $PbPub) { $PbPub } else { $FrontDist }
Copy-Item "$frontSrc\*" (Join-Path $destApp "pb_public") -Recurse -Force
Write-Host "  OK frontend" -ForegroundColor Green

# 4. Crea AVVIA.bat ultra-semplice (niente PowerShell!)
Write-Host "  Creo launcher..." -ForegroundColor Cyan

# Il launcher usa direttamente pocketbase.exe senza PowerShell
$avvia = @'
@echo off
title Cassa Oratorio
cd /d "%~dp0app"

if not exist "pocketbase.exe" (
    echo ERRORE: pocketbase.exe non trovato.
    pause
    exit /b 1
)

echo Avvio Cassa Oratorio...
echo Non chiudere questa finestra!
echo.

:: Avvia pocketbase in background e apri il browser
start "" /B pocketbase.exe serve --http=127.0.0.1:8090

:: Aspetta 3 secondi poi apri il browser
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:8090"

echo Cassa avviata su http://127.0.0.1:8090
echo.
echo Premi CTRL+C o chiudi questa finestra per spegnere.
echo.

:: Mantieni attivo
:loop
timeout /t 10 /nobreak >nul
goto loop
'@
$avvia | Set-Content (Join-Path $destDir "AVVIA_CASSA.bat") -Encoding ASCII

# 5. Crea PRIMO_AVVIO.bat per configurare admin
$primo = @'
@echo off
title Cassa Oratorio - Primo avvio
cd /d "%~dp0app"

echo.
echo  ==========================================
echo    CASSA ORATORIO - Primo avvio
echo  ==========================================
echo.
echo  Questo script configura l account amministratore.
echo  Eseguilo solo la prima volta.
echo.

set /p EMAIL="  Email amministratore: "
set /p PWD="  Password (min 8 caratteri): "

echo.
echo  Avvio PocketBase e creo account...
start "" /B pocketbase.exe serve --http=127.0.0.1:8090
timeout /t 4 /nobreak >nul

pocketbase.exe superuser create %EMAIL% %PWD%

echo.
echo  OK! Account creato: %EMAIL%
echo.
echo  Ora puoi usare AVVIA_CASSA.bat per avviare la cassa.
echo  Accedi all admin con: http://127.0.0.1:8090/_/
echo.

:: Ferma PocketBase
taskkill /f /im pocketbase.exe >nul 2>&1

pause
'@
$primo | Set-Content (Join-Path $destDir "PRIMO_AVVIO.bat") -Encoding ASCII

# 6. Crea BACKUP.bat
$backup = @'
@echo off
title Backup Cassa Oratorio
set DEST=%~dp0backup_%date:~6,4%%date:~3,2%%date:~0,2%.zip
echo Backup in corso: %DEST%
powershell -NoProfile -Command "Compress-Archive -Path '%~dp0app\pb_data' -DestinationPath '%DEST%' -Force"
echo Backup completato!
pause
'@
$backup | Set-Content (Join-Path $destDir "BACKUP.bat") -Encoding ASCII

# 7. README
$readme = @"
CASSA ORATORIO - Versione Portable
===================================

PRIMO UTILIZZO (solo la prima volta):
1. Doppio click su PRIMO_AVVIO.bat
2. Inserisci email e password per l'account admin
3. Chiudi la finestra quando termina

USO QUOTIDIANO:
- Doppio click su AVVIA_CASSA.bat
- Il browser si apre automaticamente su http://127.0.0.1:8090
- Non chiudere la finestra nera finche' la cassa e' in uso

BACKUP:
- Doppio click su BACKUP.bat per salvare i dati

MULTI-CASSA (altri PC in rete):
- Avvia su questo PC con AVVIA_CASSA.bat
- Dagli altri PC apri il browser su http://[IP-QUESTO-PC]:8090
- Trova l'IP con: Start > cmd > ipconfig

CONTENUTO CARTELLA:
- app\pocketbase.exe  : il motore del database
- app\pb_data\        : i dati (NON cancellare!)
- app\pb_public\      : l'interfaccia grafica
- app\pb_migrations\  : struttura database

REQUISITI: Windows 10/11 (niente da installare!)
"@
$readme | Set-Content (Join-Path $destDir "LEGGIMI.txt") -Encoding UTF8

Write-Host "  OK launcher e documentazione" -ForegroundColor Green

# 8. Crea ZIP
Write-Host ""
Write-Host "  Creo archivio ZIP..." -ForegroundColor Cyan
Compress-Archive -Path "$destDir\*" -DestinationPath $zipFile -Force
$sizeMB = [math]::Round((Get-Item $zipFile).Length/1MB, 1)
Write-Host "  OK ZIP creato: $sizeMB MB" -ForegroundColor Green
Write-Host ""

# Apri cartella
Start-Process "explorer.exe" $Root

Write-Host "  +=============================================+" -ForegroundColor Green
Write-Host "  |  OK  Pacchetto portable creato!            |" -ForegroundColor Green
Write-Host "  |                                           |" -ForegroundColor Green
Write-Host "  |  File: CassaOratorio_Portable_$timestamp.zip  |" -ForegroundColor Green  
Write-Host "  |  Dimensione: $sizeMB MB                        |" -ForegroundColor Green
Write-Host "  |                                           |" -ForegroundColor Green
Write-Host "  |  Distribuisci questo ZIP su altri PC.     |" -ForegroundColor Green
Write-Host "  |  Basta estrarre e fare doppio click       |" -ForegroundColor Green
Write-Host "  |  su PRIMO_AVVIO.bat (prima volta)         |" -ForegroundColor Green
Write-Host "  |  poi AVVIA_CASSA.bat ogni giorno.         |" -ForegroundColor Green
Write-Host "  +=============================================+" -ForegroundColor Green
Write-Host ""
Read-Host "  Premi INVIO per chiudere"
