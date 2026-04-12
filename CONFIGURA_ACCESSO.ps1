# CONFIGURA ACCESSO - rende le collection leggibili senza autenticazione
param(
    [string]$PbUrl = "http://127.0.0.1:8090",
    [string]$AdminEmail = "",
    [string]$AdminPassword = ""
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "Configuro accesso alle collection..." -ForegroundColor Cyan
Write-Host ""

if (-not $AdminEmail) { $AdminEmail = Read-Host "Email admin" }
if (-not $AdminPassword) {
    $s = Read-Host "Password admin" -AsSecureString
    $AdminPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

# Autenticazione superuser PB v0.36
try {
    $body = @{ identity = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
    $auth = Invoke-RestMethod `
        -Uri "$PbUrl/api/collections/_superusers/auth-with-password" `
        -Method POST -Body $body -ContentType "application/json" -EA Stop
    $token = $auth.token
    $h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
    Write-Host "OK Autenticato" -ForegroundColor Green
} catch {
    Write-Host "ERRORE autenticazione: $_" -ForegroundColor Red
    Read-Host "Premi INVIO per uscire"
    exit 1
}

# Collection che devono essere leggibili pubblicamente dalla cassa
$collections = @(
    "famiglie", "prodotti", "magazzini_comuni", "comande",
    "menu", "menu_componenti", "menu_prodotti", "tavoli",
    "scontrini", "righe_scontrino", "movimenti_magazzino", "utenti"
)

foreach ($col in $collections) {
    try {
        # Leggi collection corrente
        $current = Invoke-RestMethod -Uri "$PbUrl/api/collections/$col" -Headers $h -EA Stop

        # Imposta listRule e viewRule vuote = accesso pubblico
        # createRule, updateRule, deleteRule vuote = accesso pubblico anche in scrittura
        $update = @{
            listRule   = ""
            viewRule   = ""
            createRule = ""
            updateRule = ""
            deleteRule = ""
        } | ConvertTo-Json

        Invoke-RestMethod -Uri "$PbUrl/api/collections/$($current.id)" `
            -Method PATCH -Body $update -Headers $h -EA Stop | Out-Null

        Write-Host "OK $col - accesso pubblico configurato" -ForegroundColor Green
    } catch {
        Write-Host "WARN $col`: $_" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Configurazione completata!" -ForegroundColor Green
Write-Host "Ricarica la cassa nel browser (F5)" -ForegroundColor Cyan
Write-Host ""
Read-Host "Premi INVIO per chiudere"
