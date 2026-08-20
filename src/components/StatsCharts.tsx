// ─── RdivExport – Composants de visualisation de statistiques ───────────
// Graphiques CSS purs (sans dépendance) optimisés mobile-first.

// ─── Mini Bar Chart (horizontal) ─────────────────────────────────────────

interface BarData {
  label: string
  value: number
  max?: number
  color?: string
}

interface MiniBarChartProps {
  data: BarData[]
  maxValue?: number
  height?: number
}

export function MiniBarChart({ data, maxValue, height = 28 }: MiniBarChartProps) {
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pct = Math.round((d.value / max) * 100)
        const color = d.color ?? (i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-blue-400' : 'bg-blue-300')
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="w-24 flex-shrink-0 truncate text-[11px] text-gray-600 text-right" title={d.label}>{d.label}</span>
            <div className="flex-1 rounded-full bg-gray-100" style={{ height: `${height}px` }}>
              <div
                className={`h-full rounded-full ${color} transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-10 flex-shrink-0 text-[11px] font-semibold text-gray-700 text-right">{d.value}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Donut Chart (CSS conic-gradient) ─────────────────────────────────────

interface DonutSegment {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
  centerLabel?: string
  centerValue?: string
}

export function DonutChart({ segments, size = 120, centerLabel, centerValue }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4">
        <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-gray-100">
          <span className="text-2xl font-bold text-gray-300">0</span>
        </div>
        <p className="mt-2 text-xs text-gray-400">Aucune donnée</p>
      </div>
    )
  }

  let cumulative = 0
  const gradientParts = segments.map(seg => {
    const start = (cumulative / total) * 360
    cumulative += seg.value
    const end = (cumulative / total) * 360
    return `${seg.color} ${start}deg ${end}deg`
  }).join(', ')

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative rounded-full"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: `conic-gradient(${gradientParts})`,
        }}
      >
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-white"
          style={{ width: `${size * 0.6}px`, height: `${size * 0.6}px`, margin: `${size * 0.2}px` }}
        >
          {centerValue && <span className="text-lg font-bold text-gray-900">{centerValue}</span>}
          {centerLabel && <span className="text-[10px] text-gray-500">{centerLabel}</span>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-[11px] text-gray-600">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sparkline (mini line chart via SVG) ─────────────────────────────────

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  fillOpacity?: number
  showDots?: boolean
  labels?: string[]
}

export function Sparkline({ data, width = 280, height = 60, color = '#3b82f6', fillOpacity = 0.1, showDots = false, labels }: SparklineProps) {
  if (data.length === 0) return <p className="text-xs text-gray-400 text-center py-2">Aucune donnée</p>

  const max = Math.max(...data, 1)
  const padding = { top: 4, bottom: 4, left: 2, right: 2 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const points = data.map((v, i) => ({
    x: padding.left + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2),
    y: padding.top + chartH - (v / max) * chartH,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${height - padding.bottom} L${points[0].x},${height - padding.bottom} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={fillOpacity * 3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {showDots && points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="white" stroke={color} strokeWidth={2} />
        ))}
      </svg>
      {labels && labels.length > 0 && (
        <div className="flex justify-between mt-1 px-0.5">
          {labels.map((l, i) => (
            <span key={i} className="text-[9px] text-gray-400">{l}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'indigo' | 'purple' | 'gray'
}

const KPI_COLORS = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'bg-blue-100 text-blue-600' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'bg-green-100 text-green-600' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'bg-yellow-100 text-yellow-600' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'bg-red-100 text-red-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'bg-indigo-100 text-indigo-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'bg-purple-100 text-purple-600' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: 'bg-gray-100 text-gray-600' },
}

export function KpiCard({ label, value, icon, trend, trendValue, color = 'blue' }: KpiCardProps) {
  const c = KPI_COLORS[color]
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${c.text}`}>{value}</p>
          {trend && trendValue && (
            <div className="mt-1 flex items-center gap-1">
              {trend === 'up' && <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>}
              {trend === 'down' && <svg className="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" /></svg>}
              <span className={`text-[11px] font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        {icon && <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${c.icon}`}>{icon}</div>}
      </div>
    </div>
  )
}

// ─── Progress Ring ────────────────────────────────────────────────────────

interface ProgressRingProps {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
}

export function ProgressRing({ value, size = 80, strokeWidth = 6, color = '#3b82f6', label }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      {label && (
        <div className="-mt-[52px] mb-6 flex flex-col items-center">
          <span className="text-lg font-bold text-gray-900">{value}%</span>
          <span className="text-[10px] text-gray-500">{label}</span>
        </div>
      )}
    </div>
  )
}

// ─── Stat Section Wrapper ─────────────────────────────────────────────────

interface StatSectionProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  action?: React.ReactNode
}

export function StatSection({ title, subtitle, children, action }: StatSectionProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Insight / Suggestion Card ────────────────────────────────────────────

interface InsightCardProps {
  type: 'info' | 'warning' | 'success' | 'tip'
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

const INSIGHT_STYLES = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', iconBg: 'bg-blue-100' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', iconBg: 'bg-amber-100' },
  success: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-500', iconBg: 'bg-green-100' },
  tip: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-500', iconBg: 'bg-purple-100' },
}

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
  info: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>,
  warning: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>,
  success: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  tip: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>,
}

export function InsightCard({ type, title, description, action }: InsightCardProps) {
  const s = INSIGHT_STYLES[type]
  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-3`}>
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${s.iconBg} ${s.icon}`}>
          {INSIGHT_ICONS[type]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-900">{title}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-gray-600">{description}</p>
          {action && (
            <button onClick={action.onClick} className="mt-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700">
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Product Suggestion Chip ──────────────────────────────────────────────

interface SuggestionChipProps {
  name: string
  frequency?: number
  avgQty?: number
  unit?: string
  onClick: () => void
  compact?: boolean
}

export function SuggestionChip({ name, frequency, avgQty, unit, onClick, compact }: SuggestionChipProps) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md active:scale-[0.98]"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-900 group-hover:text-blue-700">{name}</p>
        {!compact && frequency && (
          <p className="text-[10px] text-gray-400">
            {frequency}x commande · moy. {avgQty} {unit ?? 'unites'}
          </p>
        )}
      </div>
    </button>
  )
}