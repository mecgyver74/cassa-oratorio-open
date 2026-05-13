# Novità — Cassa Dalila · Maggio 2026

> Documento integrativo per chi ha visto la presentazione della versione precedente.  
> Descrive solo le funzionalità nuove o modificate rispetto a quella versione.

---

## 1. Satispay — nuovo metodo di pagamento

Oltre a **Contanti** e **Carta**, è ora disponibile **Satispay** come metodo di pagamento.

- Si seleziona come gli altri metodi nella schermata di cassa
- Compare nel riepilogo della chiusura (voce separata)
- Incluso nell'**Incasso reale** (vedi punto 4)
- Riportato nel report XLS allegato all'email di chiusura

---

## 2. Metodo di pagamento obbligatorio

In precedenza era possibile completare uno scontrino senza selezionare un metodo di pagamento.  
Ora **il metodo è obbligatorio**: non è possibile procedere senza averne scelto uno.

Questo garantisce che il riepilogo di fine serata sia sempre accurato e completo.

---

## 3. Buoni Volontari — funzionalità completamente nuova

I volontari possono ricevere un **buono** di valore prestabilito (es. € 5,00) da spendere al banco.

### Come si configura

Nell'area amministrativa di PocketBase, nella collezione **Volontari**, si inseriscono nome e valore del buono per ogni volontario.

### Come funziona alla cassa

1. Selezionare il metodo di pagamento **Buono Volontario**
2. Scegliere il volontario dal menu a tendina
3. Il sistema mostra in tempo reale il **saldo residuo** del buono per quella sessione
4. Si può usare il buono per coprire **parzialmente o totalmente** il totale:
   - Se il buono copre tutto → pagamento completato
   - Se il buono copre solo una parte → il resto viene pagato con un altro metodo (contanti, carta, ecc.)

### Azzeramento automatico

Il saldo si azzera automaticamente a ogni chiusura cassa: all'inizio della nuova sessione il buono torna al valore pieno, indipendentemente da quanto è stato usato nella sessione precedente.

---

## 4. Incasso reale vs Valore venduto

Questa è una **correzione contabile** importante.

In precedenza, i buoni venivano sommati all'incasso della serata, ma si tratta di soldi virtuali: **non entrano fisicamente in cassa**, anzi rappresentano un **costo per l'oratorio**.

Ora le cifre sono separate chiaramente:

| Voce | Cosa comprende |
|---|---|
| **Incasso reale** | Contanti + Carta + Satispay (soldi veri incassati) |
| **Buoni (costo oratorio)** | Valore dei buoni usati — mostrato separatamente |
| **Valore venduto totale** | Incasso reale + Buoni + Omaggi (tutto ciò che è uscito dal banco) |

Questa distinzione appare in:
- Anteprima chiusura cassa
- Schermata Statistiche
- Dashboard
- Report XLS allegato all'email

---

## 5. Piccoli miglioramenti

### Tavolo nello scontrino
Lo scontrino ora può includere il **numero del tavolo**, inserito direttamente nel popup di cassa. Comodo per le serate con servizio ai tavoli.

### Modifica metodo di pagamento dallo storico
Dallo storico scontrini è ora possibile **correggere il metodo di pagamento** di uno scontrino già emesso, senza doverlo stornare e rifare.

### Filtro per metodo di pagamento nelle Statistiche
Nella schermata Statistiche è stato aggiunto un **filtro per tipo di pagamento**: si può visualizzare solo gli scontrini pagati con contanti, carta, Satispay, ecc.

---

## 6. Report di chiusura migliorato

L'email di chiusura cassa ora include:

- **Allegato XLS** (Excel) al posto del vecchio CSV, con più fogli:
  - **Riepilogo** — incasso reale, buoni, omaggi, contatori
  - **Dettaglio prodotti** — quantità venduta e valore per ogni prodotto
  - **Scontrini** — elenco completo di tutti gli scontrini della sessione

- **Corpo email** aggiornato con la distinzione tra Incasso reale e Buoni

Il file XLS si apre direttamente con Excel o LibreOffice Calc.

---

*Cassa Dalila — Oratorio Dalila · v1.4 · Maggio 2026*
