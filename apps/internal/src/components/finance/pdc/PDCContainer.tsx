import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChequeRecord } from '../../../types/finance'
import { getCheques } from '../../../lib/server/finance-cheques'
import { CurrencyCell } from '../shared/CurrencyCell'
import { PDCGridView } from './PDCGridView'
import { PDCCalendarView } from './PDCCalendarView'

type ViewMode = 'grid' | 'calendar'

/**
 * "The Cheque Board" — PDC Container.
 * Toggle between Calendar and Grid views.
 * Due This Week summary strip at top with 3-day maturity indicator.
 */
export function PDCContainer() {
  const { t, i18n } = useTranslation('finance')
  const isArabic = i18n.language === 'ar'
  const [view, setView] = useState<ViewMode>('grid')
  const [cheques, setCheques] = useState<ChequeRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCheques = async () => {
    setLoading(true)
    try {
      const result = await getCheques()
      setCheques(result.cheques)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCheques()
  }, [])

  const now = Date.now()
  const weekMs = 7 * 86_400_000
  const threeDayMs = 3 * 86_400_000

  const dueThisWeek = useMemo(() => {
    return cheques.filter((c) => {
      const maturity = new Date(c.maturityDate).getTime()
      return maturity >= now && maturity <= now + weekMs && c.status !== 'cleared' && c.status !== 'written_off' && c.status !== 'replaced'
    })
  }, [cheques, now])

  const dueThisWeekTotal = useMemo(
    () => dueThisWeek.reduce((sum, c) => sum + c.amount, 0),
    [dueThisWeek],
  )

  const dueIn3Days = useMemo(() => {
    return dueThisWeek.filter((c) => {
      const maturity = new Date(c.maturityDate).getTime()
      return maturity <= now + threeDayMs
    })
  }, [dueThisWeek, now])

  const formatCount = (n: number) =>
    new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG').format(n)

  return (
    <div className="flex flex-col">
      {/* Summary strip + view toggle */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-6">
          {/* Due This Week */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 mb-0.5">
              {t('pdc.dueThisWeek', 'Due This Week')}
            </div>
            <div className="flex items-baseline gap-2">
              <CurrencyCell amount={dueThisWeekTotal} className="text-lg font-semibold text-black dark:text-white" />
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/30 dark:text-white/30">
                {formatCount(dueThisWeek.length)} {t('pdc.cheques', 'cheques')}
              </span>
            </div>
          </div>

          {/* 3-day urgency indicator */}
          {dueIn3Days.length > 0 && (
            <div className="flex items-center gap-2 ps-6 border-s border-black/10 dark:border-white/10">
              <div className="size-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-600 dark:text-red-400 font-medium font-[family-name:var(--font-geist-mono)] tabular-nums">
                {formatCount(dueIn3Days.length)}
              </span>
              <span className="text-[10px] text-red-500/60">
                {t('pdc.dueSoon', 'within 3 days')}
              </span>
            </div>
          )}
        </div>

        {/* View toggle — minimal text tabs */}
        <div className="flex items-center rounded-md border border-black/10 dark:border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${
              view === 'grid'
                ? 'bg-[#2563EB] text-white'
                : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
            }`}
          >
            {t('pdc.gridView', 'Grid')}
          </button>
          <button
            type="button"
            onClick={() => setView('calendar')}
            className={`px-3 py-1.5 text-[10px] font-medium border-s border-black/10 dark:border-white/10 transition-colors ${
              view === 'calendar'
                ? 'bg-[#2563EB] text-white'
                : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
            }`}
          >
            {t('pdc.calendarView', 'Calendar')}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-xs text-black/30 dark:text-white/30">
          {t('common.loading', 'Loading...')}
        </div>
      ) : view === 'grid' ? (
        <PDCGridView cheques={cheques} onRefresh={fetchCheques} />
      ) : (
        <PDCCalendarView cheques={cheques} />
      )}
    </div>
  )
}
