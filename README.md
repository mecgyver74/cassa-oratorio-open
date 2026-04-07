# 🏪 Cassa Oratorio

Sistema POS (Point of Sale) open-source per oratori e parrocchie italiane. Pensato per gestire la cassa di sagre, feste e spacci.

**Versione corrente: 1.2.0**

## Caratteristiche

- **Cassa veloce** — griglia prodotti organizzata per famiglie colorate, touch-friendly
- **Comande cucina/bar** — stampa separata per ogni postazione con display live e checkbox
- **Gestione magazzino** — scorte real-time con controllo automatico alla vendita
- **Asporto** — toggle dedicato con evidenziazione arancione e stampa su scontrino/comanda
- **Pagamento flessibile** — contanti (con tagli banconote/monete Euro), carta, omaggio
- **Storico scontrini** — con sconto post-vendita, storno e ristampa
- **Export Excel** — 3 fogli: Venduto, Scontrini, Riepilogo
- **Multi-dispositivo** — accesso simultaneo da PC, tablet e smartphone via WiFi locale
- **Portabile** — funziona da chiavetta USB, nessuna installazione richiesta
- **Schermo intero** — pulsante dedicato nella barra di navigazione

## Stack tecnologico

| Componente | Tecnologia |
|---|---|
| Frontend | React 18 + Vite |
| Backend | PocketBase v0.36.7 (SQLite embedded) |
| Scripting | PowerShell (Windows) |

## Requisiti

- Windows 10 o 11
- Node.js (versione LTS, da [nodejs.org](https://nodejs.org))
- Connessione internet solo al primo avvio (per `npm install`)

## Installazione rapida

1. Scarica o clona questo repository
2. Doppio click su **`BUILD_FRONTEND.bat`** (compila il frontend, solo la prima volta)
3. Doppio click su **`AVVIA_CASSA.bat`** (avvia il server)
4. Si apre il browser su `http://127.0.0.1:8090`
5. Al primo avvio crea un account admin su PocketBase

## Utilizzo quotidiano

1. Doppio click su **`AVVIA_CASSA.bat`**
2. Non chiudere la finestra nera (è il server)
3. Per spegnere: chiudi la finestra nera o premi CTRL+C

## Accesso da tablet/smartphone

1. Avvia la cassa sul PC principale
2. Trova l'IP del PC (`ipconfig` nel prompt)
3. Dal dispositivo mobile, apri `http://IP_DEL_PC:8090`
4. Oppure usa il QR code dalla pagina Comande

## Struttura del progetto

```
CassaOratorio/
├── app/                    # Backend PocketBase
│   ├── pocketbase.exe      # Eseguibile PocketBase
│   ├── pb_migrations/      # Schema database
│   └── pb_data/            # Dati (creato al primo avvio)
├── frontend-src/           # Sorgenti React
│   ├── src/
│   │   ├── pages/          # Pagine (Cassa, Magazzino, Setup, ecc.)
│   │   ├── components/     # Componenti (Pagamento, Storico, Toast)
│   │   └── lib/            # Logica (useCassa, stampa, PocketBase client)
│   └── package.json
├── AVVIA_CASSA.bat         # Avvia tutto
├── BUILD_FRONTEND.bat      # Compila il frontend
├── CHANGELOG.md            # Storico versioni
└── LEGGIMI.md              # Guida installazione dettagliata
```

## Licenza

MIT — Libero per uso personale e comunitario.

## Contributi

Segnala bug e proponi miglioramenti tramite le [Issues](https://github.com/mecgyver74/cassa-oratorio-open/issues) su GitHub.
