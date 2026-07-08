import type { Overview } from './types'

export const LEAGUE =
  (import.meta.env.VITE_LEAGUE as string | undefined)?.trim() || 'Runes of Aldur'

export const CACHE_TTL_MINUTES =
  Number(import.meta.env.VITE_CACHE_TTL_MINUTES) > 0
    ? Number(import.meta.env.VITE_CACHE_TTL_MINUTES)
    : 5

/** Every exchange category we merge into one market. Currency must be first:
 * it provides the core rates and wins any item-id collisions. */
export const TYPES = [
  'Currency',
  'Ritual',
  'SoulCores',
  'Idols',
  'Runes',
  'Expedition',
  'LineageSupportGems',
  'Abyss',
  'Fragments',
  'Delirium',
  'Breach',
  'Verisium',
] as const

const CACHE_KEY = `poe2-exchange-overview:v3:${LEAGUE}`

interface CacheEntry {
  fetchedAt: number
  data: Overview
  failedTypes: string[]
}

export interface OverviewResult {
  data: Overview
  fetchedAt: number
  fromCache: boolean
  /** True when the fetch failed and we fell back to an expired cache entry. */
  stale: boolean
  /** Categories whose fetch failed; their items are missing from the merge. */
  failedTypes: string[]
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (!entry || typeof entry.fetchedAt !== 'number' || !entry.data?.lines) return null
    return entry
  } catch {
    return null
  }
}

async function fetchType(type: string): Promise<Overview> {
  // Build the query with URLSearchParams in (league, type) order — the exact
  // string poe2-runeshape-rewards sends. The shared Worker KV cache keys on
  // the raw search string, so any encoding drift (e.g. %20 vs +) would split
  // the two apps onto separate cache entries.
  const query = new URLSearchParams({ league: LEAGUE, type }).toString()
  const url = `/poe-api/poe2/api/economy/exchange/current/overview?${query}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`poe.ninja responded with ${res.status} for type ${type}`)
  return (await res.json()) as Overview
}

function mergeOverviews(overviews: (Overview | null)[]): Overview {
  const currency = overviews[0]
  if (!currency) throw new Error('Currency overview missing')
  const merged: Overview = { core: currency.core, items: [], lines: [] }
  const seen = new Set<string>()
  overviews.forEach((overview, i) => {
    if (!overview) return
    const lineById = new Map(overview.lines.map((l) => [l.id, l]))
    for (const item of overview.items) {
      const line = lineById.get(item.id)
      if (!line || seen.has(item.id)) continue
      seen.add(item.id)
      merged.items.push({ ...item, sourceType: TYPES[i] })
      merged.lines.push(line)
    }
  })
  return merged
}

export async function loadOverview(force = false): Promise<OverviewResult> {
  const ttlMs = CACHE_TTL_MINUTES * 60_000
  const cached = readCache()
  if (!force && cached && Date.now() - cached.fetchedAt < ttlMs) {
    return {
      data: cached.data,
      fetchedAt: cached.fetchedAt,
      fromCache: true,
      stale: false,
      failedTypes: cached.failedTypes ?? [],
    }
  }

  try {
    const settled = await Promise.allSettled(TYPES.map(fetchType))
    // Currency carries the core rates and the main comparison currencies —
    // without it there is no usable market.
    if (settled[0].status === 'rejected') throw settled[0].reason
    const failedTypes = TYPES.filter((_, i) => settled[i].status === 'rejected')
    const data = mergeOverviews(
      settled.map((s) => (s.status === 'fulfilled' ? s.value : null)),
    )
    const entry: CacheEntry = { fetchedAt: Date.now(), data, failedTypes: [...failedTypes] }
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
    } catch {
      // localStorage full or unavailable — still serve the fresh data
    }
    return {
      data,
      fetchedAt: entry.fetchedAt,
      fromCache: false,
      stale: false,
      failedTypes: entry.failedTypes,
    }
  } catch (err) {
    if (cached) {
      return {
        data: cached.data,
        fetchedAt: cached.fetchedAt,
        fromCache: true,
        stale: true,
        failedTypes: cached.failedTypes ?? [],
      }
    }
    throw err
  }
}
