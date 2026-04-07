# Cassa Oratorio — Changelog

## v1.2.0 (07/04/2026)

### Nuove funzionalità
- **Ristampa scontrino**: pulsante "🖨 Ristampa" nel dettaglio dello storico scontrini, accanto a Sconto e Storno
- **Modale pagamento compattata**: banconote tutte su una riga, monete tutte su una riga, tastierino numerico con 0/punto/cancella allineati sull'ultima riga

### Miglioramenti
- Griglia azioni nello storico scontrini ora a 3 colonne (Sconto | Ristampa | Storno)
- Ridotti margini e padding nella modale pagamento per occupare meno spazio verticale

### File modificati
- `ModalePagamento.jsx` — layout banconote/monete/numpad compattato
- `ModaleStorico.jsx` — aggiunto import stampa e pulsante ristampa

---

## v1.1.0 (05/04/2026)

### Nuove funzionalità
- **Controllo scorte real-time**: verifica disponibilità durante composizione carrello (omaggi + pagati contano verso la scorta; -1 = scorta infinita, mai decrementata)
- **Famiglie disattivate nascoste**: le famiglie prodotto disabilitate non appaiono nella vista Cassa
- **Numero tavolo nelle comande**: il tavolo viene mostrato nelle card ordini
- **Asporto**: toggle asporto con evidenziazione arancione nelle comande e stampa "*** ASPORTO ***" su scontrino e comanda
- **Tagli banconote e monete**: pulsanti denominazione Euro nella modale pagamento con calcolo automatico del resto
- **Schermo intero**: pulsante ⛶ nella barra di navigazione globale
- **Display comande live**: pagina ComandeDisplay con checkbox per-riga sincronizzate con collection `righe_pronte`
- **Export Excel**: esportazione .xlsx con tre fogli (Venduto, Scontrini, Riepilogo)
- **Ruoli dinamici**: lista ruoli per utenti (admin, cassiere, barista, cuoco, cameriere)
- **Protezione eliminazione**: impedisce cancellazione prodotti con storico vendite
- **Stampa unificata**: scontrino e comanda cucina in una sola finestra browser
- **Preferenze display persistenti**: salvate in localStorage

### File modificati
- `useCassa.js`, `Cassa.jsx`, `Statistiche.jsx`, `package.json`
- `ModalePagamento.jsx`, `ComandeDisplay.jsx`, `App.jsx`
- `stampa.js`, `1_init_schema.js`

---

## v1.0.0 (28/03/2026)

### Release iniziale
- Interfaccia cassa con griglia prodotti organizzati per famiglie colorate
- Scontrino con sconto percentuale e in euro
- Pagamento contanti/carta/omaggio
- Gestione magazzino (prodotti, famiglie, scorte)
- Statistiche giornaliere con storico scontrini
- Comande per cucina/bar con stampa separata
- Setup completo (prodotti, famiglie, comande, stampante)
- Accesso multi-dispositivo via WiFi locale
- Backend PocketBase v0.36.7 con SQLite embedded
- Portabilità su chiavetta USB
