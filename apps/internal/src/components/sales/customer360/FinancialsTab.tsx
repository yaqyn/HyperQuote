import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Cell,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
} from 'react-aria-components'
import { getCustomer360 } from '../../../lib/server/sales-customers'

interface FinancialsTabProps {
  customerId: string
  enabled: boolean
}

export function FinancialsTab({ customerId, enabled }: FinancialsTabProps) {
  const { t } = useTranslation('internal')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'financials', customerId],
    queryFn: () => getCustomer360({ customerId }),
    staleTime: 120_000,
    enabled,
    select: (d) => d.financials,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!data) return null

  const { arAging, creditLimitHistory, paymentHistory, avgDaysToPay } = data
  const totalAR = arAging.current + arAging.days1to30 + arAging.days31to60 + arAging.days61to90 + arAging.days90plus

  return (
    <div className="p-4 space-y-6">
      {/* Credit Limit History */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4">
        <h3 className="text-sm font-semibold text-black/70 dark:text-white/70 mb-3">
          {t('sales.customer360.financials.creditHistory')}
        </h3>
        <div className="flex items-end gap-4">
          {creditLimitHistory.map((entry) => (
            <div key={entry.date} className="text-center">
              <p className="text-sm font-[family-name:var(--font-geist-mono)] font-semibold text-black dark:text-white mb-1">
                {formatCurrency(entry.limit)}
              </p>
              <p className="text-xs font-[family-name:var(--font-geist-mono)] text-black/40 dark:text-white/40">
                {entry.date}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* AR Aging Buckets */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4">
        <h3 className="text-sm font-semibold text-black/70 dark:text-white/70 mb-3">
          {t('sales.customer360.financials.arAging')}
        </h3>
        <div className="grid grid-cols-5 gap-3">
          <AgingBucket
            label={t('sales.customer360.financials.current')}
            amount={arAging.current}
            total={totalAR}
            color="#22c55e"
          />
          <AgingBucket
            label="1-30"
            amount={arAging.days1to30}
            total={totalAR}
            color="#eab308"
          />
          <AgingBucket
            label="31-60"
            amount={arAging.days31to60}
            total={totalAR}
            color="#f97316"
          />
          <AgingBucket
            label="61-90"
            amount={arAging.days61to90}
            total={totalAR}
            color="#ef4444"
          />
          <AgingBucket
            label="90+"
            amount={arAging.days90plus}
            total={totalAR}
            color="#dc2626"
          />
        </div>
      </div>

      {/* Payment History */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4">
        <h3 className="text-sm font-semibold text-black/70 dark:text-white/70 mb-3">
          {t('sales.customer360.financials.paymentHistory')}
        </h3>
        <Table
          aria-label={t('sales.customer360.financials.paymentHistory')}
          className="w-full"
          selectionMode="none"
        >
          <TableHeader>
            <Column isRowHeader className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
              {t('sales.customer360.financials.date')}
            </Column>
            <Column className="text-end text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
              {t('sales.customer360.financials.amount')}
            </Column>
            <Column className="text-end text-xs font-medium text-black/50 dark:text-white/50 pb-2">
              {t('sales.customer360.financials.daysLate')}
            </Column>
          </TableHeader>
          <TableBody>
            {paymentHistory.map((payment, i) => (
              <Row
                key={`${payment.date}-${i}`}
                className="border-t border-black/5 dark:border-white/5"
              >
                <Cell className="py-2 pe-4 text-sm font-[family-name:var(--font-geist-mono)] text-black/60 dark:text-white/60">
                  {payment.date}
                </Cell>
                <Cell className="py-2 pe-4 text-end text-sm font-[family-name:var(--font-geist-mono)] text-black dark:text-white">
                  {formatCurrency(payment.amount)}
                </Cell>
                <Cell className="py-2 text-end">
                  <span
                    className={`text-sm font-[family-name:var(--font-geist-mono)] ${
                      payment.daysLate === 0
                        ? 'text-[#22c55e]'
                        : payment.daysLate <= 7
                          ? 'text-[#eab308]'
                          : 'text-[#ef4444]'
                    }`}
                  >
                    {payment.daysLate === 0 ? 'On time' : `${payment.daysLate}d late`}
                  </span>
                </Cell>
              </Row>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Avg Days to Pay */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-black/60 dark:text-white/60">
            {t('sales.customer360.financials.avgDaysToPay')}
          </span>
          <span className="text-lg font-bold font-[family-name:var(--font-geist-mono)] text-black dark:text-white">
            {avgDaysToPay} {t('sales.customer360.financials.days')}
          </span>
        </div>
      </div>
    </div>
  )
}

function AgingBucket({
  label,
  amount,
  total,
  color,
}: {
  label: string
  amount: number
  total: number
  color: string
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0

  return (
    <div className="text-center">
      <p className="text-xs text-black/50 dark:text-white/50 mb-1">{label}</p>
      <p className="text-sm font-[family-name:var(--font-geist-mono)] font-semibold" style={{ color }}>
        {formatCurrency(amount)}
      </p>
      <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 mt-1.5 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
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
    <div className="p-4 space-y-4 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-32 rounded-xl bg-black/5 dark:bg-white/5" />
      ))}
    </div>
  )
}
