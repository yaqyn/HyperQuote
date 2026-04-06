import { useTranslation } from 'react-i18next'
import { CurrencyCell } from '../shared/CurrencyCell'

interface ARKPICard {
  key: string
  label: string
  value: number
  isCurrency: boolean
  suffix?: string
  trend?: { direction: 'up' | 'down'; isGood: boolean }
  highlight?: boolean
  filterAction?: () => void
}

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
 * Horizontal KPI card strip for AR view.
 * 5 glass panel cards: Total Outstanding, DSO, CEI%, Overdue, Collections.
 * Each card clickable to filter table below.
 * All amounts via CurrencyCell (Geist Mono).
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
  // For DSO, lower is better -> down is good
  const dsoTrend: ARKPICard['trend'] =
    dsoDelta !== 0
      ? { direction: dsoDelta > 0 ? 'up' : 'down', isGood: dsoDelta < 0 }
      : undefined

  const collectionsPercent =
    collectionsTarget > 0
      ? Math.round((currentCollections / collectionsTarget) * 100)
      : 0

  const cards: ARKPICard[] = [
    {
      key: 'totalOutstanding',
      label: t('ar.kpi.totalOutstanding', 'Total Outstanding'),
      value: totalOutstanding,
      isCurrency: true,
      filterAction: () => onCardClick?.('totalOutstanding'),
    },
    {
      key: 'dso',
      label: t('ar.kpi.dso', 'DSO'),
      value: dso,
      isCurrency: false,
      suffix: t('ar.kpi.days', 'days'),
      trend: dsoTrend,
      filterAction: () => onCardClick?.('dso'),
    },
    {
      key: 'cei',
      label: t('ar.kpi.cei', 'CEI %'),
      value: cei,
      isCurrency: false,
      suffix: '%',
      filterAction: () => onCardClick?.('cei'),
    },
    {
      key: 'overdue',
      label: t('ar.kpi.overdue', 'Overdue Amount'),
      value: overdueAmount,
      isCurrency: true,
      highlight: overdueAmount > overdueThreshold,
      filterAction: () => onCardClick?.('overdue'),
    },
    {
      key: 'collections',
      label: t('ar.kpi.collections', 'Collections'),
      value: currentCollections,
      isCurrency: true,
      suffix: `${collectionsPercent}% ${t('ar.kpi.ofTarget', 'of target')}`,
      filterAction: () => onCardClick?.('collections'),
    },
  ]

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          onClick={card.filterAction}
          className={`flex-1 min-w-[180px] rounded-xl border backdrop-blur-sm p-4 text-start transition-colors
            ${
              card.highlight
                ? 'border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-950/40'
                : 'border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60'
            }
            hover:border-[#2563EB]/40 hover:bg-[#2563EB]/5 cursor-pointer`}
        >
          <div className="text-xs text-black/50 dark:text-white/50 mb-2">
            {card.label}
          </div>
          <div className="flex items-baseline gap-2">
            {card.isCurrency ? (
              <CurrencyCell amount={card.value} className="text-2xl" />
            ) : (
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl">
                {card.value}
              </span>
            )}
            {card.suffix && !card.isCurrency && (
              <span className="text-xs text-black/40 dark:text-white/40">
                {card.suffix}
              </span>
            )}
          </div>
          {card.trend && (
            <div
              className={`mt-1 flex items-center gap-1 text-xs ${
                card.trend.isGood ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <span>{card.trend.direction === 'up' ? '\u2191' : '\u2193'}</span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                {Math.abs(dso - dsoPrior)}
              </span>
              <span>{t('ar.kpi.vsPrior', 'vs prior')}</span>
            </div>
          )}
          {card.key === 'collections' && (
            <div className="mt-1 text-xs text-black/40 dark:text-white/40">
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                {collectionsPercent}%
              </span>{' '}
              {t('ar.kpi.ofTarget', 'of target')}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
