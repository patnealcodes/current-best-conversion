import { useEffect, useRef, useState } from 'react'
import type { Market } from '../model'
import { CurrencyIcon } from './bits'

export function TargetSearch({
  market,
  target,
  onSelect,
}: {
  market: Market
  target: string | null
  onSelect: (id: string | null) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const q = query.trim().toLowerCase()
  const suggestions = q
    ? market.entries.filter((e) => e.meta.name.toLowerCase().includes(q)).slice(0, 8)
    : []

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    const onDown = (ev: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const pick = (id: string) => {
    onSelect(id)
    setQuery('')
    setOpen(false)
  }

  const targetMeta = target ? market.get(target)?.meta : undefined

  return (
    <div className="search" ref={rootRef}>
      {targetMeta ? (
        <div className="target-chip">
          <CurrencyIcon market={market} id={targetMeta.id} size={24} />
          <span>{targetMeta.name}</span>
          <button
            className="chip-clear"
            aria-label="Clear target"
            onClick={() => onSelect(null)}
          >
            ×
          </button>
        </div>
      ) : null}
      <input
        className="search-input"
        placeholder={targetMeta ? 'Change target…' : 'Target'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, suggestions.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && suggestions[active]) {
            pick(suggestions[active].meta.id)
          } else if (e.key === 'Escape') {
            setOpen(false)
            setQuery('')
          }
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="suggestions" role="listbox">
          {suggestions.map((e, i) => (
            <li
              key={e.meta.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(ev) => {
                ev.preventDefault()
                pick(e.meta.id)
              }}
            >
              <CurrencyIcon market={market} id={e.meta.id} size={24} />
              <span>{e.meta.name}</span>
              {e.meta.sourceType && e.meta.sourceType !== 'Currency' && (
                <span className="cat">{e.meta.sourceType}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
