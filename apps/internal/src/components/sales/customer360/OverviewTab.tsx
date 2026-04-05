import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getCustomer360 } from '../../../lib/server/sales-customers'
import { HealthScore } from './HealthScore'

interface OverviewTabProps {
  customerId: string
  enabled: boolean
}

export function OverviewTab({ customerId, enabled }: OverviewTabProps) {
  const { t } = useTranslation('internal')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'overview', customerId],
    queryFn: () => getCustomer360({ customerId }),
    staleTime: 120_000,
    enabled,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!data) return null

  const { customer, financials, contacts, quotes } = data
  const wonQuotes = quotes.filter((q) => q.outcome === 'won')
  const revenue12mo = wonQuotes.reduce((sum, q) => sum + q.total, 0)
  const winRate = quotes.length > 0
    ? Math.round((wonQuotes.length / quotes.length) * 100)
    : 0
  const openQuotes = quotes.filter((q) => q.outcome === 'pending').length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
      {/* Health Score Card */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4">
        <h3 className="text-sm font-semibold text-black/70 dark:text-white/70 mb-3">
          {t('sales.customer360.overview.healthScore')}
        </h3>
        <HealthScore score={data.healthScore} />
      </div>

      {/* Key Metrics Card */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4">
        <h3 className="text-sm font-semibold text-black/70 dark:text-white/70 mb-3">
          {t('sales.customer360.overview.keyMetrics')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricItem
            label={t('sales.customer360.overview.lifetimeValue')}
            value={formatCurrency(revenue12mo)}
          />
          <MetricItem
            label={t('sales.customer360.overview.orders12mo')}
            value={String(data.orders.length)}
          />
          <MetricItem
            label={t('sales.customer360.overview.revenue12mo')}
            value={formatCurrency(revenue12mo)}
          />
          <MetricItem
            label={t('sales.customer360.overview.avgMargin')}
            value={`${financials.avgDaysToPay}d`}
          />
          <MetricItem
            label={t('sales.customer360.overview.winRate')}
            value={`${winRate}%`}
          />
          <MetricItem
            label={t('sales.customer360.overview.openQuotes')}
            value={String(openQuotes)}
          />
        </div>
      </div>

      {/* Credit & AR Card */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4">
        <h3 className="text-sm font-semibold text-black/70 dark:text-white/70 mb-3">
          {t('sales.customer360.overview.creditAR')}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-black/60 dark:text-white/60">
              {t('sales.customer360.overview.creditLimit')}
            </span>
            <span className="font-[family-name:var(--font-geist-mono)] text-sm">
              {formatCurrency(financials.creditLimit)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-black/60 dark:text-white/60">
              {t('sales.customer360.overview.currentExposure')}
            </span>
            <span className="font-[family-name:var(--font-geist-mono)] text-sm">
              {formatCurrency(customer.currentExposure)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-black/60 dark:text-white/60">
              {t('sales.customer360.overview.available')}
            </span>
            <span className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold">
              {formatCurrency(financials.creditLimit - customer.currentExposure)}
            </span>
          </div>
          <div className="h-px bg-black/10 dark:bg-white/10 my-2" />
          <div className="flex justify-between">
            <span className="text-sm text-black/60 dark:text-white/60">
              {t('sales.customer360.overview.avgDaysToPay')}
            </span>
            <span className="font-[family-name:var(--font-geist-mono)] text-sm">
              {financials.avgDaysToPay}
            </span>
          </div>
        </div>
      </div>

      {/* Key Contacts Card */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4">
        <h3 className="text-sm font-semibold text-black/70 dark:text-white/70 mb-3">
          {t('sales.customer360.overview.keyContacts')}
        </h3>
        <div className="space-y-2">
          {contacts.slice(0, 5).map((contact) => (
            <div key={contact.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black dark:text-white">
                  {contact.name}
                </p>
                <p className="text-xs text-black/50 dark:text-white/50">
                  {contact.role}
                </p>
              </div>
              <span className="text-xs text-black/40 dark:text-white/40">
                {contact.commPreference}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="lg:col-span-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4">
        <h3 className="text-sm font-semibold text-black/70 dark:text-white/70 mb-3">
          {t('sales.customer360.overview.recentActivity')}
        </h3>
        <div className="space-y-3">
          {data.communications.slice(0, 5).map((comm) => (
            <div key={comm.id} className="flex items-start gap-3">
              <CommIcon type={comm.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-black/80 dark:text-white/80 truncate">
                  {comm.summary}
                </p>
                <p className="text-xs text-black/40 dark:text-white/40">
                  {comm.contactName} &middot;{' '}
                  <span className="font-[family-name:var(--font-geist-mono)]">
                    {new Date(comm.date).toLocaleDateString()}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-black/50 dark:text-white/50 mb-0.5">{label}</p>
      <p className="text-sm font-semibold font-[family-name:var(--font-geist-mono)] text-black dark:text-white">
        {value}
      </p>
    </div>
  )
}

function CommIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    call: '\u{1F4DE}',
    email: '\u{2709}',
    meeting: '\u{1F91D}',
    whatsapp: '\u{1F4AC}',
  }
  return (
    <span className="text-sm w-6 h-6 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 shrink-0">
      {icons[type] ?? '\u{1F4CB}'}
    </span>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-48 rounded-xl bg-black/5 dark:bg-white/5"
        />
      ))}
    </div>
  )
}
