import { isBlack, mod } from './theory'

export interface Mark {
  label?: string
  finger?: number
  root?: boolean
}

const W = 36
const H = 140
const BW = 22
const BH = 88

/**
 * Piano keyboard SVG from the C at/below `lo` to the B at/above `hi`.
 * With `tight`, it spans only lo…hi plus one white key on each side, widened to the right up to `tight` white keys.
 */
export function keyboard(
  lo: number,
  hi: number,
  marks = new Map<number, Mark>(),
  title = 'Tastiera',
  tight = 0,
): string {
  let from = lo - mod(lo, 12)
  let to = hi + 11 - mod(hi, 12)
  if (tight) {
    from = lo - 1
    while (isBlack(from)) from--
    to = hi + 1
    while (isBlack(to)) to++
    const whiteCount = () => Array.from({ length: to - from + 1 }, (_, i) => from + i).filter((m) => !isBlack(m)).length
    while (whiteCount() < tight) to += isBlack(to + 1) ? 2 : 1
  }
  const fingers = [...marks.values()].some((m) => m.finger !== undefined)
  const top = fingers ? 26 : 4
  const cx = new Map<number, number>()
  let whites = ''
  let blacks = ''
  let wi = 0

  for (let m = from; m <= to; m++) {
    const mk = marks.get(m)
    const cls = `${mk ? ' on' : ''}${mk?.root ? ' root' : ''}`
    if (isBlack(m)) {
      cx.set(m, wi * W)
      blacks += `<rect class="k bk${cls}" data-midi="${m}" x="${wi * W - BW / 2}" y="${top}" width="${BW}" height="${BH}" rx="3"/>`
    } else {
      cx.set(m, wi * W + W / 2)
      whites += `<rect class="k wk${cls}" data-midi="${m}" x="${wi * W + 0.5}" y="${top}" width="${W - 1}" height="${H}" rx="4"/>`
      wi++
    }
  }

  let labels = ''
  for (const [m, mk] of marks) {
    const x = cx.get(m)
    if (x === undefined) continue
    const black = isBlack(m)
    if (mk.label) {
      const y = black ? top + BH - 9 : top + H - 12
      labels += `<text class="lbl ${black ? 'lb' : 'lw'}" x="${x}" y="${y}">${mk.label}</text>`
    }
    if (mk.finger !== undefined) {
      labels += `<g class="fg"><circle cx="${x}" cy="12" r="8.5"/><text x="${x}" y="16">${mk.finger}</text></g>`
    }
  }

  return `<svg class="kb" viewBox="0 0 ${wi * W} ${top + H + 2}" role="img" aria-label="${title}">${whites}${blacks}${labels}</svg>`
}

/** Mark keys as currently sounding inside `root`. */
export function highlight(root: ParentNode, midis: number[]) {
  root.querySelectorAll('.k.active').forEach((el) => el.classList.remove('active'))
  for (const m of midis) root.querySelector(`.k[data-midi="${m}"]`)?.classList.add('active')
}
