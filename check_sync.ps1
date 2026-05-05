# CASSA DALILA - Verifica sync Google Drive
# Legge il tooltip dell'icona Drive nella system tray via UI Automation.
# Fallback: monitora CPU di GoogleDriveFS.exe.

$ProgressPreference = "SilentlyContinue"
$Root       = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildInfo  = Join-Path $Root "_build_info.txt"
$TimeoutSec = 180
$PollSec    = 2

Clear-Host
Write-Host ""
Write-Host "  +=============================================+" -ForegroundColor Yellow
Write-Host "  |   CASSA DALILA - Verifica Sync Drive       |" -ForegroundColor Yellow
Write-Host "  +=============================================+" -ForegroundColor Yellow
Write-Host ""

# ── Info ultimo build ─────────────────────────────────────────
if (Test-Path $BuildInfo) {
    try {
        $bi = Get-Content $BuildInfo -Raw | ConvertFrom-Json
        Write-Host "  Ultimo build:" -ForegroundColor Gray
        Write-Host "    Data:   $($bi.data)" -ForegroundColor White
        Write-Host "    Bundle: $($bi.bundle)" -ForegroundColor White
        Write-Host "    Commit: $($bi.commit)" -ForegroundColor White
        Write-Host ""
    } catch { }
} else {
    Write-Host "  (nessun _build_info.txt trovato - esegui prima build_frontend.ps1)" -ForegroundColor DarkYellow
    Write-Host ""
}

# ── Funzione: legge tooltip icona Drive dalla tray ────────────
function Get-DriveTrayTooltip {
    try {
        Add-Type -AssemblyName UIAutomationClient -EA Stop
        Add-Type -AssemblyName UIAutomationTypes  -EA Stop

        $root = [System.Windows.Automation.AutomationElement]::RootElement

        # Cerca prima nella taskbar visibile, poi nell'overflow
        $targets = @("Shell_TrayWnd", "NotifyIconOverflowWindow")
        foreach ($className in $targets) {
            $classCond = New-Object System.Windows.Automation.PropertyCondition(
                [System.Windows.Automation.AutomationElement]::ClassNameProperty, $className)
            $tray = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $classCond)
            if (-not $tray) { continue }

            $btnCond = New-Object System.Windows.Automation.PropertyCondition(
                [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
                [System.Windows.Automation.ControlType]::Button)
            $buttons = $tray.FindAll([System.Windows.Automation.TreeScope]::Descendants, $btnCond)
            foreach ($btn in $buttons) {
                if ($btn.Current.Name -match "Google Drive") {
                    return $btn.Current.Name
                }
            }
        }
    } catch { }
    return $null
}

# ── Funzione: determina se Drive è in sync ────────────────────
function Test-DriveSynced($tooltip) {
    if (-not $tooltip) { return $false }
    $t = $tooltip.ToLower()
    $keywords = @("sincronizzazione","syncing","caricamento","uploading",
                  "in attesa","waiting","download","errore","error","in corso","pending")
    foreach ($kw in $keywords) { if ($t -match $kw) { return $false } }
    return $true
}

# ── Funzione fallback: CPU GoogleDriveFS ──────────────────────
function Test-DriveFsIdle {
    $proc = Get-Process "GoogleDriveFS" -EA SilentlyContinue | Select-Object -First 1
    if (-not $proc) { return $null }
    $c1 = $proc.TotalProcessorTime.TotalSeconds
    Start-Sleep -Milliseconds 800
    $proc.Refresh()
    $c2 = $proc.TotalProcessorTime.TotalSeconds
    return ($c2 - $c1) -lt 0.1
}

# ── Polling ───────────────────────────────────────────────────
Write-Host "  Attendo completamento sync..." -ForegroundColor Cyan
Write-Host "  (timeout: $TimeoutSec s  |  Ctrl+C per annullare)" -ForegroundColor DarkGray
Write-Host ""

$elapsed  = 0
$synced   = $false
$noTray   = $false

while ($elapsed -le $TimeoutSec) {
    $tooltip = Get-DriveTrayTooltip

    if ($tooltip) {
        $ok = Test-DriveSynced $tooltip
        $label = if ($ok) { "OK  Sync completato!" } else { "    $tooltip" }
        $col   = if ($ok) { "Green" } else { "Yellow" }
        Write-Host "`r  [$("{0,3}" -f $elapsed)s] $label                    " `
            -ForegroundColor $col -NoNewline
        if ($ok) { $synced = $true; break }

    } else {
        # Fallback CPU
        $idle = Test-DriveFsIdle
        if ($idle -eq $null) {
            Write-Host "`r  [!] GoogleDriveFS non trovato - verifica manualmente l'icona Drive  " `
                -ForegroundColor Red -NoNewline
            $noTray = $true; break
        }
        $label = if ($idle) { "OK  Sync completato (CPU idle)" } else { "    Drive attivo, sync in corso..." }
        $col   = if ($idle) { "Green" } else { "Yellow" }
        Write-Host "`r  [$("{0,3}" -f $elapsed)s] $label                    " `
            -ForegroundColor $col -NoNewline
        if ($idle) { $synced = $true; break }
    }

    Start-Sleep -Seconds $PollSec
    $elapsed += $PollSec
}

Write-Host ""
Write-Host ""

if ($synced) {
    Write-Host "  +=============================================+" -ForegroundColor Green
    Write-Host "  |   SYNC COMPLETATO - L'altro PC e' pronto  |" -ForegroundColor Green
    Write-Host "  +=============================================+" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Sull'altro PC:" -ForegroundColor White
    Write-Host "    1. Chiudi e riavvia la cassa (CassaOratorio.ps1)" -ForegroundColor White
    Write-Host "    2. Ctrl+Shift+R nel browser" -ForegroundColor White
} elseif ($noTray) {
    Write-Host "  [!] Impossibile rilevare lo stato automaticamente." -ForegroundColor Yellow
    Write-Host "  Controlla l'icona di Google Drive nella system tray." -ForegroundColor Yellow
} else {
    Write-Host "  [!] Timeout ($TimeoutSec s) - sync non completato." -ForegroundColor Red
    Write-Host "  Controlla la connessione e l'icona di Google Drive." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "  Premi INVIO per uscire"
