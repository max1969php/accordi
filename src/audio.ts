let ctx: AudioContext | null = null
let master: GainNode

function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    const comp = ctx.createDynamicsCompressor()
    master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(comp)
    comp.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** A soft piano-like tone: a few partials through a closing low-pass and a percussive envelope. */
function tone(c: AudioContext, dest: AudioNode, midi: number, t: number, dur: number, vel: number) {
  const f = 440 * 2 ** ((midi - 69) / 12)
  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(vel, t + 0.008)
  env.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.3)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(Math.min(f * 8, 9000), t)
  lp.frequency.exponentialRampToValueAtTime(Math.min(f * 2.5, 4000), t + dur + 0.3)
  lp.connect(env).connect(dest)
  const partials: [OscillatorType, number, number][] = [
    ['triangle', 1, 1],
    ['sine', 2, 0.3],
    ['sine', 3, 0.08],
  ]
  for (const [type, mult, gain] of partials) {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type
    o.frequency.value = f * mult
    g.gain.value = gain
    o.connect(g).connect(lp)
    o.start(t)
    o.stop(t + dur + 0.4)
  }
}

function click(c: AudioContext, dest: AudioNode, t: number, accent: boolean) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.frequency.value = accent ? 1760 : 1100
  g.gain.setValueAtTime(accent ? 0.35 : 0.2, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
  o.connect(g).connect(dest)
  o.start(t)
  o.stop(t + 0.05)
}

export interface Step {
  notes: number[]
  beats: number
}

export interface PlayOptions {
  bpm: number
  loop?: boolean
  metronome?: boolean
  beatsPerBar?: number
  onStep?: (i: number, step: Step) => void
  onEnd?: () => void
}

class Player {
  private bus: GainNode | null = null
  private timers: number[] = []
  private onEnd: (() => void) | undefined

  get playing() {
    return this.bus !== null
  }

  play(steps: Step[], opts: PlayOptions) {
    this.stop()
    const c = audio()
    const bus = c.createGain()
    bus.connect(master)
    this.bus = bus
    this.onEnd = opts.onEnd
    const spb = 60 / opts.bpm
    const bar = opts.beatsPerBar ?? 4
    let beat = 0

    const cycle = (t0: number) => {
      let t = t0
      steps.forEach((s, i) => {
        const dur = s.beats * spb
        const vel = s.notes.length > 1 ? 0.32 / Math.sqrt(s.notes.length) : 0.3
        for (const m of s.notes) tone(c, bus, m, t, Math.max(dur * 0.92, 0.12), vel)
        if (opts.metronome) {
          for (let b = 0; b < s.beats; b++, beat++) click(c, bus, t + b * spb, beat % bar === 0)
        }
        this.at(t, () => opts.onStep?.(i, s))
        t += dur
      })
      if (opts.loop) this.at(t - 0.15, () => cycle(t))
      else this.at(t + 0.2, () => this.stop())
    }
    cycle(c.currentTime + 0.08)
  }

  stop() {
    this.timers.forEach(clearTimeout)
    this.timers = []
    if (this.bus && ctx) {
      const bus = this.bus
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.02)
      setTimeout(() => bus.disconnect(), 150)
    }
    this.bus = null
    const cb = this.onEnd
    this.onEnd = undefined
    cb?.()
  }

  private at(t: number, fn: () => void) {
    this.timers.push(window.setTimeout(fn, Math.max(0, (t - ctx!.currentTime) * 1000)))
  }
}

export const player = new Player()
