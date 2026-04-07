import { useTranslation } from 'react-i18next'
import { CurrencyCell } from '../shared/CurrencyCell'

interface ARKPIStripProps {
  totalOutstanding: number
  dso: number
  dsoPrior: number
  cei: number
  overdueAmount: number
  overdueThreshold: number
  currentCollections: number
  collectionsTarget: number
  onCardClick?: (metric: string) => void
}

/**
 * 4 metrics in a tight row — Total AR, DSO, Collection Rate, At-Risk Amount.
 * Large mono numbers, tiny labels below. Bloomberg density.
 */
export function ARKPIStrip({
  totalOutstanding,
  dso,
  dsoPrior,
  cei,
  overdueAmount,
  overdueThreshold,
  currentCollections,
  collectionsTarget,
  onCardClick,
}: ARKPIStripProps) {
  const { t } = useTranslation('finance')

  const dsoDelta = dso - dsoPrior
  const collectionsPercent =
    collectionsTarget > 0
      ? Math.round((currentCollections / collectionsTarget) * 100)
      : 0

  const metrics: {
    key: string
    label: string
    content: React.ReactNode
    sub?: React.ReactNode
    warn?: boolean
  }[] = [
    {
      key: 'totalOutstanding',
      label: t('ar.kpi.totalOutstanding', 'Total AR'),
      content: <CurrencyCell amount={totalOutstanding} className="text-2xl" subtle />,
    },
    {
      key: 'dso',
      label: t('ar.kpi.dso', 'DSO'),
      content: (
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl">
            {dso}
          </span>
          <span className="text-xs text-black/40 dark:text-white/40">
            {t('ar.kpi.days', 'days')}
          </span>
        </div>
      ),
      sub: dsoDelta !== 0 ? (
        <span
          className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs ${dsoDelta < 0 ? 'text-green-600' : 'text-red-600'}`}
        >
          {dsoDelta > 0 ? '\u2191' : '\u2193'}{Math.abs(dsoDelta)} {t('ar.kpi.vsPrior', 'vs prior')}
        </span>
      ) : undefined,
    },
    {
      key: 'collections',
      label: t('ar.kpi.collections', 'Collection Rate'),
      content: (
        <div className="flex items-baseline gap-1">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl">
            {collectionsPercent}
          </span>
          <span className="text-sm text-black/30 dark:text-white/30">%</span>
        </div>
      ),
      sub: (
        <span className="text-xs text-black/40 dark:text-white/40">
          CEI {cei}%
        </span>
      ),
    },
    {
      key: 'overdue',
      label: t('ar.kpi.overdue', 'At-Risk'),
      content: <CurrencyCell amount={overdueAmount} className="text-2xl" subtle />,
      warn: overdueAmount > overdueThreshold,
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-px bg-black/5 dark:bg-white/5 rounded-lg overflow-hidden">
      {metrics.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onCardClick?.(m.key)}
          className={`bg-white dark:bg-black px-4 py-3 text-start cursor-pointer transition-colors hover:bg-[#2563EB]/[0.03] ${
            m.warn ? 'border-s-2 border-red-500' : ''
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">
            {m.label}
          </div>
          {m.content}
          {m.sub && <div className="mt-0.5">{m.sub}</div>}
        </button>
      ))}
    </div>
  )
}
