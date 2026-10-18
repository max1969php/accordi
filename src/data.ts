export interface Fingering {
  rh: number[] // mano destra, dalla tonica salendo
  lh: number[] // mano sinistra, dalla tonica salendo
}

export const CHORD_FINGERS: Fingering[] = [
  { rh: [1, 3, 5], lh: [5, 3, 1] }, // fondamentale
  { rh: [1, 2, 5], lh: [5, 3, 1] }, // 1° rivolto
  { rh: [1, 3, 5], lh: [5, 2, 1] }, // 2° rivolto
]

const STD: Fingering = { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] }

export const MAJOR_FINGERS: Record<string, Fingering> = {
  C: STD,
  G: STD,
  D: STD,
  A: STD,
  E: STD,
  B: { rh: STD.rh, lh: [4, 3, 2, 1, 4, 3, 2, 1] },
  'F#': { rh: [2, 3, 4, 1, 2, 3, 1, 2], lh: [4, 3, 2, 1, 3, 2, 1, 4] },
  Db: { rh: [2, 3, 1, 2, 3, 4, 1, 2], lh: [3, 2, 1, 4, 3, 2, 1, 3] },
  Ab: { rh: [3, 4, 1, 2, 3, 1, 2, 3], lh: [3, 2, 1, 4, 3, 2, 1, 3] },
  Eb: { rh: [3, 1, 2, 3, 4, 1, 2, 3], lh: [3, 2, 1, 4, 3, 2, 1, 3] },
  Bb: { rh: [4, 1, 2, 3, 1, 2, 3, 4], lh: [3, 2, 1, 4, 3, 2, 1, 3] },
  F: { rh: [1, 2, 3, 4, 1, 2, 3, 4], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
}

export const MINOR_FINGERS: Record<string, Fingering> = {
  A: STD,
  E: STD,
  D: STD,
  G: STD,
  C: STD,
  B: { rh: STD.rh, lh: [4, 3, 2, 1, 4, 3, 2, 1] },
  'F#': { rh: [3, 4, 1, 2, 3, 1, 2, 3], lh: [4, 3, 2, 1, 3, 2, 1, 4] },
  'C#': { rh: [3, 4, 1, 2, 3, 1, 2, 3], lh: [3, 2, 1, 4, 3, 2, 1, 3] },
  'G#': { rh: [3, 4, 1, 2, 3, 1, 2, 3], lh: [3, 2, 1, 4, 3, 2, 1, 3] },
  Eb: { rh: [3, 1, 2, 3, 4, 1, 2, 3], lh: [2, 1, 4, 3, 2, 1, 3, 2] },
  Bb: { rh: [4, 1, 2, 3, 1, 2, 3, 4], lh: [2, 1, 3, 2, 1, 4, 3, 2] },
  F: { rh: [1, 2, 3, 4, 1, 2, 3, 4], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
}

/** Varianti per la minore naturale dove la 7ª non alterata cambia la posizione del pollice. */
export const NATURAL_MINOR_FINGERS: Record<string, Fingering> = {
  'G#': { rh: [3, 4, 1, 2, 3, 1, 2, 3], lh: [3, 2, 1, 3, 2, 1, 4, 3] },
}

const range =(a: number, b: number) =>
  Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => (a <= b ? a + i : a - i))

export interface Pattern {
  name: string
  desc: string
  hands: 'one' | 'contrary' | 'parallel'
  gen: () => number[] // gradi della scala (0 = tonica)
}

export const PATTERNS: Record<string, Pattern> = {
  five: {
    name: 'Cinque dita',
    desc: 'La mano resta ferma: un dito per tasto sulle prime cinque note (1-2-3-4-5). Ideale per iniziare: cerca un suono uguale con tutte le dita.',
    hands: 'one',
    gen: () => [...range(0, 4), ...range(3, 0)],
  },
  scale: {
    name: 'Scala – 1 ottava',
    desc: 'Sali e scendi con la diteggiatura della scheda Scale. Il pollice passa sotto la mano senza scatti e senza alzare il polso.',
    hands: 'one',
    gen: () => [...range(0, 7), ...range(6, 0)],
  },
  scale2: {
    name: 'Scala – 2 ottave',
    desc: 'Come sopra su due ottave: il passaggio del pollice si ripete. Tieni il polso morbido e il braccio che accompagna la mano.',
    hands: 'one',
    gen: () => [...range(0, 14), ...range(13, 0)],
  },
  groups3: {
    name: 'Gruppi di 3',
    desc: 'In Do: Do-Re-Mi, Re-Mi-Fa, Mi-Fa-Sol… e poi a scendere. Rafforza l’indipendenza delle dita.',
    hands: 'one',
    gen: () => [...range(0, 5).flatMap((i) => [i, i + 1, i + 2]), ...range(7, 2).flatMap((i) => [i, i - 1, i - 2])],
  },
  groups4: {
    name: 'Gruppi di 4',
    desc: 'In Do: Do-Re-Mi-Fa, Re-Mi-Fa-Sol… Ottimo con il metronomo: accenta la prima nota di ogni gruppo.',
    hands: 'one',
    gen: () => [
      ...range(0, 4).flatMap((i) => [i, i + 1, i + 2, i + 3]),
      ...range(7, 3).flatMap((i) => [i, i - 1, i - 2, i - 3]),
    ],
  },
  thirds: {
    name: 'Per terze',
    desc: 'In Do: Do-Mi, Re-Fa, Mi-Sol… Salti di terza: allenano l’orecchio e preparano agli accordi.',
    hands: 'one',
    gen: () => [...range(0, 5).flatMap((i) => [i, i + 2]), ...range(7, 2).flatMap((i) => [i, i - 2])],
  },
  repeated: {
    name: 'Note ripetute',
    desc: 'Ogni nota due volte. Controlla che la seconda abbia lo stesso volume della prima: il dito rimbalza, non spinge.',
    hands: 'one',
    gen: () => [...range(0, 7), ...range(6, 0)].flatMap((d) => [d, d]),
  },
  arpeggio: {
    name: 'Arpeggio – 2 ottave',
    desc: 'Le note dell’accordo di tonica (1-3-5) su due ottave. In Do: MD 1-2-3-1-2-3-5, MS 5-4-2-1-4-2-1.',
    hands: 'one',
    gen: () => [0, 2, 4, 7, 9, 11, 14, 11, 9, 7, 4, 2, 0],
  },
  contrary: {
    name: 'Moto contrario',
    desc: 'Entrambi i pollici sulla tonica: la MD sale mentre la MS scende. In Do maggiore le due mani usano le stesse dita nello stesso momento: è il modo più facile per iniziare a mani unite.',
    hands: 'contrary',
    gen: () => [...range(0, 7), ...range(6, 0)],
  },
  parallel: {
    name: 'Mani unite (parallelo)',
    desc: 'MD e MS a un’ottava di distanza salgono e scendono insieme. Le dita delle due mani sono diverse: vai molto piano.',
    hands: 'parallel',
    gen: () => [...range(0, 7), ...range(6, 0)],
  },
}

export interface Progression {
  id: string
  name: string
  nick: string
  mode: 'major' | 'minor'
  chords: string[]
  desc: string
}

export const PROGRESSIONS: Progression[] = [
  {
    id: 'cadenza',
    name: 'I – IV – V – I',
    nick: 'Cadenza perfetta',
    mode: 'major',
    chords: ['I', 'IV', 'V', 'I'],
    desc: 'Il giro più importante di tutti: tonica, sottodominante, dominante e ritorno a casa. In Do: Do – Fa – Sol – Do.',
  },
  {
    id: 'giro-do',
    name: 'I – vi – IV – V',
    nick: 'Il “giro di Do”',
    mode: 'major',
    chords: ['I', 'vi', 'IV', 'V'],
    desc: 'Il classico giro anni ’50–’60 (Stand by Me e moltissime canzoni italiane). In Do: Do – Lam – Fa – Sol.',
  },
  {
    id: 'pop',
    name: 'I – V – vi – IV',
    nick: 'Giro pop',
    mode: 'major',
    chords: ['I', 'V', 'vi', 'IV'],
    desc: 'Lo trovi in centinaia di successi pop (Let It Be, Someone Like You…). In Do: Do – Sol – Lam – Fa.',
  },
  {
    id: 'pop-min',
    name: 'vi – IV – I – V',
    nick: 'Pop malinconico',
    mode: 'major',
    chords: ['vi', 'IV', 'I', 'V'],
    desc: 'Gli stessi accordi del giro pop, ma partendo dal vi: il colore diventa più triste.',
  },
  {
    id: 'ii-v-i',
    name: 'ii – V – I',
    nick: 'Cadenza jazz',
    mode: 'major',
    chords: ['ii', 'V', 'I', 'I'],
    desc: 'La cadenza alla base del jazz. In Do: Rem – Sol – Do. Con i rivolti vicini le dita si muovono pochissimo.',
  },
  {
    id: 'canone',
    name: 'I – V – vi – iii – IV – I – IV – V',
    nick: 'Canone di Pachelbel',
    mode: 'major',
    chords: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
    desc: 'La celebre sequenza del Canone in Re. Ottima per allenare i cambi di accordo.',
  },
  {
    id: 'blues',
    name: 'Blues in 12 battute',
    nick: 'Blues',
    mode: 'major',
    chords: ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'],
    desc: 'La forma del blues e del rock’n’roll: 12 battute con soli tre accordi (I, IV, V).',
  },
  {
    id: 'min-cad',
    name: 'i – iv – V – i',
    nick: 'Cadenza minore',
    mode: 'minor',
    chords: ['i', 'iv', 'V', 'i'],
    desc: 'La cadenza perfetta in minore. Il V è maggiore (dalla scala armonica): in La minore Mi maggiore con il Sol♯.',
  },
  {
    id: 'andalusa',
    name: 'i – VII – VI – V',
    nick: 'Cadenza andalusa',
    mode: 'minor',
    chords: ['i', 'VII', 'VI', 'V'],
    desc: 'Discesa tipica del flamenco (e di Hit the Road Jack). In La minore: Lam – Sol – Fa – Mi.',
  },
  {
    id: 'epico',
    name: 'i – VI – III – VII',
    nick: 'Minore “epico”',
    mode: 'minor',
    chords: ['i', 'VI', 'III', 'VII'],
    desc: 'Giro molto usato nelle colonne sonore e nel rock. In La minore: Lam – Fa – Do – Sol.',
  },
]

export const ROUTINE = [
  'Riscaldamento: cinque dita su e giù, mani separate (2 min)',
  'Scala del giorno a mani separate, lenta con metronomo (3 min)',
  'Stessa scala a gruppi di 3 o per terze (3 min)',
  'Arpeggio della tonalità (2 min)',
  'Accordi I – IV – V della tonalità con i rivolti (3 min)',
  'Mani unite a velocità ridotta (2 min)',
]

export const TIPS = [
  'Lento è veloce: suona a una velocità a cui non sbagli mai.',
  'Aumenta il metronomo di 4–6 bpm solo dopo 3 ripetizioni pulite di fila.',
  'Dita curve, come se tenessi una pallina; polso morbido, spalle giù.',
  'Il pollice suona con il lato, vicino all’unghia, e passa sotto la mano senza ruotare il polso.',
  'Dì il nome delle note ad alta voce mentre suoni: memorizzi più in fretta.',
  'Meglio 15 minuti ogni giorno che 2 ore la domenica.',
]
