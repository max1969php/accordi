# Accordi

Pagina web per chi inizia a studiare il pianoforte: accordi e scale disegnati su una tastiera, con diteggiature, audio, esercizi e giri di accordi.

## Sezioni

1. **Accordi maggiori**: i 12 accordi, in posizione fondamentale e nei due rivolti, con diteggiatura MD/MS.
2. **Scale maggiori**: le 12 scale nell'ordine del circolo delle quinte, con armatura, relativa minore e diteggiatura.
3. **Accordi minori**: i 12 accordi minori, con i rivolti.
4. **Scale minori**: le 12 scale minori in forma naturale, armonica e melodica.
5. **Esercizi**: cinque dita, scale su una o due ottave, gruppi di 3 e di 4, terze, note ripetute, arpeggi, moto contrario e mani unite, con metronomo, più una routine quotidiana.
6. **Giri di accordi**: cadenza perfetta, giro di Do, giro pop, ii-V-I, Pachelbel, blues in 12 battute e giri minori in tutte le tonalità, con rivolti vicini e riproduzione in loop.

I nomi delle note si possono mostrare come Do Re Mi oppure come C D E. L'audio è sintetizzato con la Web Audio API, senza file esterni.

## Sviluppo

```bash
pnpm install
pnpm dev       # http://localhost:5173
pnpm build     # output in dist/
pnpm preview
```

## Deploy su Vercel

Il progetto è un sito statico Vite, che Vercel riconosce in automatico:

1. Fai il push del repository su GitHub.
2. Su [vercel.com/new](https://vercel.com/new) importa il repository `accordi`.
3. Lascia le impostazioni proposte (Framework: **Vite**, Build: `pnpm build`, Output: `dist`) e premi **Deploy**.

Da quel momento ogni push su `main` pubblica di nuovo il sito.
