@echo off
chcp 65001 >nul 2>&1
title Spegni Cassa Oratorio

echo.
echo  Spegnimento Cassa Oratorio in corso...
echo.

taskkill /F /IM pocketbase.exe >nul 2>&1
if %errorlevel% == 0 (
    echo  Cassa spenta correttamente.
) else (
    echo  La cassa non era in esecuzione.
)

echo.
pause
