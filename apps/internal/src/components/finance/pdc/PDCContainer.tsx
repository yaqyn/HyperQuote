import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleButton } from 'react-aria-components'
import type { ChequeRecord } from '../../../types/finance'
import { getCheques } from '../../../lib/server/finance-cheques'
import { CurrencyCell } from '../shared/CurrencyCell'
import { PDCGridView } from './PDCGridView'
import { PDCCalendarView } from './PDCCalendarView'

type ViewMode = 'grid' | 'calendar'

/**
 * PDC Container — toggles between grid and calendar views.
 * Shows "Due This Week" summary bar at top with 3-day maturity amber indicator.
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

  // Due This Week: cheques maturing within 7 days from now
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

  // Cheques maturing within 3 days
  const dueIn3Days = useMemo(() => {
    return dueThisWeek.filter((c) => {
      const maturity = new Date(c.maturityDate).getTime()
      return maturity <= now + threeDayMs
    })
  }, [dueThisWeek, now])

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Due This Week summary bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-black/50 dark:text-white/50">
            {t('pdc.dueThisWeek', 'Due This Week')}
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-[family-name:var(--font-geist-mono)] text-lg text-black dark:text-white">
              {new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG').format(dueThisWeek.length)}
            </span>
            <span className="text-xs text-black/40 dark:text-white/40">
              {t('pdc.cheques', 'cheques')}
            </span>
            <CurrencyCell amount={dueThisWeekTotal} className="text-base" />
          </div>
        </div>

        {/* 3-day amber indicator */}
        {dueIn3Days.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <div className="size-2 rounded-full bg-amber-500" />
            <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
              {new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG').format(dueIn3Days.length)}{' '}
              {t('pdc.dueSoon', 'due within 3 days')}
            </span>
          </div>
        )}

        {/* View toggle */}
        <div className="flex rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
          <ToggleButton
            isSelected={view === 'grid'}
            onChange={() => setView('grid')}
            className="px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] data-[selected]:bg-[#2563EB] data-[selected]:text-white text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
          >
            {t('pdc.gridView', 'Grid View')}
          </ToggleButton>
          <ToggleButton
            isSelected={view === 'calendar'}
            onChange={() => setView('calendar')}
            className="px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] data-[selected]:bg-[#2563EB] data-[selected]:text-white text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 border-s border-black/10 dark:border-white/10"
          >
            {t('pdc.calendarView', 'Calendar View')}
          </ToggleButton>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-black/40 dark:text-white/40">
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
