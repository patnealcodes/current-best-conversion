import { useCallback, useEffect, useMemo, useState } from 'react'
import { CACHE_TTL_MINUTES, LEAGUE, loadOverview } from './api'
import type { OverviewResult } from './api'
import { Market } from './model'
import { OverviewTable } from './components/OverviewTable'
import { RefreshButton } from './components/RefreshButton'
import { TargetSearch } from './components/TargetSearch'
import { TargetView } from './components/TargetView'

const TTL_MS = CACHE_TTL_MINUTES * 60_000

export default function App() {
  const [result, setResult] = useState<OverviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [target, setTarget] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const refresh = useCallback((force: boolean) => {
    setError(null)
    setPending(true)
    loadOverview(force)
      .then(setResult)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setPending(false))
  }, [])

  useEffect(() => refresh(false), [refresh])

  const market = useMemo(() => (result ? new Market(result.data) : null), [result])

  return (
    <div className="page">
      {market && <TargetSearch market={market} target={target} onSelect={setTarget} />}

      {error && !market && <div className="notice error">Failed to load poe.ninja data: {error}</div>}
      {result?.stale && (
        <div className="notice warn">
          poe.ninja is unreachable — showing cached data from{' '}
          {new Date(result.fetchedAt).toLocaleTimeString()}.
        </div>
      )}
      {result && result.failedTypes.length > 0 && (
        <div className="notice warn">
          Some categories failed to load and are missing below:{' '}
          {result.failedTypes.join(', ')}.
        </div>
      )}

      {market &&
        (target ? (
          <TargetView market={market} targetId={target} />
        ) : (
          <OverviewTable market={market} onPick={setTarget} />
        ))}

      {!market && !error && <div className="notice">Loading exchange data…</div>}

      {result && (
        <footer className="status">
          <span>League: {LEAGUE}</span>
          <span>
            Updated {new Date(result.fetchedAt).toLocaleTimeString()}
            {result.fromCache ? ' (cached)' : ''} · refreshes every {CACHE_TTL_MINUTES} min
          </span>
          <RefreshButton
            availableAt={result.fetchedAt + TTL_MS}
            totalMs={TTL_MS}
            pending={pending}
            onRefresh={() => refresh(true)}
          />
          <span className="muted">data: poe.ninja</span>
        </footer>
      )}
    </div>
  )
}
