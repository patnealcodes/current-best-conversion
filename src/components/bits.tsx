import type { Market } from '../model'
import { fmt } from '../model'

export function CurrencyIcon({ market, id, size = 26 }: { market: Market; id: string; size?: number }) {
  const meta = market.get(id)?.meta
  if (!meta) return <span className="icon-fallback" style={{ width: size, height: size }} />
  return (
    <img
      className="cur-icon"
      src={`/poe-img${meta.image}`}
      alt={meta.name}
      title={meta.name}
      width={size}
      height={size}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden'
      }}
    />
  )
}

/** "6.9k [divine] ⇄ 1.0 [mirror]" style ratio. */
export function Ratio({
  market,
  amt,
  leftCur,
  rightCur,
}: {
  market: Market
  amt: number
  leftCur: string
  rightCur: string
}) {
  return (
    <span className="ratio">
      <b>{fmt(amt)}</b>
      <CurrencyIcon market={market} id={leftCur} size={22} />
      <span className="swap">⇄</span>
      <b>1.0</b>
      <CurrencyIcon market={market} id={rightCur} size={22} />
    </span>
  )
}

/** Directed exchange: "1.0 [from] → N [to]" (flips so no side shows < 1). */
export function Exchange({
  market,
  perOne,
  fromCur,
  toCur,
}: {
  market: Market
  /** Units of toCur received per 1 fromCur. */
  perOne: number
  fromCur: string
  toCur: string
}) {
  const flip = perOne < 1
  return (
    <span className="ratio">
      <b>{flip ? fmt(1 / perOne) : '1.0'}</b>
      <CurrencyIcon market={market} id={fromCur} size={22} />
      <span className="swap">→</span>
      <b>{flip ? '1.0' : fmt(perOne)}</b>
      <CurrencyIcon market={market} id={toCur} size={22} />
    </span>
  )
}
