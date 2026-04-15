@echo off
chcp 65001 >nul 2>&1
title Collegamento Desktop - Cassa Oratorio

echo.
echo  ================================================
echo   COLLEGAMENTO DESKTOP - Cassa Oratorio
echo  ================================================
echo.
echo  Creo collegamento sul Desktop...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $shortcut = $ws.CreateShortcut([IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Cassa Oratorio.lnk')); $shortcut.TargetPath = '%~dp0AVVIA_CASSA.bat'; $shortcut.WorkingDirectory = '%~dp0'; $shortcut.Description = 'Avvia Cassa Oratorio'; $shortcut.IconLocation = '%~dp0app\cassa.ico,0'; $shortcut.Save(); Write-Host '  Collegamento creato sul Desktop' -ForegroundColor Green"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo  Fatto! Trovi "Cassa Oratorio" sul Desktop.
) else (
    echo.
    echo  Errore nella creazione del collegamento
)
echo.
pause
