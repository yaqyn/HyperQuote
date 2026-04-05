import { useTranslation } from 'react-i18next'
import type { Customer } from '../../../types/sales'
import { TierBadge } from '../shared/TierBadge'

interface CustomerHeaderProps {
  customer: Customer
  accountManager?: string | null
}

export function CustomerHeader({ customer, accountManager }: CustomerHeaderProps) {
  const { t } = useTranslation('internal')
  const isUnclaimed = customer.status === 'unclaimed'

  return (
    <div
      className={`p-5 rounded-xl ${
        isUnclaimed
          ? 'border-2 border-dashed border-[#eab308]/50 bg-[#eab308]/5'
          : 'border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40'
      }`}
    >
      {isUnclaimed && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-[#eab308]/10 border border-[#eab308]/20">
          <p className="text-sm font-medium text-[#eab308]">
            {t('sales.customer360.noCreditEstablished')}
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-black dark:text-white">
              {customer.companyName}
            </h1>
            <TierBadge tier={customer.tier} />
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-black/60 dark:text-white/60">
            {customer.address && (
              <span>{customer.address}</span>
            )}
            <span className="font-[family-name:var(--font-geist-mono)]">
              {customer.phone}
            </span>
            {customer.email && (
              <span>{customer.email}</span>
            )}
          </div>

          {accountManager && (
            <p className="text-xs text-black/40 dark:text-white/40">
              {t('sales.customer360.accountManager')}: {accountManager}
            </p>
          )}
        </div>

        <div className="text-end text-xs text-black/40 dark:text-white/40 shrink-0">
          <p>{t('sales.customer360.since')}</p>
          <p className="font-[family-name:var(--font-geist-mono)]">
            {new Date(customer.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}
