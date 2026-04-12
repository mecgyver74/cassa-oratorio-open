# Cassa Oratorio — Changelog

## v1.3.0 (12/04/2026)

### Nuove funzionalità
- **Ingredienti personalizzabili**: nel Setup Prodotti è possibile configurare la lista ingredienti per ogni prodotto (separati da virgola). Nella Cassa, i prodotti con ingredienti mostrano un pulsante 🔧 sulla riga scontrino che apre un menu a tendina per escludere singoli ingredienti (es. "no insalata, no formaggio"). Le esclusioni appaiono automaticamente sullo scontrino e sulla comanda stampata.

### Miglioramenti
- **Configurazione persistente nel database**: tutte le impostazioni di aspetto, stampa e preferenze comande sono ora salvate nella collection `configurazione` di PocketBase invece che nel localStorage del browser. Le impostazioni viaggiano con la chiavetta USB su qualsiasi PC. Al primo avvio viene eseguita una migrazione automatica dal browser al database.
- **Fullscreen preservato**: i dialoghi di conferma, inserimento testo e stampa non fanno più uscire dalla modalità schermo intero. Il fullscreen si ripristina automaticamente dopo ogni interazione.
- **Stampa via iframe**: la stampa di scontrini, comande e statistiche usa un iframe nascosto invece di aprire una nuova finestra del browser.

### File modificati
- `1_init_schema.js` — campo `ingredienti` (JSON) nella collection `prodotti`
- `Setup.jsx` — campo ingredienti nel form prodotto
- `Cassa.jsx` — pulsante 🔧 + dropdown ingredienti, fullscreen fix
- `useCassa.js` — passa `_ingredienti` alla riga carrello, usa `getConfig` da stampa.js
- `stampa.js` — stampa via iframe, ripristino fullscreen, config da DB
- `App.jsx` — migrazione localStorage → DB, fullscreen fix
- `ComandeDisplay.jsx` — preferenze da DB
- `EditorStampe.jsx` — config da DB
- `Statistiche.jsx` — stampa via iframe, fullscreen fix
- `ModaleStorico.jsx` — pulsante ristampa, fullscreen fix
- `ModalePagamento.jsx` — layout compattato
- `config.js` — NUOVO, utility lettura/scrittura configurazione da PocketBase
- `fullscreen.js` — NUOVO, wrapper dialoghi con ripristino fullscreen

---

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
