# CASSA DALILA - Build frontend e deploy
# Workaround: Node.js 22 ha problemi con percorsi Google Drive lunghi,
# quindi il build avviene in C:\temp\cassabuild (percorso corto).

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"

$Root       = Split-Path -Parent $MyInvocation.MyCommand.Path
$SrcDir     = Join-Path $Root "frontend-src"
$TempDir    = "C:\temp\cassabuild"
$DistTemp   = Join-Path $TempDir "dist"

$DestPublic      = Join-Path $Root "app\pb_public"
$DestFrontDist   = Join-Path $Root "frontend-dist"
$DestSrcDist     = Join-Path $SrcDir "dist"

function Step($n, $msg) { Write-Host "`n[$n/5] $msg" -ForegroundColor Cyan }
function OK($msg)        { Write-Host "  OK  $msg" -ForegroundColor Green }
function Fail($msg)      { Write-Host "  ERR $msg" -ForegroundColor Red; Read-Host "Premi INVIO per uscire"; exit 1 }

Clear-Host
Write-Host ""
Write-Host "  ================================================" -ForegroundColor Yellow
Write-Host "    CASSA DALILA - Build Frontend                " -ForegroundColor Yellow
Write-Host "  ================================================" -ForegroundColor Yellow
Write-Host ""

# ── 1. Pulisci e copia sorgenti in temp ──────────────────────
Step 1 "Copia sorgenti in $TempDir (escludo node_modules se presente)..."

if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

# Robocopy: copia tutto tranne node_modules (npm install è più veloce in locale)
# /E = includi sottocartelle vuote  /XD = escludi cartelle  /NJH /NJS /NFL /NDL = output silenzioso
robocopy $SrcDir $TempDir /E /XD "node_modules" ".git" /NJH /NJS /NFL /NDL | Out-Null
if (-not (Test-Path (Join-Path $TempDir "package.json"))) { Fail "Copia sorgenti fallita" }
OK "Sorgenti copiati"

# ── 2. npm install ───────────────────────────────────────────
Step 2 "npm install (da $TempDir)..."
Push-Location $TempDir
try {
    npm install --prefer-offline 2>&1 | Tee-Object -Variable npmOut | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail "npm install fallito: $($npmOut[-5..-1] -join "`n")" }
    OK "Dipendenze installate"
} finally { Pop-Location }

# ── 3. Build ─────────────────────────────────────────────────
Step 3 "npm run build..."
Push-Location $TempDir
try {
    npm run build 2>&1 | Tee-Object -Variable buildOut
    if ($LASTEXITCODE -ne 0) { Fail "Build fallito:`n$($buildOut[-10..-1] -join "`n")" }
    OK "Build completato"
} finally { Pop-Location }

if (-not (Test-Path $DistTemp)) { Fail "Cartella dist non trovata in $TempDir" }

# ── 4. Pulizia vecchi bundle nelle tre destinazioni ──────────
Step 4 "Pulizia vecchi bundle JS/CSS..."
foreach ($dest in @($DestPublic, $DestFrontDist, $DestSrcDist)) {
    $assetsDir = Join-Path $dest "assets"
    if (Test-Path $assetsDir) { Remove-Item $assetsDir -Recurse -Force }
}
OK "Vecchi bundle rimossi"

# ── 5. Copia dist nelle tre destinazioni ─────────────────────
# /IS = sovrascrivi anche file con stesso timestamp (necessario con Google Drive)
Step 5 "Deploy in:"
foreach ($dest in @($DestPublic, $DestFrontDist, $DestSrcDist)) {
    robocopy $DistTemp $dest /E /IS /NJH /NJS /NFL /NDL | Out-Null
    OK $dest
}

Write-Host ""
Write-Host "  ================================================" -ForegroundColor Green
Write-Host "    BUILD E DEPLOY COMPLETATI                    " -ForegroundColor Green
Write-Host "  ================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Prossimi passi:" -ForegroundColor White
Write-Host "  1. Attendi che Google Drive sincronizzi i file" -ForegroundColor White
Write-Host "  2. Riavvia la cassa sull'altro PC (CassaOratorio.ps1)" -ForegroundColor White
Write-Host "  3. Apri il browser e fai Ctrl+Shift+R" -ForegroundColor White
Write-Host ""
Read-Host "Premi INVIO per uscire"
