import { useTranslation } from 'react-i18next'
import { useProcurementStore } from '../../../stores/procurement'
import type { ProcurementHomeData } from '../../../types/procurement'
import { useQuery } from '@tanstack/react-query'
import { getProcurementQueue } from '../../../lib/server/procurement-suppliers'

function SummaryCard({
  icon,
  label,
  count,
  onClick,
  urgency,
}: {
  icon: React.ReactNode
  label: string
  count: number
  onClick: () => void
  urgency?: 'normal' | 'warning' | 'critical'
}) {
  const urgencyBorder =
    urgency === 'critical'
      ? 'border-red-500/30'
      : urgency === 'warning'
        ? 'border-yellow-500/30'
        : 'border-black/10 dark:border-white/10'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 rounded-2xl border ${urgencyBorder} bg-white/60 p-5 text-start backdrop-blur-xl transition-colors hover:bg-white/80 dark:bg-black/60 dark:hover:bg-black/80`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tabular-nums">
          {count}
        </span>
        <span className="text-sm text-black/60 dark:text-white/60">{label}</span>
      </div>
    </button>
  )
}

export function ProcurementHomeView() {
  const { t } = useTranslation('internal')
  const setActiveTab = useProcurementStore((s) => s.setActiveTab)

  const { data } = useQuery({
    queryKey: ['procurement', 'queue'],
    queryFn: () => getProcurementQueue({ data: { page: 1, limit: 20 } }),
    staleTime: 30_000,
  })

  const homeData: ProcurementHomeData | undefined = data?.items

  const activePOCount = homeData
    ? Object.values(homeData.activePOs).reduce((sum: number, c: number) => sum + c, 0)
    : 0

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8" /><path d="M3 16.2V21h4.8" /><path d="M21 7.8V3h-4.8" /><path d="M3 7.8V3h4.8" /></svg>
          }
          label={t('procurement.home.pendingInquiries')}
          count={homeData?.pendingInquiries ?? 0}
          onClick={() => setActiveTab('inquiries')}
          urgency={homeData && homeData.pendingInquiries > 5 ? 'warning' : 'normal'}
        />
        <SummaryCard
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="m9 15 2 2 4-4" /></svg>
          }
          label={t('procurement.home.responsesNeedingReview')}
          count={homeData?.responsesNeedingReview ?? 0}
          onClick={() => setActiveTab('comparison')}
          urgency={homeData && homeData.responsesNeedingReview > 3 ? 'critical' : 'normal'}
        />
        <SummaryCard
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
          }
          label={t('procurement.home.activePOs')}
          count={activePOCount}
          onClick={() => setActiveTab('po-management')}
        />
        <SummaryCard
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          }
          label={t('procurement.home.performanceHighlights')}
          count={homeData?.performanceHighlights.best.score ?? 0}
          onClick={() => setActiveTab('scorecard')}
        />
      </div>

      {/* Performance Highlights */}
      {homeData?.performanceHighlights && (
        <div className="rounded-2xl border border-black/10 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-black/60">
          <h3 className="mb-4 text-sm font-semibold">{t('procurement.home.supplierPerformance')}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl bg-green-500/5 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium">{homeData.performanceHighlights.best.supplierName}</p>
                <p className="font-[family-name:var(--font-geist-mono)] text-xs text-green-600 dark:text-green-400 tabular-nums">
                  {t('procurement.home.score')}: {homeData.performanceHighlights.best.score}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-red-500/5 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium">{homeData.performanceHighlights.worst.supplierName}</p>
                <p className="font-[family-name:var(--font-geist-mono)] text-xs text-red-600 dark:text-red-400 tabular-nums">
                  {t('procurement.home.score')}: {homeData.performanceHighlights.worst.score}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active PO Breakdown */}
      {homeData?.activePOs && (
        <div className="rounded-2xl border border-black/10 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-black/60">
          <h3 className="mb-4 text-sm font-semibold">{t('procurement.home.poBreakdown')}</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(homeData.activePOs)
              .filter(([, count]) => count > 0)
              .map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10"
                >
                  <span className="text-xs text-black/60 dark:text-white/60">
                    {t(`procurement.poStatus.${status}`)}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
