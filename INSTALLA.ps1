# CASSA ORATORIO - Installer grafico
# Richiede PowerShell 5+ e .NET (incluso in Windows 10/11)
$ErrorActionPreference = "Continue"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ── Funzioni UI ───────────────────────────────────────────────
function MakeForm($title, $w, $h) {
    $f = New-Object System.Windows.Forms.Form
    $f.Text = $title
    $f.Size = New-Object System.Drawing.Size($w, $h)
    $f.StartPosition = "CenterScreen"
    $f.FormBorderStyle = "FixedDialog"
    $f.MaximizeBox = $false
    $f.BackColor = [System.Drawing.Color]::FromArgb(240, 242, 245)
    $f.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    return $f
}

function MakeLabel($form, $text, $x, $y, $w, $h, $bold=$false) {
    $l = New-Object System.Windows.Forms.Label
    $l.Text = $text; $l.Left = $x; $l.Top = $y; $l.Width = $w; $l.Height = $h
    if ($bold) { $l.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold) }
    $l.BackColor = [System.Drawing.Color]::Transparent
    $form.Controls.Add($l); return $l
}

function MakeTextBox($form, $x, $y, $w, $default="", $password=$false) {
    $t = New-Object System.Windows.Forms.TextBox
    $t.Left = $x; $t.Top = $y; $t.Width = $w; $t.Text = $default
    if ($password) { $t.UseSystemPasswordChar = $true }
    $t.BorderStyle = "FixedSingle"
    $form.Controls.Add($t); return $t
}

function MakeButton($form, $text, $x, $y, $w, $h, $primary=$false) {
    $b = New-Object System.Windows.Forms.Button
    $b.Text = $text; $b.Left = $x; $b.Top = $y; $b.Width = $w; $b.Height = $h
    $b.FlatStyle = "Flat"
    if ($primary) {
        $b.BackColor = [System.Drawing.Color]::FromArgb(26, 82, 118)
        $b.ForeColor = [System.Drawing.Color]::White
        $b.FlatAppearance.BorderSize = 0
        $b.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
    }
    $form.Controls.Add($b); return $b
}

function MakePanel($form, $x, $y, $w, $h, $color) {
    $p = New-Object System.Windows.Forms.Panel
    $p.Left = $x; $p.Top = $y; $p.Width = $w; $p.Height = $h
    $p.BackColor = $color
    $form.Controls.Add($p); return $p
}

# ── Schermata 1: Benvenuto ────────────────────────────────────
function ShowWelcome {
    $f = MakeForm "Cassa Oratorio - Installazione" 540 460
    
    # Header blu
    $header = MakePanel $f 0 0 500 80 ([System.Drawing.Color]::FromArgb(26, 82, 118))
    $title = New-Object System.Windows.Forms.Label
    $title.Text = "CASSA ORATORIO"
    $title.Left = 20; $title.Top = 20; $title.Width = 460; $title.Height = 30
    $title.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $title.ForeColor = [System.Drawing.Color]::White
    $title.BackColor = [System.Drawing.Color]::Transparent
    $header.Controls.Add($title)
    $sub = New-Object System.Windows.Forms.Label
    $sub.Text = "Procedura guidata di installazione"
    $sub.Left = 20; $sub.Top = 52; $sub.Width = 460; $sub.Height = 20
    $sub.ForeColor = [System.Drawing.Color]::FromArgb(200, 220, 240)
    $sub.BackColor = [System.Drawing.Color]::Transparent
    $header.Controls.Add($sub)

    MakeLabel $f "Benvenuto nell'installer di Cassa Oratorio." 20 110 460 20 $true
    MakeLabel $f "Questa procedura guidata ti aiuterà a:" 20 135 460 20
    MakeLabel $f "  • Scegliere dove installare il programma (PC o chiavetta USB)" 20 158 460 20
    MakeLabel $f "  • Creare l'account amministratore" 20 178 460 20
    MakeLabel $f "  • Compilare l'interfaccia grafica" 20 198 460 20
    MakeLabel $f "  • Creare il collegamento sul desktop" 20 218 460 20
    MakeLabel $f "Tempo stimato: 3-5 minuti (richiede connessione internet)" 20 250 460 20
    MakeLabel $f "Assicurati che Node.js sia installato (nodejs.org)" 20 270 460 20
    
    $btnNext = MakeButton $f "Inizia l'installazione →" 360 400 160 35 $true
    $btnEsci = MakeButton $f "Esci" 20 400 80 35

    $result = $null
    $btnNext.Add_Click({ $script:result = "next"; $f.Close() })
    $btnEsci.Add_Click({ $script:result = "exit"; $f.Close() })
    
    $f.ShowDialog() | Out-Null
    return $script:result
}

# ── Schermata 2: Posizione installazione ─────────────────────
function ShowLocation {
    $f = MakeForm "Cassa Oratorio - Posizione installazione" 540 500
    
    $header = MakePanel $f 0 0 500 60 ([System.Drawing.Color]::FromArgb(26, 82, 118))
    $t = New-Object System.Windows.Forms.Label
    $t.Text = "Dove vuoi installare Cassa Oratorio?"
    $t.Left = 20; $t.Top = 18; $t.Width = 460; $t.Height = 25
    $t.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $t.ForeColor = [System.Drawing.Color]::White
    $t.BackColor = [System.Drawing.Color]::Transparent
    $header.Controls.Add($t)

    # Radio PC
    $rbPC = New-Object System.Windows.Forms.RadioButton
    $rbPC.Text = "Installa su questo PC"
    $rbPC.Left = 20; $rbPC.Top = 90; $rbPC.Width = 300; $rbPC.Height = 20
    $rbPC.Checked = $true
    $rbPC.BackColor = [System.Drawing.Color]::Transparent
    $f.Controls.Add($rbPC)
    MakeLabel $f "Il programma resterà su questo computer." 40 112 420 18

    # Radio USB
    $rbUSB = New-Object System.Windows.Forms.RadioButton
    $rbUSB.Text = "Installa su chiavetta USB (portabile)"
    $rbUSB.Left = 20; $rbUSB.Top = 140; $rbUSB.Width = 300; $rbUSB.Height = 20
    $rbUSB.BackColor = [System.Drawing.Color]::Transparent
    $f.Controls.Add($rbUSB)
    MakeLabel $f "Il programma girerà da chiavetta su qualsiasi PC Windows." 40 162 420 18

    MakeLabel $f "Cartella di installazione:" 20 205 460 20 $true
    $txtPath = MakeTextBox $f 20 225 380 "C:\CassaOratorio"
    
    $btnBrowse = MakeButton $f "..." 410 223 60 26
    $btnBrowse.Add_Click({
        $browser = New-Object System.Windows.Forms.FolderBrowserDialog
        $browser.Description = "Scegli dove installare Cassa Oratorio"
        if ($browser.ShowDialog() -eq "OK") {
            $txtPath.Text = Join-Path $browser.SelectedPath "CassaOratorio"
        }
    })

    # Aggiorna path in base alla scelta
    $rbUSB.Add_CheckedChanged({
        if ($rbUSB.Checked) {
            # Cerca drive rimovibili
            $drives = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Root -match '^[A-Z]:\\$' }
            $usb = $drives | Where-Object {
                $d = [System.IO.DriveInfo]::new($_.Root)
                $d.DriveType -eq 'Removable'
            } | Select-Object -First 1
            if ($usb) {
                $txtPath.Text = Join-Path $usb.Root "CassaOratorio"
            } else {
                $txtPath.Text = "D:\CassaOratorio"
            }
        } else {
            $txtPath.Text = "C:\CassaOratorio"
        }
    })

    MakeLabel $f "Nota: la cartella verrà creata se non esiste." 20 260 460 18

    $btnNext = MakeButton $f "Avanti →" 380 430 140 35 $true
    $btnBack = MakeButton $f "← Indietro" 20 430 100 35

    $result = $null
    $btnNext.Add_Click({
        if ([string]::IsNullOrWhiteSpace($txtPath.Text)) {
            [System.Windows.Forms.MessageBox]::Show("Inserisci una cartella di installazione.", "Errore")
            return
        }
        $script:result = @{ action="next"; path=$txtPath.Text; usb=$rbUSB.Checked }
        $f.Close()
    })
    $btnBack.Add_Click({ $script:result = @{ action="back" }; $f.Close() })

    $f.ShowDialog() | Out-Null
    return $script:result
}

# ── Schermata 3: Account amministratore ─────────────────────
function ShowAccount {
    $f = MakeForm "Cassa Oratorio - Account amministratore" 540 440

    $header = MakePanel $f 0 0 500 60 ([System.Drawing.Color]::FromArgb(26, 82, 118))
    $t = New-Object System.Windows.Forms.Label
    $t.Text = "Crea l'account amministratore"
    $t.Left = 20; $t.Top = 18; $t.Width = 460; $t.Height = 25
    $t.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $t.ForeColor = [System.Drawing.Color]::White
    $t.BackColor = [System.Drawing.Color]::Transparent
    $header.Controls.Add($t)

    MakeLabel $f "Questi dati servono per accedere al pannello di amministrazione." 20 80 460 18
    MakeLabel $f "Conservali in un posto sicuro." 20 100 460 18

    MakeLabel $f "Email amministratore:" 20 140 460 20 $true
    $txtEmail = MakeTextBox $f 20 162 440 "admin@cassaoratorio.it"

    MakeLabel $f "Password (minimo 8 caratteri):" 20 200 460 20 $true
    $txtPwd = MakeTextBox $f 20 222 440 "" $true

    MakeLabel $f "Conferma password:" 20 260 460 20 $true
    $txtPwd2 = MakeTextBox $f 20 282 440 "" $true

    $btnNext = MakeButton $f "Avanti →" 380 390 140 35 $true
    $btnBack = MakeButton $f "← Indietro" 20 390 100 35

    $result = $null
    $btnNext.Add_Click({
        if ($txtEmail.Text -notmatch '@') {
            [System.Windows.Forms.MessageBox]::Show("Inserisci un'email valida.", "Errore"); return
        }
        if ($txtPwd.Text.Length -lt 8) {
            [System.Windows.Forms.MessageBox]::Show("La password deve essere di almeno 8 caratteri.", "Errore"); return
        }
        if ($txtPwd.Text -ne $txtPwd2.Text) {
            [System.Windows.Forms.MessageBox]::Show("Le password non coincidono.", "Errore"); return
        }
        $script:result = @{ action="next"; email=$txtEmail.Text; password=$txtPwd.Text }
        $f.Close()
    })
    $btnBack.Add_Click({ $script:result = @{ action="back" }; $f.Close() })

    $f.ShowDialog() | Out-Null
    return $script:result
}

# ── Schermata 4: Opzioni finali ───────────────────────────────
function ShowOptions {
    $f = MakeForm "Cassa Oratorio - Opzioni" 540 420

    $header = MakePanel $f 0 0 500 60 ([System.Drawing.Color]::FromArgb(26, 82, 118))
    $t = New-Object System.Windows.Forms.Label
    $t.Text = "Opzioni di installazione"
    $t.Left = 20; $t.Top = 18; $t.Width = 460; $t.Height = 25
    $t.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $t.ForeColor = [System.Drawing.Color]::White
    $t.BackColor = [System.Drawing.Color]::Transparent
    $header.Controls.Add($t)

    $cbDesktop = New-Object System.Windows.Forms.CheckBox
    $cbDesktop.Text = "Crea collegamento sul desktop"
    $cbDesktop.Left = 20; $cbDesktop.Top = 90; $cbDesktop.Width = 400; $cbDesktop.Height = 22
    $cbDesktop.Checked = $true
    $cbDesktop.BackColor = [System.Drawing.Color]::Transparent
    $f.Controls.Add($cbDesktop)

    $cbAvvia = New-Object System.Windows.Forms.CheckBox
    $cbAvvia.Text = "Avvia Cassa Oratorio al termine dell'installazione"
    $cbAvvia.Left = 20; $cbAvvia.Top = 120; $cbAvvia.Width = 400; $cbAvvia.Height = 22
    $cbAvvia.Checked = $true
    $cbAvvia.BackColor = [System.Drawing.Color]::Transparent
    $f.Controls.Add($cbAvvia)

    MakeLabel $f "Riepilogo installazione:" 20 165 460 20 $true
    $lblRiepilogo = MakeLabel $f "" 20 188 460 60

    $btnInstalla = MakeButton $f "Installa ora" 360 360 160 35 $true
    $btnBack = MakeButton $f "← Indietro" 20 360 100 35

    $result = $null
    $btnInstalla.Add_Click({
        $script:result = @{
            action="install"
            desktop=$cbDesktop.Checked
            avvia=$cbAvvia.Checked
        }
        $f.Close()
    })
    $btnBack.Add_Click({ $script:result = @{ action="back" }; $f.Close() })

    $f.ShowDialog() | Out-Null
    return $script:result
}

# ── Schermata 5: Installazione in corso ──────────────────────
function ShowProgress($installPath, $email, $password, $isUSB, $desktop) {
    $f = MakeForm "Cassa Oratorio - Installazione in corso..." 540 460
    $f.ControlBox = $false

    $header = MakePanel $f 0 0 500 60 ([System.Drawing.Color]::FromArgb(26, 82, 118))
    $t = New-Object System.Windows.Forms.Label
    $t.Text = "Installazione in corso..."
    $t.Left = 20; $t.Top = 18; $t.Width = 460; $t.Height = 25
    $t.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $t.ForeColor = [System.Drawing.Color]::White
    $t.BackColor = [System.Drawing.Color]::Transparent
    $header.Controls.Add($t)

    $lblStatus = MakeLabel $f "Preparazione..." 20 90 460 20
    $progress = New-Object System.Windows.Forms.ProgressBar
    $progress.Left = 20; $progress.Top = 118; $progress.Width = 460; $progress.Height = 24
    $progress.Minimum = 0; $progress.Maximum = 100; $progress.Value = 0
    $progress.Style = "Continuous"
    $f.Controls.Add($progress)

    $log = New-Object System.Windows.Forms.TextBox
    $log.Left = 20; $log.Top = 155; $log.Width = 460; $log.Height = 160
    $log.Multiline = $true; $log.ScrollBars = "Vertical"
    $log.ReadOnly = $true; $log.BackColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
    $log.ForeColor = [System.Drawing.Color]::FromArgb(100, 200, 100)
    $log.Font = New-Object System.Drawing.Font("Consolas", 8)
    $f.Controls.Add($log)

    $btnFine = MakeButton $f "Fine" 360 400 160 35 $true
    $btnFine.Enabled = $false

    $ok = $true

    $f.Add_Shown({
        $addLog = { param($msg, $col="ok")
            $log.AppendText("> $msg`r`n")
            $log.ScrollToCaret()
            $f.Refresh()
        }

        # Step 1: Crea cartella
        $lblStatus.Text = "Creazione cartella..."; $progress.Value = 5; $f.Refresh()
        try {
            New-Item -ItemType Directory -Force -Path $installPath | Out-Null
            & $addLog "Cartella creata: $installPath"
        } catch {
            & $addLog "ERRORE: $_"; $ok = $false
        }

        # Step 2: Copia file
        $lblStatus.Text = "Copia file..."; $progress.Value = 15; $f.Refresh()
        $src = Split-Path -Parent $MyInvocation.ScriptName
        try {
            $exclude = @('pb_data', 'cassa.config.json', 'cassa.log', 'backup', 'node_modules', 'dist')
            Get-ChildItem $src -Recurse | Where-Object {
                $rel = $_.FullName.Substring($src.Length)
                -not ($exclude | Where-Object { $rel -match [regex]::Escape($_) })
            } | ForEach-Object {
                $dest = Join-Path $installPath $_.FullName.Substring($src.Length)
                if ($_.PSIsContainer) {
                    New-Item -ItemType Directory -Force -Path $dest | Out-Null
                } else {
                    $destDir = Split-Path $dest
                    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
                    Copy-Item $_.FullName $dest -Force
                }
            }
            & $addLog "File copiati"
        } catch {
            & $addLog "ERRORE copia: $_"; $ok = $false
        }

        # Step 3: Verifica Node.js
        $lblStatus.Text = "Verifica Node.js..."; $progress.Value = 25; $f.Refresh()
        try {
            $nodeVer = & node --version 2>&1
            & $addLog "Node.js: $nodeVer"
        } catch {
            & $addLog "ATTENZIONE: Node.js non trovato. Installa da nodejs.org"
        }

        # Step 4: Build frontend
        $lblStatus.Text = "Compilazione interfaccia (potrebbe richiedere qualche minuto)..."; $progress.Value = 35; $f.Refresh()
        $frontDir = Join-Path $installPath "frontend-src"
        if (Test-Path $frontDir) {
            try {
                & $addLog "npm install in corso..."
                $npmOut = & cmd /c "cd /d `"$frontDir`" && npm install 2>&1"
                & $addLog "Dipendenze installate"
                $progress.Value = 60; $f.Refresh()
                & $addLog "Build in corso..."
                "VITE_PB_URL=" | Set-Content (Join-Path $frontDir ".env") -Encoding UTF8
                $buildOut = & cmd /c "cd /d `"$frontDir`" && npm run build 2>&1"
                # Copia dist in pb_public
                $distDir = Join-Path $frontDir "dist"
                $pbPublic = Join-Path $installPath "app\pb_public"
                New-Item -ItemType Directory -Force -Path $pbPublic | Out-Null
                Copy-Item "$distDir\*" $pbPublic -Recurse -Force
                & $addLog "Interfaccia compilata"
                $progress.Value = 80
            } catch {
                & $addLog "ERRORE build: $_"; $ok = $false
            }
        }

        # Step 5: Salva credenziali per primo avvio
        $lblStatus.Text = "Configurazione..."; $progress.Value = 85; $f.Refresh()
        $cfgPath = Join-Path $installPath "cassa.config.json"
        $cfg = @{ firstRun=$true; adminEmail=$email; adminPasswordPlain=$password } | ConvertTo-Json
        $cfg | Set-Content $cfgPath -Encoding UTF8
        & $addLog "Configurazione salvata"

        # Step 6: Collegamento desktop
        if ($desktop) {
            $progress.Value = 90; $f.Refresh()
            try {
                $batPath = Join-Path $installPath "AVVIA_CASSA.bat"
                $shell = New-Object -ComObject WScript.Shell
                $shortcut = $shell.CreateShortcut("$env:USERPROFILE\Desktop\Cassa Oratorio.lnk")
                $shortcut.TargetPath = $batPath
                $shortcut.WorkingDirectory = $installPath
                $shortcut.Description = "Avvia Cassa Oratorio"
                $shortcut.Save()
                & $addLog "Collegamento desktop creato"
            } catch {
                & $addLog "ATTENZIONE: collegamento non creato: $_"
            }
        }

        $progress.Value = 100
        if ($ok) {
            $lblStatus.Text = "Installazione completata!"
            $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(22, 163, 74)
            & $addLog "=== INSTALLAZIONE COMPLETATA ==="
        } else {
            $lblStatus.Text = "Installazione completata con errori"
            $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(220, 38, 38)
        }
        $btnFine.Enabled = $true
        $script:installOk = $ok
        $script:installPath2 = $installPath
    })

    $btnFine.Add_Click({ $f.Close() })
    $f.ShowDialog() | Out-Null
    return $script:installOk
}

# ── Main ──────────────────────────────────────────────────────
$step = 1
$locResult = $null
$accResult = $null
$optResult = $null

while ($true) {
    switch ($step) {
        1 {
            $r = ShowWelcome
            if ($r -eq "exit") { exit }
            $step = 2
        }
        2 {
            $locResult = ShowLocation
            if ($locResult.action -eq "back") { $step = 1 }
            else { $step = 3 }
        }
        3 {
            $accResult = ShowAccount
            if ($accResult.action -eq "back") { $step = 2 }
            else { $step = 4 }
        }
        4 {
            $optResult = ShowOptions
            if ($optResult.action -eq "back") { $step = 3 }
            else {
                # Installa
                $ok = ShowProgress `
                    -installPath $locResult.path `
                    -email $accResult.email `
                    -password $accResult.password `
                    -isUSB $locResult.usb `
                    -desktop $optResult.desktop

                if ($ok -and $optResult.avvia) {
                    $bat = Join-Path $locResult.path "AVVIA_CASSA.bat"
                    if (Test-Path $bat) { Start-Process $bat }
                }

                [System.Windows.Forms.MessageBox]::Show(
                    "Cassa Oratorio è stata installata in:`n$($locResult.path)`n`nUsa AVVIA_CASSA.bat per avviare la cassa.",
                    "Installazione completata",
                    [System.Windows.Forms.MessageBoxButtons]::OK,
                    [System.Windows.Forms.MessageBoxIcon]::Information
                ) | Out-Null
                exit
            }
        }
    }
}
