import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getCustomer360 } from '../../../lib/server/sales-customers'

interface OverviewTabProps {
  customerId: string
  enabled: boolean
}

export function OverviewTab({ customerId, enabled }: OverviewTabProps) {
  const { t } = useTranslation('internal')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'overview', customerId],
    queryFn: () => getCustomer360({ data: { customerId } }),
    staleTime: 120_000,
    enabled,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!data) return null

  const { customer, financials, contacts, quotes, communications } = data
  const wonQuotes = quotes.filter((q) => q.outcome === 'won')
  const revenue12mo = wonQuotes.reduce((sum, q) => sum + q.total, 0)
  const winRate = quotes.length > 0
    ? Math.round((wonQuotes.length / quotes.length) * 100)
    : 0
  const openQuotes = quotes.filter((q) => q.outcome === 'pending').length

  const availableCredit = financials.creditLimit - customer.currentExposure
  const creditUtilization = financials.creditLimit > 0
    ? Math.round((customer.currentExposure / financials.creditLimit) * 100)
    : 0
  const openOrders = data.orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length

  return (
    <div className="p-6 flex gap-12">
      {/* Left column — summary metrics first, then details */}
      <div className="flex-1 min-w-0">
        {/* Credit status — the #1 thing a sales rep checks */}
        <div className="mb-6">
          <p className="text-[9px] uppercase tracking-widest text-black/35 dark:text-white/35 mb-3 font-medium">
            {t('sales.customer360.overview.creditStatus', 'Credit Status')}
          </p>
          <div className="flex items-end gap-8">
            <div>
              <p className="font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tabular-nums text-[var(--color-text)]">
                {formatCurrency(availableCredit)}
              </p>
              <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">
                {t('sales.customer360.overview.available', 'Available')}
              </p>
            </div>
            <div>
              <p className={`font-[family-name:var(--font-geist-mono)] text-[15px] font-medium tabular-nums ${
                creditUtilization > 80 ? 'text-red-500' : creditUtilization > 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-[var(--color-text)]'
              }`}>
                {creditUtilization}%
              </p>
              <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">utilized</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-geist-mono)] text-[15px] font-medium tabular-nums text-[var(--color-text)]">
                {financials.avgDaysToPay}d
              </p>
              <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">avg pay</p>
            </div>
          </div>
        </div>

        {/* Activity counts — open quotes/orders at a glance */}
        <div className="mb-6 flex items-center gap-8">
          {[
            { value: String(openQuotes), label: 'Open Quotes' },
            { value: String(openOrders), label: 'Open Orders' },
            { value: String(data.orders.length), label: 'Orders 12mo' },
            { value: formatCurrency(revenue12mo), label: 'Revenue 12mo' },
            { value: `${winRate}%`, label: 'Win Rate' },
          ].map((m) => (
            <div key={m.label}>
              <p className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium tabular-nums text-[var(--color-text)]">
                {m.value}
              </p>
              <p className="text-[9px] uppercase tracking-widest text-black/35 dark:text-white/35 mt-0.5">
                {m.label}
              </p>
            </div>
          ))}
        </div>

        {/* Contact info — compact */}
        <div className="space-y-0 border-t border-black/[0.04] dark:border-white/[0.04] pt-4">
          {[
            { label: t('sales.customer360.overview.contactName'), value: customer.contactName },
            { label: t('sales.customer360.overview.phone'), value: customer.phone, mono: true },
            { label: t('sales.customer360.overview.email'), value: customer.email ?? '\u2014' },
            { label: t('sales.customer360.overview.address'), value: customer.address ?? '\u2014' },
          ].map((item) => (
            <div key={item.label} className="flex items-baseline justify-between py-2">
              <span className="text-[11px] text-black/35 dark:text-white/35">
                {item.label}
              </span>
              <span
                className={`text-[13px] text-[var(--color-text)] dark:text-white ${
                  item.mono ? 'font-[family-name:var(--font-geist-mono)] tabular-nums' : ''
                }`}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Key contacts — compact */}
        {contacts.length > 0 && (
          <div className="mt-6">
            <p className="text-[9px] uppercase tracking-widest text-black/35 dark:text-white/35 mb-3 font-medium">
              {t('sales.customer360.overview.keyContacts')}
            </p>
            <div className="space-y-2">
              {contacts.slice(0, 3).map((contact) => (
                <div key={contact.id} className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[13px] font-medium text-[var(--color-text)] dark:text-white">
                      {contact.name}
                    </span>
                    <span className="text-[11px] text-black/30 dark:text-white/30 ms-2">
                      {contact.role}
                    </span>
                  </div>
                  <span className="text-[11px] text-black/25 dark:text-white/25">
                    {contact.commPreference}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column — recent activity */}
      <div className="w-[320px] shrink-0">
        <p className="text-[9px] uppercase tracking-widest text-black/35 dark:text-white/35 mb-3 font-medium">
          {t('sales.customer360.overview.recentActivity')}
        </p>
        <div className="space-y-3">
          {communications.slice(0, 8).map((comm) => (
            <div key={comm.id} className="flex items-start gap-3">
              <CommIcon type={comm.type} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[var(--color-text)] dark:text-white/80 truncate leading-snug">
                  {comm.summary}
                </p>
                <p className="text-[11px] text-black/30 dark:text-white/30 mt-0.5">
                  {comm.contactName} &middot;{' '}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {new Date(comm.date).toLocaleDateString()}
                  </span>
                </p>
              </div>
            </div>
          ))}
          {communications.length === 0 && (
            <p className="text-[13px] text-black/25 dark:text-white/25">
              {t('sales.customer360.communications.noCommunications')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function CommIcon({ type }: { type: string }) {
  const labels: Record<string, string> = {
    call: 'C',
    email: 'E',
    meeting: 'M',
    whatsapp: 'W',
  }
  return (
    <span className="w-6 h-6 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0 text-[10px] font-semibold text-black/40 dark:text-white/40">
      {labels[type] ?? 'N'}
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
    <div className="p-6 space-y-4 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex justify-between">
          <div className="h-3 w-24 rounded bg-black/[0.03] dark:bg-white/[0.03]" />
          <div className="h-3 w-32 rounded bg-black/[0.03] dark:bg-white/[0.03]" />
        </div>
      ))}
    </div>
  )
}
