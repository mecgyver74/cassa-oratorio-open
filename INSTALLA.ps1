# CASSA ORATORIO - Installer grafico v2
$ErrorActionPreference = "Continue"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$BLU    = [System.Drawing.Color]::FromArgb(26, 82, 118)
$VERDE  = [System.Drawing.Color]::FromArgb(22, 163, 74)
$SFONDO = [System.Drawing.Color]::FromArgb(245, 247, 250)
$BIANCO = [System.Drawing.Color]::White
$TESTO  = [System.Drawing.Color]::FromArgb(30, 30, 30)
$GRIGIO = [System.Drawing.Color]::FromArgb(107, 114, 128)

function NuovaFinestra($titolo, $w=600, $h=520) {
    $f = New-Object System.Windows.Forms.Form
    $f.Text = $titolo
    $f.Size = New-Object System.Drawing.Size($w, $h)
    $f.StartPosition = "CenterScreen"
    $f.FormBorderStyle = "FixedDialog"
    $f.MaximizeBox = $false
    $f.BackColor = $SFONDO
    $f.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    return $f
}

function Header($form, $titolo, $sub) {
    $p = New-Object System.Windows.Forms.Panel
    $p.Dock = "Top"; $p.Height = 80; $p.BackColor = $BLU
    $form.Controls.Add($p)
    $t = New-Object System.Windows.Forms.Label
    $t.Text = $titolo; $t.Left = 24; $t.Top = 14; $t.Width = 550; $t.Height = 30
    $t.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    $t.ForeColor = $BIANCO; $t.BackColor = [System.Drawing.Color]::Transparent
    $p.Controls.Add($t)
    $s = New-Object System.Windows.Forms.Label
    $s.Text = $sub; $s.Left = 24; $s.Top = 50; $s.Width = 550; $s.Height = 22
    $s.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $s.ForeColor = [System.Drawing.Color]::FromArgb(180,210,240)
    $s.BackColor = [System.Drawing.Color]::Transparent
    $p.Controls.Add($s)
}

function Lbl($form, $testo, $x, $y, $w=520, $h=22, $bold=$false) {
    $l = New-Object System.Windows.Forms.Label
    $l.Text = $testo; $l.Left = $x; $l.Top = $y; $l.Width = $w; $l.Height = $h
    $l.ForeColor = if ($bold) { $TESTO } else { $GRIGIO }
    $l.BackColor = [System.Drawing.Color]::Transparent
    if ($bold) { $l.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold) }
    $form.Controls.Add($l); return $l
}

function Inp($form, $x, $y, $w=520, $def="", $pwd=$false) {
    $t = New-Object System.Windows.Forms.TextBox
    $t.Left = $x; $t.Top = $y; $t.Width = $w; $t.Text = $def
    $t.Height = 28; $t.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    if ($pwd) { $t.UseSystemPasswordChar = $true }
    $t.BorderStyle = "FixedSingle"; $t.BackColor = $BIANCO
    $form.Controls.Add($t); return $t
}

function Btn($form, $testo, $x, $y, $w=140, $h=38, $primario=$false, $colore=$null) {
    $b = New-Object System.Windows.Forms.Button
    $b.Text = $testo; $b.Left = $x; $b.Top = $y; $b.Width = $w; $b.Height = $h
    $b.FlatStyle = "Flat"; $b.Cursor = "Hand"
    $b.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    if ($primario) {
        $b.BackColor = if ($colore) { $colore } else { $BLU }
        $b.ForeColor = $BIANCO; $b.FlatAppearance.BorderSize = 0
    } else {
        $b.BackColor = [System.Drawing.Color]::FromArgb(229,231,235)
        $b.ForeColor = $TESTO
        $b.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(209,213,219)
    }
    $form.Controls.Add($b); return $b
}

function Sep($form, $y) {
    $p = New-Object System.Windows.Forms.Panel
    $p.Left = 24; $p.Top = $y; $p.Width = 552; $p.Height = 1
    $p.BackColor = [System.Drawing.Color]::FromArgb(229,231,235)
    $form.Controls.Add($p)
}

# ── Schermata 1: Benvenuto ────────────────────────────────────
function S1_Benvenuto {
    $f = NuovaFinestra "Cassa Oratorio - Installazione" 600 500
    Header $f "Benvenuto in Cassa Oratorio" "Procedura guidata di installazione"

    $box = New-Object System.Windows.Forms.Panel
    $box.Left = 24; $box.Top = 100; $box.Width = 552; $box.Height = 190
    $box.BackColor = $BIANCO; $box.BorderStyle = "FixedSingle"
    $f.Controls.Add($box)
    $info = New-Object System.Windows.Forms.Label
    $info.Text = "Questa procedura ti guida in pochi passi:`n`n" +
        "  1.  Scegliere dove installare (PC o chiavetta USB)`n" +
        "  2.  Creare l'account amministratore`n" +
        "  3.  Compilare automaticamente l'interfaccia`n" +
        "  4.  Creare il collegamento sul desktop`n`n" +
        "Tempo stimato: 3-5 minuti."
    $info.Left = 16; $info.Top = 14; $info.Width = 520; $info.Height = 162
    $info.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $info.ForeColor = $TESTO; $info.BackColor = $BIANCO
    $box.Controls.Add($info)

    $avviso = New-Object System.Windows.Forms.Panel
    $avviso.Left = 24; $avviso.Top = 304; $avviso.Width = 552; $avviso.Height = 50
    $avviso.BackColor = [System.Drawing.Color]::FromArgb(255,251,235); $avviso.BorderStyle = "FixedSingle"
    $f.Controls.Add($avviso)
    $av = New-Object System.Windows.Forms.Label
    $av.Text = "Requisito: Node.js deve essere installato. Scaricalo da nodejs.org (versione LTS) se non lo hai."
    $av.Left = 12; $av.Top = 8; $av.Width = 528; $av.Height = 34
    $av.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $av.ForeColor = [System.Drawing.Color]::FromArgb(146,64,14); $av.BackColor = [System.Drawing.Color]::Transparent
    $avviso.Controls.Add($av)

    $btnOk   = Btn $f "Inizia l'installazione →" 388 430 188 40 $true
    $btnEsci = Btn $f "Esci" 24 430 100 40

    $r = $null
    $btnOk.Add_Click({ $script:r = "next"; $f.Close() })
    $btnEsci.Add_Click({ $script:r = "exit"; $f.Close() })
    $f.ShowDialog() | Out-Null
    return $script:r
}

# ── Schermata 2: Posizione ────────────────────────────────────
function S2_Posizione {
    $f = NuovaFinestra "Cassa Oratorio - Dove installare" 600 540
    Header $f "Dove vuoi installare?" "PC fisso o chiavetta USB portabile"

    # Pannello PC
    $panPC = New-Object System.Windows.Forms.Panel
    $panPC.Left = 24; $panPC.Top = 100; $panPC.Width = 552; $panPC.Height = 76
    $panPC.BackColor = $BIANCO; $panPC.BorderStyle = "FixedSingle"; $panPC.Cursor = "Hand"
    $f.Controls.Add($panPC)
    $rbPC = New-Object System.Windows.Forms.RadioButton
    $rbPC.Text = "  Installa su questo PC"; $rbPC.Left = 8; $rbPC.Top = 8
    $rbPC.Width = 530; $rbPC.Height = 26; $rbPC.Checked = $true
    $rbPC.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $rbPC.ForeColor = $BLU; $rbPC.BackColor = $BIANCO; $panPC.Controls.Add($rbPC)
    $ldPC = New-Object System.Windows.Forms.Label
    $ldPC.Text = "     Rimane su questo computer. Accesso rapido, massime prestazioni."
    $ldPC.Left = 8; $ldPC.Top = 36; $ldPC.Width = 530; $ldPC.Height = 30
    $ldPC.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $ldPC.ForeColor = $GRIGIO; $ldPC.BackColor = $BIANCO; $panPC.Controls.Add($ldPC)

    # Pannello USB
    $panUSB = New-Object System.Windows.Forms.Panel
    $panUSB.Left = 24; $panUSB.Top = 188; $panUSB.Width = 552; $panUSB.Height = 76
    $panUSB.BackColor = $BIANCO; $panUSB.BorderStyle = "FixedSingle"; $panUSB.Cursor = "Hand"
    $f.Controls.Add($panUSB)
    $rbUSB = New-Object System.Windows.Forms.RadioButton
    $rbUSB.Text = "  Chiavetta USB (portabile)"; $rbUSB.Left = 8; $rbUSB.Top = 8
    $rbUSB.Width = 530; $rbUSB.Height = 26
    $rbUSB.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $rbUSB.ForeColor = $BLU; $rbUSB.BackColor = $BIANCO; $panUSB.Controls.Add($rbUSB)
    $ldUSB = New-Object System.Windows.Forms.Label
    $ldUSB.Text = "     Portabile su qualsiasi PC Windows. Usa una chiavetta USB 3.0."
    $ldUSB.Left = 8; $ldUSB.Top = 36; $ldUSB.Width = 530; $ldUSB.Height = 30
    $ldUSB.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $ldUSB.ForeColor = $GRIGIO; $ldUSB.BackColor = $BIANCO; $panUSB.Controls.Add($ldUSB)

    $panPC.Add_Click({ $rbPC.Checked = $true })
    $panUSB.Add_Click({ $rbUSB.Checked = $true })

    Sep $f 278
    Lbl $f "Cartella di installazione:" 24 296 300 22 $true
    $txtPath = Inp $f 24 322 464 "C:\CassaOratorio"
    $btnBrowse = Btn $f "Sfoglia..." 498 320 78 30
    $btnBrowse.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $btnBrowse.Add_Click({
        $d = New-Object System.Windows.Forms.FolderBrowserDialog
        $d.Description = "Scegli cartella di installazione"
        if ($d.ShowDialog() -eq "OK") { $txtPath.Text = Join-Path $d.SelectedPath "CassaOratorio" }
    })

    $rbUSB.Add_CheckedChanged({
        if ($rbUSB.Checked) {
            $usb = $null
            foreach ($drv in (Get-PSDrive -PSProvider FileSystem -EA SilentlyContinue)) {
                try { $di=[System.IO.DriveInfo]::new($drv.Root); if($di.DriveType -eq 'Removable'){$usb=$drv.Root;break} } catch {}
            }
            $txtPath.Text = if ($usb) { Join-Path $usb "CassaOratorio" } else { "D:\CassaOratorio" }
        }
    })
    $rbPC.Add_CheckedChanged({ if ($rbPC.Checked) { $txtPath.Text = "C:\CassaOratorio" } })

    $btnOk  = Btn $f "Avanti →" 432 468 144 40 $true
    $btnInd = Btn $f "← Indietro" 24 468 120 40

    $r = $null
    $btnOk.Add_Click({
        if ([string]::IsNullOrWhiteSpace($txtPath.Text)) {
            [System.Windows.Forms.MessageBox]::Show("Inserisci una cartella.","Attenzione",[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Warning)|Out-Null; return
        }
        $script:r = @{action="next";path=$txtPath.Text;usb=$rbUSB.Checked}; $f.Close()
    })
    $btnInd.Add_Click({ $script:r=@{action="back"}; $f.Close() })
    $f.ShowDialog()|Out-Null; return $script:r
}

# ── Schermata 3: Account ──────────────────────────────────────
function S3_Account {
    $f = NuovaFinestra "Cassa Oratorio - Account" 600 470
    Header $f "Account amministratore" "Servono per accedere al pannello di configurazione avanzato"

    $nota = New-Object System.Windows.Forms.Panel
    $nota.Left=24; $nota.Top=100; $nota.Width=552; $nota.Height=44
    $nota.BackColor=[System.Drawing.Color]::FromArgb(239,246,255); $nota.BorderStyle="FixedSingle"
    $f.Controls.Add($nota)
    $ntxt = New-Object System.Windows.Forms.Label
    $ntxt.Text = "Conserva email e password — servono per accedere al pannello admin di PocketBase."
    $ntxt.Left=12; $ntxt.Top=10; $ntxt.Width=528; $ntxt.Height=24
    $ntxt.Font=New-Object System.Drawing.Font("Segoe UI",9)
    $ntxt.ForeColor=[System.Drawing.Color]::FromArgb(29,78,216); $ntxt.BackColor=[System.Drawing.Color]::Transparent
    $nota.Controls.Add($ntxt)

    Lbl $f "Email amministratore" 24 162 300 22 $true
    $txtEmail = Inp $f 24 188 552 "admin@cassaoratorio.it"
    Lbl $f "Password (minimo 8 caratteri)" 24 228 300 22 $true
    $txtPwd = Inp $f 24 254 552 "" $true
    Lbl $f "Conferma password" 24 294 300 22 $true
    $txtPwd2 = Inp $f 24 320 552 "" $true

    $btnOk  = Btn $f "Avanti →" 432 396 144 40 $true
    $btnInd = Btn $f "← Indietro" 24 396 120 40

    $r = $null
    $btnOk.Add_Click({
        if ($txtEmail.Text -notmatch '@') { [System.Windows.Forms.MessageBox]::Show("Email non valida.","Attenzione",[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Warning)|Out-Null; return }
        if ($txtPwd.Text.Length -lt 8) { [System.Windows.Forms.MessageBox]::Show("Password troppo corta (min 8).","Attenzione",[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Warning)|Out-Null; return }
        if ($txtPwd.Text -ne $txtPwd2.Text) { [System.Windows.Forms.MessageBox]::Show("Le password non coincidono.","Attenzione",[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Warning)|Out-Null; return }
        $script:r=@{action="next";email=$txtEmail.Text;password=$txtPwd.Text}; $f.Close()
    })
    $btnInd.Add_Click({ $script:r=@{action="back"}; $f.Close() })
    $f.ShowDialog()|Out-Null; return $script:r
}

# ── Schermata 4: Riepilogo ────────────────────────────────────
function S4_Riepilogo($path, $email) {
    $f = NuovaFinestra "Cassa Oratorio - Riepilogo" 600 460
    Header $f "Pronto per l'installazione" "Controlla e clicca Installa"

    $box = New-Object System.Windows.Forms.Panel
    $box.Left=24; $box.Top=100; $box.Width=552; $box.Height=100
    $box.BackColor=$BIANCO; $box.BorderStyle="FixedSingle"; $f.Controls.Add($box)
    $rl = New-Object System.Windows.Forms.Label
    $rl.Text = "Cartella:   $path`nEmail:        $email"
    $rl.Left=16; $rl.Top=14; $rl.Width=520; $rl.Height=72
    $rl.Font=New-Object System.Drawing.Font("Consolas",9)
    $rl.ForeColor=$TESTO; $rl.BackColor=$BIANCO; $box.Controls.Add($rl)

    Sep $f 216
    $cbDesk = New-Object System.Windows.Forms.CheckBox
    $cbDesk.Text="Crea collegamento sul desktop"; $cbDesk.Left=24; $cbDesk.Top=232
    $cbDesk.Width=400; $cbDesk.Height=26; $cbDesk.Checked=$true
    $cbDesk.Font=New-Object System.Drawing.Font("Segoe UI",10)
    $cbDesk.BackColor=[System.Drawing.Color]::Transparent; $f.Controls.Add($cbDesk)

    $cbAvvia = New-Object System.Windows.Forms.CheckBox
    $cbAvvia.Text="Avvia Cassa Oratorio al termine"; $cbAvvia.Left=24; $cbAvvia.Top=266
    $cbAvvia.Width=400; $cbAvvia.Height=26; $cbAvvia.Checked=$true
    $cbAvvia.Font=New-Object System.Drawing.Font("Segoe UI",10)
    $cbAvvia.BackColor=[System.Drawing.Color]::Transparent; $f.Controls.Add($cbAvvia)

    $btnOk  = Btn $f "Installa ora" 408 386 168 40 $true $VERDE
    $btnInd = Btn $f "← Indietro" 24 386 120 40

    $r=$null
    $btnOk.Add_Click({ $script:r=@{action="install";desktop=$cbDesk.Checked;avvia=$cbAvvia.Checked}; $f.Close() })
    $btnInd.Add_Click({ $script:r=@{action="back"}; $f.Close() })
    $f.ShowDialog()|Out-Null; return $script:r
}

# ── Schermata 5: Installazione ────────────────────────────────
function S5_Installa($path, $email, $pwd, $desktop) {
    $f = NuovaFinestra "Cassa Oratorio - Installazione" 600 520
    $f.ControlBox = $false
    Header $f "Installazione in corso..." "Non chiudere questa finestra"

    $lblS = New-Object System.Windows.Forms.Label
    $lblS.Left=24; $lblS.Top=100; $lblS.Width=552; $lblS.Height=24
    $lblS.Font=New-Object System.Drawing.Font("Segoe UI",10,[System.Drawing.FontStyle]::Bold)
    $lblS.ForeColor=$BLU; $lblS.BackColor=[System.Drawing.Color]::Transparent; $f.Controls.Add($lblS)

    $prog = New-Object System.Windows.Forms.ProgressBar
    $prog.Left=24; $prog.Top=130; $prog.Width=552; $prog.Height=18
    $prog.Minimum=0; $prog.Maximum=100; $prog.Style="Continuous"; $f.Controls.Add($prog)

    $log = New-Object System.Windows.Forms.RichTextBox
    $log.Left=24; $log.Top=158; $log.Width=552; $log.Height=290
    $log.ReadOnly=$true; $log.BackColor=[System.Drawing.Color]::FromArgb(15,23,42)
    $log.ForeColor=[System.Drawing.Color]::FromArgb(134,239,172)
    $log.Font=New-Object System.Drawing.Font("Consolas",9); $log.BorderStyle="None"
    $f.Controls.Add($log)

    $btnFine = Btn $f "Fine - Chiudi" 408 460 168 40 $true
    $btnFine.Enabled=$false

    $L = { param($m,$ok=$true); $log.AppendText("$(if($ok){'> '}else{'! '})$m`n"); $log.ScrollToCaret(); $f.Refresh() }
    $S = { param($m,$p); $lblS.Text=$m; $prog.Value=[Math]::Min(100,$p); $f.Refresh() }

    $instOk=$true

    $f.Add_Shown({
        & $S "Creazione cartella..." 5
        try { New-Item -ItemType Directory -Force -Path $path|Out-Null; & $L "Cartella: $path" }
        catch { & $L "ERRORE: $_" $false; $instOk=$false }

        & $S "Copia file..." 15
        $src = Split-Path -Parent $MyInvocation.ScriptName
        try {
            $ex = @('pb_data','cassa.config.json','cassa.log','backup','node_modules','dist','.env')
            Get-ChildItem $src -Recurse | Where-Object {
                $rel=$_.FullName.Substring($src.Length+1); $skip=$false
                foreach($e in $ex){ if($rel -like "*$e*"){$skip=$true;break} }; -not $skip
            } | ForEach-Object {
                $dest=Join-Path $path $_.FullName.Substring($src.Length)
                if($_.PSIsContainer){ New-Item -ItemType Directory -Force -Path $dest|Out-Null }
                else {
                    $dd=Split-Path $dest
                    if(-not(Test-Path $dd)){New-Item -ItemType Directory -Force -Path $dd|Out-Null}
                    Copy-Item $_.FullName $dest -Force -EA SilentlyContinue
                }
            }
            & $L "File copiati"
        } catch { & $L "ERRORE copia: $_" $false; $instOk=$false }

        & $S "Verifica Node.js..." 25
        try { $nv=& node --version 2>&1; & $L "Node.js $nv" }
        catch { & $L "ATTENZIONE: Node.js non trovato" $false }

        & $S "Installazione dipendenze..." 35
        $fd=Join-Path $path "frontend-src"
        if(Test-Path $fd){
            try {
                & $L "npm install..."
                & cmd /c "cd /d `"$fd`" && npm install --prefer-offline 2>&1"|ForEach-Object{}
                & $L "Dipendenze OK"
                & $S "Compilazione interfaccia..." 60
                "VITE_PB_URL="|Set-Content (Join-Path $fd ".env") -Encoding UTF8
                & cmd /c "cd /d `"$fd`" && npm run build 2>&1"|ForEach-Object{}
                $dist=Join-Path $fd "dist"
                $pub=Join-Path $path "app\pb_public"
                New-Item -ItemType Directory -Force -Path $pub|Out-Null
                if(Test-Path $dist){ Copy-Item "$dist\*" $pub -Recurse -Force; & $L "Interfaccia compilata" }
                else { & $L "ERRORE: build fallita — controlla Node.js" $false; $instOk=$false }
            } catch { & $L "ERRORE build: $_" $false; $instOk=$false }
        }

        & $S "Configurazione..." 85
        @{firstRun=$true;adminEmail=$email;adminPasswordPlain=$pwd}|ConvertTo-Json|Set-Content (Join-Path $path "cassa.config.json") -Encoding UTF8
        & $L "Credenziali salvate"

        if($desktop){
            & $S "Collegamento desktop..." 92
            try {
                $sh=New-Object -ComObject WScript.Shell
                $lnk=$sh.CreateShortcut("$env:USERPROFILE\Desktop\Cassa Oratorio.lnk")
                $lnk.TargetPath=Join-Path $path "AVVIA_CASSA.bat"
                $lnk.WorkingDirectory=$path; $lnk.Description="Avvia Cassa Oratorio"; $lnk.Save()
                & $L "Collegamento creato"
            } catch { & $L "ATTENZIONE: collegamento non creato" $false }
        }

        $prog.Value=100; $script:instOk=$instOk; $script:instPath=$path
        if($instOk){ $lblS.Text="Installazione completata!"; $lblS.ForeColor=$VERDE; & $L "=== COMPLETATO ===" }
        else { $lblS.Text="Completato con avvisi"; $lblS.ForeColor=[System.Drawing.Color]::FromArgb(217,119,6) }
        $btnFine.Enabled=$true
    })

    $btnFine.Add_Click({ $f.Close() })
    $f.ShowDialog()|Out-Null
    return $script:instOk
}

# ── Main ──────────────────────────────────────────────────────
$step=1; $loc=$null; $acc=$null; $opt=$null
while($true){
    switch($step){
        1{ $r=S1_Benvenuto; if($r -eq "exit"){exit}; $step=2 }
        2{ $loc=S2_Posizione; if($loc.action -eq "back"){$step=1}else{$step=3} }
        3{ $acc=S3_Account; if($acc.action -eq "back"){$step=2}else{$step=4} }
        4{
            $opt=S4_Riepilogo $loc.path $acc.email
            if($opt.action -eq "back"){$step=3}
            else{
                $ok=S5_Installa $loc.path $acc.email $acc.password $opt.desktop
                if($ok -and $opt.avvia){
                    $bat=Join-Path $loc.path "AVVIA_CASSA.bat"
                    if(Test-Path $bat){Start-Process $bat}
                }
                [System.Windows.Forms.MessageBox]::Show(
                    "Cassa Oratorio installata in:`n$($loc.path)`n`nUsa AVVIA_CASSA.bat per avviare.",
                    "Installazione completata",
                    [System.Windows.Forms.MessageBoxButtons]::OK,
                    [System.Windows.Forms.MessageBoxIcon]::Information)|Out-Null
                exit
            }
        }
    }
}
