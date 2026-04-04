# Changelog - Cassa Oratorio

## v1.1.0 (2026-04-05)
- Spunte per singole righe nelle comande (preparazione progressiva, sincronizzate tra dispositivi)
- Preferenze comande persistenti in localStorage (filtro famiglie, ordine, vista)
- Protezione eliminazione prodotti già venduti con messaggio esplicativo
- Scorta infinita per prodotti (valore -1, non scala il magazzino)
- Stampa unificata: scontrino + comande in una sola finestra di stampa
- Fix scontrini con totale zero (omaggi totali e sconti 100%)
- Fix magazzino: scorta infinita non viene scalata dalle vendite
- Ruoli utente aggiornati: admin, cassiere, barista, cuoco, cameriere
- Installer grafico migliorato: finestre più grandi, fix errori PowerShell
- Fix ComandeDisplay: QR code con avviso localhost, pulsante schermo intero
- Fix CSS mobile: pannello scontrino sempre visibile, pulsante PAGA accessibile
- Fix ordine visualizzazione comande non persisteva al cambio pagina
- Nuova collection righe_pronte per spunte sincronizzate nel DB

## v1.0.0 (2026-04-03)
- Prima release pubblica stabile
- Cassa con prodotti per famiglia, sconti, omaggi, note righe
- Comande live con evase condivise tra dispositivi
- Magazzino con scarico automatico
- Statistiche per periodo
- Stampa scontrino e comande
- Installer grafico guidato
- Supporto chiavetta USB portabile
- Accesso multi-dispositivo via WiFi con QR code
