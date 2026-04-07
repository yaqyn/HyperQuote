import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import type { CreditProfile } from '../../../types/finance'
import { CurrencyCell } from '../shared/CurrencyCell'

interface CreditProfileCardProps {
  profile: CreditProfile
  onHoldOrders?: () => void
  onAdjustLimit?: () => void
  onReview?: () => void
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 50) return 'text-black/60 dark:text-white/60'
  return 'text-red-600 dark:text-red-400'
}

/** Mock sparkline data for payment behavior */
const SPARKLINE_DATA = [85, 88, 92, 78, 90, 95, 88, 92, 96, 94, 90, 97]

function PaymentSparkline({ score }: { score: number }) {
  const w = 80
  const h = 20
  const data = SPARKLINE_DATA
  const max = 100
  const min = 60
  const range = max - min

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'

  return (
    <svg width={w} height={h} className="block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * "The Risk Desk" — Customer credit snapshot.
 * Limit (large mono) + used (progress bar) + available + risk score (large mono, colored).
 * Payment behavior as sparkline.
 */
export function CreditProfileCard({
  profile,
  onHoldOrders,
  onAdjustLimit,
  onReview,
}: CreditProfileCardProps) {
  const { t } = useTranslation('finance')

  return (
    <div className="space-y-0">
      {/* ─── Header ────────────────────────────────────── */}
      <div className="flex items-start justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="text-sm font-medium text-black/80 dark:text-white/80">
            {profile.customerName}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/25 dark:text-white/25">
              Tier {profile.tier}
            </span>
            <span className={`size-1.5 rounded-full ${profile.isOnHold ? 'bg-red-500' : 'bg-green-500'}`} />
            <span className="text-[10px] text-black/30 dark:text-white/30">
              {profile.isOnHold
                ? t('credit.statusOnHold', 'On Hold')
                : t('credit.statusActive', 'Active')}
            </span>
          </div>
        </div>

        {/* Risk score — large mono, colored */}
        <div className="text-end">
          <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-0.5">
            {t('credit.paymentScore', 'Score')}
          </div>
          <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-medium ${getScoreColor(profile.paymentScore)}`}>
            {profile.paymentScore}
          </span>
        </div>
      </div>

      {/* ─── Credit limit + utilization bar ─────────────── */}
      <div className="py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-0.5">
              {t('credit.creditLimit', 'Credit Limit')}
            </div>
            <CurrencyCell amount={profile.creditLimit} className="text-xl" />
          </div>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/25 dark:text-white/25">
            {Math.round(profile.utilizationPct)}% used
          </span>
        </div>

        {/* Full-width utilization bar */}
        <div className="w-full h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              profile.utilizationPct > 100
                ? 'bg-red-500 animate-pulse'
                : profile.utilizationPct > 80
                  ? 'bg-red-500/70'
                  : profile.utilizationPct > 60
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(profile.utilizationPct, 100)}%` }}
          />
        </div>

        {profile.utilizationPct > 100 && (
          <div className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-1 tracking-wider uppercase">
            {t('credit.overLimit', 'Over Limit')}
          </div>
        )}
      </div>

      {/* ─── Stats grid ────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-0 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <StatCell
          label={t('credit.availableCredit', 'Available')}
          value={<CurrencyCell amount={profile.availableCredit} className="text-xs" />}
        />
        <StatCell
          label={t('credit.overdueAmount', 'Overdue')}
          value={
            <CurrencyCell
              amount={profile.overdueAmount}
              className={`text-xs ${profile.overdueAmount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}
            />
          }
        />
        <StatCell
          label={t('credit.avgDaysToPay', 'Avg Days')}
          value={
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
              {profile.avgDaysToPay}
            </span>
          }
        />
        <StatCell
          label={t('credit.bouncedCheques', 'Bounced (12mo)')}
          value={
            <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs ${profile.bouncedCheques12mo > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
              {profile.bouncedCheques12mo}
            </span>
          }
          className="mt-3"
        />
        <StatCell
          label={t('credit.lastPayment', 'Last Payment')}
          value={
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/50 dark:text-white/50">
              {profile.lastPaymentDate || '--'}
            </span>
          }
          className="mt-3"
        />
        <div className="mt-3 px-4">
          <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-1">
            {t('credit.paymentBehavior', 'Behavior')}
          </div>
          <PaymentSparkline score={profile.paymentScore} />
        </div>
      </div>

      {/* New customer note */}
      {profile.tier === 1 && (
        <div className="py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-2 text-[11px] text-[#2563EB]/60">
            <span className="size-1 rounded-full bg-[#2563EB]" />
            {t(
              'credit.newCustomerDefaults',
              'New customer: 50% advance + 50% COD by certified bank cheque',
            )}
          </div>
        </div>
      )}

      {/* ─── Actions ───────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-4">
        <Button
          onPress={onHoldOrders}
          className="rounded-md border border-black/[0.08] dark:border-white/[0.08] px-3 py-1.5 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.03] pressed:bg-black/[0.06] dark:pressed:bg-white/[0.06] transition-colors"
        >
          {t('credit.holdOrders', 'Hold Orders')}
        </Button>
        <Button
          onPress={onAdjustLimit}
          className="rounded-md border border-black/[0.08] dark:border-white/[0.08] px-3 py-1.5 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.03] pressed:bg-black/[0.06] dark:pressed:bg-white/[0.06] transition-colors"
        >
          {t('credit.adjustLimit', 'Adjust Limit')}
        </Button>
        <div className="flex-1" />
        <Button
          onPress={onReview}
          className="rounded-md bg-[#2563EB] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 transition-colors"
        >
          {t('credit.review', 'Review')}
        </Button>
      </div>
    </div>
  )
}

function StatCell({
  label,
  value,
  className = '',
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={`px-4 ${className}`}>
      <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-0.5">
        {label}
      </div>
      {value}
    </div>
  )
}
