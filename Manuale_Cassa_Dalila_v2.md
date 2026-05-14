# CASSA DALILA
## Sistema di cassa per oratori
## MANUALE UTENTE
### Guida completa all'installazione e all'utilizzo
**Versione 1.4 | 2026**

---

## 1. Introduzione

Cassa Dalila è un sistema di cassa open source progettato specificamente per le esigenze degli oratori italiani. Permette di gestire vendite, scorte, comande per la cucina e statistiche di incasso, il tutto senza bisogno di connessione internet e con la possibilità di usare più dispositivi contemporaneamente sulla stessa rete WiFi.

Il sistema è completamente autonomo: gira su un normale PC Windows e non richiede abbonamenti, account cloud o software commerciali. I dati rimangono sul vostro hardware.

### Cosa puoi fare con Cassa Dalila

- Vendere prodotti e incassare pagamenti in contanti, carta, Satispay, buono volontario o omaggio
- Gestire buoni per i volontari con saldo residuo in tempo reale
- Gestire il magazzino con scorte e soglie di allarme
- Inviare automaticamente le comande alla cucina o al bar
- Usare tablet e telefoni come casse aggiuntive sulla rete WiFi
- Consultare statistiche di vendita e incassi con distinzione tra incasso reale e costi
- Stampare o esportare i dati in Excel
- Ricevere il report di chiusura via email con allegato Excel multi-foglio
- Gestire ordini da asporto con evidenziazione dedicata
- Ristampare scontrini dallo storico
- Passare in modalità schermo intero con un pulsante dedicato

### Requisiti di sistema

| Requisito | Dettaglio |
|-----------|-----------|
| Sistema operativo | Windows 10 o Windows 11 |
| Node.js | Versione LTS (scaricabile da nodejs.org) — necessario solo per la prima installazione |
| Connessione internet | Solo al primo avvio per scaricare il database (~15 MB) |
| Spazio su disco | Circa 50 MB per il programma, variabile per i dati |
| Rete locale | WiFi o cavo per accesso multi-dispositivo |

---

## 2. Installazione

### Installazione con installer guidato (consigliato)

Il modo più semplice per installare Cassa Dalila è usare l'installer grafico incluso nel pacchetto.

1. Scarica e installa Node.js da nodejs.org (scegli la versione LTS).
2. Estrai il contenuto dello ZIP in una cartella qualsiasi sul PC.
3. Fai doppio clic su **INSTALLA.bat** — si apre una procedura guidata a finestre.
4. Scegli dove installare (PC o chiavetta USB), inserisci email e password, scegli le opzioni.
5. Clicca **Installa ora** — il programma si compila e si configura automaticamente.
6. Al termine, la cassa si avvia da sola se hai selezionato l'opzione.

> **Suggerimento:** L'installer crea automaticamente il collegamento sul desktop, compila il frontend e configura tutto in autonomia.

### Installazione manuale su PC fisso

1. Scarica e installa Node.js da nodejs.org (scegli la versione LTS). Serve solo questa prima volta.
2. Estrai il contenuto dello ZIP di Cassa Dalila in una cartella definitiva, ad esempio `C:\CassaOratorio\`
3. Fai doppio clic su **BUILD_FRONTEND.bat** e aspetta che finisca.
4. Fai clic destro su **AVVIA_CASSA.bat** e scegli **Esegui come amministratore** — serve almeno la prima volta per aprire la porta nel firewall.
5. Al primo avvio inserisci email e password per l'account amministratore. Conservale.
6. Si apre automaticamente il browser con la cassa pronta.
7. Vai su **Setup** per inserire prodotti, famiglie e comande.

> **Attenzione:** Non chiudere la finestra nera di PocketBase mentre la cassa è in uso. Chiuderla spegne il server.

### Installazione su chiavetta USB

Cassa Dalila è completamente portabile: puoi usarla da una chiavetta USB su qualsiasi PC Windows senza installare nulla (tranne Node.js per la prima compilazione).

1. Su un PC con Node.js installato, estrai lo ZIP in una cartella temporanea.
2. Fai doppio clic su **PREPARA_CHIAVETTA.bat** — compila tutto sul PC e copia il risultato automaticamente.
3. Copia l'intera cartella sulla chiavetta USB.
4. Sulla chiavetta, usa solo **AVVIA_CASSA.bat**. Node.js non serve più.

> **Suggerimento:** Usa una chiavetta USB 3.0 o un SSD esterno per prestazioni migliori. Le chiavette lente possono rallentare il database.

### Aggiornare un'installazione esistente

Per aggiornare il software senza perdere i dati:

1. Sostituisci i file modificati (`CassaOratorio.ps1`, `BUILD_FRONTEND.bat`, e i file in `frontend-src/`).
2. Esegui **BUILD_FRONTEND.bat** per ricompilare l'interfaccia.
3. Riavvia **AVVIA_CASSA.bat**.

> **Attenzione:** Non toccare mai la cartella `app\pb_data\` — contiene il database con tutti i tuoi dati.

---

## 3. Avvio e uso quotidiano

### Avviare la cassa

Ogni giorno, per avviare la cassa:

1. Fai doppio clic su **AVVIA_CASSA.bat**
2. Si apre la finestra nera del server e poi il browser con la cassa
3. Puoi usare la cassa normalmente

> **Suggerimento:** Installa il collegamento sul desktop con **INSTALLA_COLLEGAMENTO_DESKTOP.bat** per avviare la cassa con un solo clic.

### Spegnere la cassa

Per spegnere il sistema a fine giornata:

- Chiudi la finestra nera di PocketBase, oppure
- Premi **CTRL+C** nella finestra nera

> **Suggerimento:** Prima di spegnere, esegui **BACKUP_DATI.bat** per creare una copia di sicurezza del database. I backup vengono salvati nella cartella `backup\`.

### Accesso da tablet o telefono

Puoi usare tablet e telefoni come casse aggiuntive o per visualizzare le comande, purché siano sulla stessa rete WiFi del PC.

1. Avvia la cassa sul PC come amministratore.
2. Il browser si apre automaticamente sull'indirizzo IP di rete corretto (es. `http://192.168.1.15:8090`).
3. Nella pagina **Comande**, premi il pulsante con il simbolo del telefono per generare un QR Code.
4. Inquadra il QR Code con la fotocamera del tablet — si apre direttamente la cassa.

> **Nota:** Se il tablet non si connette, controlla che il router non abbia attivo il client isolation.

---

## 4. Configurazione iniziale (Setup)

Prima di usare la cassa devi configurare prodotti, famiglie e comande. Accedi a **Setup** dalla barra in alto.

### Famiglie di prodotti

Le famiglie raggruppano i prodotti per categoria (es. Fritti, Bar, Dolci). Ogni famiglia ha un colore che appare sui pulsanti della cassa.

1. Vai su **Setup → Famiglie**
2. Clicca su **Nuova famiglia**
3. Inserisci il nome e scegli un colore
4. Ripeti per tutte le categorie

> **Suggerimento:** Le famiglie disattivate vengono automaticamente nascoste nella schermata Cassa insieme a tutti i loro prodotti.

### Prodotti

Ogni prodotto appartiene a una famiglia e ha un prezzo e una scorta.

1. Vai su **Setup → Prodotti**
2. Clicca su **Nuovo prodotto**
3. Compila: nome, prezzo, famiglia, scorta iniziale e soglia di allarme
4. Se la scorta è illimitata, imposta `-1` come quantità

> **Nota:** Se più prodotti condividono lo stesso stock, crea un **Magazzino comune** in Setup → Magazzini comuni.

### Comande

Le comande servono per inviare gli ordini alle stazioni di preparazione (cucina, bar, griglia).

1. Vai su **Setup → Comande**
2. Clicca su **Nuova comanda**
3. Inserisci il nome (es. Griglia, Bar, Fritti)
4. Seleziona le famiglie di prodotti che appartengono a questa comanda

> **Attenzione:** Se non assegni nessuna famiglia a una comanda, non apparirà nessun prodotto nella schermata comande.

### Volontari *(nuovo)*

Gestisci l'elenco dei volontari e il valore del loro buono consumazione.

1. Vai su **Setup → Volontari**
2. Clicca su **+ Nuovo**
3. Inserisci: nome e cognome, valore del buono (€), note opzionali
4. Salva

Il valore del buono si azzera automaticamente a ogni chiusura cassa: ogni serata i volontari ripartono con il buono pieno.

> **Nota:** I buoni non sono trasferibili e non si accumulano tra sessioni diverse.

### Aspetto dei pulsanti

Puoi personalizzare l'aspetto dei pulsanti della cassa in **Setup → Aspetto**:
- Dimensione del nome del prodotto e del prezzo
- Altezza, larghezza e spaziatura dei pulsanti
- Colore del testo

### Ingredienti personalizzabili

Per i prodotti che possono essere personalizzati dal cliente (es. hamburger, panini):

1. Vai su **Setup → Prodotti** e seleziona il prodotto
2. Nel campo **Ingredienti** inserisci gli ingredienti separati da virgola
3. Salva

In cassa, il pulsante 🔧 accanto al prodotto permette di selezionare gli ingredienti da escludere.

### Notifiche email

Per ricevere il riepilogo di chiusura cassa via email con allegato Excel:

1. Vai su **Setup → Notifiche**
2. Nel campo **Destinatari** inserisci uno o più indirizzi email, separati da virgola
3. Salva

> **Nota:** Per l'invio email è necessario configurare le impostazioni SMTP nel pannello PocketBase (Settings → Mail settings).

---

## 5. La cassa

### Come fare uno scontrino

1. Seleziona il filtro di famiglia in alto per filtrare i prodotti
2. Clicca sui pulsanti dei prodotti per aggiungerli allo scontrino
3. Modifica le quantità con i pulsanti **+** e **−**
4. Per aggiungere una nota a una riga, fai doppio clic sul nome del prodotto
5. Per personalizzare gli ingredienti, clicca il pulsante 🔧
6. Per omaggiare una singola riga, clicca l'icona omaggio direttamente sulla riga del prodotto
7. Per assegnare un numero tavolo, clicca il pulsante **Tavolo** nello scontrino
7. Per un ordine da asporto, attiva il toggle **Asporto**
8. Se è presente un volontario, selezionalo nella sezione **Buono Volontario** (vedi sotto)
9. Clicca **PAGA** per aprire il pannello di pagamento


### Buono Volontario *(nuovo)*

I volontari hanno diritto a un buono consumazione per la serata. Per utilizzarlo:

1. Nel piede dello scontrino, trova la sezione **Buono Volontario**
2. Seleziona il volontario dal menu a tendina
3. Viene mostrato automaticamente il **saldo residuo** del buono per questa sessione
4. Il sistema scala automaticamente il buono fino al valore totale dello scontrino
5. Il totale da pagare si aggiorna in tempo reale

**Copertura totale:** Se il buono copre l'intero importo, il modale di pagamento mostra "Interamente coperto dal buono" e non richiede alcun metodo di pagamento aggiuntivo.

**Copertura parziale:** Se il buono copre solo una parte, il modale chiede il pagamento del residuo con il metodo preferito (contanti, carta, Satispay).

> **Come funziona il saldo:** Il sistema somma tutti gli importi di buono usati nella sessione corrente per quel volontario. Il saldo residuo = valore del buono − quanto già usato questa sessione. Si azzera automaticamente a ogni chiusura cassa.

### Pagamento

Cliccando **PAGA** si apre il pannello di pagamento. **Il metodo di pagamento deve essere selezionato esplicitamente** — il pulsante Conferma rimane disattivato finché non si sceglie.

**Contanti**
Clicca sui pulsanti delle banconote e monete per comporre l'importo ricevuto. Il sistema calcola automaticamente il resto. Puoi anche digitare l'importo o lasciare il campo vuoto per registrare come pagamento esatto.

**Carta**
Registra il pagamento con carta. L'importo è automaticamente quello del totale.

**Satispay** *(nuovo)*
Registra il pagamento tramite Satispay. Viene tracciato separatamente nelle statistiche.

**Omaggio**
Registra l'articolo come omaggio. Il totale diventa zero.

> **Nota:** Il numero tavolo può essere inserito o modificato direttamente nel pannello di pagamento.

### Storico e modifiche

Il pulsante **Storico** mostra gli scontrini della giornata. Da qui puoi:

- Visualizzare le righe di ogni scontrino
- Rimuovere singole righe da uno scontrino
- Modificare le quantità
- Stornare completamente uno scontrino
- Ristampare uno scontrino con il pulsante **Ristampa**
- **Modificare il tipo di pagamento** di uno scontrino già emesso *(nuovo)*

> **Attenzione:** Le operazioni sullo storico sono registrate e non cancellano i dati — lo storno crea un movimento negativo che annulla lo scontrino originale.

---

## 6. Gestione comande

La pagina **Comande** è pensata per essere aperta su un tablet in cucina o al bar. Mostra in tempo reale tutti gli ordini da preparare.

### Interfaccia comande

| Elemento | Descrizione |
|----------|-------------|
| X in attesa | Numero di comande ancora da preparare |
| X evase | Numero di comande già completate |
| Tutte / [famiglia]... | Filtra per famiglia di prodotti |
| Freccia su/giù | Inverte l'ordine di visualizzazione |
| Riepilogo | Mostra i totali aggregati per prodotto |
| Telefono (QR) | Genera un QR Code per aprire la cassa da un altro dispositivo |

### Evadere una comanda

Quando un ordine è pronto, premi il pulsante verde **EVASA** sulla card. La comanda passa nella sezione in basso. Premi **Riapri** se hai premuto per errore.

### Checkbox per singola riga

Ogni riga di una comanda ha una checkbox per segnare i singoli prodotti come pronti. Le checkbox sono sincronizzate in tempo reale tra tutti i dispositivi.

### Vista per-riga e Riepilogo

- **Vista per-riga:** mostra tutti i prodotti raggruppati per tipo invece che per scontrino.
- **Riepilogo:** pannello con i totali aggregati di tutti i prodotti ancora da preparare.

---

## 7. Magazzino

La pagina **Magazzino** permette di gestire le scorte dei prodotti. Ogni vendita scala automaticamente la giacenza.

### Le due schede

**Magazzini comuni** — Stock condivisi tra più prodotti (es. panini usati da più tipi di hamburger).

**Prodotti singoli** — Prodotti con scorta propria, non collegati a un magazzino comune.

### Operazioni disponibili

**Carico (+)** — Aggiunge la quantità inserita alla scorta attuale. Usalo quando ricevi nuova merce.

**Rettifica (=)** — Imposta la scorta al valore esatto inserito. Usalo dopo un conteggio fisico.

---

## 8. Statistiche

La pagina **Statistiche** è organizzata in tre schede: **Corrente** (scontrini della sessione aperta), **Per data** (filtrabile per intervallo), **Sessioni archiviate** (storico delle chiusure precedenti).

### Filtro per tipo di pagamento *(nuovo)*

In cima alla pagina sono disponibili pulsanti rapidi per filtrare gli scontrini per metodo di pagamento:

**Tutti · Contanti · Carta · Satispay · Buono · Omaggio**

### I dati disponibili

| Voce | Descrizione |
|------|-------------|
| **Incasso reale** | Soldi fisicamente incassati (contanti + carta + Satispay) — esclude buoni e omaggi |
| Scontrini | Numero totale di scontrini validi |
| Media scontrino | Valore medio per scontrino (calcolato sull'incasso reale) |
| Contanti | Totale pagato in contanti |
| Carta | Totale pagato con carta |
| Satispay | Totale pagato con Satispay |
| **Buoni (costo oratorio)** | Valore consumato dai volontari tramite buono — è un costo per l'oratorio, non un'entrata |
| Omaggi | Valore degli articoli omaggiati |
| Pezzi venduti | Numero totale di articoli venduti |

> **Nota sulla distinzione incasso/buoni:** I buoni non sono soldi che entrano in cassa — rappresentano quanto l'oratorio ha offerto ai volontari. Per questo vengono mostrati separatamente in viola, con segno negativo, e non confluiscono nell'incasso reale.

### Venduto per prodotto

Tabella con quantità, omaggi e incasso per ogni prodotto.

### Storico scontrini

Elenco di tutti gli scontrini con: numero, data/ora, operatore, lordo, buono usato, netto, metodo di pagamento, stato.

### Export Excel

Il pulsante **⬇ Excel** genera un file Excel con tre fogli:

| Foglio | Contenuto |
|--------|-----------|
| **Venduto** | Quantità e incasso per ogni prodotto, inclusi gli omaggi |
| **Scontrini** | Elenco completo con numero, data, lordo, buono, netto, pagamento, stato |
| **Riepilogo** | Incasso reale, scontrini, media, contanti, carta, Satispay, buoni (costo), valore venduto totale |

### Chiusura cassa

La chiusura cassa archivia la sessione corrente: tutti gli scontrini vengono collegati alla sessione e il contatore ricomincia da #0001. È una funzione riservata agli amministratori.

**Per chiudere la cassa:**

1. In Statistiche, premi il pulsante **🔒 Chiudi cassa** (visibile solo agli admin)
2. Verifica il riepilogo nell'anteprima: scontrini validi, incasso reale, buoni, contanti, carta, Satispay
3. Assegna un nome alla sessione (opzionale, default: data corrente)
4. Conferma — il sistema crea la sessione archivio e collega tutti gli scontrini correnti
5. Al termine, il contatore scontrini riparte automaticamente da #0001

**Alla chiusura vengono generati automaticamente nella cartella `chiusure/`:**
- File **XLS** multi-foglio (Riepilogo, Venduto, Scontrini) — aperto nativamente da Excel
- File **HTML** stampabile con le stesse informazioni

Se hai configurato i destinatari in Setup → Notifiche, il report viene inviato via email con l'**allegato XLS** automaticamente alla chiusura.

> **Nota:** Le sessioni archiviate sono consultabili nella scheda Sessioni archiviate di Statistiche.

### Eliminare gli scontrini

In fondo alla pagina, nella sezione Storico scontrini, trovi i pulsanti:

- **Elimina periodo selezionato** — Elimina gli scontrini nell'intervallo corrente
- **⚠ Elimina tutto** — Elimina tutti gli scontrini e tutte le sessioni archiviate

> **Attenzione:** L'eliminazione degli scontrini è irreversibile. Esegui sempre un backup prima di procedere.

---

## 9. Backup e sicurezza dei dati

### Eseguire un backup

1. Fai doppio clic su **BACKUP_DATI.bat**
2. Il backup viene salvato nella cartella `backup\` con la data e l'ora nel nome del file

> **Suggerimento:** Esegui il backup dopo ogni serata. Copia periodicamente la cartella `backup\` su un disco esterno o una chiavetta diversa.

### Dove sono i dati

Tutti i dati sono contenuti nella cartella `app\pb_data\`.

> **Attenzione:** Non cancellare mai la cartella `app\pb_data\`. Perderesti tutti i dati in modo definitivo.

### Trasferire il database

Per spostare il database su un nuovo PC o una nuova chiavetta:

1. Copia la cartella `app\pb_data\` dalla vecchia installazione
2. Incollala nella stessa posizione nella nuova installazione (sovrascrivi)
3. Avvia la nuova installazione — troverà tutti i dati

### Ripristino da backup

1. Spegni la cassa (chiudi la finestra nera)
2. Apri la cartella `backup\` e trova il backup da ripristinare
3. Copia il file `.db` e rinominalo `data.db`
4. Incollalo in `app\pb_data\` sovrascrivendo il file esistente
5. Riavvia la cassa

---

## 10. Problemi comuni e soluzioni

### Problemi di avvio

| Problema | Soluzione |
|----------|-----------|
| Esecuzione script disabilitata | Fai clic destro su AVVIA_CASSA.bat e scegli **Esegui come amministratore** |
| Il browser non si apre | Apri manualmente `http://127.0.0.1:8090` |
| Porta in uso | Chiudi eventuali istanze precedenti dal Task Manager (cerca `pocketbase`) |
| PocketBase non risponde | Windows Defender potrebbe aver bloccato l'eseguibile — vai su Sicurezza Windows → Protezione da virus, cerca pocketbase nella cronologia e sblocca |

### Problemi di rete (tablet/telefono)

| Problema | Soluzione |
|----------|-----------|
| Il tablet non si connette | Verifica che sia sulla stessa rete WiFi del PC. Aspetta 10-15 secondi al primo tentativo |
| Connessione lenta o assente | Il router potrebbe avere il client isolation attivo — disabilitalo |
| Le comande non si aggiornano | Controlla che le API Rules di tutte le collection in PocketBase siano vuote |
| QR Code punta a 127.0.0.1 | Apri la cassa sul PC usando l'IP di rete invece di localhost |

### Problemi con prodotti e magazzino

| Problema | Soluzione |
|----------|-----------|
| I prodotti non appaiono | Verifica che siano impostati come attivi in Setup → Prodotti |
| Le comande sono vuote | In Setup → Comande, assicurati di aver selezionato le famiglie per ogni comanda |
| La scorta non scala | Controlla che il prodotto abbia una scorta diversa da -1 (infinita) |
| Errore autocancelled | Temporaneo, si risolve da solo. Se persiste, riavvia la cassa |

---

## 11. Struttura dei file

| File / Cartella | Descrizione |
|-----------------|-------------|
| `INSTALLA.bat` | Installer guidato con interfaccia grafica |
| `AVVIA_CASSA.bat` | Avvia la cassa (doppio clic ogni volta) |
| `BUILD_FRONTEND.bat` | Compila l'interfaccia grafica |
| `PREPARA_CHIAVETTA.bat` | Compila e prepara l'installazione per una chiavetta USB |
| `BACKUP_DATI.bat` | Crea un backup del database |
| `INSTALLA_COLLEGAMENTO_DESKTOP.bat` | Crea un collegamento sul desktop |
| `CassaOratorio.ps1` | Script principale (non modificare) |
| `LEGGIMI.md` | Guida rapida all'installazione |
| `app/pb_data/` | **DATABASE — non cancellare mai!** |
| `app/pb_public/` | Frontend compilato servito da PocketBase |
| `app/pb_migrations/` | Script di inizializzazione e aggiornamento del database |
| `app/pb_hooks/` | Logica server-side (chiusura cassa, scarico magazzino) |
| `frontend-src/` | Codice sorgente dell'interfaccia (per sviluppatori) |
| `backup/` | Cartella dei backup (creata automaticamente) |
| `chiusure/` | Report XLS e HTML generati ad ogni chiusura cassa |

---

## 12. Pannello amministratore PocketBase

PocketBase include un pannello di amministrazione avanzato accessibile dal browser.

- Dal PC: `http://127.0.0.1:8090/_/`
- Da rete locale: `http://192.168.1.x:8090/_/`

> **Attenzione:** Il pannello admin è potente e permette di modificare direttamente il database. Usalo con attenzione.

### Impostare le regole di accesso

Dopo la prima installazione, alcune collection potrebbero avere le regole impostate su *Superusers only*. Per sbloccarle:

1. Apri il pannello admin
2. Vai su **Collections** e seleziona una collection
3. Clicca sulla scheda **API Rules**
4. Svuota il campo per ciascuna regola (List, View, Create, Update, Delete)
5. Clicca **Save changes**
6. Ripeti per tutte le collection: `scontrini`, `righe_scontrino`, `prodotti`, `famiglie`, `comande`, `magazzini_comuni`, `movimenti_magazzino`, `comande_evase`, `utenti`, `menu`, `tavoli`, `configurazione`, `righe_pronte`, `volontari`, `sessioni_cassa`

---

## 13. Informazioni tecniche

### Stack tecnologico

| Componente | Tecnologia |
|------------|------------|
| Frontend | React 18 + Vite — interfaccia utente web |
| Backend | PocketBase v0.36 — database SQLite embedded + API REST + realtime |
| Database | SQLite — file singolo, nessun server separato |
| Linguaggi | JavaScript/JSX per il frontend, PowerShell per gli script di avvio |

### Come funziona l'architettura

PocketBase fa tutto: serve il database, espone le API REST e serve i file statici del frontend. Il browser si connette a PocketBase che risponde sia con i dati che con l'interfaccia grafica. Non serve internet: tutto gira localmente.

### Modificare il frontend

1. Modifica i file in `frontend-src/src/`
2. Esegui **BUILD_FRONTEND.bat** per compilare
3. Riavvia la cassa

### Licenza

Cassa Dalila è un progetto open source. PocketBase è rilasciato sotto licenza MIT. React è rilasciato sotto licenza MIT.
