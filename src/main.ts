import './style.css'
import * as T from './theory'
import type { Note, Notation, Pitch, Quality, ScaleKind } from './theory'
import { highlight, keyboard, type Mark } from './keyboard'
import { player, type Step } from './audio'
import {
  CHORD_FINGERS,
  MAJOR_FINGERS,
  MINOR_FINGERS,
  NATURAL_MINOR_FINGERS,
  PATTERNS,
  PROGRESSIONS,
  ROUTINE,
  TIPS,
  type Fingering,
} from './data'

// Radici in ordine cromatico (accordi) e nel circolo delle quinte (scale)
const MAJ_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const MIN_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']
const MAJ_FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']
const MIN_FIFTHS = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'Eb', 'Bb', 'F', 'C', 'G', 'D']

const TABS = [
  ['accordi-maggiori', 'Accordi maggiori'],
  ['scale-maggiori', 'Scale maggiori'],
  ['accordi-minori', 'Accordi minori'],
  ['scale-minori', 'Scale minori'],
  ['esercizi', 'Esercizi'],
  ['giri', 'Giri di accordi'],
] as const
type TabId = (typeof TABS)[number][0]
type Hand = 'rh' | 'lh'

// ---------- stato ----------

const store = {
  get<V>(k: string, d: V): V {
    try {
      const v = localStorage.getItem(`accordi:${k}`)
      return v ? (JSON.parse(v) as V) : d
    } catch {
      return d
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(`accordi:${k}`, JSON.stringify(v))
    } catch {
      /* storage non disponibile */
    }
  },
}

interface State {
  notation: Notation
  tab: TabId
  inv: Record<Quality, number>
  hand: Hand
  minorForm: 'nat' | 'harm' | 'mel'
  ex: { kind: ScaleKind; tonic: number; pattern: string; hand: Hand; bpm: number; metro: boolean; loop: boolean }
  prog: { id: string; tonic: number; bpm: number; smooth: boolean; metro: boolean }
}

const defaults: State = {
  notation: 'it',
  tab: 'accordi-maggiori',
  inv: { maj: 0, min: 0 },
  hand: 'rh',
  minorForm: 'nat',
  ex: { kind: 'major', tonic: 0, pattern: 'scale', hand: 'rh', bpm: 72, metro: true, loop: false },
  prog: { id: 'cadenza', tonic: 0, bpm: 80, smooth: true, metro: true },
}
const saved = store.get<Partial<State>>('state', {})
const state: State = {
  ...defaults,
  ...saved,
  inv: { ...defaults.inv, ...saved.inv },
  ex: { ...defaults.ex, ...saved.ex },
  prog: { ...defaults.prog, ...saved.prog },
}
if (!PATTERNS[state.ex.pattern]) state.ex.pattern = defaults.ex.pattern
if (!PROGRESSIONS.some((p) => p.id === state.prog.id)) state.prog.id = defaults.prog.id
T.setNotation(state.notation)
const save = () => store.set('state', state)

// ---------- helpers di markup ----------

const N = (p: Pitch) => T.name(p)
const panel = (id: TabId) => document.getElementById(`p-${id}`)!

function seg(key: string, current: string | number, options: [string | number, string][]) {
  return `<div class="seg" role="group">${options
    .map(
      ([v, l]) =>
        `<button type="button" data-set="${key}" data-value="${v}" aria-pressed="${String(v) === String(current)}">${l}</button>`,
    )
    .join('')}</div>`
}

const playBtn = (kind: string, midis: number[], label: string, extra = '') =>
  `<button type="button" class="btn" data-play="${kind}" data-midis="${midis.join(',')}" data-label="${label}" ${extra}>${label}</button>`

const EXPAND_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>'
const expandBtn = `<button type="button" class="expand" data-expand aria-label="Ingrandisci" title="Ingrandisci">${EXPAND_ICON}</button>`

const intro = (title: string, body: string) => `<div class="intro"><h2>${title}</h2>${body}</div>`

const marksOf = (notes: Note[], fingers?: number[], rootLetter = notes[0].letter) =>
  new Map<number, Mark>(
    notes.map((n, i) => [n.midi, { label: N(n), finger: fingers?.[i], root: n.letter === rootLetter }]),
  )

const options = (items: [string | number, string][], current: string | number) =>
  items
    .map(([v, l]) => `<option value="${v}"${String(v) === String(current) ? ' selected' : ''}>${l}</option>`)
    .join('')

// ---------- tab 1 e 3: accordi ----------

function chordCard(rootName: string, q: Quality, inv: number) {
  const root = T.parse(rootName)
  let notes = T.invert(T.triad(root, q), inv)
  if (notes[0].midi > 71) notes = notes.map((n) => ({ ...n, midi: n.midi - 12 }))
  const f = CHORD_FINGERS[inv]
  const enh = T.enharmonic(root)
  const title = `${N(root)} ${q === 'maj' ? 'maggiore' : 'minore'}`
  return `<article class="card" data-expandable>
    <header class="card-h"><h3>${title}</h3><span class="sym" title="Sigla">${T.chordSymbol(root, q, 'en')}</span>${expandBtn}</header>
    ${enh ? `<p class="enh">detto anche ${N(enh)} ${q === 'maj' ? 'maggiore' : 'minore'}</p>` : ''}
    ${keyboard(60, 83, marksOf(notes, f.rh, root.letter), `Accordo di ${title}`)}
    <p class="notes">${notes.map((n) => `<span${n.letter === root.letter ? ' class="r"' : ''}>${N(n)}</span>`).join('<i>·</i>')}</p>
    <p class="fing"><b>MD</b> ${f.rh.join('-')} <span>·</span> <b>MS</b> ${f.lh.join('-')}</p>
    <div class="actions">
      ${playBtn('chord', notes.map((n) => n.midi), '▶ Accordo', `data-bass="${48 + T.pc(root)}"`)}
      ${playBtn('arp', notes.map((n) => n.midi), '♪ Arpeggio')}
    </div>
  </article>`
}

function renderChords(q: Quality) {
  const maj = q === 'maj'
  const text = maj
    ? `<p>Un accordo maggiore è formato da tre note: la <b>fondamentale</b>, la <b>terza maggiore</b> (4 semitoni sopra) e la <b>quinta giusta</b> (7 semitoni sopra).</p>
       <p class="tip"><b>Trucco:</b> parti dalla fondamentale, conta 4 tasti (bianchi e neri) e poi altri 3. Suono: luminoso, allegro.</p>`
    : `<p>Un accordo minore ha la <b>terza minore</b> (3 semitoni) al posto della terza maggiore: fondamentale + 3 tasti + 4 tasti.</p>
       <p class="tip"><b>Trucco:</b> suona l’accordo maggiore e abbassa di un tasto la nota centrale. Suono: malinconico, più scuro.</p>`
  const inv = state.inv[q]
  panel(maj ? 'accordi-maggiori' : 'accordi-minori').innerHTML = `
    ${intro(maj ? 'I 12 accordi maggiori' : 'I 12 accordi minori', text)}
    <div class="toolbar">
      <span class="tl">Posizione</span>
      ${seg(`inv-${q}`, inv, [
        [0, 'Fondamentale'],
        [1, '1° rivolto'],
        [2, '2° rivolto'],
      ])}
      <span class="legend"><i class="sw root"></i>fondamentale <i class="sw on"></i>altre note <i class="sw fg"></i>dito MD</span>
    </div>
    ${inv ? `<p class="note">${inv === 1 ? 'Nel 1° rivolto la nota più grave è la terza.' : 'Nel 2° rivolto la nota più grave è la quinta.'} Le note sono le stesse, cambia solo l’ordine: i rivolti servono a passare da un accordo all’altro muovendo poco la mano.</p>` : ''}
    <div class="grid">${(maj ? MAJ_ROOTS : MIN_ROOTS).map((r) => chordCard(r, q, inv)).join('')}</div>`
}

// ---------- tab 2 e 4: scale ----------

const STEP_NAME: Record<number, string> = { 1: 'S', 2: 'T', 3: 'T+S' }

function scaleCard(keyName: string, kind: ScaleKind) {
  const root = T.parse(keyName)
  const notes = T.scale(root, kind)
  const fing: Fingering =
    (kind === 'nat' && NATURAL_MINOR_FINGERS[keyName]) || (kind === 'major' ? MAJOR_FINGERS : MINOR_FINGERS)[keyName]
  // Nella melodica alcune diteggiature farebbero cadere il pollice su un tasto nero: in quel caso non la mostriamo.
  const thumbOnBlack = (f: number[]) => f.some((x, i) => x === 1 && T.isBlack(notes[i].midi))
  const fingOk = kind !== 'mel' || !(thumbOnBlack(fing.rh) || thumbOnBlack(fing.lh))
  const sig = T.keySignature(root, kind === 'major' ? 'major' : 'nat')
  const rel = kind === 'major' ? notes[5] : notes[2]
  const title = `${N(root)} ${T.SCALE_LABEL[kind]}`
  const steps = notes.slice(1).map((n, i) => STEP_NAME[n.midi - notes[i].midi])
  const midis = notes.map((n) => n.midi)

  return `<article class="card" data-expandable>
    <header class="card-h"><h3>${title}</h3><span class="sym">${T.chordSymbol(root, kind === 'major' ? 'maj' : 'min', 'en')}</span>${expandBtn}</header>
    <p class="sig">${sig.notes.length ? `<b>${sig.notes.length} ${sig.sym}</b> in chiave: ${sig.notes.map(N).join(', ')}` : '<b>Nessuna alterazione</b> in chiave'}
      <span class="rel">· relativa ${kind === 'major' ? 'minore' : 'maggiore'}: ${N(rel)}${kind === 'major' ? 'm' : ''}</span></p>
    ${keyboard(midis[0], midis[7], marksOf(notes, fingOk ? fing[state.hand] : undefined), `Scala di ${title}`, 10)}
    <table class="ftab">
      <tr><th>Nota</th>${notes.map((n, i) => `<td${i % 7 === 0 ? ' class="r"' : ''}>${N(n)}</td>`).join('')}</tr>
      <tr><th>MD</th>${notes.map((_, i) => `<td>${fingOk ? fing.rh[i] : '–'}</td>`).join('')}</tr>
      <tr><th>MS</th>${notes.map((_, i) => `<td>${fingOk ? fing.lh[i] : '–'}</td>`).join('')}</tr>
    </table>
    <p class="formula">Passi: ${steps.map((s) => `<span>${s}</span>`).join('')}</p>
    ${fingOk ? '' : '<p class="note small">In questa scala melodica la diteggiatura cambia rispetto alla naturale: chiedi all’insegnante la variante.</p>'}
    <div class="actions">${playBtn('scale', midis, '▶ Su e giù')}</div>
  </article>`
}

const handSeg = () =>
  seg('hand', state.hand, [
    ['rh', 'Mano destra'],
    ['lh', 'Mano sinistra'],
  ])

function renderMajorScales() {
  panel('scale-maggiori').innerHTML = `
    ${intro(
      'Le 12 scale maggiori',
      `<p>Ogni scala maggiore segue la stessa formula di passi: <b>T T S T T T S</b> (T = tono = 2 tasti, S = semitono = 1 tasto).</p>
       <p class="tip"><b>Diteggiatura:</b> i numeri sono le dita (1 = pollice, 5 = mignolo). Quando il pollice passa <i>sotto</i> la mano (o il 3°/4° dito scavalca il pollice scendendo) la mano si sposta senza interrompere il suono. Le scale sono in ordine di circolo delle quinte: ogni scala aggiunge un’alterazione.</p>`,
    )}
    <div class="toolbar"><span class="tl">Numeri sulla tastiera</span>${handSeg()}</div>
    <div class="grid">${MAJ_FIFTHS.map((k) => scaleCard(k, 'major')).join('')}</div>`
}

function renderMinorScales() {
  const form = state.minorForm
  const formText = {
    nat: 'La <b>naturale</b> usa le stesse note della relativa maggiore (La minore = Do maggiore partendo dal La). Formula: <b>T S T T S T T</b>.',
    harm: 'L’<b>armonica</b> alza di un semitono il 7° grado: nasce il passo di <b>T+S</b> (un tono e mezzo) dal sapore “orientale”.',
    mel: 'La <b>melodica</b> alza 6° e 7° grado salendo; scendendo si suona di solito come la naturale.',
  }[form]
  panel('scale-minori').innerHTML = `
    ${intro(
      'Le 12 scale minori',
      `<p>Ogni scala minore esiste in tre forme. ${formText}</p>
       <p class="tip"><b>Consiglio:</b> inizia dalla naturale, poi passa all’armonica, la più usata negli esami e nella musica classica.</p>`,
    )}
    <div class="toolbar">
      <span class="tl">Forma</span>
      ${seg('minorForm', form, [
        ['nat', 'Naturale'],
        ['harm', 'Armonica'],
        ['mel', 'Melodica'],
      ])}
      <span class="tl">Numeri sulla tastiera</span>${handSeg()}
    </div>
    <div class="grid">${MIN_FIFTHS.map((k) => scaleCard(k, form)).join('')}</div>`
}

// ---------- tab 5: esercizi ----------

function exerciseSteps() {
  const ex = state.ex
  const root = T.parse((ex.kind === 'major' ? MAJ_ROOTS : MIN_ROOTS)[ex.tonic])
  const pat = PATTERNS[ex.pattern]
  const base = ex.hand === 'rh' ? 60 : 48
  const seq: Note[][] = pat.gen().map((d) => {
    if (pat.hands === 'contrary') return [T.degree(root, ex.kind, d, 60), T.degree(root, ex.kind, -d, 60)]
    if (pat.hands === 'parallel') return [T.degree(root, ex.kind, d, 60), T.degree(root, ex.kind, d, 48)]
    return [T.degree(root, ex.kind, d, base)]
  })
  return { root, pat, seq }
}

function renderExercises() {
  const ex = state.ex
  const roots = ex.kind === 'major' ? MAJ_ROOTS : MIN_ROOTS
  const { root, pat, seq } = exerciseSteps()
  const all = seq.flat()
  const marks = new Map<number, Mark>(all.map((n) => [n.midi, { label: N(n), root: n.letter === root.letter }]))
  const midis = all.map((n) => n.midi)
  const title = `${N(root)} ${T.SCALE_LABEL[ex.kind]}`
  const today = new Date().toISOString().slice(0, 10)
  const routine = store.get<{ date: string; done: number[] }>('routine', { date: today, done: [] })
  const done = routine.date === today ? routine.done : []

  panel('esercizi').innerHTML = `
    ${intro(
      'Esercizi sulle scale',
      `<p>Scegli scala, tonalità ed esercizio, poi premi <b>Avvia</b>: la tastiera si illumina nota per nota e il metronomo tiene il tempo. Suona insieme, all’inizio molto lentamente.</p>
       <p class="tip"><b>Diteggiatura:</b> per le scale usa quella indicata nelle schede <i>Scale maggiori</i> e <i>Scale minori</i>.</p>`,
    )}
    <div class="controls card">
      <label>Scala<select data-field="ex.kind">${options(
        (Object.keys(T.SCALE_LABEL) as ScaleKind[]).map((k) => [k, T.SCALE_LABEL[k]]),
        ex.kind,
      )}</select></label>
      <label>Tonalità<select data-field="ex.tonic">${options(
        roots.map((r, i) => [i, N(T.parse(r))]),
        ex.tonic,
      )}</select></label>
      <label>Esercizio<select data-field="ex.pattern">${options(
        Object.entries(PATTERNS).map(([k, p]) => [k, p.name]),
        ex.pattern,
      )}</select></label>
      <div class="ctl"><span>Mano</span>${
        pat.hands === 'one'
          ? seg('ex-hand', ex.hand, [
              ['rh', 'Destra'],
              ['lh', 'Sinistra'],
            ])
          : '<span class="pill">Due mani</span>'
      }</div>
      <label class="bpm">Velocità<span><input type="range" min="40" max="168" step="4" value="${ex.bpm}" data-field="ex.bpm"><output>${ex.bpm} bpm</output></span></label>
      <div class="checks">
        <label class="chk"><input type="checkbox" data-field="ex.metro"${ex.metro ? ' checked' : ''}> Metronomo</label>
        <label class="chk"><input type="checkbox" data-field="ex.loop"${ex.loop ? ' checked' : ''}> Ripeti</label>
      </div>
      <button type="button" class="btn primary" data-action="ex-play">▶ Avvia</button>
    </div>
    <section class="card ex-view" data-expandable>
      <header class="card-h"><h3>${pat.name} <small>· ${title}</small></h3>
        <button type="button" class="btn primary modal-only" data-action="ex-play">▶ Avvia</button>${expandBtn}</header>
      <p class="desc">${pat.desc}</p>
      ${keyboard(Math.min(...midis), Math.max(...midis), marks, `${pat.name}, ${title}`, 1)}
      <ol class="chips">${seq.map((s, i) => `<li data-i="${i}">${s.map(N).join(' + ')}</li>`).join('')}</ol>
    </section>
    <div class="two-col">
      <section class="card">
        <h3>Routine quotidiana · 15 minuti</h3>
        <p class="small muted">Le spunte si azzerano ogni giorno.</p>
        <ul class="routine">${ROUTINE.map(
          (r, i) =>
            `<li><label><input type="checkbox" data-routine="${i}"${done.includes(i) ? ' checked' : ''}> ${r}</label></li>`,
        ).join('')}</ul>
      </section>
      <section class="card">
        <h3>Consigli</h3>
        <ul class="tips">${TIPS.map((t) => `<li>${t}</li>`).join('')}</ul>
      </section>
    </div>`
}

/** Toggle the "playing" look on every button bound to `action` (on the page and in the modal). */
function setActionButtons(action: string, playing: boolean, idleLabel: string) {
  document.querySelectorAll<HTMLButtonElement>(`[data-action="${action}"]`).forEach((b) => {
    b.textContent = playing ? '■ Stop' : idleLabel
    b.classList.toggle('playing', playing)
  })
}

function playExercise() {
  if (player.playing) return player.stop()
  // La vista può essere duplicata nella modale: aggiorna tutte le copie
  const views = [...document.querySelectorAll<HTMLElement>('.ex-view')]
  const chips = views.flatMap((v) => [...v.querySelectorAll<HTMLElement>('.chips li')])
  const steps: Step[] = exerciseSteps().seq.map((s) => ({ notes: s.map((n) => n.midi), beats: 1 }))
  setActionButtons('ex-play', true, '▶ Avvia')
  player.play(steps, {
    bpm: state.ex.bpm,
    metronome: state.ex.metro,
    loop: state.ex.loop,
    onStep: (i, s) => {
      views.forEach((v) => highlight(v, s.notes))
      chips.forEach((c) => c.classList.toggle('now', Number(c.dataset.i) === i))
    },
    onEnd: () => {
      views.forEach((v) => highlight(v, []))
      chips.forEach((c) => c.classList.remove('now'))
      setActionButtons('ex-play', false, '▶ Avvia')
    },
  })
}

// ---------- tab 6: giri di accordi ----------

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

function progressionChords() {
  const prog = PROGRESSIONS.find((p) => p.id === state.prog.id)!
  const minor = prog.mode === 'minor'
  const key = T.parse((minor ? MIN_ROOTS : MAJ_ROOTS)[state.prog.tonic])
  const chords = prog.chords.map((r) => {
    const deg = ROMAN.indexOf(r.toUpperCase())
    const q: Quality = r === r.toUpperCase() ? 'maj' : 'min'
    const d = T.degree(key, minor ? 'nat' : 'major', deg)
    const root: Pitch = { letter: d.letter, acc: d.acc }
    return { roman: r, root, q }
  })
  // Rivolti vicini: per ogni accordo scegli il rivolto più vicino al precedente
  let prev: number[] | null = null
  const voiced = chords.map((c) => {
    const base = T.triad(c.root, c.q)
    let best = base
    if (state.prog.smooth && prev) {
      let bestCost = Infinity
      for (let inv = 0; inv < 3; inv++) {
        for (const sh of [-12, 0, 12]) {
          const v = T.invert(base, inv).map((n) => ({ ...n, midi: n.midi + sh }))
          if (v[0].midi < 60 || v[2].midi > 83) continue
          const p = prev
          const cost = v.reduce((s, n, i) => s + Math.abs(n.midi - p[i]), 0)
          if (cost < bestCost) {
            bestCost = cost
            best = v
          }
        }
      }
    }
    prev = best.map((n) => n.midi)
    return { ...c, notes: best }
  })
  return { prog, key, minor, chords: voiced }
}

const INV_NAME = ['fondamentale', '1° rivolto', '2° rivolto']

function renderProgressions() {
  const pr = state.prog
  const { prog, key, minor, chords } = progressionChords()
  const roots = minor ? MIN_ROOTS : MAJ_ROOTS
  const keyTitle = `${N(key)} ${minor ? 'minore' : 'maggiore'}`

  panel('giri').innerHTML = `
    ${intro(
      'Giri di accordi',
      `<p>Un giro è una sequenza di accordi che si ripete. I numeri romani indicano su quale grado della scala è costruito ogni accordo: <b>maiuscolo</b> = maggiore, <b>minuscolo</b> = minore. Così puoi suonare lo stesso giro in qualsiasi tonalità.</p>
       <p class="tip"><b>Come suonarlo:</b> mano sinistra la fondamentale (la nota più grave), mano destra l’accordo. Con “rivolti vicini” la mano destra si sposta il meno possibile.</p>`,
    )}
    <div class="controls card">
      <label>Giro<select data-field="prog.id">${options(
        PROGRESSIONS.map((p) => [p.id, `${p.nick} (${p.name})`]),
        pr.id,
      )}</select></label>
      <label>Tonalità<select data-field="prog.tonic">${options(
        roots.map((r, i) => [i, `${N(T.parse(r))} ${minor ? 'minore' : 'maggiore'}`]),
        pr.tonic,
      )}</select></label>
      <label class="bpm">Velocità<span><input type="range" min="40" max="160" step="4" value="${pr.bpm}" data-field="prog.bpm"><output>${pr.bpm} bpm</output></span></label>
      <div class="checks">
        <label class="chk"><input type="checkbox" data-field="prog.smooth"${pr.smooth ? ' checked' : ''}> Rivolti vicini</label>
        <label class="chk"><input type="checkbox" data-field="prog.metro"${pr.metro ? ' checked' : ''}> Metronomo</label>
      </div>
      <button type="button" class="btn primary" data-action="prog-play">▶ Suona in loop</button>
    </div>
    <div class="prog-wrap" data-expandable>
    <section class="prog-head">
      <header class="card-h"><h3>${prog.nick} <small>· ${keyTitle}</small></h3>
        <button type="button" class="btn primary modal-only" data-action="prog-play">▶ Suona in loop</button>${expandBtn}</header>
      <p>${prog.desc}</p>
      <p class="seq">${chords.map((c) => `<span>${T.chordSymbol(c.root, c.q)}</span>`).join('<i>→</i>')}</p>
    </section>
    <div class="grid prog-grid">${chords
      .map((c, i) => {
        const lowest = c.notes[0].letter
        const inv = lowest === c.root.letter ? 0 : lowest === T.mod(c.root.letter + 2, 7) ? 1 : 2
        return `<article class="card prog-card" data-i="${i}" data-expandable>
          <header class="card-h"><span class="roman">${c.roman}</span><h3>${T.chordSymbol(c.root, c.q)}</h3><span class="sym">${prog.chords.length > 4 ? `batt. ${i + 1}` : T.chordSymbol(c.root, c.q, 'en')}</span>${expandBtn}</header>
          ${keyboard(60, 83, marksOf(c.notes, undefined, c.root.letter), `Accordo ${c.roman}`)}
          <p class="notes">${c.notes.map((n) => `<span${n.letter === c.root.letter ? ' class="r"' : ''}>${N(n)}</span>`).join('<i>·</i>')}</p>
          <p class="fing"><span class="muted">${INV_NAME[inv]}</span> · <b>MS</b> ${N(c.root)}</p>
          <div class="actions">${playBtn('chord', c.notes.map((n) => n.midi), '▶', `data-bass="${48 + T.pc(c.root)}" aria-label="Ascolta ${T.chordSymbol(c.root, c.q)}"`)}</div>
        </article>`
      })
      .join('')}</div>
    </div>`
}

function playProgression() {
  if (player.playing) return player.stop()
  const cards = [...document.querySelectorAll<HTMLElement>('.prog-card')]
  const { chords } = progressionChords()
  const steps: Step[] = chords.map((c) => ({
    notes: [48 + T.pc(c.root), ...c.notes.map((n) => n.midi)],
    beats: 4,
  }))
  setActionButtons('prog-play', true, '▶ Suona in loop')
  player.play(steps, {
    bpm: state.prog.bpm,
    metronome: state.prog.metro,
    loop: true,
    onStep: (i, s) =>
      cards.forEach((c) => {
        const now = Number(c.dataset.i) === i
        c.classList.toggle('now', now)
        highlight(c, now ? s.notes : [])
      }),
    onEnd: () => {
      cards.forEach((c) => {
        c.classList.remove('now')
        highlight(c, [])
      })
      setActionButtons('prog-play', false, '▶ Suona in loop')
    },
  })
}

// ---------- struttura e navigazione ----------

const RENDER: Record<TabId, () => void> = {
  'accordi-maggiori': () => renderChords('maj'),
  'scale-maggiori': renderMajorScales,
  'accordi-minori': () => renderChords('min'),
  'scale-minori': renderMinorScales,
  esercizi: renderExercises,
  giri: renderProgressions,
}

function renderHeader() {
  document.getElementById('notation')!.innerHTML = seg('notation', state.notation, [
    ['it', 'Do Re Mi'],
    ['en', 'C D E'],
  ])
}

function renderAll() {
  player.stop()
  renderHeader()
  Object.values(RENDER).forEach((r) => r())
}

function showTab(id: TabId) {
  player.stop()
  state.tab = id
  save()
  for (const [t] of TABS) {
    document.getElementById(`t-${t}`)!.setAttribute('aria-selected', String(t === id))
    panel(t).hidden = t !== id
  }
  if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`)
}

document.querySelector('#app')!.innerHTML = `
  <header class="top">
    <div class="brand">
      <img src="/favicon.svg" alt="" width="40" height="40">
      <div><h1>Accordi</h1><p>Pianoforte per principianti</p></div>
    </div>
    <div class="notation"><span class="tl">Nomi delle note</span><div id="notation"></div></div>
  </header>
  <nav class="tabs" role="tablist" aria-label="Sezioni">${TABS.map(
    ([id, label], i) =>
      `<button type="button" role="tab" id="t-${id}" aria-controls="p-${id}" data-tab="${id}"><span class="n">${i + 1}</span>${label}</button>`,
  ).join('')}</nav>
  <main>${TABS.map(([id]) => `<section class="panel" role="tabpanel" id="p-${id}" aria-labelledby="t-${id}" hidden></section>`).join('')}</main>
  <dialog class="modal" id="modal">
    <button type="button" class="expand close" data-close aria-label="Chiudi" title="Chiudi (Esc)">✕</button>
    <div class="modal-body"></div>
  </dialog>
  <footer>Premi ▶ per ascoltare (alza il volume). 1 = pollice · 2 = indice · 3 = medio · 4 = anulare · 5 = mignolo · MD = mano destra · MS = mano sinistra</footer>`

renderAll()
const fromHash = location.hash.slice(1) as TabId
showTab(TABS.some(([t]) => t === fromHash) ? fromHash : state.tab)

// ---------- modale ----------

const modal = document.getElementById('modal') as HTMLDialogElement

/** Show an enlarged copy of `el`; its play buttons keep working through the shared click handler. */
function openModal(el: HTMLElement) {
  player.stop()
  const copy = el.cloneNode(true) as HTMLElement
  copy.querySelectorAll('[data-expand]').forEach((b) => b.remove())
  copy.removeAttribute('data-expandable')
  modal.setAttribute('aria-label', el.querySelector('h3')?.textContent?.trim() ?? 'Dettaglio')
  modal.querySelector('.modal-body')!.replaceChildren(copy)
  modal.showModal()
}

// L'evento close arriva in modo asincrono: se nel frattempo la modale è stata riaperta, non svuotarla
modal.addEventListener('close', () => {
  if (modal.open) return
  player.stop()
  modal.querySelector('.modal-body')!.replaceChildren()
})
// Clic sullo sfondo fuori dal riquadro: chiudi
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close()
})

// ---------- eventi ----------

function setOption(key: string, value: string) {
  switch (key) {
    case 'notation':
      state.notation = value as Notation
      T.setNotation(state.notation)
      renderAll()
      break
    case 'inv-maj':
    case 'inv-min': {
      const q = key.slice(4) as Quality
      state.inv[q] = Number(value)
      renderChords(q)
      break
    }
    case 'hand':
      state.hand = value as Hand
      renderMajorScales()
      renderMinorScales()
      break
    case 'minorForm':
      state.minorForm = value as State['minorForm']
      renderMinorScales()
      break
    case 'ex-hand':
      player.stop()
      state.ex.hand = value as Hand
      renderExercises()
      break
  }
  save()
}

document.addEventListener('click', (e) => {
  const target = e.target as Element
  const tab = target.closest<HTMLElement>('[data-tab]')
  if (tab) return showTab(tab.dataset.tab as TabId)

  const set = target.closest<HTMLElement>('[data-set]')
  if (set) return setOption(set.dataset.set!, set.dataset.value!)

  const btn = target.closest<HTMLButtonElement>('button')
  if (btn?.dataset.action === 'ex-play') return playExercise()
  if (btn?.dataset.action === 'prog-play') return playProgression()
  if (btn?.hasAttribute('data-expand')) return openModal(btn.closest<HTMLElement>('[data-expandable]')!)
  if (btn?.hasAttribute('data-close')) return modal.close()
  if (!btn?.dataset.play) return

  if (btn.classList.contains('playing')) return player.stop()
  const card = btn.closest<HTMLElement>('.card')!
  const midis = btn.dataset.midis!.split(',').map(Number)
  let steps: Step[]
  let bpm = 120
  switch (btn.dataset.play) {
    case 'chord':
      steps = [{ notes: [Number(btn.dataset.bass), ...midis], beats: 3 }]
      bpm = 60
      break
    case 'arp':
      steps = [...midis.map((m) => ({ notes: [m], beats: 1 })), { notes: midis, beats: 3 }]
      bpm = 110
      break
    default:
      steps = [...midis, ...midis.slice(0, -1).reverse()].map((m) => ({ notes: [m], beats: 1 }))
  }
  btn.classList.add('playing')
  btn.textContent = '■'
  player.play(steps, {
    bpm,
    onStep: (_, s) => highlight(card, s.notes),
    onEnd: () => {
      highlight(card, [])
      btn.classList.remove('playing')
      btn.textContent = btn.dataset.label!
    },
  })
})

document.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement
  if (el.dataset.routine !== undefined) {
    const today = new Date().toISOString().slice(0, 10)
    const done = [...panelInputs('[data-routine]')].filter((c) => c.checked).map((c) => Number(c.dataset.routine))
    store.set('routine', { date: today, done })
    return
  }
  const field = el.dataset.field
  if (!field) return
  const [group, key] = field.split('.') as ['ex' | 'prog', string]
  const obj = state[group] as Record<string, unknown>
  const isCheck = el instanceof HTMLInputElement && el.type === 'checkbox'
  obj[key] = isCheck ? el.checked : typeof obj[key] === 'number' ? Number(el.value) : el.value
  save()
  if (isCheck && key !== 'smooth') return
  if (el.type === 'range') return
  player.stop()
  if (group === 'ex') renderExercises()
  else renderProgressions()
})

const panelInputs = (sel: string) => panel('esercizi').querySelectorAll<HTMLInputElement>(sel)

document.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement
  if (el.type !== 'range' || !el.dataset.field) return
  const [group] = el.dataset.field.split('.') as ['ex' | 'prog']
  state[group].bpm = Number(el.value)
  el.nextElementSibling!.textContent = `${el.value} bpm`
  save()
})

window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1) as TabId
  if (TABS.some(([t]) => t === id)) showTab(id)
})
