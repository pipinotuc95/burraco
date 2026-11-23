# ♥ ♠ Burraco ♦ ♣

Sito statico (GitHub Pages) per registrare le partite di Burraco e vedere le statistiche.

| Pagina | Cosa fa |
|---|---|
| **Nuova partita** (`index.html`) | Inserisci data, coppie, smazzate (totale calcolato in automatico), burraci puliti/sporchi, chiusura, note |
| **Statistiche** (`statistiche.html`) | Riepilogo, classifica giocatori e coppie (ordinabili), partite per mese |
| **Partite** (`partite.html`) | Elenco di tutte le partite con ricerca, dettaglio smazzate, modifica/elimina, backup JSON/CSV |
| **Tavoli** (`tavoli.html`) | Scegli coppia + avversari e vedi testa a testa, confronto statistiche e storico |

## Pubblicare su GitHub Pages
1. Crea un repository su GitHub e carica tutti i file di questa cartella.
2. Vai su **Settings → Pages**, scegli *Deploy from a branch*, branch `main`, cartella `/ (root)`.
3. Dopo un minuto il sito è online su `https://<tuo-utente>.github.io/<nome-repo>/`.

## Dove finiscono i dati
GitHub Pages ospita solo file statici: le partite sono salvate nel **browser** (localStorage) del dispositivo che usi.
Dalla pagina *Partite* puoi **esportare** un file JSON di backup e **importarlo** su un altro telefono/computer.
