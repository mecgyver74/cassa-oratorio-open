# CASSA ORATORIO — Guida all'installazione

## Requisiti

- Windows 10 o 11
- Connessione internet al primo avvio (per scaricare il database, ~15 MB)
- Node.js installato (scarica da https://nodejs.org — versione LTS)

---

## Prima installazione (passi nell'ordine)

### Passo 1 — Estrai la cartella
Estrai il contenuto dello ZIP in una posizione definitiva sul PC,
ad esempio `C:\CassaOratorio\`

### Passo 2 — Compila l'interfaccia
Doppio click su **`BUILD_FRONTEND.bat`**
- Installa le dipendenze e compila l'interfaccia grafica
- Richiede Node.js installato
- Da fare solo la prima volta (o dopo aggiornamenti)

### Passo 3 — Avvia la cassa
Doppio click su **`AVVIA_CASSA.bat`**

Al primo avvio ti chiederà:
- Email per l'account amministratore
- Password (minimo 8 caratteri)

### Passo 4 — Configura il database
Si aprirà il browser su `http://127.0.0.1:8090`

Vai su **Setup** e inserisci:
- Famiglie di prodotti (con colori)
- Prodotti (con prezzi e scorte)
- Comande (abbinando ogni comanda alle famiglie di prodotti)

---

## Utilizzo quotidiano

Doppio click su **`AVVIA_CASSA.bat`** ogni volta.

Si apre la finestra nera (il server) e poi il browser con la cassa.
**Non chiudere la finestra nera** finché la cassa è in uso.

Per spegnere: chiudi la finestra nera o premi CTRL+C.

---

## Configurare le comande

Perché i prodotti appaiano nella schermata **Comande**, devi:

1. Andare in **Setup → Comande**
2. Creare una comanda (es. "Griglia", "Bar", "Fritti")
3. Selezionare le **famiglie** di prodotti che appartengono a quella comanda
4. In **Setup → Prodotti**, assegnare ogni prodotto alla famiglia corretta

---

## Accesso da tablet o telefono

1. Avvia `AVVIA_CASSA.bat` **come amministratore** (clic destro → Esegui come amministratore) almeno la prima volta — aggiunge automaticamente la regola firewall
2. Trova l'IP del PC: apri il prompt e digita `ipconfig`, cerca "Indirizzo IPv4" (es. `192.168.1.15`)
3. Sul PC apri la cassa usando l'IP: `http://192.168.1.15:8090`
4. Nella pagina Comande, premi il bottone 📱 per generare il QR code
5. Inquadra il QR dal tablet — si apre direttamente la cassa

Se il tablet gira e non risponde: aspetta 10-15 secondi, la prima connessione può essere lenta. Se continua a non funzionare, il router potrebbe avere il "client isolation" attivo (impedisce ai dispositivi WiFi di comunicare tra loro) — verifica nelle impostazioni del router.

---

## Multi-cassa (più PC o telefoni)

Il database è pronto per multi-cassa.

Sul PC principale avvia `AVVIA_CASSA.bat` normalmente.

Su altri PC o telefoni (stessa rete WiFi), apri il browser e vai su:
```
http://[IP-DEL-PC-PRINCIPALE]:8090
```
Per trovare l'IP: apri il prompt e digita `ipconfig`, cerca "Indirizzo IPv4".

---

## File e cartelle

| File/Cartella | Descrizione |
|---|---|
| `AVVIA_CASSA.bat` | **Avvia la cassa** (doppio click ogni volta) |
| `BUILD_FRONTEND.bat` | Compila l'interfaccia (prima volta e aggiornamenti) |
| `INSTALLA_COLLEGAMENTO_DESKTOP.bat` | Crea icona sul desktop |
| `BACKUP_DATI.bat` | Crea un backup del database |
| `app/pb_data/` | **DATI DEL DATABASE — non cancellare mai!** |
| `frontend-src/` | Codice sorgente (per sviluppatori) |

---

## Backup dati

Esegui `BACKUP_DATI.bat` per creare una copia di sicurezza.
I backup vengono salvati nella cartella `backup/`.

Consiglio: esegui il backup dopo ogni serata.

---

## Problemi comuni

**"Esecuzione script disabilitata"**
Fai clic destro su `AVVIA_CASSA.bat` → Esegui come amministratore

**Il browser non si apre**
Vai manualmente su `http://127.0.0.1:8090`

**"Porta in uso"**
Chiudi eventuali istanze precedenti dal Task Manager (cerca "pocketbase")

**Le comande non mostrano prodotti**
Verifica in Setup → Comande che le famiglie siano selezionate correttamente

**Dati persi**
I dati sono in `app/pb_data/` — non cancellare mai questa cartella!

---

## Portabilita'

L'intera cartella e' portabile: puoi copiarla su USB e usarla
su qualsiasi PC Windows 10/11 senza installare nulla
(Node.js serve solo per ricompilare l'interfaccia).

---

## Crediti

Database: PocketBase (pocketbase.io) — MIT License
Interfaccia: React + Vite
