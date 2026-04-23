# CASSA DALILA - Launcher v1.5 (PocketBase v0.36+)
$ErrorActionPreference = "Continue"
$ProgressPreference    = "SilentlyContinue"
$VerbosePreference     = "Continue"

$Root     = Split-Path -Parent $MyInvocation.MyCommand.Path
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

# ── FASE 2: Sblocca exe da Windows SmartScreen ───────────────
# File scaricati da internet sono "bloccati" da Windows - questo li sblocca
try {
    Unblock-File -Path $PbExe -EA SilentlyContinue
    LogOK "pocketbase.exe sbloccato"
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

    # Apri porta firewall per accesso da rete locale (silenzioso, richiede admin)
try {
    $fwRule = Get-NetFirewallRule -DisplayName "Cassa Dalila" -ErrorAction SilentlyContinue
    if (-not $fwRule) {
        New-NetFirewallRule -DisplayName "Cassa Dalila" `
            -Direction Inbound -Protocol TCP -LocalPort $PB_PORT `
            -Action Allow -Profile Any -ErrorAction Stop | Out-Null
        Log "Regola firewall aggiunta (porta $PB_PORT aperta per rete locale)" "Green"
    }
} catch {
    LogWarn "Impossibile aggiungere regola firewall (esegui come amministratore per accesso da rete)"
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
$localIP = $null
$ips = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^127\.' }).IPAddress
foreach ($ip in $ips) {
    if ($ip -match '^192\.168\.' -or $ip -match '^10\.' -or $ip -match '^172\.(1[6-9]|2[0-9]|3[01])\.') {
        $localIP = $ip; break
    }
}
if (-not $localIP -and $ips) { $localIP = $ips | Select-Object -First 1 }
if (-not $localIP) { $localIP = "127.0.0.1" }

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
Start-Process $browserUrl
LogOK "Browser aperto: $browserUrl"

Write-Host ""
Write-Host "  +=============================================+" -ForegroundColor Green
Write-Host "  |  OK  CASSA DALILA e' in esecuzione!     |" -ForegroundColor Green
Write-Host "  |                                           |" -ForegroundColor Green
Write-Host "  |  Apri: http://127.0.0.1:$PB_PORT              |" -ForegroundColor Green
Write-Host "  |  NON chiudere questa finestra!            |" -ForegroundColor DarkGreen
Write-Host "  +=============================================+" -ForegroundColor Green
Write-Host ""
Write-Host "  Premi CTRL+C per spegnere la cassa" -ForegroundColor DarkYellow
Write-Host "  Oppure usa il pulsante Spegni nell'interfaccia" -ForegroundColor DarkYellow

# Avvia listener HTTP per shutdown remoto sulla porta 8091
$shutdownPort = 8091
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$shutdownPort/shutdown/")
try { 
    $listener.Start() 
    Log "Listener avviato su localhost:$shutdownPort"
} catch { 
    $listener = $null 
    Log "Errore avvio listener: $_"
}
$lastRequest = [DateTime]::Now
try {
    while ($true) {
        # Controlla se arriva richiesta di shutdown
        if ($listener -and $listener.IsListening) {
            $ctx = $null
            try {
                $async = $listener.BeginGetContext($null, $null)
                if ($async.AsyncWaitHandle.WaitOne(100)) {
                    $ctx = $listener.EndGetContext($async)
                    Log "Richiesta ricevuta: $($ctx.Request.HttpMethod) $($ctx.Request.Url)"
                    $resp = $ctx.Response
                    $body = [System.Text.Encoding]::UTF8.GetBytes("OK")
                    $resp.ContentLength64 = $body.Length
                    $resp.OutputStream.Write($body, 0, $body.Length)
                    $resp.Close()
                    Log "Shutdown richiesto dall'interfaccia"
                    break
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
    Log "Chiusura..."
    EliminaLock
    if ($listener) { try { $listener.Stop() } catch { } }
    # Chiudi PocketBase e la finestra cmd che lo contiene
    if ($pbProc) {
        Stop-Process -Id $pbProc.Id -Force -EA SilentlyContinue
    }
    Get-Process -Name "pocketbase" -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue
    if ($pbProc) {
        $pbProc.CloseMainWindow() | Out-Null
        Start-Sleep -Milliseconds 500
    }
    LogOK "Cassa spenta"
    Start-Sleep -Seconds 1
    # Chiudi anche questa finestra
    Stop-Process -Id $PID -Force -EA SilentlyContinue
}

# Se arriviamo qui, c'è stato un errore
Write-Host "Errore durante l'esecuzione" -ForegroundColor Red
Write-Host "Premi invio per chiudere..." -ForegroundColor Yellow
Read-Host
