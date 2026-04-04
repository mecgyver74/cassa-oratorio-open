# CASSA ORATORIO - Installer v1.0
$ErrorActionPreference = "SilentlyContinue"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Colori come oggetti statici
$cBlu    = [System.Drawing.Color]::FromArgb(26, 82, 118)
$cVerde  = [System.Drawing.Color]::FromArgb(22, 163, 74)
$cBianco = [System.Drawing.Color]::White
$cSfondo = [System.Drawing.Color]::FromArgb(245, 247, 250)
$cTesto  = [System.Drawing.Color]::FromArgb(30, 30, 30)
$cGrigio = [System.Drawing.Color]::FromArgb(107, 114, 128)
$cBordo  = [System.Drawing.Color]::FromArgb(209, 213, 219)

function NuovaFinestra([string]$titolo, [int]$w, [int]$h) {
    $f = New-Object System.Windows.Forms.Form
    $f.Text = $titolo
    $f.Size = New-Object System.Drawing.Size($w, $h)
    $f.StartPosition = "CenterScreen"
    $f.FormBorderStyle = "FixedDialog"
    $f.MaximizeBox = $false
    $f.BackColor = $cSfondo
    $f.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    return $f
}

function AggiungiHeader([System.Windows.Forms.Form]$form, [string]$titolo, [string]$sub) {
    $p = New-Object System.Windows.Forms.Panel
    $p.Dock = "Top"; $p.Height = 80
    $p.BackColor = $cBlu
    $form.Controls.Add($p)

    $t = New-Object System.Windows.Forms.Label
    $t.Text = $titolo; $t.Left = 24; $t.Top = 14; $t.Width = 550; $t.Height = 30
    $t.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    $t.ForeColor = $cBianco; $t.BackColor = [System.Drawing.Color]::Transparent
    $p.Controls.Add($t)

    $s = New-Object System.Windows.Forms.Label
    $s.Text = $sub; $s.Left = 24; $s.Top = 50; $s.Width = 550; $s.Height = 22
    $s.ForeColor = [System.Drawing.Color]::FromArgb(180, 210, 240)
    $s.BackColor = [System.Drawing.Color]::Transparent
    $p.Controls.Add($s)
}

function NuovaLabel([System.Windows.Forms.Control]$parent, [string]$testo, [int]$x, [int]$y, [int]$w, [int]$h) {
    $l = New-Object System.Windows.Forms.Label
    $l.Text = $testo; $l.Left = $x; $l.Top = $y; $l.Width = $w; $l.Height = $h
    $l.ForeColor = $cGrigio; $l.BackColor = [System.Drawing.Color]::Transparent
    $parent.Controls.Add($l)
    return $l
}

function NuovaLabelBold([System.Windows.Forms.Control]$parent, [string]$testo, [int]$x, [int]$y, [int]$w, [int]$h) {
    $l = New-Object System.Windows.Forms.Label
    $l.Text = $testo; $l.Left = $x; $l.Top = $y; $l.Width = $w; $l.Height = $h
    $l.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $l.ForeColor = $cTesto; $l.BackColor = [System.Drawing.Color]::Transparent
    $parent.Controls.Add($l)
    return $l
}

function NuovoInput([System.Windows.Forms.Form]$form, [int]$x, [int]$y, [int]$w, [string]$default, [bool]$password) {
    $t = New-Object System.Windows.Forms.TextBox
    $t.Left = $x; $t.Top = $y; $t.Width = $w; $t.Text = $default
    $t.BorderStyle = "FixedSingle"; $t.BackColor = $cBianco
    if ($password) { $t.UseSystemPasswordChar = $true }
    $form.Controls.Add($t)
    return $t
}

function NuovoBtnPrimario([System.Windows.Forms.Form]$form, [string]$testo, [int]$x, [int]$y, [int]$w, [int]$h) {
    $b = New-Object System.Windows.Forms.Button
    $b.Text = $testo; $b.Left = $x; $b.Top = $y; $b.Width = $w; $b.Height = $h
    $b.FlatStyle = "Flat"; $b.Cursor = "Hand"
    $b.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $b.BackColor = $cBlu; $b.ForeColor = $cBianco
    $b.FlatAppearance.BorderSize = 0
    $form.Controls.Add($b)
    return $b
}

function NuovoBtnPrimarioVerde([System.Windows.Forms.Form]$form, [string]$testo, [int]$x, [int]$y, [int]$w, [int]$h) {
    $b = New-Object System.Windows.Forms.Button
    $b.Text = $testo; $b.Left = $x; $b.Top = $y; $b.Width = $w; $b.Height = $h
    $b.FlatStyle = "Flat"; $b.Cursor = "Hand"
    $b.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $b.BackColor = $cVerde; $b.ForeColor = $cBianco
    $b.FlatAppearance.BorderSize = 0
    $form.Controls.Add($b)
    return $b
}

function NuovoBtnSecondario([System.Windows.Forms.Form]$form, [string]$testo, [int]$x, [int]$y, [int]$w, [int]$h) {
    $b = New-Object System.Windows.Forms.Button
    $b.Text = $testo; $b.Left = $x; $b.Top = $y; $b.Width = $w; $b.Height = $h
    $b.FlatStyle = "Flat"; $b.Cursor = "Hand"
    $b.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $b.BackColor = [System.Drawing.Color]::FromArgb(229, 231, 235)
    $b.ForeColor = $cTesto
    $b.FlatAppearance.BorderColor = $cBordo
    $form.Controls.Add($b)
    return $b
}

# ── Schermata 1: Benvenuto ────────────────────────────────────
function S1_Benvenuto {
    $f = NuovaFinestra "Cassa Oratorio - Installazione" 600 500
    AggiungiHeader $f "Benvenuto in Cassa Oratorio" "Procedura guidata di installazione"

    $box = New-Object System.Windows.Forms.Panel
    $box.Left = 24; $box.Top = 100; $box.Width = 552; $box.Height = 190
    $box.BackColor = $cBianco; $box.BorderStyle = "FixedSingle"
    $f.Controls.Add($box)

    $info = New-Object System.Windows.Forms.Label
    $info.Text = "Questa procedura ti guida in pochi passi:`n`n  1.  Scegliere dove installare (PC o chiavetta USB)`n  2.  Creare l'account amministratore`n  3.  Compilare automaticamente l'interfaccia`n  4.  Creare il collegamento sul desktop`n`nTempo stimato: 3-5 minuti."
    $info.Left = 16; $info.Top = 14; $info.Width = 520; $info.Height = 162
    $info.ForeColor = $cTesto; $info.BackColor = $cBianco
    $box.Controls.Add($info)

    $avviso = New-Object System.Windows.Forms.Panel
    $avviso.Left = 24; $avviso.Top = 304; $avviso.Width = 552; $avviso.Height = 50
    $avviso.BackColor = [System.Drawing.Color]::FromArgb(255, 251, 235)
    $avviso.BorderStyle = "FixedSingle"
    $f.Controls.Add($avviso)

    $av = New-Object System.Windows.Forms.Label
    $av.Text = "Requisito: Node.js deve essere installato. Scaricalo da nodejs.org (LTS)."
    $av.Left = 12; $av.Top = 10; $av.Width = 528; $av.Height = 28
    $av.ForeColor = [System.Drawing.Color]::FromArgb(146, 64, 14)
    $av.BackColor = [System.Drawing.Color]::Transparent
    $avviso.Controls.Add($av)

    $btnOk   = NuovoBtnPrimario   $f "Inizia l'installazione" 388 430 188 40
    $btnEsci = NuovoBtnSecondario $f "Esci" 24 430 100 40

    $script:r1 = $null
    $btnOk.Add_Click({   $script:r1 = "next"; $f.Close() })
    $btnEsci.Add_Click({ $script:r1 = "exit"; $f.Close() })
    $f.ShowDialog() | Out-Null
    return $script:r1
}

# ── Schermata 2: Posizione ────────────────────────────────────
function S2_Posizione {
    $f = NuovaFinestra "Cassa Oratorio - Dove installare" 600 520
    AggiungiHeader $f "Dove vuoi installare?" "PC fisso o chiavetta USB"

    # PC
    $panPC = New-Object System.Windows.Forms.Panel
    $panPC.Left = 24; $panPC.Top = 100; $panPC.Width = 552; $panPC.Height = 76
    $panPC.BackColor = $cBianco; $panPC.BorderStyle = "FixedSingle"
    $f.Controls.Add($panPC)
    $rbPC = New-Object System.Windows.Forms.RadioButton
    $rbPC.Text = "Installa su questo PC"; $rbPC.Left = 8; $rbPC.Top = 8
    $rbPC.Width = 530; $rbPC.Height = 26; $rbPC.Checked = $true
    $rbPC.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $rbPC.ForeColor = $cBlu; $rbPC.BackColor = $cBianco
    $panPC.Controls.Add($rbPC)
    $lPC = New-Object System.Windows.Forms.Label
    $lPC.Text = "     Rimane su questo computer. Massime prestazioni."; $lPC.Left = 8; $lPC.Top = 36
    $lPC.Width = 530; $lPC.Height = 28; $lPC.ForeColor = $cGrigio; $lPC.BackColor = $cBianco
    $panPC.Controls.Add($lPC)

    # USB
    $panUSB = New-Object System.Windows.Forms.Panel
    $panUSB.Left = 24; $panUSB.Top = 188; $panUSB.Width = 552; $panUSB.Height = 76
    $panUSB.BackColor = $cBianco; $panUSB.BorderStyle = "FixedSingle"
    $f.Controls.Add($panUSB)
    $rbUSB = New-Object System.Windows.Forms.RadioButton
    $rbUSB.Text = "Chiavetta USB (portabile)"; $rbUSB.Left = 8; $rbUSB.Top = 8
    $rbUSB.Width = 530; $rbUSB.Height = 26
    $rbUSB.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $rbUSB.ForeColor = $cBlu; $rbUSB.BackColor = $cBianco
    $panUSB.Controls.Add($rbUSB)
    $lUSB = New-Object System.Windows.Forms.Label
    $lUSB.Text = "     Portabile su qualsiasi PC Windows. Usa una chiavetta USB 3.0."; $lUSB.Left = 8; $lUSB.Top = 36
    $lUSB.Width = 530; $lUSB.Height = 28; $lUSB.ForeColor = $cGrigio; $lUSB.BackColor = $cBianco
    $panUSB.Controls.Add($lUSB)

    $panPC.Add_Click({ $rbPC.Checked = $true })
    $panUSB.Add_Click({ $rbUSB.Checked = $true })

    $sep = New-Object System.Windows.Forms.Panel
    $sep.Left = 24; $sep.Top = 278; $sep.Width = 552; $sep.Height = 1
    $sep.BackColor = $cBordo; $f.Controls.Add($sep)

    NuovaLabelBold $f "Cartella di installazione:" 24 296 300 22 | Out-Null
    $txtPath = NuovoInput $f 24 322 464 "C:\CassaOratorio" $false

    $btnBrowse = NuovoBtnSecondario $f "..." 498 320 78 30
    $btnBrowse.Add_Click({
        $d = New-Object System.Windows.Forms.FolderBrowserDialog
        $d.Description = "Scegli cartella di installazione"
        if ($d.ShowDialog() -eq "OK") { $txtPath.Text = Join-Path $d.SelectedPath "CassaOratorio" }
    })

    $rbUSB.Add_CheckedChanged({
        if ($rbUSB.Checked) {
            $usb = $null
            foreach ($drv in (Get-PSDrive -PSProvider FileSystem -EA SilentlyContinue)) {
                try {
                    $di = [System.IO.DriveInfo]::new($drv.Root)
                    if ($di.DriveType -eq 'Removable') { $usb = $drv.Root; break }
                } catch {}
            }
            $txtPath.Text = if ($usb) { Join-Path $usb "CassaOratorio" } else { "D:\CassaOratorio" }
        }
    })
    $rbPC.Add_CheckedChanged({ if ($rbPC.Checked) { $txtPath.Text = "C:\CassaOratorio" } })

    $btnOk  = NuovoBtnPrimario   $f "Avanti" 432 450 144 40
    $btnInd = NuovoBtnSecondario $f "Indietro" 24 450 120 40

    $script:r2 = $null
    $btnOk.Add_Click({
        if ([string]::IsNullOrWhiteSpace($txtPath.Text)) {
            [System.Windows.Forms.MessageBox]::Show("Inserisci una cartella.", "Attenzione") | Out-Null
            return
        }
        $script:r2 = @{ action = "next"; path = $txtPath.Text; usb = $rbUSB.Checked }
        $f.Close()
    })
    $btnInd.Add_Click({ $script:r2 = @{ action = "back" }; $f.Close() })
    $f.ShowDialog() | Out-Null
    return $script:r2
}

# ── Schermata 3: Account ──────────────────────────────────────
function S3_Account {
    $f = NuovaFinestra "Cassa Oratorio - Account" 600 450
    AggiungiHeader $f "Account amministratore" "Servono per accedere al pannello di configurazione"

    $nota = New-Object System.Windows.Forms.Panel
    $nota.Left = 24; $nota.Top = 100; $nota.Width = 552; $nota.Height = 44
    $nota.BackColor = [System.Drawing.Color]::FromArgb(239, 246, 255)
    $nota.BorderStyle = "FixedSingle"; $f.Controls.Add($nota)
    $ntxt = New-Object System.Windows.Forms.Label
    $ntxt.Text = "Conserva email e password - servono per il pannello admin di PocketBase."
    $ntxt.Left = 12; $ntxt.Top = 10; $ntxt.Width = 528; $ntxt.Height = 24
    $ntxt.ForeColor = [System.Drawing.Color]::FromArgb(29, 78, 216)
    $ntxt.BackColor = [System.Drawing.Color]::Transparent
    $nota.Controls.Add($ntxt)

    NuovaLabelBold $f "Email amministratore" 24 162 300 22 | Out-Null
    $txtEmail = NuovoInput $f 24 188 552 "admin@cassaoratorio.it" $false
    NuovaLabelBold $f "Password (minimo 8 caratteri)" 24 228 300 22 | Out-Null
    $txtPwd  = NuovoInput $f 24 254 552 "" $true
    NuovaLabelBold $f "Conferma password" 24 294 300 22 | Out-Null
    $txtPwd2 = NuovoInput $f 24 320 552 "" $true

    $btnOk  = NuovoBtnPrimario   $f "Avanti" 432 380 144 40
    $btnInd = NuovoBtnSecondario $f "Indietro" 24 380 120 40

    $script:r3 = $null
    $btnOk.Add_Click({
        if ($txtEmail.Text -notmatch '@') {
            [System.Windows.Forms.MessageBox]::Show("Email non valida.", "Attenzione") | Out-Null; return
        }
        if ($txtPwd.Text.Length -lt 8) {
            [System.Windows.Forms.MessageBox]::Show("Password troppo corta (min 8).", "Attenzione") | Out-Null; return
        }
        if ($txtPwd.Text -ne $txtPwd2.Text) {
            [System.Windows.Forms.MessageBox]::Show("Le password non coincidono.", "Attenzione") | Out-Null; return
        }
        $script:r3 = @{ action = "next"; email = $txtEmail.Text; password = $txtPwd.Text }
        $f.Close()
    })
    $btnInd.Add_Click({ $script:r3 = @{ action = "back" }; $f.Close() })
    $f.ShowDialog() | Out-Null
    return $script:r3
}

# ── Schermata 4: Riepilogo ────────────────────────────────────
function S4_Riepilogo([string]$path, [string]$email) {
    $f = NuovaFinestra "Cassa Oratorio - Riepilogo" 600 440
    AggiungiHeader $f "Pronto per l'installazione" "Controlla e clicca Installa"

    $box = New-Object System.Windows.Forms.Panel
    $box.Left = 24; $box.Top = 100; $box.Width = 552; $box.Height = 80
    $box.BackColor = $cBianco; $box.BorderStyle = "FixedSingle"; $f.Controls.Add($box)
    $rl = New-Object System.Windows.Forms.Label
    $rl.Text = "Cartella:  $path`nEmail:     $email"
    $rl.Left = 16; $rl.Top = 10; $rl.Width = 520; $rl.Height = 60
    $rl.Font = New-Object System.Drawing.Font("Consolas", 9)
    $rl.ForeColor = $cTesto; $rl.BackColor = $cBianco
    $box.Controls.Add($rl)

    $cbDesk = New-Object System.Windows.Forms.CheckBox
    $cbDesk.Text = "Crea collegamento sul desktop"
    $cbDesk.Left = 24; $cbDesk.Top = 200; $cbDesk.Width = 400; $cbDesk.Height = 26
    $cbDesk.Checked = $true; $cbDesk.BackColor = [System.Drawing.Color]::Transparent
    $f.Controls.Add($cbDesk)

    $cbAvvia = New-Object System.Windows.Forms.CheckBox
    $cbAvvia.Text = "Avvia Cassa Oratorio al termine"
    $cbAvvia.Left = 24; $cbAvvia.Top = 234; $cbAvvia.Width = 400; $cbAvvia.Height = 26
    $cbAvvia.Checked = $true; $cbAvvia.BackColor = [System.Drawing.Color]::Transparent
    $f.Controls.Add($cbAvvia)

    $btnOk  = NuovoBtnPrimarioVerde $f "Installa ora" 408 366 168 40
    $btnInd = NuovoBtnSecondario    $f "Indietro" 24 366 120 40

    $script:r4 = $null
    $btnOk.Add_Click({ $script:r4 = @{ action = "install"; desktop = $cbDesk.Checked; avvia = $cbAvvia.Checked }; $f.Close() })
    $btnInd.Add_Click({ $script:r4 = @{ action = "back" }; $f.Close() })
    $f.ShowDialog() | Out-Null
    return $script:r4
}

# ── Schermata 5: Installazione ────────────────────────────────
function S5_Installa([string]$path, [string]$email, [string]$pwd, [bool]$desktop) {
    $f = NuovaFinestra "Cassa Oratorio - Installazione" 600 520
    $f.ControlBox = $false
    AggiungiHeader $f "Installazione in corso..." "Non chiudere questa finestra"

    $lblS = New-Object System.Windows.Forms.Label
    $lblS.Left = 24; $lblS.Top = 100; $lblS.Width = 552; $lblS.Height = 24
    $lblS.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $lblS.ForeColor = $cBlu; $lblS.BackColor = [System.Drawing.Color]::Transparent
    $f.Controls.Add($lblS)

    $prog = New-Object System.Windows.Forms.ProgressBar
    $prog.Left = 24; $prog.Top = 130; $prog.Width = 552; $prog.Height = 18
    $prog.Minimum = 0; $prog.Maximum = 100; $prog.Style = "Continuous"
    $f.Controls.Add($prog)

    $log = New-Object System.Windows.Forms.RichTextBox
    $log.Left = 24; $log.Top = 158; $log.Width = 552; $log.Height = 290
    $log.ReadOnly = $true
    $log.BackColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
    $log.ForeColor = [System.Drawing.Color]::FromArgb(134, 239, 172)
    $log.Font = New-Object System.Drawing.Font("Consolas", 9)
    $log.BorderStyle = "None"
    $f.Controls.Add($log)

    $btnFine = NuovoBtnPrimario $f "Fine - Chiudi" 408 460 168 40
    $btnFine.Enabled = $false

    $script:instOk = $true
    $script:instPath = $path

    $f.Add_Shown({
        $addLog = {
            param([string]$msg, [bool]$ok = $true)
            $prefix = if ($ok) { "> " } else { "! " }
            $log.AppendText("$prefix$msg`n")
            $log.ScrollToCaret()
            $f.Refresh()
        }
        $setStep = {
            param([string]$msg, [int]$pct)
            $lblS.Text = $msg
            $prog.Value = [Math]::Min(100, $pct)
            $f.Refresh()
        }

        # Step 1: Crea cartella
        & $setStep "Creazione cartella..." 5
        try {
            New-Item -ItemType Directory -Force -Path $path | Out-Null
            & $addLog "Cartella: $path"
        } catch {
            & $addLog "ERRORE: $_" $false
            $script:instOk = $false
        }

        # Step 2: Copia file
        & $setStep "Copia file..." 15
        $src = Split-Path -Parent $MyInvocation.ScriptName
        try {
            $ex = @('pb_data', 'cassa.config.json', 'cassa.log', 'backup', 'node_modules', 'dist', '.env')
            Get-ChildItem $src -Recurse | Where-Object {
                $rel = $_.FullName.Substring($src.Length + 1)
                $skip = $false
                foreach ($e in $ex) { if ($rel -like "*$e*") { $skip = $true; break } }
                -not $skip
            } | ForEach-Object {
                $dest = Join-Path $path $_.FullName.Substring($src.Length)
                if ($_.PSIsContainer) {
                    New-Item -ItemType Directory -Force -Path $dest | Out-Null
                } else {
                    $dd = Split-Path $dest
                    if (-not (Test-Path $dd)) { New-Item -ItemType Directory -Force -Path $dd | Out-Null }
                    Copy-Item $_.FullName $dest -Force -EA SilentlyContinue
                }
            }
            & $addLog "File copiati"
        } catch {
            & $addLog "ERRORE copia: $_" $false
            $script:instOk = $false
        }

        # Step 3: Node.js
        & $setStep "Verifica Node.js..." 25
        try {
            $nv = & node --version 2>&1
            & $addLog "Node.js: $nv"
        } catch {
            & $addLog "ATTENZIONE: Node.js non trovato - installa da nodejs.org" $false
        }

        # Step 4: npm install
        & $setStep "Installazione dipendenze..." 35
        $fd = Join-Path $path "frontend-src"
        if (Test-Path $fd) {
            try {
                & $addLog "npm install in corso..."
                Push-Location $fd
                $null = & npm install --prefer-offline 2>&1
                Pop-Location
                & $addLog "Dipendenze OK"

                # Step 5: Build
                & $setStep "Compilazione interfaccia..." 60
                "VITE_PB_URL=" | Set-Content (Join-Path $fd ".env") -Encoding UTF8
                Push-Location $fd
                $null = & npm run build 2>&1
                Pop-Location

                $dist = Join-Path $fd "dist"
                $pub  = Join-Path $path "app\pb_public"
                New-Item -ItemType Directory -Force -Path $pub | Out-Null

                if (Test-Path $dist) {
                    Copy-Item "$dist\*" $pub -Recurse -Force
                    & $addLog "Interfaccia compilata"
                } else {
                    & $addLog "ERRORE: build fallita - controlla Node.js" $false
                    $script:instOk = $false
                }
            } catch {
                & $addLog "ERRORE build: $_" $false
                $script:instOk = $false
                Pop-Location -EA SilentlyContinue
            }
        }

        # Step 6: Config
        & $setStep "Configurazione..." 85
        @{ firstRun = $true; adminEmail = $email; adminPasswordPlain = $pwd } |
            ConvertTo-Json | Set-Content (Join-Path $path "cassa.config.json") -Encoding UTF8
        & $addLog "Credenziali salvate"

        # Step 7: Desktop
        if ($desktop) {
            & $setStep "Collegamento desktop..." 92
            try {
                $sh  = New-Object -ComObject WScript.Shell
                $lnk = $sh.CreateShortcut("$env:USERPROFILE\Desktop\Cassa Oratorio.lnk")
                $lnk.TargetPath      = Join-Path $path "AVVIA_CASSA.bat"
                $lnk.WorkingDirectory = $path
                $lnk.Description     = "Avvia Cassa Oratorio"
                $lnk.Save()
                & $addLog "Collegamento creato"
            } catch {
                & $addLog "ATTENZIONE: collegamento non creato" $false
            }
        }

        $prog.Value = 100
        if ($script:instOk) {
            $lblS.Text     = "Installazione completata!"
            $lblS.ForeColor = $cVerde
            & $addLog "=== COMPLETATO ==="
        } else {
            $lblS.Text      = "Completato con avvisi - controlla i messaggi"
            $lblS.ForeColor = [System.Drawing.Color]::FromArgb(217, 119, 6)
        }
        $btnFine.Enabled = $true
    })

    $btnFine.Add_Click({ $f.Close() })
    $f.ShowDialog() | Out-Null
    return $script:instOk
}

# ── Main ──────────────────────────────────────────────────────
$step = 1
$loc  = $null
$acc  = $null
$opt  = $null

while ($true) {
    switch ($step) {
        1 {
            $r = S1_Benvenuto
            if ($r -eq "exit") { exit }
            $step = 2
        }
        2 {
            $loc = S2_Posizione
            if ($loc.action -eq "back") { $step = 1 } else { $step = 3 }
        }
        3 {
            $acc = S3_Account
            if ($acc.action -eq "back") { $step = 2 } else { $step = 4 }
        }
        4 {
            $opt = S4_Riepilogo $loc.path $acc.email
            if ($opt.action -eq "back") {
                $step = 3
            } else {
                $ok = S5_Installa $loc.path $acc.email $acc.password $opt.desktop
                if ($ok -and $opt.avvia) {
                    $bat = Join-Path $loc.path "AVVIA_CASSA.bat"
                    if (Test-Path $bat) { Start-Process $bat }
                }
                [System.Windows.Forms.MessageBox]::Show(
                    "Cassa Oratorio installata in:`n$($loc.path)`n`nUsa AVVIA_CASSA.bat per avviare.",
                    "Installazione completata",
                    [System.Windows.Forms.MessageBoxButtons]::OK,
                    [System.Windows.Forms.MessageBoxIcon]::Information
                ) | Out-Null
                exit
            }
        }
    }
}
