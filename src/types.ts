export interface ItemMeta {
  id: string
  name: string
  image: string
  category: string
  detailsId: string
  /** Which exchange type endpoint this item came from (added during merge). */
  sourceType?: string
}

export interface Sparkline {
  totalChange: number
  data: (number | null)[]
}

export interface Line {
  id: string
  /** Value of one unit, denominated in the primary currency (Divine Orb). */
  primaryValue: number
  volumePrimaryValue: number
  /** Currency this item is most traded against. */
  maxVolumeCurrency?: string
  /** Units of this item received per 1 maxVolumeCurrency on the most-traded pair. */
  maxVolumeRate?: number
  sparkline?: Sparkline
}

export interface Overview {
  core: {
    items: ItemMeta[]
    rates: Record<string, number>
    primary: string
    secondary: string
  }
  lines: Line[]
  items: ItemMeta[]
}
