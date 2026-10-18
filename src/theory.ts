export interface Pitch {
  letter: number // 0 = Do/C … 6 = Si/B
  acc: number // -2 … +2
}
export interface Note extends Pitch {
  midi: number
}
export type Notation = 'it' | 'en'
export type Quality = 'maj' | 'min'

const LETTER_PC = [0, 2, 4, 5, 7, 9, 11]
const NAMES: Record<Notation, string[]> = {
  it: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'],
  en: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
}
const ACC: Record<string, string> = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' }

export const mod = (n: number, m: number) => ((n % m) + m) % m

let notation: Notation = 'it'
export const getNotation = () => notation
export const setNotation = (n: Notation) => {
  notation = n
}

/** "F#", "Bb", "C" → Pitch */
export function parse(name: string): Pitch {
  const letter = 'CDEFGAB'.indexOf(name[0])
  let acc = 0
  for (const ch of name.slice(1)) acc += ch === '#' ? 1 : ch === 'b' ? -1 : 0
  return { letter, acc }
}

export const pc = (p: Pitch) => mod(LETTER_PC[p.letter] + p.acc, 12)
export const name = (p: Pitch, n: Notation = notation) => NAMES[n][p.letter] + ACC[String(p.acc)]
export const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(mod(midi, 12))

/** Spell a midi note using the given letter (handles ♯, ♭, 𝄪, 𝄫). */
function spell(midi: number, letter: number): Note {
  const l = mod(letter, 7)
  return { letter: l, acc: mod(midi - LETTER_PC[l] + 6, 12) - 6, midi }
}

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  nat: [0, 2, 3, 5, 7, 8, 10],
  harm: [0, 2, 3, 5, 7, 8, 11],
  mel: [0, 2, 3, 5, 7, 9, 11],
} as const
export type ScaleKind = keyof typeof SCALES

export const SCALE_LABEL: Record<ScaleKind, string> = {
  major: 'maggiore',
  nat: 'minore naturale',
  harm: 'minore armonica',
  mel: 'minore melodica',
}

/** Scale degree d (0 = tonic, may be negative or > 7) with root placed at base + pc(root). */
export function degree(root: Pitch, kind: ScaleKind, d: number, base = 60): Note {
  const midi = base + pc(root) + SCALES[kind][mod(d, 7)] + 12 * Math.floor(d / 7)
  return spell(midi, root.letter + d)
}

export const scale = (root: Pitch, kind: ScaleKind, base = 60) =>
  Array.from({ length: 8 }, (_, d) => degree(root, kind, d, base))

export function triad(root: Pitch, q: Quality, base = 60): Note[] {
  const r = base + pc(root)
  return [spell(r, root.letter), spell(r + (q === 'maj' ? 4 : 3), root.letter + 2), spell(r + 7, root.letter + 4)]
}

/** Move the lowest note up an octave `inv` times. */
export function invert(notes: Note[], inv: number): Note[] {
  let v = notes.map((n) => ({ ...n }))
  for (let i = 0; i < inv; i++) {
    const [first, ...rest] = v
    v = [...rest, { ...first, midi: first.midi + 12 }]
  }
  return v
}

export const chordSymbol = (root: Pitch, q: Quality, n: Notation = notation) =>
  name(root, n) + (q === 'min' ? 'm' : '')

export function enharmonic(p: Pitch): Pitch | null {
  if (p.acc === 0) return null
  const s = spell(60 + pc(p), p.letter + (p.acc > 0 ? 1 : -1))
  return { letter: s.letter, acc: s.acc }
}

export function keySignature(root: Pitch, kind: 'major' | 'nat') {
  const alt = scale(root, kind)
    .slice(0, 7)
    .filter((n) => n.acc !== 0)
  if (!alt.length) return { sym: '', notes: [] as Note[] }
  const sharp = alt[0].acc > 0
  const order = sharp ? [3, 0, 4, 1, 5, 2, 6] : [6, 2, 5, 1, 4, 0, 3] // Fa Do Sol Re La Mi Si / Si Mi La Re Sol Do Fa
  alt.sort((a, b) => order.indexOf(a.letter) - order.indexOf(b.letter))
  return { sym: sharp ? '♯' : '♭', notes: alt }
}
