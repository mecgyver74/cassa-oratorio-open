# CASSA DALILA - Launcher v1.5 (PocketBase v0.36+)
$ErrorActionPreference = "Continue"
$ProgressPreference    = "SilentlyContinue"
$VerbosePreference     = "Continue"

$ScriptPath = $MyInvocation.MyCommand.Path
$Root     = Split-Path -Parent $ScriptPath
$AppDir   = Join-Path $Root "app"
$PbExe    = Join-Path $AppDir "pocketbase.exe"
$PbData   = Join-Path $AppDir "pb_data"
$MigDir   = Join-Path $AppDir "pb_migrations"
$PbPublic = Join-Path $AppDir "pb_public"
$FrontDir = Join-Path $AppDir "frontend"
$LogFile  = Join-Path $Root "cassa.log"
$ConfigF  = Join-Path $Root "cassa.config.json"

$PB_VERSION = "0.36.7"
$PB_URL     = "https://github.com/pocketbase/pocketbase/releases/download/v$PB_VERSION/pocketbase_${PB_VERSION}_windows_amd64.zip"
$PB_PORT    = 8090

function Log($msg, $col = "Cyan") {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] $msg" -ForegroundColor $col
    Add-Content $LogFile "[$ts] $msg" -EA SilentlyContinue
}
function LogOK($msg)   { Log "OK $msg" "Green" }
function LogErr($msg)  { Log "ERRORE $msg" "Red" }
function LogWarn($msg) { Log "AVVISO $msg" "Yellow" }

function AggiornaCollegamentoDesktop {
    $icoSrc = Join-Path $AppDir "cassa.ico"
    if (-not (Test-Path $icoSrc)) { return }
    try {
        # Copia l'icona in una cartella locale (%LOCALAPPDATA%) per evitare
        # che Windows non riesca a caricarla quando Google Drive non è ancora montato.
        $localDir = Join-Path $env:LOCALAPPDATA "CassaDalila"
        New-Item -ItemType Directory -Path $localDir -Force | Out-Null
        $localIco = Join-Path $localDir "cassa.ico"
        Copy-Item $icoSrc $localIco -Force

        $desktop = [Environment]::GetFolderPath("Desktop")
        $lnkPath = Join-Path $desktop "Cassa Dalila.lnk"
        $wsh     = New-Object -ComObject WScript.Shell
        $lnk     = $wsh.CreateShortcut($lnkPath)
        $lnk.TargetPath       = "powershell.exe"
        $lnk.Arguments        = "-ExecutionPolicy Bypass -File `"$ScriptPath`""
        $lnk.WorkingDirectory = $Root
        $lnk.IconLocation     = "$localIco,0"
        $lnk.Description      = "Cassa Dalila"
        $lnk.WindowStyle      = 1
        $lnk.Save()
        LogOK "Collegamento desktop aggiornato con icona"
    } catch {
        LogWarn "Collegamento desktop non aggiornato: $_"
    }
}

function WaitPB($sec) {
    for ($i = 0; $i -lt ($sec * 2); $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$PB_PORT/api/health" `
                 -UseBasicParsing -TimeoutSec 2 -EA Stop
            if ($r.StatusCode -eq 200) { return $true }
        } catch { }
    }
    return $false
}

Clear-Host
Write-Host ""
Write-Host "  +=============================================+" -ForegroundColor Yellow
Write-Host "  |       CASSA DALILA  v1.0.0              |" -ForegroundColor Yellow
Write-Host "  +=============================================+" -ForegroundColor Yellow

# Mostra data e bundle dell'ultimo build frontend
$buildInfoFile = Join-Path $Root "_build_info.txt"
if (Test-Path $buildInfoFile) {
    try {
        $bi = Get-Content $buildInfoFile -Raw | ConvertFrom-Json
        Write-Host "  Build: $($bi.data)   Bundle: $($bi.bundle)" -ForegroundColor DarkGray
    } catch { }
}
Write-Host ""

# ── Lock file: impedisce doppio avvio ────────────────────────
$LockFile = Join-Path $Root "_cassa.lock"

function LeggiLock {
    if (Test-Path $LockFile) {
        try { return Get-Content $LockFile -Raw | ConvertFrom-Json } catch { }
    }
    return $null
}
function ScriviLock($ip) {
    [PSCustomObject]@{ hostname=$env:COMPUTERNAME; ip=$ip; port=$PB_PORT; avviato=(Get-Date -Format "dd/MM/yyyy HH:mm:ss") } |
        ConvertTo-Json | Set-Content $LockFile -Encoding UTF8
}
function EliminaLock { Remove-Item $LockFile -Force -EA SilentlyContinue }

$lock = LeggiLock
if ($lock) {
    $urlCheck = "http://$($lock.ip):$($lock.port)/api/health"
    $attivo = $false
    try {
        $r = Invoke-WebRequest -Uri $urlCheck -UseBasicParsing -TimeoutSec 3 -EA Stop
        if ($r.StatusCode -eq 200) { $attivo = $true }
    } catch { }

    if ($attivo) {
        Write-Host ""
        Write-Host "  +=============================================+" -ForegroundColor Red
        Write-Host "  |   CASSA GIA' IN ESECUZIONE!               |" -ForegroundColor Red
        Write-Host "  +=============================================+" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Server attivo su: $($lock.hostname)" -ForegroundColor Yellow
        Write-Host "  Avviato il:       $($lock.avviato)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Per usare la cassa apri il browser su:" -ForegroundColor White
        Write-Host "  --> http://$($lock.ip):$($lock.port)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  NON avviare un secondo server!" -ForegroundColor Red
        Write-Host "  (due istanze sullo stesso database causano corruzione dati)" -ForegroundColor DarkYellow
        Write-Host ""
        Read-Host "  Premi INVIO per uscire"
        exit 0
    } elseif ($lock.hostname -ne $env:COMPUTERNAME) {
        # Lock da altro PC: non rimuovere automaticamente, potrebbe essere un problema di rete/firewall
        Write-Host ""
        Write-Host "  +=============================================+" -ForegroundColor Red
        Write-Host "  |   CASSA BLOCCATA DA ALTRO PC!             |" -ForegroundColor Red
        Write-Host "  +=============================================+" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Il PC '$($lock.hostname)' ha avviato la cassa" -ForegroundColor Yellow
        Write-Host "  Avviato il: $($lock.avviato)" -ForegroundColor Yellow
        Write-Host "  IP registrato: $($lock.ip):$($lock.port)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Il server non risponde, ma potrebbe essere un problema di rete." -ForegroundColor DarkYellow
        Write-Host "  Assicurati che la cassa sia chiusa su '$($lock.hostname)'" -ForegroundColor White
        Write-Host "  prima di avviarla qui." -ForegroundColor White
        Write-Host ""
        Write-Host "  Se sei SICURO che la cassa e' spenta su quell'altro PC," -ForegroundColor White
        $risposta = Read-Host "  digita FORZA e premi INVIO (oppure solo INVIO per uscire)"
        if ($risposta.Trim().ToUpper() -ne "FORZA") { exit 0 }
        LogWarn "Avvio forzato dall'utente: lock di '$($lock.hostname)' rimosso"
        EliminaLock
    } else {
        LogWarn "Lock file obsoleto (crash locale su questo PC) - rimozione e riavvio"
        EliminaLock
    }
}

# ── Controllo percorso cloud ─────────────────────────────────
if ($Root -match "Google Drive|OneDrive|Dropbox|iCloud") {
    Write-Host "  ATTENZIONE: cartella su cloud storage!" -ForegroundColor Red
    Write-Host "  Copia la cartella in C:\CassaOratorio\ e riprova." -ForegroundColor Yellow
    Read-Host "  Premi INVIO per uscire"
    exit 1
}

# ── Crea cartelle ────────────────────────────────────────────
foreach ($d in @($AppDir, $PbData, $MigDir, $PbPublic, $FrontDir)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

# ── Collegamento desktop con icona ───────────────────────────
AggiornaCollegamentoDesktop

# ── Copia migrazioni (solo se sorgente diversa da destinazione) ──
$MigSrc = Join-Path $Root "app\pb_migrations"
if ((Test-Path $MigSrc) -and ($MigSrc -ne $MigDir)) {
    Get-ChildItem $MigSrc -Filter "*.js" | ForEach-Object {
        $dest = Join-Path $MigDir $_.Name
        if ($_.FullName -ne $dest) {
            Copy-Item $_.FullName $dest -Force
        }
    }
}

# ── FASE 1: Scarica PocketBase ───────────────────────────────
if (-not (Test-Path $PbExe)) {
    Log "Download PocketBase v$PB_VERSION..."
    $zip = Join-Path $env:TEMP "pb_$PID.zip"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $PB_URL -OutFile $zip -UseBasicParsing
        Expand-Archive -Path $zip -DestinationPath $AppDir -Force
        Remove-Item $zip -Force -EA SilentlyContinue
        LogOK "PocketBase v$PB_VERSION scaricato"
    } catch {
        LogErr "Download fallito: $_"
        Read-Host "  Premi INVIO per uscire"
        exit 1
    }
}

# ── FASE 2: Sblocca file da Windows SmartScreen ──────────────
# File sincronizzati da Google Drive vengono marcati come "da internet".
# Unblock-File rimuove il blocco su tutti gli script e l'eseguibile.
try {
    Get-ChildItem $Root -File | Where-Object { $_.Extension -in ".bat",".ps1",".exe",".js" } |
        ForEach-Object { Unblock-File $_.FullName -EA SilentlyContinue }
    Unblock-File -Path $PbExe -EA SilentlyContinue
    LogOK "File sbloccati (Zone.Identifier rimosso)"
} catch { }

# ── FASE 3: Primo avvio ──────────────────────────────────────
function GetConfig {
    if (Test-Path $ConfigF) {
        try { return Get-Content $ConfigF -Raw | ConvertFrom-Json } catch { }
    }
    return [PSCustomObject]@{ firstRun = $true; adminEmail = "" }
}
function SaveConfig($cfg) { $cfg | ConvertTo-Json | Set-Content $ConfigF -Encoding UTF8 }
$cfg = GetConfig

if ($cfg.firstRun -or -not $cfg.adminEmail) {
    Write-Host ""
    Write-Host "  +---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "  |  PRIMO AVVIO - Configurazione iniziale      |" -ForegroundColor Cyan
    Write-Host "  +---------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""

    # Se l'installer ha gia salvato le credenziali, usale senza chiedere
    if ($cfg.adminEmail -and $cfg.adminPasswordPlain) {
        $email = $cfg.adminEmail
        $plain  = $cfg.adminPasswordPlain
        Log "Uso credenziali dall'installer: $email"
    } else {
        Write-Host "  NOTA: Windows potrebbe mostrare un avviso di sicurezza" -ForegroundColor Yellow
        Write-Host "  su PocketBase. Clicca 'Esegui comunque'." -ForegroundColor Yellow
        Write-Host ""
        do { $email = Read-Host "  Email amministratore" } while ($email -notmatch "@")
        do {
            $secPwd = Read-Host "  Password (min 8 caratteri)" -AsSecureString
            $plain  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                      [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPwd))
        } while ($plain.Length -lt 8)
    }

Log "Avvio PocketBase (finestra visibile - accetta eventuali avvisi)..."

    # In PB v0.36 il superuser si crea con --automigrate
    $pbInit = Start-Process -FilePath $PbExe `
        -ArgumentList @("serve", "--http=0.0.0.0:$PB_PORT", "--dir=$PbData") `
        -WorkingDirectory $AppDir -PassThru -WindowStyle Normal

    Log "Attendo PocketBase (max 60 sec)..."
    if (-not (WaitPB 120)) {
        LogErr "PocketBase non risponde dopo 120 secondi."
        Write-Host ""
        Write-Host "  Cause probabili:" -ForegroundColor Yellow
        Write-Host "  1. Windows Defender ha bloccato pocketbase.exe" -ForegroundColor Yellow
        Write-Host "     -> Apri Windows Security, vai su Protezione virus," -ForegroundColor Yellow
        Write-Host "        cerca pocketbase nella cronologia e sblocca" -ForegroundColor Yellow
        Write-Host "  2. Un antivirus sta bloccando l'eseguibile" -ForegroundColor Yellow
        Write-Host "  3. La porta $PB_PORT e' gia' usata da altro programma" -ForegroundColor Yellow
        Write-Host ""
        Stop-Process -Id $pbInit.Id -Force -EA SilentlyContinue
        Read-Host "  Premi INVIO per uscire"
        exit 1
    }

    LogOK "PocketBase avviato - migrazioni applicate"

    # Crea superuser - se esiste già, aggiorna la password
    Log "Creo account amministratore..."
    $out = & $PbExe superuser create $email $plain 2>&1
    if ($out -match "already exists") {
        Log "Account esistente, aggiorno password..."
        $out2 = & $PbExe superuser update $email $plain 2>&1
        LogOK "Admin aggiornato: $email"
    } elseif ($LASTEXITCODE -eq 0) {
        LogOK "Admin creato: $email"
    } else {
        LogWarn "Risposta PocketBase: $out"
    }

    $cfg.firstRun = $false; $cfg.adminEmail = $email
    # Rimuovi la password in chiaro dal config dopo averla usata
    $cfg | Add-Member -NotePropertyName adminPasswordPlain -NotePropertyValue "" -Force
    SaveConfig $cfg
    Stop-Process -Id $pbInit.Id -Force -EA SilentlyContinue
    Start-Sleep -Seconds 2
    LogOK "Configurazione completata!"
    Write-Host ""
}

# ── FASE 4: Frontend ─────────────────────────────────────────
$indexHtml = Join-Path $PbPublic "index.html"
$frontDist = Join-Path $Root "frontend-dist"

# Usa frontend-dist solo se è più recente di pb_public
if ((Test-Path $frontDist) -and (Test-Path (Join-Path $frontDist "index.html"))) {
    $distTime   = (Get-Item (Join-Path $frontDist "index.html")).LastWriteTime
    $pubTime    = if (Test-Path $indexHtml) { (Get-Item $indexHtml).LastWriteTime } else { [DateTime]::MinValue }
    if ($distTime -gt $pubTime) {
        Copy-Item "$frontDist\*" $PbPublic -Recurse -Force -EA SilentlyContinue
        LogOK "Frontend aggiornato da frontend-dist"
    } else {
        LogOK "Frontend pb_public gia' aggiornato"
    }
} elseif (-not (Test-Path $indexHtml)) {
    # Pagina temporanea
    @"
<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>Cassa Dalila</title>
<style>body{font-family:sans-serif;background:#0d1117;color:#e6edf3;display:flex;
align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column}
h1{color:#f0a500}.box{background:#161b22;border:1px solid #2a3348;border-radius:12px;
padding:32px 40px;text-align:center;max-width:480px}
p{color:#8892b0;line-height:1.7}a{color:#f0a500;font-weight:bold}
.ok{color:#3fb950;font-size:48px;margin-bottom:8px}
</style></head><body><div class="box">
<div class="ok">✓</div>
<h1>Cassa Dalila</h1>
<p>Database attivo e pronto!<br><br>
Per l'interfaccia grafica completa,<br>installa
<a href="https://nodejs.org" target="_blank">Node.js</a>
ed esegui <b>BUILD_FRONTEND.bat</b><br><br>
Pannello admin database:<br>
<a href="http://127.0.0.1:$($PB_PORT)/_/" target="_blank">
  http://127.0.0.1:$($PB_PORT)/_/</a></p>
</div></body></html>
"@ | Set-Content $indexHtml -Encoding UTF8
    LogOK "Pagina temporanea creata"
}

# pb_public è già aggiornato sopra

# ── Rileva IP locale (serve per lock e per browser) ──────────
# Strategia: preferisce l'IP sulla stessa subnet del gateway predefinito,
# così se ci sono adattatori virtuali (VPN, VMware, VirtualBox, hotspot)
# viene scelto quello della rete LAN reale.
$localIP = $null
$allIpObjs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^127\.' }
$privateIPs = ($allIpObjs | Where-Object {
    $_.IPAddress -match '^192\.168\.' -or $_.IPAddress -match '^10\.' -or
    $_.IPAddress -match '^172\.(1[6-9]|2[0-9]|3[01])\.'
}).IPAddress

# Tenta di scegliere l'IP sulla stessa subnet del gateway
try {
    $gw = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' -EA Stop |
           Sort-Object RouteMetric | Select-Object -First 1).NextHop
    if ($gw) {
        $gwPrefix = ($gw -split '\.')[0..2] -join '.'
        $localIP = $privateIPs | Where-Object { $_.StartsWith($gwPrefix) } | Select-Object -First 1
    }
} catch { }

# Fallback: primo IP privato disponibile
if (-not $localIP -and $privateIPs) { $localIP = $privateIPs | Select-Object -First 1 }
if (-not $localIP -and $allIpObjs)  { $localIP = $allIpObjs[0].IPAddress }
if (-not $localIP) { $localIP = "127.0.0.1" }

# Mostra tutti gli IP per diagnosi (utile se il multicassa non funziona)
if ($privateIPs -and $privateIPs.Count -gt 1) {
    Log "IP disponibili: $($privateIPs -join ', ')  →  uso $localIP" "DarkGray"
}

# ── Firewall: apri porta per multicassa ─────────────────────
# Controlla ad ogni avvio, non solo al primo, perché la regola potrebbe
# non essere stata creata (script non admin) o essere stata rimossa.
try {
    $fwRule = Get-NetFirewallRule -DisplayName "Cassa Dalila" -EA SilentlyContinue
    if (-not $fwRule) {
        New-NetFirewallRule -DisplayName "Cassa Dalila" `
            -Direction Inbound -Protocol TCP -LocalPort $PB_PORT `
            -Action Allow -Profile Any -EA Stop | Out-Null
        LogOK "Regola firewall aggiunta (porta $PB_PORT aperta per multicassa)"
    } else {
        Log "Firewall OK (porta $PB_PORT gia' aperta)"
    }
} catch {
    LogWarn "Firewall: impossibile aprire porta $PB_PORT (richiede admin). Multicassa potrebbe non funzionare."
}

# ── FASE 5: Avvia PocketBase ─────────────────────────────────
# Termina eventuale istanza precedente rimasta attiva
Get-Process -Name "pocketbase" -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue
# Aspetta che la porta si liberi
$portaLibera = $false
for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Seconds 1
    $inUso = netstat -ano | Select-String ":$PB_PORT "
    if (-not $inUso) { $portaLibera = $true; break }
}
if (-not $portaLibera) {
    # Forza kill tramite netstat
    $procPid = (netstat -ano | Select-String ":$PB_PORT " | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
    if ($procPid -match '^\d+$') { Stop-Process -Id ([int]$procPid) -Force -EA SilentlyContinue }
    Start-Sleep -Seconds 2
}
Log "Avvio PocketBase..."
# Usa cmd /c per avviare in una nuova finestra - più compatibile tra versioni Windows
$pbCmd = "`"$PbExe`" serve --http=0.0.0.0:$PB_PORT --dir=`"$PbData`" > pb_log.txt 2>&1"
$pbProc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "title PocketBase Cassa && $pbCmd" `
    -WorkingDirectory $AppDir -PassThru

Log "Attendo PocketBase..."
if (-not (WaitPB 120)) {
    LogErr "PocketBase non risponde. Controlla Windows Defender."
    Stop-Process -Id $pbProc.Id -Force -EA SilentlyContinue
    Read-Host "Premi INVIO per uscire"
    exit 1
}
LogOK "Database attivo su http://127.0.0.1:$PB_PORT"

# Scrivi lock: da questo momento siamo il server ufficiale
ScriviLock $localIP
Log "Lock scritto: $localIP"

# ── FASE 6: Apri browser con IP di rete ─────────────────────
$browserUrl = "http://${localIP}:$PB_PORT"
$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($chrome) {
    Start-Process -FilePath $chrome -ArgumentList "--start-fullscreen", $browserUrl
    LogOK "Browser aperto in fullscreen: $browserUrl"
} else {
    Start-Process $browserUrl
    LogOK "Browser aperto: $browserUrl"
}

Write-Host ""
Write-Host "  +=============================================+" -ForegroundColor Green
Write-Host "  |  OK  CASSA DALILA e' in esecuzione!     |" -ForegroundColor Green
Write-Host "  |                                           |" -ForegroundColor Green
Write-Host "  |  Locale:  http://127.0.0.1:$PB_PORT          |" -ForegroundColor Green
Write-Host "  |  Rete:    http://${localIP}:$PB_PORT          |" -ForegroundColor Cyan
Write-Host "  |  NON chiudere questa finestra!            |" -ForegroundColor DarkGreen
Write-Host "  +=============================================+" -ForegroundColor Green
Write-Host ""
Write-Host "  Premi CTRL+C per spegnere la cassa" -ForegroundColor DarkYellow
Write-Host "  Oppure usa il pulsante Spegni nell'interfaccia" -ForegroundColor DarkYellow

# Avvia listener TCP per shutdown remoto (prova più porte perché Windows può escluderne alcune)
$shutdownPort = $null
$listener = $null
foreach ($port in @(8093, 8094, 8095, 8096, 8097)) {
    try {
        $tcpListener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
        $tcpListener.Start()
        $listener = $tcpListener
        $shutdownPort = $port
        Log "Listener avviato su localhost:$shutdownPort"
        break
    } catch { }
}
if (-not $listener) {
    LogWarn "Listener shutdown non disponibile (porte bloccate da Windows)"
}
try {
    while ($true) {
        # Controlla se arriva richiesta di shutdown
        if ($listener -and $listener.Server.IsBound) {
            try {
                if ($listener.Pending()) {
                    $client = $listener.AcceptTcpClient()
                    $stream = $client.GetStream()
                    $buf = New-Object byte[] 4096
                    if ($stream.DataAvailable) { $stream.Read($buf, 0, $buf.Length) | Out-Null }
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes("HTTP/1.1 200 OK`r`nContent-Length: 2`r`nAccess-Control-Allow-Origin: *`r`n`r`nOK")
                    $stream.Write($respBytes, 0, $respBytes.Length)
                    $client.Close()
                    Log "Shutdown richiesto dall'interfaccia"
                    break
                } else {
                    Start-Sleep -Milliseconds 100
                }
            } catch {
                Log "Errore listener: $_"
            }
        } else {
            Start-Sleep -Seconds 1
        }
        if ($pbProc.HasExited) {
            LogWarn "PocketBase fermato - riavvio..."
            $pbCmd2 = "`"$PbExe`" serve --http=0.0.0.0:$PB_PORT --dir=`"$PbData`""
            $pbProc = Start-Process -FilePath "cmd.exe" `
                -ArgumentList "/c", "title PocketBase Cassa && $pbCmd2" `
                -WorkingDirectory $AppDir -PassThru
        }
    }
} finally {
    Log "Chiusura in corso..."
    if ($listener) { try { $listener.Stop() } catch { }; $listener = $null }

    # Ferma PocketBase
    if ($pbProc) {
        Stop-Process -Id $pbProc.Id -Force -EA SilentlyContinue
    }
    Get-Process -Name "pocketbase" -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue
    Start-Sleep -Seconds 2

    # WAL checkpoint: unisce data.db-wal in data.db prima che Drive sincronizzi
    # Usa winsqlite3.dll integrata in Windows 10+ (zero download)
    # ROLLBACK: rimuovere il blocco try/catch sottostante
    try {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class WalCheckpoint {
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int sqlite3_open(string filename, out IntPtr db);
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int sqlite3_exec(IntPtr db, string sql, IntPtr cb, IntPtr arg, out IntPtr errmsg);
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int sqlite3_close(IntPtr db);
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern void sqlite3_free(IntPtr ptr);
}
'@ -EA Stop

        foreach ($dbFile in @("data.db", "auxiliary.db")) {
            $dbPath = Join-Path $PbData $dbFile
            $walPath = "$dbPath-wal"
            if ((Test-Path $dbPath) -and (Test-Path $walPath) -and (Get-Item $walPath).Length -gt 0) {
                $db = [IntPtr]::Zero
                $rc = [WalCheckpoint]::sqlite3_open($dbPath, [ref]$db)
                if ($rc -eq 0) {
                    $errmsg = [IntPtr]::Zero
                    [WalCheckpoint]::sqlite3_exec($db, "PRAGMA wal_checkpoint(TRUNCATE);", [IntPtr]::Zero, [IntPtr]::Zero, [ref]$errmsg) | Out-Null
                    if ($errmsg -ne [IntPtr]::Zero) { [WalCheckpoint]::sqlite3_free($errmsg) }
                    [WalCheckpoint]::sqlite3_close($db) | Out-Null
                    LogOK "WAL checkpoint: $dbFile pronto per sincronizzazione"
                }
            }
        }
    } catch {
        LogWarn "WAL checkpoint non disponibile ($($_.Exception.Message)) - Drive sincronizzera' anche il file .wal"
    }

    EliminaLock
    LogOK "Cassa spenta"
    Start-Sleep -Seconds 1
    Stop-Process -Id $PID -Force -EA SilentlyContinue
}

# Se arriviamo qui, c'è stato un errore
Write-Host "Errore durante l'esecuzione" -ForegroundColor Red
Write-Host "Premi invio per chiudere..." -ForegroundColor Yellow
Read-Host
