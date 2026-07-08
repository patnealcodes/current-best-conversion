import type { Overview } from './types'

export const LEAGUE =
  (import.meta.env.VITE_LEAGUE as string | undefined)?.trim() || 'Runes of Aldur'

export const CACHE_TTL_MINUTES =
  Number(import.meta.env.VITE_CACHE_TTL_MINUTES) > 0
    ? Number(import.meta.env.VITE_CACHE_TTL_MINUTES)
    : 5

const CACHE_KEY = `poe2-exchange-overview:${LEAGUE}:Currency`

interface CacheEntry {
  fetchedAt: number
  data: Overview
}

export interface OverviewResult {
  data: Overview
  fetchedAt: number
  fromCache: boolean
  /** True when the fetch failed and we fell back to an expired cache entry. */
  stale: boolean
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

export async function loadOverview(force = false): Promise<OverviewResult> {
  const ttlMs = CACHE_TTL_MINUTES * 60_000
  const cached = readCache()
  if (!force && cached && Date.now() - cached.fetchedAt < ttlMs) {
    return { data: cached.data, fetchedAt: cached.fetchedAt, fromCache: true, stale: false }
  }

  try {
    const url = `/poe-api/poe2/api/economy/exchange/current/overview?league=${encodeURIComponent(LEAGUE)}&type=Currency`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`poe.ninja responded with ${res.status}`)
    const data = (await res.json()) as Overview
    const entry: CacheEntry = { fetchedAt: Date.now(), data }
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
    } catch {
      // localStorage full or unavailable — still serve the fresh data
    }
    return { data, fetchedAt: entry.fetchedAt, fromCache: false, stale: false }
  } catch (err) {
    if (cached) {
      return { data: cached.data, fetchedAt: cached.fetchedAt, fromCache: true, stale: true }
    }
    throw err
  }
}
