import type { Sparkline } from '../types'
import { fmt } from '../model'

const W = 90
const H = 30
const PAD = 2

export function SparklineChart({ spark }: { spark?: Sparkline }) {
  if (!spark || !spark.data?.length) return <span className="muted">—</span>

  const points = spark.data.map((v) => (typeof v === 'number' ? v : 0))
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const step = (W - PAD * 2) / Math.max(points.length - 1, 1)
  const xy = points.map((v, i) => {
    const x = PAD + i * step
    const y = PAD + (1 - (v - min) / span) * (H - PAD * 2)
    return [x, y] as const
  })
  const path = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${path} L${xy[xy.length - 1][0].toFixed(1)},${H} L${xy[0][0].toFixed(1)},${H} Z`

  const up = spark.totalChange >= 0
  const color = up ? 'var(--green)' : 'var(--red)'
  const pct = `${up ? '+' : '-'}${fmt(Math.abs(spark.totalChange))}%`

  return (
    <span className="spark">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <path d={area} fill={color} opacity={0.12} />
        <path d={path} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
      <span className="spark-pct" style={{ color }}>
        {pct}
      </span>
    </span>
  )
}
