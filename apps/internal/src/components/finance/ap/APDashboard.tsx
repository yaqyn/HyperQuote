import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { APInvoiceList } from './APInvoiceList'
import { ThreeWayMatchReview } from './ThreeWayMatchReview'
import { WithholdingTaxSection } from './WithholdingTaxSection'
import { APAgingTable } from './APAgingTable'
import { CurrencyCell } from '../shared/CurrencyCell'
import { getAPInvoices } from '../../../lib/server/finance-ap'
import type { APInvoice } from '../../../types/finance'

type APView = 'list' | 'review'

/**
 * "The Payables Desk" — AP Dashboard.
 * Top strip: aging bar + outstanding total + upcoming due dates.
 * Below: invoice list or three-way match review.
 * Sub-sections: withholding tax + aging table in list view.
 */
export function APDashboard() {
  const { t, i18n } = useTranslation('finance')
  const isArabic = i18n.language === 'ar'
  const [view, setView] = useState<APView>('list')
  const [selectedInvoice, setSelectedInvoice] = useState<APInvoice | null>(null)
  const [invoices, setInvoices] = useState<APInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useState(() => {
    getAPInvoices().then((res) => {
      setInvoices(res.invoices)
      setLoading(false)
    })
  })

  const handleSelectInvoice = (invoice: APInvoice) => {
    setSelectedInvoice(invoice)
    setView('review')
  }

  const handleBack = () => {
    setSelectedInvoice(null)
    setView('list')
  }

  // Dashboard metrics derived from data
  const metrics = useMemo(() => {
    const outstanding = invoices.reduce((sum, inv) => sum + inv.netPayable, 0)
    const overdue = invoices.filter((inv) => {
      const due = new Date(inv.dueDate)
      return due < new Date() && inv.matchStatus !== 'matched'
    })
    const overdueAmount = overdue.reduce((sum, inv) => sum + inv.netPayable, 0)
    const dueThisWeek = invoices.filter((inv) => {
      const due = new Date(inv.dueDate)
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 86_400_000)
      return due >= now && due <= weekFromNow
    })
    const dueThisWeekAmount = dueThisWeek.reduce((sum, inv) => sum + inv.netPayable, 0)
    const matchedCount = invoices.filter((inv) => inv.matchStatus === 'matched').length

    // Aging buckets for the bar
    const current = invoices.filter((inv) => {
      const days = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86_400_000)
      return days <= 0
    }).reduce((s, inv) => s + inv.netPayable, 0)
    const days30 = invoices.filter((inv) => {
      const days = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86_400_000)
      return days > 0 && days <= 30
    }).reduce((s, inv) => s + inv.netPayable, 0)
    const days60 = invoices.filter((inv) => {
      const days = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86_400_000)
      return days > 30 && days <= 60
    }).reduce((s, inv) => s + inv.netPayable, 0)
    const days90 = invoices.filter((inv) => {
      const days = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86_400_000)
      return days > 60 && days <= 90
    }).reduce((s, inv) => s + inv.netPayable, 0)
    const days90plus = invoices.filter((inv) => {
      const days = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86_400_000)
      return days > 90
    }).reduce((s, inv) => s + inv.netPayable, 0)

    return {
      outstanding, overdueAmount, overdue: overdue.length,
      dueThisWeek: dueThisWeek.length, dueThisWeekAmount,
      matchedCount, total: invoices.length,
      aging: { current, days30, days60, days90, days90plus },
    }
  }, [invoices])

  const agingTotal = metrics.outstanding || 1
  const agingSegments = [
    { label: t('ap.aging.current', 'Current'), value: metrics.aging.current, color: 'bg-black/20 dark:bg-white/20' },
    { label: '1-30', value: metrics.aging.days30, color: 'bg-black/40 dark:bg-white/40' },
    { label: '31-60', value: metrics.aging.days60, color: 'bg-[#2563EB]' },
    { label: '61-90', value: metrics.aging.days90, color: 'bg-red-500' },
    { label: '90+', value: metrics.aging.days90plus, color: 'bg-red-700' },
  ]

  return (
    <div className="flex flex-col gap-0">
      {/* Top metrics strip */}
      {view === 'list' && !loading && (
        <div className="border-b border-black/10 dark:border-white/10 px-6 py-5">
          {/* Aging bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
                {t('ap.agingDistribution', 'Aging Distribution')}
              </span>
              <span className="text-[11px] text-black/40 dark:text-white/40">
                {t('ap.matchRate', '{{matched}}/{{total}} matched', {
                  matched: metrics.matchedCount,
                  total: metrics.total,
                })}
              </span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
              {agingSegments.map((seg) =>
                seg.value > 0 ? (
                  <div
                    key={seg.label}
                    className={`${seg.color} transition-all duration-500`}
                    style={{ width: `${(seg.value / agingTotal) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              {agingSegments.map((seg) => (
                <div key={seg.label} className="flex items-center gap-1.5">
                  <div className={`size-1.5 rounded-full ${seg.color}`} />
                  <span className="text-[10px] text-black/40 dark:text-white/40">{seg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key figures row — Due This Week is PRIMARY for a clerk */}
          <div className="grid grid-cols-4 gap-6">
            <div className={metrics.dueThisWeekAmount > 0 ? 'col-span-2 rounded-lg bg-[#2563EB]/[0.03] border border-[#2563EB]/10 px-4 py-3 -mx-1' : ''}>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#2563EB]/60 mb-1">
                {t('ap.dueThisWeek', 'Due This Week')}
              </div>
              <div className="flex items-baseline gap-3">
                <CurrencyCell amount={metrics.dueThisWeekAmount} className="text-3xl font-semibold text-black dark:text-white" />
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
                  {new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG').format(metrics.dueThisWeek)} {t('ap.invoices', 'inv.')}
                </span>
              </div>
            </div>
            {metrics.dueThisWeekAmount > 0 ? (
              <>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">
                    {t('ap.overdue', 'Overdue')}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <CurrencyCell
                      amount={metrics.overdueAmount}
                      className={`text-xl font-semibold ${metrics.overdueAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'}`}
                    />
                    {metrics.overdue > 0 && (
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-red-500">
                        {new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG').format(metrics.overdue)}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">
                    {t('ap.totalOutstanding', 'Outstanding')}
                  </div>
                  <CurrencyCell amount={metrics.outstanding} className="text-xl font-semibold text-black dark:text-white" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">
                    {t('ap.totalOutstanding', 'Outstanding')}
                  </div>
                  <CurrencyCell amount={metrics.outstanding} className="text-xl font-semibold text-black dark:text-white" />
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">
                    {t('ap.overdue', 'Overdue')}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <CurrencyCell
                      amount={metrics.overdueAmount}
                      className={`text-xl font-semibold ${metrics.overdueAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'}`}
                    />
                    {metrics.overdue > 0 && (
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-red-500">
                        {new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG').format(metrics.overdue)} {t('ap.invoices', 'inv.')}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">
                    {t('ap.nextDueDate', 'Next Due')}
                  </div>
                  <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xl font-semibold text-black dark:text-white">
                    {invoices.length > 0
                      ? new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-EG', {
                          month: 'short',
                          day: 'numeric',
                        }).format(
                          new Date(
                            [...invoices]
                              .filter((inv) => new Date(inv.dueDate) >= new Date())
                              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]?.dueDate ?? Date.now(),
                          ),
                        )
                      : '--'}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Form 41 deadline — inline countdown for finance clerk */}
          {(() => {
            const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
            const currentYear = new Date().getFullYear()
            const quarterEndMonth = currentQuarter * 3
            const quarterEnd = new Date(currentYear, quarterEndMonth, 0)
            const daysUntilDeadline = Math.max(0, Math.ceil((quarterEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            const isUrgent = daysUntilDeadline <= 14
            return (
              <div className={`flex items-center gap-3 mt-4 pt-3 border-t border-black/[0.04] dark:border-white/[0.04] ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-black/40 dark:text-white/40'}`}>
                {isUrgent && <span className="size-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  {t('ap.form41DeadlineInline', 'Form 41')}
                </span>
                <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs ${isUrgent ? 'font-semibold' : ''}`}>
                  {t('ap.dueInDays', 'Due in {{days}} days', { days: daysUntilDeadline })}
                </span>
                <span className="text-[10px] text-black/20 dark:text-white/20">
                  Q{currentQuarter} {currentYear}
                </span>
              </div>
            )
          })()}
        </div>
      )}

      {/* Main content */}
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <APInvoiceList invoices={invoices} loading={loading} onSelectInvoice={handleSelectInvoice} />

            {/* Sub-sections */}
            {!loading && (
              <>
                <div className="border-t border-black/10 dark:border-white/10">
                  <WithholdingTaxSection />
                </div>
                <div className="border-t border-black/10 dark:border-white/10">
                  <APAgingTable />
                </div>
              </>
            )}
          </motion.div>
        ) : (
          selectedInvoice && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <ThreeWayMatchReview invoice={selectedInvoice} onBack={handleBack} />
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  )
}
