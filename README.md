# Cassa Dalila

Sistema di cassa per eventi e sagre, pensato per funzionare in locale su Windows senza dipendenze cloud. Un PC fa da server, tutti gli altri si collegano via browser — da PC, tablet o smartphone sulla stessa rete WiFi.

---

## Funzionalità

- **Cassa** — vendita prodotti con gestione comande e stampa scontrini
- **Comande** — schermata dedicata per le postazioni di preparazione (cucina, bar…)
- **Magazzino** — carico, scarico e rettifica scorte in tempo reale
- **Dashboard** — riepilogo vendite della sessione corrente
- **Statistiche** — analisi storica per prodotto, famiglia, operatore
- **Setup** — configurazione prodotti, famiglie, prezzi e comande
- **Multi-postazione** — più PC/tablet collegati simultaneamente allo stesso database
- **Chiusura cassa** — sessioni di cassa con reset contatori e archivio storico
- **Backup** — esportazione dati con un click

---

## Requisiti

- Windows 10 o 11
- Connessione internet al primo avvio (scarica PocketBase ~15 MB)

> Node.js è necessario solo per ricompilare l'interfaccia dopo modifiche al codice sorgente. Per l'uso normale non serve.

---

## Installazione

1. Scarica e decomprimi la cartella in una posizione definitiva (es. `C:\CassaDalila\`)
2. Doppio click su **`AVVIA_CASSA.bat`**
3. Al primo avvio viene chiesto email e password per l'account amministratore
4. Si apre automaticamente il browser sulla cassa

---

## Utilizzo quotidiano

Doppio click su **`AVVIA_CASSA.bat`** ogni volta.

Si apre la finestra del server (non chiuderla) e poi il browser con la cassa.  
Per spegnere: chiudi la finestra del server o premi `CTRL+C`.

---

## Accesso da tablet e smartphone

1. Avvia `AVVIA_CASSA.bat` come amministratore (aggiunge la regola firewall automaticamente)
2. Trova l'IP del PC: apri il prompt e digita `ipconfig`, cerca "Indirizzo IPv4" (es. `192.168.1.15`)
3. Dagli altri dispositivi sulla stessa rete, apri il browser su `http://192.168.1.15:8090`
4. Nella pagina Comande è disponibile un QR code da inquadrare direttamente

---

## Script disponibili

| File | Funzione |
|---|---|
| `AVVIA_CASSA.bat` | Avvia il server e apre la cassa |
| `BACKUP_DATI.bat` | Crea un backup del database |
| `INSTALLA_COLLEGAMENTO_DESKTOP.bat` | Crea icona sul desktop |
| `CONFIGURA_ACCESSO.bat` | Configura accesso da rete (firewall) |
| `DIAGNOSTICA.bat` | Verifica lo stato dell'installazione |
| `PREPARA_CHIAVETTA.bat` | Crea versione portable su USB |

---

## Struttura dati

I dati del database si trovano in `app/pb_data/` — **non cancellare mai questa cartella**.  
I backup vengono salvati in `backup/`.

---

## Stack tecnico

| Componente | Tecnologia |
|---|---|
| Backend / database | [PocketBase](https://pocketbase.io) |
| Frontend | React + Vite |
| Launcher | PowerShell |

---

## Licenza

MIT
