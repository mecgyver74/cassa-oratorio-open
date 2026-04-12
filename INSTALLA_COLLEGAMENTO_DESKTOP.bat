@echo off
chcp 65001 >nul 2>&1
title Installa collegamento Desktop

echo.
echo  Creo collegamento sul Desktop...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; ^
   $shortcut = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Cassa Oratorio.lnk'); ^
   $shortcut.TargetPath = '%~dp0AVVIA_CASSA.bat'; ^
   $shortcut.WorkingDirectory = '%~dp0'; ^
   $shortcut.Description = 'Cassa Oratorio - Sistema di cassa open source'; ^
   $shortcut.IconLocation = '%SystemRoot%\System32\shell32.dll,44'; ^
   $shortcut.Save()"

if %errorlevel% equ 0 (
    echo  ? Collegamento creato sul Desktop!
) else (
    echo  Errore nella creazione del collegamento
)

echo.
pause
