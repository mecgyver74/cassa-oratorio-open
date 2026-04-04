# Setup Database PocketBase - Cassa Oratorio

## 1. Scarica PocketBase
https://pocketbase.io/docs/ → Download per Windows/Linux/Mac
Estrai e avvia: `./pocketbase serve`
Apri: http://127.0.0.1:8090/_/

## 2. Crea le collezioni nell'ordine seguente

### Collection: `utenti` (Base)
| Campo | Tipo | Opzioni |
|-------|------|---------|
| nome | text | required |
| postazione | text | required |
| ruolo | select | options: admin, cassiere |
| pin | text | - |
| attivo | bool | default: true |

### Collection: `famiglie` (Base)
| Campo | Tipo | Opzioni |
|-------|------|---------|
| nome | text | required |
| codice | number | - |
| colore | text | default: #888888 |
| attivo | bool | default: true |
| ordine | number | default: 0 |

### Collection: `magazzini_comuni` (Base)
| Campo | Tipo | Opzioni |
|-------|------|---------|
| nome | text | required |
| quantita | number | default: 0 |
| soglia_allarme | number | default: 5 |

### Collection: `comande` (Base)
| Campo | Tipo | Opzioni |
|-------|------|---------|
| nome | text | required |
| abilitata | bool | default: true |
| stampante | text | - |
| copie | number | default: 1 |
| salva_su_db | bool | default: true |
| invia_stampante | bool | default: false |
| famiglie_ids | json | - |
| ordine | number | default: 0 |

### Collection: `prodotti` (Base)
| Campo | Tipo | Opzioni |
|-------|------|---------|
| nome | text | required |
| codice_pers | text | - |
| famiglia | relation | famiglie, required |
| magazzino_comune | relation | magazzini_comuni, optional |
| prezzo | number | required |
| quantita | number | default: 0 |
| unita | text | default: pz |
| soglia_allarme | number | default: 0 |
| attivo | bool | default: true |
| solo_menu | bool | default: false |
| colore | text | - |
| ordine | number | default: 0 |
| stampa | bool | default: true |
| comanda | relation | comande, optional |

### Collection: `menu` (Base)
| Campo | Tipo | Opzioni |
|-------|------|---------|
| nome | text | required |
| prezzo | number | required |
| colore | text | - |
| attivo | bool | default: true |
| ordine | number | default: 0 |

### Collection: `menu_componenti` (Base)
| Campo | Tipo | Opzioni |
|-------|------|---------|
| menu | relation | menu, required |
| nome | text | required |
| colore | text | - |
| ordine | number | default: 0 |

### Collection: `menu_prodotti` (Base)
| Campo | Tipo | Opzioni |
|-------|------|---------|
| componente | relation | menu_componenti, required |
| prodotto | relation | prodotti, required |

### Collection: `tavoli` (Base)
| Campo | Tipo | Opzioni |
|-------|------|---------|
| numero | text | required |
| nome | text | - |
| attivo | bool | default: true |

### Collection: `scontrini` (Base)
| Campo | Tipo | Opzioni |
|-------|------|---------|
| numero | number | required |
| data_ora | date | required |
| operatore | relation | utenti, optional |
| postazione | text | - |
| tavolo | relation | tavoli, optional |
| note | text | - |
| totale_lordo | number | required |
| sconto_perc | number | default: 0 |
| sconto_euro | number | default: 0 |
| totale_netto | number | required |
| tipo_pagamento | select | options: contanti, carta, omaggio |
| pagato | number | default: 0 |
| resto | number | default: 0 |
| stornato | bool | default: false |
| data_storno | date | - |
| note_storno | text | - |

### Collection: `righe_scontrino` (Base)
| Campo | Tipo | Opzioni |
|-------|------|---------|
| scontrino | relation | scontrini, required |
| prodotto | relation | prodotti, optional |
| menu | relation | menu, optional |
| nome_snapshot | text | required |
| prezzo_snapshot | number | required |
| quantita | number | required |
| unita | text | - |
| totale_riga | number | required |
| omaggio | bool | default: false |
| note | text | - |
| stornata | bool | default: false |

### Collection: `movimenti_magazzino` (Base)
| Campo | Tipo | Opzioni |
|-------|------|---------|
| prodotto | relation | prodotti, optional |
| magazzino_comune | relation | magazzini_comuni, optional |
| tipo | select | options: carico, scarico, rettifica |
| quantita | number | required |
| note | text | - |
| scontrino | relation | scontrini, optional |

## 3. Configura CORS in PocketBase
Settings → Application → CORS origins: aggiungi `http://localhost:5173` (dev) e il tuo dominio produzione.

## 4. Crea superuser
Al primo avvio PocketBase chiede email/password admin → usala per il setup.
