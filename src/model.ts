import type { ItemMeta, Line, Overview } from './types'

/** The currencies offered as ways to buy/sell the targeted currency. */
export const MAIN_IDS = ['divine', 'exalted', 'chaos'] as const

export interface Entry {
  meta: ItemMeta
  line: Line
}

export interface Rate {
  /** Units of `to` received per 1 unit of `from`. */
  rate: number
  /** 'pair' = real most-traded pair rate from the API; 'derived' = from mid values. */
  source: 'pair' | 'derived'
}

export class Market {
  entries: Entry[] = []
  private byId = new Map<string, Entry>()

  constructor(public overview: Overview) {
    const metas = new Map(overview.items.map((i) => [i.id, i]))
    for (const line of overview.lines) {
      const meta = metas.get(line.id)
      if (!meta || !(line.primaryValue > 0)) continue
      const entry = { meta, line }
      this.entries.push(entry)
      this.byId.set(line.id, entry)
    }
    this.entries.sort((a, b) => b.line.primaryValue - a.line.primaryValue)
  }

  get(id: string): Entry | undefined {
    return this.byId.get(id)
  }

  /** Value of one unit in Divine Orbs. */
  valueInDivine(id: string): number | undefined {
    return this.byId.get(id)?.line.primaryValue
  }

  /**
   * How many `toId` you receive per 1 `fromId`. Prefers the real rate of the
   * most-traded pair when this exact pair is one, otherwise derives it from
   * the mid values.
   */
  rate(fromId: string, toId: string): Rate | undefined {
    const from = this.byId.get(fromId)
    const to = this.byId.get(toId)
    if (!from || !to) return undefined
    if (fromId === toId) return { rate: 1, source: 'derived' }
    if (to.line.maxVolumeCurrency === fromId && to.line.maxVolumeRate) {
      return { rate: to.line.maxVolumeRate, source: 'pair' }
    }
    if (from.line.maxVolumeCurrency === toId && from.line.maxVolumeRate) {
      return { rate: 1 / from.line.maxVolumeRate, source: 'pair' }
    }
    return { rate: from.line.primaryValue / to.line.primaryValue, source: 'derived' }
  }
}

/** Compact number formatting in the poe.ninja style: 6.9k, 219k, 13, 8.5, 0.12 */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n >= 999.5) {
    const k = n / 1000
    return `${k >= 9.95 ? k.toFixed(0) : k.toFixed(1)}k`
  }
  if (n >= 99.5) return n.toFixed(0)
  if (n >= 1) {
    const s = n.toFixed(1)
    return s.endsWith('.0') ? String(Math.round(n)) : s
  }
  if (n >= 0.01) return n.toFixed(2)
  return n.toPrecision(2)
}

/** Higher-precision formatting for comparing close rates (3 significant digits). */
export function fmtPrecise(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n >= 999.5) return fmt(n)
  return String(Number(n.toPrecision(3)))
}

export interface ValueDisplay {
  /** Number shown on the left. */
  amt: number
  leftCur: string
  rightCur: string
}

/**
 * The "Value" column: express the item in whichever of divine/chaos/exalted
 * yields a readable "N cur ⇄ 1.0 item" ratio; very cheap items flip to
 * "N item ⇄ 1.0 cur" against their most-traded currency.
 */
export function displayValue(m: Market, id: string): ValueDisplay | undefined {
  const v = m.valueInDivine(id)
  if (v === undefined) return undefined
  for (const cur of ['divine', 'chaos', 'exalted']) {
    if (cur === id) continue
    const cv = m.valueInDivine(cur)
    if (!cv) continue
    const amt = v / cv
    if (amt >= 1) return { amt, leftCur: cur, rightCur: id }
  }
  const line = m.get(id)!.line
  const cur =
    line.maxVolumeCurrency && line.maxVolumeCurrency !== id ? line.maxVolumeCurrency : 'exalted'
  const cv = m.valueInDivine(cur)
  if (!cv) return undefined
  return { amt: cv / v, leftCur: id, rightCur: cur }
}
