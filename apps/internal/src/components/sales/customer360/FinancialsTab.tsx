import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getCustomer360 } from '../../../lib/server/sales-customers'

interface FinancialsTabProps {
  customerId: string
  enabled: boolean
}

export function FinancialsTab({ customerId, enabled }: FinancialsTabProps) {
  const { t } = useTranslation('internal')

  const { data: fullData, isLoading } = useQuery({
    queryKey: ['customer-360', 'financials', customerId],
    queryFn: () => getCustomer360({ data: { customerId } }),
    staleTime: 120_000,
    enabled,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!fullData) return null

  const { financials, customer } = fullData
  const { arAging, creditLimitHistory, paymentHistory, avgDaysToPay } = financials
  const totalAR = arAging.current + arAging.days1to30 + arAging.days31to60 + arAging.days61to90 + arAging.days90plus
  const creditUsed = customer.currentExposure
  const creditLimit = financials.creditLimit
  const creditPct = creditLimit > 0 ? Math.min((creditUsed / creditLimit) * 100, 100) : 0

  // AR aging segments for horizontal bar
  const agingSegments = [
    { label: t('sales.customer360.financials.current'), amount: arAging.current, color: '#22c55e' },
    { label: '1-30', amount: arAging.days1to30, color: '#eab308' },
    { label: '31-60', amount: arAging.days31to60, color: '#f97316' },
    { label: '61-90', amount: arAging.days61to90, color: '#ef4444' },
    { label: '90+', amount: arAging.days90plus, color: '#dc2626' },
  ]

  return (
    <div className="p-6 space-y-8">
      {/* AR Aging — horizontal segmented bar */}
      <div>
        <p className="text-[11px] text-black/35 dark:text-white/35 uppercase tracking-wider font-medium mb-3">
          {t('sales.customer360.financials.arAging')}
        </p>

        {/* Segmented bar */}
        {totalAR > 0 ? (
          <>
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-black/[0.04] dark:bg-white/[0.06]">
              {agingSegments.map((seg) => {
                const pct = (seg.amount / totalAR) * 100
                if (pct === 0) return null
                return (
                  <div
                    key={seg.label}
                    className="h-full first:rounded-s-full last:rounded-e-full"
                    style={{ width: `${pct}%`, backgroundColor: seg.color }}
                  />
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 mt-3">
              {agingSegments.map((seg) => (
                <div key={seg.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="text-[11px] text-black/35 dark:text-white/35">{seg.label}</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] font-medium" style={{ color: seg.color }}>
                    {formatCurrency(seg.amount)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[13px] text-black/25 dark:text-white/25">
            {t('sales.customer360.financials.noAR')}
          </p>
        )}
      </div>

      {/* Credit Limit — progress bar */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[11px] text-black/35 dark:text-white/35 uppercase tracking-wider font-medium">
            {t('sales.customer360.overview.creditLimit')}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] text-[var(--color-text)] dark:text-white">
              {formatCurrency(creditUsed)}
            </span>
            <span className="text-[11px] text-black/25 dark:text-white/25">/</span>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] text-black/40 dark:text-white/40">
              {formatCurrency(creditLimit)}
            </span>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${creditPct}%`,
              backgroundColor: creditPct > 80 ? '#ef4444' : creditPct > 50 ? '#eab308' : '#2563EB',
            }}
          />
        </div>
      </div>

      {/* Payment History — compact dot indicator */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[11px] text-black/35 dark:text-white/35 uppercase tracking-wider font-medium">
            {t('sales.customer360.financials.paymentHistory')}
          </p>
          <span className="text-[11px] text-black/30 dark:text-white/30">
            {t('sales.customer360.financials.avgDaysToPay')}:{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-semibold text-[var(--color-text)] dark:text-white">
              {avgDaysToPay}d
            </span>
          </span>
        </div>

        {/* Sparkline dots */}
        <div className="flex items-end gap-1 mb-4">
          {paymentHistory.slice(-20).map((payment, i) => {
            const dotColor = payment.daysLate === 0
              ? '#22c55e'
              : payment.daysLate <= 7
                ? '#eab308'
                : '#ef4444'
            return (
              <div
                key={`${payment.date}-${i}`}
                className="group relative flex flex-col items-center"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-150"
                  style={{ backgroundColor: dotColor }}
                />
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block">
                  <div className="bg-[var(--color-text)] dark:bg-white text-white dark:text-black text-[10px] px-2 py-1 rounded whitespace-nowrap font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {formatCurrency(payment.amount)} &middot; {payment.daysLate === 0 ? 'On time' : `${payment.daysLate}d late`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Payment list — key-value style */}
        <div className="space-y-0">
          {paymentHistory.map((payment, i) => (
            <div
              key={`${payment.date}-${i}`}
              className="flex items-center justify-between py-2 border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0"
            >
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] text-black/40 dark:text-white/40">
                {payment.date}
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] text-[var(--color-text)] dark:text-white">
                {formatCurrency(payment.amount)}
              </span>
              <span
                className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] font-medium ${
                  payment.daysLate === 0
                    ? 'text-[#22c55e]'
                    : payment.daysLate <= 7
                      ? 'text-[#eab308]'
                      : 'text-[#ef4444]'
                }`}
              >
                {payment.daysLate === 0 ? 'On time' : `${payment.daysLate}d late`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Credit Limit History */}
      {creditLimitHistory.length > 0 && (
        <div>
          <p className="text-[11px] text-black/35 dark:text-white/35 uppercase tracking-wider font-medium mb-3">
            {t('sales.customer360.financials.creditHistory')}
          </p>
          <div className="flex items-end gap-6">
            {creditLimitHistory.map((entry) => (
              <div key={entry.date}>
                <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] font-semibold text-[var(--color-text)] dark:text-white">
                  {formatCurrency(entry.limit)}
                </p>
                <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/25 dark:text-white/25 mt-0.5">
                  {entry.date}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function TabSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-3 w-full rounded-full bg-black/[0.03] dark:bg-white/[0.03]" />
      <div className="h-2 w-full rounded-full bg-black/[0.03] dark:bg-white/[0.03]" />
      <div className="flex gap-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-full bg-black/[0.03] dark:bg-white/[0.03]" />
        ))}
      </div>
    </div>
  )
}
