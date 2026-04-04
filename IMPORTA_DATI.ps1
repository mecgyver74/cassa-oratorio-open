# IMPORTA DATI - Cassa Oratorio
# Importa famiglie, magazzini comuni e prodotti tramite API PocketBase
param(
    [string]$PbUrl = "http://127.0.0.1:8090",
    [string]$AdminEmail = "",
    [string]$AdminPassword = ""
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "  +=============================================+" -ForegroundColor Cyan
Write-Host "  |   IMPORTAZIONE DATI - Cassa Oratorio       |" -ForegroundColor Cyan
Write-Host "  +=============================================+" -ForegroundColor Cyan
Write-Host ""

# Leggi credenziali se non passate
if (-not $AdminEmail) { $AdminEmail = Read-Host "  Email admin PocketBase" }
if (-not $AdminPassword) {
    $s = Read-Host "  Password admin" -AsSecureString
    $AdminPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

# Autenticazione
Write-Host ""
Write-Host "  Connessione a PocketBase..." -ForegroundColor Cyan
try {
    $authBody = @{ identity = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
    $auth = Invoke-RestMethod -Uri "$PbUrl/api/collections/_superusers/auth-with-password" `
        -Method POST -Body $authBody -ContentType "application/json" -EA Stop
    $token = $auth.token
    $h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
    Write-Host "  OK Autenticato come $AdminEmail" -ForegroundColor Green
} catch {
    Write-Host "  ERRORE autenticazione: $_" -ForegroundColor Red
    Write-Host "  Assicurati che AVVIA_CASSA.bat sia in esecuzione" -ForegroundColor Yellow
    Read-Host "  Premi INVIO per uscire"
    exit 1
}

function Post($col, $body) {
    try {
        $r = Invoke-RestMethod -Uri "$PbUrl/api/collections/$col/records" `
            -Method POST -Body ($body | ConvertTo-Json) -Headers $h -EA Stop
        return $r.id
    } catch {
        $msg = $_.ToString()
        if ($msg -match "unique") { return "gia_presente" }
        Write-Host "    WARN $col`: $msg" -ForegroundColor Yellow
        return $null
    }
}

# ── FAMIGLIE ──────────────────────────────────────────────────
Write-Host ""
Write-Host "  Importo famiglie..." -ForegroundColor Cyan
$famiglie = @(
    @{ nome="Fritti";        colore="#FF6B35"; attivo=$true; ordine=1 }
    @{ nome="Griglia";       colore="#E74C3C"; attivo=$true; ordine=2 }
    @{ nome="Bar";           colore="#27AE60"; attivo=$true; ordine=3 }
    @{ nome="Dolci e Frutta";colore="#F39C12"; attivo=$true; ordine=4 }
    @{ nome="Spritz";        colore="#8E44AD"; attivo=$true; ordine=5 }
)
$famIds = @{}
foreach ($f in $famiglie) {
    $id = Post "famiglie" $f
    if ($id -and $id -ne "gia_presente") {
        $famIds[$f.nome] = $id
        Write-Host "    OK $($f.nome)" -ForegroundColor Green
    } elseif ($id -eq "gia_presente") {
        # Recupera ID esistente
        $existing = Invoke-RestMethod -Uri "$PbUrl/api/collections/famiglie/records?filter=(nome='$($f.nome)')" -Headers $h -EA SilentlyContinue
        if ($existing.items.Count -gt 0) { $famIds[$f.nome] = $existing.items[0].id }
        Write-Host "    -- $($f.nome) (gia' presente)" -ForegroundColor Yellow
    }
}

# ── MAGAZZINI COMUNI ──────────────────────────────────────────
Write-Host ""
Write-Host "  Importo magazzini comuni..." -ForegroundColor Cyan
$magazzini = @(
    @{ nome="HAMBURGER";   quantita=36; soglia_allarme=5 }
    @{ nome="WURSTEL";     quantita=22; soglia_allarme=5 }
    @{ nome="SALAMELLE";   quantita=39; soglia_allarme=5 }
    @{ nome="FRITTELLE";   quantita=0;  soglia_allarme=3 }
)
$magIds = @{}
foreach ($m in $magazzini) {
    $id = Post "magazzini_comuni" $m
    if ($id -and $id -ne "gia_presente") {
        $magIds[$m.nome] = $id
        Write-Host "    OK $($m.nome) (scorta: $($m.quantita))" -ForegroundColor Green
    } elseif ($id -eq "gia_presente") {
        $existing = Invoke-RestMethod -Uri "$PbUrl/api/collections/magazzini_comuni/records?filter=(nome='$($m.nome)')" -Headers $h -EA SilentlyContinue
        if ($existing.items.Count -gt 0) { $magIds[$m.nome] = $existing.items[0].id }
        Write-Host "    -- $($m.nome) (gia' presente)" -ForegroundColor Yellow
    }
}

# ── PRODOTTI ──────────────────────────────────────────────────
Write-Host ""
Write-Host "  Importo prodotti..." -ForegroundColor Cyan

# Helper per creare prodotto
function Prod($nome, $fam, $prezzo, $qta, $mag=$null, $soloMenu=$false, $ordine=0) {
    $body = @{
        nome             = $nome
        famiglia         = $famIds[$fam]
        prezzo           = $prezzo
        quantita         = $qta
        attivo           = $true
        solo_menu        = $soloMenu
        stampa           = $true
        ordine           = $ordine
        unita            = "pz"
        soglia_allarme   = 3
    }
    if ($mag -and $magIds[$mag]) { $body.magazzino_comune = $magIds[$mag] }
    $id = Post "prodotti" $body
    if ($id -and $id -ne "gia_presente") {
        Write-Host "    OK $nome (EUR $prezzo)" -ForegroundColor Green
    } elseif ($id -eq "gia_presente") {
        Write-Host "    -- $nome (gia' presente)" -ForegroundColor Yellow
    }
}

# FRITTI
if ($famIds["Fritti"]) {
    Prod "Patatine Fritte"      "Fritti" 2.50 37 $null $false 1
    Prod "Nuggets"              "Fritti" 4.00 37 $null $false 2
    Prod "Nuggets con patatine" "Fritti" 6.00 37 $null $false 3
    Prod "Il Fagottino"         "Fritti" 3.50 0  $null $false 4
    Prod "Crocchette di Patate" "Fritti" 2.50 0  $null $false 5
}

# GRIGLIA
if ($famIds["Griglia"]) {
    Prod "Salamella"            "Griglia" 4.00 39 "SALAMELLE" $false 1
    Prod "SalBacon"             "Griglia" 4.50 39 "SALAMELLE" $false 2
    Prod "Hamburger Classico"   "Griglia" 5.00 36 "HAMBURGER" $false 3
    Prod "Hamburger Bacon"      "Griglia" 5.00 36 "HAMBURGER" $false 4
    Prod "SoloBurger"           "Griglia" 4.00 36 "HAMBURGER" $false 5
    Prod "Soloburger con Cheddar" "Griglia" 4.50 36 "HAMBURGER" $false 6
    Prod "SoloWurstel"          "Griglia" 3.00 22 "WURSTEL"   $false 7
    Prod "Wurstel e Crauti"     "Griglia" 3.50 22 "WURSTEL"   $false 8
    Prod "Arrosticini di Ovino" "Griglia" 5.50 5  $null $false 9
    Prod "Il Bruschettone"      "Griglia" 4.50 7  $null $false 10
    Prod "MAGRI'"               "Griglia" 3.00 12 $null $false 11
    Prod "Verdure Grigliate"    "Griglia" 3.00 0  $null $false 12
}

# BAR
if ($famIds["Bar"]) {
    Prod "Acqua Nat. Bott. 50cl"  "Bar" 1.00 290 $null $false 1
    Prod "Acqua Frizz. Bott. 50cl" "Bar" 1.00 132 $null $false 2
    Prod "Coca Cola latt."        "Bar" 1.50 91  $null $false 3
    Prod "Coca Cola ZERO latt."   "Bar" 1.50 10  $null $false 4
    Prod "Vino Bianco Bicchiere"  "Bar" 2.00 0   $null $false 5
    Prod "Caraffa Vino Bianco"    "Bar" 6.00 0   $null $false 6
    Prod "Birra alla Spina Chiara" "Bar" 4.00 0  $null $false 7
    Prod "Birra alla Spina Rossa" "Bar" 4.50 0   $null $false 8
}

# DOLCI E FRUTTA
if ($famIds["Dolci e Frutta"]) {
    Prod "Tiramisu'"             "Dolci e Frutta" 3.00 16 $null $false 1
    Prod "Tiramisu' senza lattosio" "Dolci e Frutta" 3.00 1 $null $false 2
    Prod "Tartufo Pistacchio"    "Dolci e Frutta" 3.50 0  $null $false 3
    Prod "Mousse Limone"         "Dolci e Frutta" 3.00 8  $null $false 4
    Prod "Mousse Frutti di Bosco" "Dolci e Frutta" 3.00 7 $null $false 5
    Prod "Mousse Cioccolato"     "Dolci e Frutta" 3.00 0  $null $false 6
    Prod "Meringata"             "Dolci e Frutta" 3.00 3  $null $false 7
    Prod "Macedonia"             "Dolci e Frutta" 3.00 0  $null $false 8
    Prod "Frittella con nutella" "Dolci e Frutta" 2.50 0  $null $false 9
    Prod "Frittella"             "Dolci e Frutta" 2.50 0  "FRITTELLE" $false 10
    Prod "Caldarroste"           "Dolci e Frutta" 3.50 0  $null $false 11
}

# SPRITZ
if ($famIds["Spritz"]) {
    Prod "Spritz"     "Spritz" 3.00 22 $null $false 1
    Prod "Analcolico" "Spritz" 2.50 0  $null $false 2
}

# ── COMANDE ───────────────────────────────────────────────────
Write-Host ""
Write-Host "  Importo comande..." -ForegroundColor Cyan
$comande = @(
    @{ nome="Griglia";       abilitata=$true; salva_su_db=$true; invia_stampante=$false; copie=1; ordine=1 }
    @{ nome="Bar";           abilitata=$true; salva_su_db=$true; invia_stampante=$false; copie=1; ordine=2 }
    @{ nome="Dolci e Frutta";abilitata=$true; salva_su_db=$true; invia_stampante=$false; copie=1; ordine=3 }
    @{ nome="Spritz";        abilitata=$true; salva_su_db=$true; invia_stampante=$false; copie=1; ordine=4 }
    @{ nome="Fritti";        abilitata=$true; salva_su_db=$true; invia_stampante=$false; copie=1; ordine=5 }
)
foreach ($c in $comande) {
    $id = Post "comande" $c
    if ($id -and $id -ne "gia_presente") {
        Write-Host "    OK $($c.nome)" -ForegroundColor Green
    } elseif ($id -eq "gia_presente") {
        Write-Host "    -- $($c.nome) (gia' presente)" -ForegroundColor Yellow
    }
}

# ── RIEPILOGO ─────────────────────────────────────────────────
Write-Host ""
Write-Host "  +=============================================+" -ForegroundColor Green
Write-Host "  |  OK  Importazione completata!              |" -ForegroundColor Green
Write-Host "  +=============================================+" -ForegroundColor Green
Write-Host ""
Write-Host "  Ricarica la pagina della cassa nel browser." -ForegroundColor Cyan
Write-Host "  I prodotti sono pronti all'uso." -ForegroundColor Cyan
Write-Host ""
Write-Host "  NOTA: le scorte sono quelle viste negli screenshot." -ForegroundColor Yellow
Write-Host "  Aggiornale nella sezione Magazzino della cassa." -ForegroundColor Yellow
Write-Host ""
Read-Host "  Premi INVIO per chiudere"
