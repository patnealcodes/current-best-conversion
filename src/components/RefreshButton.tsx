import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'

export function RefreshButton({
  availableAt,
  totalMs,
  pending,
  onRefresh,
}: {
  /** Epoch ms when the button becomes pressable (fetchedAt + cache TTL). */
  availableAt: number
  /** Full cooldown duration, for the clock-wipe fraction. */
  totalMs: number
  /** True while a fetch is in flight. */
  pending: boolean
  onRefresh: () => void
}) {
  const [now, setNow] = useState(() => Date.now())

  // Tick once per second for the countdown text; the final tick lands exactly
  // on availableAt so the button enables on time. The wipe itself is a CSS
  // animation and needs no re-renders.
  useEffect(() => {
    setNow(Date.now())
    let id: number | undefined
    const schedule = () => {
      const left = availableAt - Date.now()
      if (left <= 0) return
      id = window.setTimeout(() => {
        setNow(Date.now())
        schedule()
      }, Math.min(1000, left))
    }
    schedule()
    return () => clearTimeout(id)
  }, [availableAt])

  // Starting angle and duration for the CSS sweep, fixed per cooldown.
  const anim = useMemo(() => {
    const left = Math.max(0, availableAt - Date.now())
    return {
      startDeg: totalMs > 0 ? Math.min(360, (1 - left / totalMs) * 360) : 360,
      durationMs: left,
    }
  }, [availableAt, totalMs])

  const remaining = Math.max(0, availableAt - now)
  const ready = remaining <= 0 && !pending
  const secs = Math.ceil(remaining / 1000)
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

  return (
    <button
      className={`refresh${ready ? '' : ' cooling'}`}
      disabled={!ready}
      onClick={onRefresh}
      title={ready ? 'Fetch fresh data from poe.ninja' : `Ready in ${clock}`}
    >
      {pending ? 'Refreshing…' : 'Refresh now'}
      {remaining > 0 && <span className="cooldown-time">{clock}</span>}
      {remaining > 0 && (
        <span
          key={availableAt}
          className="cooldown-overlay"
          aria-hidden="true"
          style={
            {
              '--sweep': `${anim.startDeg}deg`,
              animationDuration: `${anim.durationMs}ms`,
            } as CSSProperties
          }
        />
      )}
    </button>
  )
}
