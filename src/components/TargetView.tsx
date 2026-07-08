import type { Market } from '../model'
import { MAIN_IDS, fmtPrecise } from '../model'
import { CurrencyIcon, Exchange } from './bits'

interface Row {
  payId: string
  /** Target received per 1 pay currency. */
  buyRate: number
  buySource: 'pair' | 'derived'
  /** Pay currency received per 1 target. */
  sellRate: number
  sellSource: 'pair' | 'derived'
  /** Target received per 1 Divine Orb worth of the pay currency spent. */
  perDivine: number
}

export function TargetView({ market, targetId }: { market: Market; targetId: string }) {
  const target = market.get(targetId)
  if (!target) return null

  const rows: Row[] = []
  for (const payId of MAIN_IDS) {
    if (payId === targetId) continue
    const buy = market.rate(payId, targetId)
    const sell = market.rate(targetId, payId)
    const payValue = market.valueInDivine(payId)
    if (!buy || !sell || !payValue) continue
    rows.push({
      payId,
      buyRate: buy.rate,
      buySource: buy.source,
      sellRate: sell.rate,
      sellSource: sell.source,
      perDivine: buy.rate / payValue,
    })
  }
  rows.sort((a, b) => b.perDivine - a.perDivine)
  const best = rows[0]?.perDivine ?? 0

  return (
    <div>
      <div className="target-summary">
        <CurrencyIcon market={market} id={targetId} size={34} />
        <div>
          <h2>{target.meta.name}</h2>
          <p className="muted">
            Best way to buy {target.meta.name} with a main currency — rows sorted by how much you
            receive per 1 Divine Orb of value spent.
          </p>
        </div>
      </div>
      <table className="grid">
        <thead>
          <tr>
            <th className="left">Pay with</th>
            <th title={`What you receive when you sell the pay currency for ${target.meta.name}`}>
              Buy {target.meta.name}
            </th>
            <th title={`What you receive when you sell ${target.meta.name} for the pay currency`}>
              Sell {target.meta.name}
            </th>
            <th title="Target received per 1 Divine Orb of value spent — higher is better">
              Value per Divine
            </th>
            <th className="left">Efficiency</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const payMeta = market.get(row.payId)!.meta
            const relative = best > 0 ? row.perDivine / best : 0
            const deficit = (1 - relative) * 100
            return (
              <tr key={row.payId}>
                <td className="left">
                  <span className="name-cell">
                    <CurrencyIcon market={market} id={row.payId} size={28} />
                    <span>{payMeta.name}</span>
                  </span>
                </td>
                <td>
                  <Exchange market={market} perOne={row.buyRate} fromCur={row.payId} toCur={targetId} />
                  <span className={`source ${row.buySource}`}>
                    {row.buySource === 'pair' ? 'market pair' : 'derived'}
                  </span>
                </td>
                <td>
                  <Exchange market={market} perOne={row.sellRate} fromCur={targetId} toCur={row.payId} />
                  <span className={`source ${row.sellSource}`}>
                    {row.sellSource === 'pair' ? 'market pair' : 'derived'}
                  </span>
                </td>
                <td>
                  <b>{fmtPrecise(row.perDivine)}</b> <span className="muted">per 1</span>{' '}
                  <CurrencyIcon market={market} id="divine" size={20} />
                </td>
                <td className="left">
                  <span className="eff">
                    <span className="eff-bar">
                      <span style={{ width: `${(relative * 100).toFixed(1)}%` }} />
                    </span>
                    <span className={i === 0 ? 'eff-best' : 'muted'}>
                      {i === 0 ? 'best' : deficit < 0.005 ? '≈ best' : `-${deficit.toFixed(2)}%`}
                    </span>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="footnote">
        Rates marked <em>market pair</em> come from poe.ninja's most-traded pairing for that
        currency; <em>derived</em> rates are computed from mid values (no bid/ask spread).
      </p>
    </div>
  )
}
