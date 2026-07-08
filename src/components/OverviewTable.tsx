import type { Market } from '../model'
import { displayValue, fmt } from '../model'
import { CurrencyIcon, Ratio } from './bits'
import { SparklineChart } from './SparklineChart'

export function OverviewTable({
  market,
  onPick,
}: {
  market: Market
  onPick: (id: string) => void
}) {
  return (
    <table className="grid">
      <thead>
        <tr>
          <th className="left">Name</th>
          <th title="Mid value expressed in a convenient main currency">Value</th>
          <th>Last 7 days</th>
          <th title="Trade volume on the most popular pairing">Volume / Hour</th>
          <th title="Rate on the most-traded pairing for this currency">Most Popular</th>
        </tr>
      </thead>
      <tbody>
        {market.entries.map(({ meta, line }) => {
          const value = displayValue(market, meta.id)
          const volCur = line.maxVolumeCurrency ?? 'divine'
          const popular =
            line.maxVolumeCurrency && line.maxVolumeRate
              ? line.maxVolumeRate >= 1
                ? { amt: line.maxVolumeRate, leftCur: meta.id, rightCur: line.maxVolumeCurrency }
                : { amt: 1 / line.maxVolumeRate, leftCur: line.maxVolumeCurrency, rightCur: meta.id }
              : undefined
          return (
            <tr key={meta.id}>
              <td className="left">
                <button className="name-cell" onClick={() => onPick(meta.id)} title="Set as target">
                  <CurrencyIcon market={market} id={meta.id} size={28} />
                  <span>{meta.name}</span>
                </button>
              </td>
              <td>{value ? <Ratio market={market} {...value} /> : <span className="muted">—</span>}</td>
              <td>
                <SparklineChart spark={line.sparkline} />
              </td>
              <td>
                <span className="ratio">
                  <b>{fmt(line.volumePrimaryValue)}</b>
                  <CurrencyIcon market={market} id={volCur} size={22} />
                </span>
              </td>
              <td>{popular ? <Ratio market={market} {...popular} /> : <span className="muted">—</span>}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
