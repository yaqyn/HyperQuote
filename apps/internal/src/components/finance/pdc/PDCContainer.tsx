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

  const bouncedCheques = useMemo(() => {
    return cheques.filter((c) => c.status === 'bounced')
  }, [cheques])

  const bouncedTotal = useMemo(
    () => bouncedCheques.reduce((sum, c) => sum + c.amount, 0),
    [bouncedCheques],
  )

  const formatCount = (n: number) =>
    new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG').format(n)

  return (
    <div className="flex flex-col">
      {/* CRIMINAL WARNING — Bounced cheques banner (Egyptian law) */}
      {!loading && bouncedCheques.length > 0 && (
        <div className="flex items-center gap-3 px-6 py-3 border-b-2 border-red-600/20 bg-red-600/[0.06]">
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-5 text-red-600 dark:text-red-400 shrink-0">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">
              {t('pdc.bouncedAlert', '{{count}} bounced cheques — Criminal offense under Egyptian law', { count: bouncedCheques.length })}
            </span>
            <span className="text-[10px] text-red-600/70 dark:text-red-400/70 ms-2">
              {t('pdc.bouncedAlertSub', 'Penal Code Art. 337 — immediate legal action required')}
            </span>
          </div>
          <CurrencyCell amount={bouncedTotal} className="text-sm font-semibold text-red-600 dark:text-red-400 shrink-0" />
        </div>
      )}

      {/* Summary strip + view toggle */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-6">
          {/* Due This Week — highlighted */}
          <div className={dueThisWeek.length > 0 ? 'rounded-lg bg-[#2563EB]/[0.03] border border-[#2563EB]/10 px-3 py-2 -my-1' : ''}>
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
