@echo off
chcp 65001 >nul 2>&1
title Backup Cassa Dalila

echo.
echo  ================================================
echo   BACKUP DATI - Cassa Dalila
echo  ================================================
echo.

set BACKUP_DIR=%~dp0backup
set TIMESTAMP=%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%BACKUP_DIR%\backup_%TIMESTAMP%.zip

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo  Creo backup in: %BACKUP_FILE%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '%~dp0app\pb_data' -DestinationPath '%BACKUP_FILE%' -Force"

echo.
echo  Backup completato!
echo  I backup sono salvati in: %BACKUP_DIR%
echo.
pause
