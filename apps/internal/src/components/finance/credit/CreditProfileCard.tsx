import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import type { CreditProfile } from '../../../types/finance'
import { CurrencyCell } from '../shared/CurrencyCell'
import { UtilizationBar } from '../shared/UtilizationBar'

interface CreditProfileCardProps {
  profile: CreditProfile
  onHoldOrders?: () => void
  onAdjustLimit?: () => void
  onReview?: () => void
}

const TIER_COLORS: Record<number, string> = {
  1: 'bg-green-500/20 text-green-700 dark:text-green-400',
  2: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  3: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  4: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  5: 'bg-red-500/20 text-red-700 dark:text-red-400',
}

const TIER_LABELS: Record<number, string> = {
  1: 'New',
  2: 'Developing',
  3: 'Established',
  4: 'Strategic',
  5: 'Flagged',
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Full credit profile card for a customer.
 * Header: name, tier badge, status badge.
 * Credit limit in Geist Mono 20px, full-width utilization bar.
 * Stats grid 2x3, quick actions.
 */
export function CreditProfileCard({
  profile,
  onHoldOrders,
  onAdjustLimit,
  onReview,
}: CreditProfileCardProps) {
  const { t } = useTranslation('finance')
  const tierColor = TIER_COLORS[profile.tier] ?? TIER_COLORS[3]
  const tierLabel = TIER_LABELS[profile.tier] ?? 'Unknown'

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{profile.customerName}</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierColor}`}>
            {t(`credit.tier${profile.tier}`, `Tier ${profile.tier} - ${tierLabel}`)}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            profile.isOnHold
              ? 'bg-red-500/20 text-red-700 dark:text-red-400'
              : 'bg-green-500/20 text-green-700 dark:text-green-400'
          }`}
        >
          {profile.isOnHold
            ? t('credit.statusOnHold', 'On Hold')
            : t('credit.statusActive', 'Active')}
        </span>
      </div>

      {/* Credit Limit */}
      <div>
        <div className="text-xs text-black/50 dark:text-white/50 mb-1">
          {t('credit.creditLimit', 'Credit Limit')}
        </div>
        <div className="text-xl">
          <CurrencyCell amount={profile.creditLimit} className="text-xl" />
        </div>
      </div>

      {/* Utilization Bar */}
      <div>
        <div className="text-xs text-black/50 dark:text-white/50 mb-1">
          {t('credit.utilization', 'Utilization')}
        </div>
        <UtilizationBar percentage={profile.utilizationPct} />
        {profile.utilizationPct > 100 && (
          <div className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
            {t('credit.overLimit', 'OVER LIMIT')}
          </div>
        )}
      </div>

      {/* Stats Grid 2x3 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <div className="text-xs text-black/50 dark:text-white/50 mb-0.5">
            {t('credit.availableCredit', 'Available Credit')}
          </div>
          <CurrencyCell amount={profile.availableCredit} className="text-sm" />
        </div>
        <div>
          <div className="text-xs text-black/50 dark:text-white/50 mb-0.5">
            {t('credit.overdueAmount', 'Overdue Amount')}
          </div>
          <CurrencyCell
            amount={profile.overdueAmount}
            className={`text-sm ${profile.overdueAmount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}
          />
        </div>
        <div>
          <div className="text-xs text-black/50 dark:text-white/50 mb-0.5">
            {t('credit.paymentScore', 'Payment Score')}
          </div>
          <span
            className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-sm ${getScoreColor(profile.paymentScore)}`}
          >
            {profile.paymentScore}/100
          </span>
        </div>
        <div>
          <div className="text-xs text-black/50 dark:text-white/50 mb-0.5">
            {t('credit.avgDaysToPay', 'Avg Days to Pay')}
          </div>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
            {profile.avgDaysToPay}
          </span>
        </div>
        <div>
          <div className="text-xs text-black/50 dark:text-white/50 mb-0.5">
            {t('credit.bouncedCheques', 'Bounced Cheques (12mo)')}
          </div>
          <span
            className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-sm ${profile.bouncedCheques12mo > 0 ? 'text-red-600 dark:text-red-400' : ''}`}
          >
            {profile.bouncedCheques12mo}
          </span>
        </div>
        <div>
          <div className="text-xs text-black/50 dark:text-white/50 mb-0.5">
            {t('credit.lastPayment', 'Last Payment')}
          </div>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
            {profile.lastPaymentDate}
          </span>
        </div>
      </div>

      {/* New customer defaults */}
      {profile.tier === 1 && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-700 dark:text-blue-400">
          {t(
            'credit.newCustomerDefaults',
            'New customer defaults: 50% advance + 50% COD by certified bank cheque',
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onPress={onHoldOrders}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80 hover:bg-black/5 dark:hover:bg-white/5 pressed:bg-black/10 dark:pressed:bg-white/10 transition-colors"
        >
          {t('credit.holdOrders', 'Hold Orders')}
        </Button>
        <Button
          onPress={onAdjustLimit}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80 hover:bg-black/5 dark:hover:bg-white/5 pressed:bg-black/10 dark:pressed:bg-white/10 transition-colors"
        >
          {t('credit.adjustLimit', 'Adjust Limit')}
        </Button>
        <Button
          onPress={onReview}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#2563EB] text-white hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 transition-colors"
        >
          {t('credit.review', 'Review')}
        </Button>
      </div>
    </div>
  )
}
