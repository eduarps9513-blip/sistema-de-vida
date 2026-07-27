'use client'

import { useState, useEffect, useCallback } from 'react'

type DataPoint = {
  label: string
  objectivesPct: number
  habitsPct: number
  dateIso: string
}

type ChartData = {
  range: string
  points: DataPoint[]
  objectivesAvg: number
  habitsAvg: number
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const cp1x = p0.x + (p1.x - p0.x) / 2
    const cp1y = p0.y
    const cp2x = p0.x + (p1.x - p0.x) / 2
    const cp2y = p1.y
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`
  }
  return path
}

export default function PerformanceChart({ refreshTrigger }: { refreshTrigger?: number }) {
  const [range, setRange] = useState<'week' | 'month' | 'quarter' | 'year'>('week')
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const fetchChartData = useCallback(async (r: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/performance-chart?range=${r}&t=${Date.now()}`)
      if (res.ok) {
        const json = await res.json()
        setChartData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChartData(range)
  }, [range, refreshTrigger, fetchChartData])

  const points = chartData?.points ?? []
  const svgWidth = 700
  const svgHeight = 220
  const paddingX = 40
  const paddingY = 30
  const chartW = svgWidth - paddingX * 2
  const chartH = svgHeight - paddingY * 2

  // Map values to coordinates
  const coordsObj = points.map((p, idx) => {
    const x = paddingX + (idx / Math.max(1, points.length - 1)) * chartW
    const y = paddingY + chartH - (p.objectivesPct / 100) * chartH
    return { x, y }
  })

  const coordsHab = points.map((p, idx) => {
    const x = paddingX + (idx / Math.max(1, points.length - 1)) * chartW
    const y = paddingY + chartH - (p.habitsPct / 100) * chartH
    return { x, y }
  })

  const pathObj = buildSmoothPath(coordsObj)
  const pathHab = buildSmoothPath(coordsHab)

  // Area paths for gradient fills under lines
  const areaObj = coordsObj.length
    ? `${pathObj} L ${coordsObj[coordsObj.length - 1].x} ${svgHeight - paddingY} L ${coordsObj[0].x} ${svgHeight - paddingY} Z`
    : ''

  const areaHab = coordsHab.length
    ? `${pathHab} L ${coordsHab[coordsHab.length - 1].x} ${svgHeight - paddingY} L ${coordsHab[0].x} ${svgHeight - paddingY} Z`
    : ''

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null

  return (
    <div className="card border-emerald-500/20 bg-slate-900/90 shadow-2xl relative overflow-hidden p-5">
      {/* Wall Street Glow Accents */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Wall Street Header Bar */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08] flex-wrap gap-2 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-mono text-xs tracking-wider text-emerald-400 font-bold uppercase">
              📈 TERMINAL DE RENDIMIENTO PERSONAL · MÉTRICAS DE VIDA
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-300 font-bold">
              Objetivos: <span className="text-purple-400">{chartData?.objectivesAvg ?? 0}%</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-bold">
              Hábitos: <span className="text-emerald-400">{chartData?.habitsAvg ?? 0}%</span>
            </span>
          </div>
        </div>

        {/* Timeframe Selector Controls */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
          {(['week', 'month', 'quarter', 'year'] as const).map((r) => {
            const labels = { week: 'Semana', month: 'Mes', quarter: '3 Meses', year: 'Año' }
            const isSelected = range === r
            return (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {labels[r]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Interactive Canvas/SVG Financial Chart */}
      {loading ? (
        <div className="shimmer h-56 rounded-xl" />
      ) : (
        <div className="relative z-10">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              {/* Objective Violet Glow Gradient */}
              <linearGradient id="gradObj" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
              </linearGradient>

              {/* Habit Emerald Glow Gradient */}
              <linearGradient id="gradHab" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>

              {/* Drop Shadow for Financial Glow Line */}
              <filter id="glowObj" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#a855f7" floodOpacity="0.6" />
              </filter>
              <filter id="glowHab" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* Grid Background Lines (0%, 25%, 50%, 75%, 100%) */}
            {[0, 25, 50, 75, 100].map((val) => {
              const y = paddingY + chartH - (val / 100) * chartH
              return (
                <g key={val}>
                  <line
                    x1={paddingX} y1={y}
                    x2={svgWidth - paddingX} y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingX - 8} y={y + 3}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {val}%
                  </text>
                </g>
              )
            })}

            {/* Gradient Area Below Lines */}
            <path d={areaHab} fill="url(#gradHab)" />
            <path d={areaObj} fill="url(#gradObj)" />

            {/* Glowing Curves */}
            <path
              d={pathHab}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              filter="url(#glowHab)"
            />
            <path
              d={pathObj}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2.5"
              filter="url(#glowObj)"
            />

            {/* Interactive Data Nodes & Hover Trigger Areas */}
            {points.map((p, idx) => {
              const objCoord = coordsObj[idx]
              const habCoord = coordsHab[idx]
              const isHovered = hoverIndex === idx

              return (
                <g key={idx}>
                  {/* Vertical Hover Guide Bar */}
                  {isHovered && (
                    <line
                      x1={objCoord.x} y1={paddingY}
                      x2={objCoord.x} y2={svgHeight - paddingY}
                      stroke="rgba(255,255,255,0.25)"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Habit Point Circle */}
                  <circle
                    cx={habCoord.x} cy={habCoord.y}
                    r={isHovered ? 6 : 4}
                    fill="#10b981"
                    stroke="#020617" strokeWidth="2"
                    className="transition-all cursor-pointer"
                  />

                  {/* Objective Point Circle */}
                  <circle
                    cx={objCoord.x} cy={objCoord.y}
                    r={isHovered ? 6 : 4}
                    fill="#a855f7"
                    stroke="#020617" strokeWidth="2"
                    className="transition-all cursor-pointer"
                  />

                  {/* Invisible Hover Rect Trigger */}
                  <rect
                    x={objCoord.x - (chartW / points.length) / 2}
                    y={paddingY}
                    width={chartW / points.length}
                    height={chartH}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(idx)}
                  />

                  {/* X Axis Label */}
                  <text
                    x={objCoord.x}
                    y={svgHeight - 8}
                    fill={isHovered ? '#f8fafc' : '#64748b'}
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight={isHovered ? 'bold' : 'normal'}
                  >
                    {p.label}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Wall Street Floating Glassmorphic Tooltip */}
          {activePoint && hoverIndex !== null && (
            <div
              className="absolute pointer-events-none bg-slate-950/90 border border-white/20 backdrop-blur-md rounded-xl p-3 shadow-2xl z-20 text-xs font-mono space-y-1 transition-all"
              style={{
                left: `${Math.min(75, Math.max(10, (hoverIndex / (points.length - 1)) * 100))}%`,
                top: '15%',
                transform: 'translateX(-50%)',
              }}
            >
              <p className="text-slate-400 font-bold text-[11px] pb-1 border-b border-white/10">
                🗓️ {activePoint.label} ({activePoint.dateIso})
              </p>
              <div className="flex items-center justify-between gap-4 text-purple-300 pt-1">
                <span>🟣 Objetivos:</span>
                <span className="font-bold">{activePoint.objectivesPct}%</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-emerald-300">
                <span>⚡ Hábitos:</span>
                <span className="font-bold">{activePoint.habitsPct}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend Footer */}
      <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-white/[0.06] text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-purple-500 shadow-md shadow-purple-500/50" />
          <span>🟣 Objetivos / Tácticas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50" />
          <span>⚡ Rendimiento de Hábitos</span>
        </div>
      </div>
    </div>
  )
}
