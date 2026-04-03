# Cassa Oratorio

Sistema di cassa open source per oratori italiani. Gestisce vendite, magazzino, comande per cucina/bar e statistiche di incasso. Gira interamente in locale su Windows, senza cloud e senza abbonamenti.

![Versione](https://img.shields.io/badge/versione-1.0.0-blue)
![Licenza](https://img.shields.io/badge/licenza-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-lightgrey)

## Funzionalità

- **Cassa** — prodotti raggruppati per famiglia, sconti, omaggi, note per riga
- **Comande** — schermata live per cucina/bar, evase condivise tra dispositivi, riepilogo prodotti
- **Magazzino** — scarico automatico, carichi manuali, movimenti, scorta infinita
- **Statistiche** — incassi per periodo, venduto per prodotto, export CSV
- **Stampa** — scontrino e comande in un'unica stampa, margini configurabili
- **Multi-dispositivo** — accesso da tablet e telefoni sulla rete WiFi locale
- **Portabile** — gira da chiavetta USB su qualsiasi PC Windows

## Stack tecnologico

- **Frontend**: React 18 + Vite
- **Backend**: PocketBase v0.36 (SQLite embedded)
- **Script avvio**: PowerShell

## Requisiti

- Windows 10 o 11
- Node.js LTS (solo per la prima compilazione)
- Connessione internet al primo avvio (~15 MB per PocketBase)

## Installazione rapida

1. Scarica lo ZIP dalla pagina [Releases](../../releases)
2. Estrai in una cartella (es. `C:\CassaOratorio\`)
3. Installa [Node.js](https://nodejs.org) LTS
4. Doppio clic su **`INSTALLA.bat`** — segui la procedura guidata
5. Oppure manualmente: `BUILD_FRONTEND.bat` poi `AVVIA_CASSA.bat`

## Accesso da tablet/telefono

1. Avvia `AVVIA_CASSA.bat` come amministratore (apre la porta firewall)
2. Apri la cassa usando l'IP di rete del PC (es. `http://192.168.1.15:8090`)
3. Nella pagina Comande premi 📱 per il QR code

## Licenza

MIT — vedi [LICENSE](LICENSE)

## Crediti

- [PocketBase](https://pocketbase.io) — MIT License
- [React](https://react.dev) — MIT License
- [Vite](https://vitejs.dev) — MIT License
