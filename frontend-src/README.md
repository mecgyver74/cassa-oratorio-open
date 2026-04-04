# Cassa Oratorio

Sistema di cassa open source per oratorio — React + PocketBase.

## Stack tecnologico
- **Frontend**: React 18 + Vite (PWA installabile su PC e telefono)
- **Backend + DB**: PocketBase (SQLite embedded, API REST, realtime)
- **Hosting backend**: Render.com (gratuito)
- **Hosting frontend**: Netlify o Vercel (gratuiti)
- **Licenza**: MIT — tutto gratuito per sempre

## Avvio in locale (sviluppo)

### 1. Avvia PocketBase
```bash
# Scarica da https://pocketbase.io/docs/
./pocketbase serve
# Apri http://127.0.0.1:8090/_/ e crea l'account admin
```

### 2. Configura il database
Segui le istruzioni in `SETUP_DATABASE.md` per creare tutte le collezioni.

### 3. Avvia il frontend
```bash
npm install
npm run dev
# Apri http://localhost:5173
```

## Deploy in produzione (gratuito)

### Backend su Render.com
1. Crea account su https://render.com
2. New → Web Service → Connect GitHub
3. Crea un repo con il Dockerfile:
```dockerfile
FROM alpine:latest
ARG PB_VERSION=0.22.0
RUN apk add --no-cache unzip ca-certificates wget
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip -d /pb/ \
    && rm *.zip
EXPOSE 8090
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
```
4. Start Command: lascia vuoto (usa CMD del Dockerfile)
5. Disk: aggiungi un disco da 1GB montato su `/pb/pb_data`

### Frontend su Netlify
```bash
npm run build
# Trascina la cartella `dist/` su netlify.com/drop
```
Oppure collega il repo GitHub e Netlify fa il deploy automatico.

### Variabile d'ambiente
Crea `.env` nella root del frontend:
```
VITE_PB_URL=https://tuo-app.onrender.com
```

## Struttura del progetto
```
cassa-oratorio/
├── src/
│   ├── pages/
│   │   ├── Cassa.jsx          ← Schermata cassa principale
│   │   ├── Statistiche.jsx    ← Report venduto e storico
│   │   ├── Magazzino.jsx      ← Gestione scorte
│   │   └── Setup.jsx          ← Configurazione prodotti/famiglie/menù
│   ├── components/
│   │   ├── ModalePagamento.jsx
│   │   └── Toast.jsx
│   ├── lib/
│   │   ├── pb.js              ← Client PocketBase
│   │   └── useCassa.js        ← Logica centrale cassa
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
│   └── manifest.json          ← PWA manifest
├── SETUP_DATABASE.md          ← Istruzioni database
├── index.html
├── package.json
└── vite.config.js
```

## Funzionalità
- ✅ Cassa con griglia prodotti colorata per famiglia
- ✅ Gestione menù composti (3 livelli: menù → componenti → prodotti)
- ✅ Magazzino comune condiviso tra prodotti
- ✅ Scarico automatico magazzino a ogni vendita
- ✅ Sconti in % o €, omaggi per riga
- ✅ Pagamento contanti (con calcolo resto), carta, omaggio
- ✅ Storno scontrino con ricarico magazzino automatico
- ✅ Comande configurabili per stampante/famiglia
- ✅ Statistiche: incasso, venduto per prodotto, storico scontrini
- ✅ Carico manuale e rettifica magazzino
- ✅ Setup completo: prodotti, famiglie, magazzini comuni, comande, menù, utenti
- ✅ Multi-cassa (accesso simultaneo da più dispositivi)
- ✅ PWA: installabile su telefono come app nativa
- ✅ 100% open source, zero costi

## Prossimi sviluppi suggeriti
- Stampa scontrino (window.print() o ESC/POS per stampante termica)
- Login con PIN per cambio operatore
- Chiusura cassa giornaliera con report PDF
- Gestione tavoli con scontrino sospeso/ripreso
- Comande: invio automatico alla stampante di cucina
