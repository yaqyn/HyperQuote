import { useTranslation } from 'react-i18next'
import type { Customer, Customer360Data } from '../../../types/sales'

interface CustomerHeaderProps {
  customer: Customer
  accountManager?: string | null
  healthScore: number
  financials: Customer360Data['financials']
  orders: Customer360Data['orders']
  quotes: Customer360Data['quotes']
}

export function CustomerHeader({
  customer,
  accountManager,
  healthScore,
  financials,
  orders,
  quotes,
}: CustomerHeaderProps) {
  const { t } = useTranslation('internal')
  const isUnclaimed = customer.status === 'unclaimed'

  // Derive stat row metrics
  const totalOrders = orders.length
  const lifetimeValue = orders.reduce((sum, o) => sum + o.total, 0)
  const wonQuotes = quotes.filter((q) => q.outcome === 'won')
  const avgMargin = wonQuotes.length > 0
    ? Math.round(wonQuotes.reduce((sum, q) => sum + q.total, 0) / wonQuotes.length)
    : 0
  const creditAvailable = financials.creditLimit - customer.currentExposure
  const lastOrderDate = orders.length > 0
    ? orders.reduce((latest, o) => {
        const d = new Date(o.createdAt).getTime()
        return d > latest ? d : latest
      }, 0)
    : null
  const daysSinceLastOrder = lastOrderDate
    ? Math.floor((Date.now() - lastOrderDate) / (1000 * 60 * 60 * 24))
    : null

  const stats = [
    { label: t('sales.customer360.header.totalOrders'), value: String(totalOrders) },
    { label: t('sales.customer360.header.lifetimeValue'), value: formatCurrency(lifetimeValue) },
    { label: t('sales.customer360.header.avgMargin'), value: formatCurrency(avgMargin) },
    { label: t('sales.customer360.header.creditAvailable'), value: formatCurrency(creditAvailable) },
    { label: t('sales.customer360.header.healthScore'), value: String(healthScore) },
    {
      label: t('sales.customer360.header.daysSinceLastOrder'),
      value: daysSinceLastOrder !== null ? String(daysSinceLastOrder) : '\u2014',
    },
  ]

  return (
    <div
      className={
        isUnclaimed
          ? 'border border-dashed border-black/[0.15] dark:border-white/[0.15] rounded-lg p-5 relative'
          : ''
      }
    >
      {/* Unclaimed label */}
      {isUnclaimed && (
        <span className="absolute top-0 start-4 -translate-y-1/2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 bg-white dark:bg-[var(--color-bg)]">
          {t('sales.customer360.unclaimed')}
        </span>
      )}

      {/* Company name + tier pill */}
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-[20px] font-semibold text-[var(--color-text)] dark:text-white leading-tight">
          {customer.companyName}
        </h1>
        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums font-medium px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-black/50 dark:text-white/50 leading-none">
          {customer.tier === 'new' ? 'NEW' : customer.tier}
        </span>
      </div>

      {/* Subtitle: account manager + since */}
      <div className="flex items-center gap-4 text-[11px] text-black/35 dark:text-white/35 mb-5">
        {accountManager && (
          <span>{t('sales.customer360.accountManager')}: {accountManager}</span>
        )}
        <span>
          {t('sales.customer360.since')}{' '}
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            {new Date(customer.createdAt).toLocaleDateString()}
          </span>
        </span>
      </div>

      {/* Stat row — horizontal strip */}
      <div className="flex items-start gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[18px] font-semibold text-[var(--color-text)] dark:text-white leading-tight">
              {stat.value}
            </p>
            <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5 whitespace-nowrap">
              {stat.label}
            </p>
          </div>
        ))}
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
