import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import type { CreditProfile, AutoHoldTrigger, CreditHoldType } from '../../../types/finance'
import { shouldAutoHold } from '../../../lib/finance/credit-scoring'
import { CurrencyCell } from '../shared/CurrencyCell'

interface CreditHoldPanelProps {
  profile: CreditProfile
  onRelease?: () => void
  onReleaseOneTime?: () => void
  onEscalate?: () => void
}

const TRIGGER_LABELS: Record<CreditHoldType, string> = {
  limit_exceeded: 'Credit limit exceeded',
  overdue_30: 'Invoice overdue >30 days',
  overdue_pct: 'Overdue exceeds % of limit',
  bounced_cheque: 'Bounced cheques threshold',
  limit_expired: 'Credit limit expired',
}

function getTriggerDescription(trigger: AutoHoldTrigger): string {
  switch (trigger.type) {
    case 'limit_exceeded':
      return `EGP ${trigger.currentValue.toLocaleString()} / ${trigger.threshold.toLocaleString()}`
    case 'overdue_30':
      return `${trigger.currentValue} days avg (max ${trigger.threshold})`
    case 'overdue_pct':
      return `${Math.round(trigger.currentValue)}% of limit (max ${trigger.threshold}%)`
    case 'bounced_cheque':
      return `${trigger.currentValue} bounced (max ${trigger.threshold})`
    case 'limit_expired':
      return 'Needs renewal'
    default:
      return ''
  }
}

/** Mock credit limit change history */
const MOCK_CHANGE_HISTORY = [
  { date: '2026-01-15', oldLimit: 1_500_000, newLimit: 2_000_000, approvedBy: 'Ahmed Hassan (FM)' },
  { date: '2025-07-20', oldLimit: 1_000_000, newLimit: 1_500_000, approvedBy: 'Ahmed Hassan (FM)' },
  { date: '2025-01-10', oldLimit: 500_000, newLimit: 1_000_000, approvedBy: 'Omar Farouk (CFO)' },
]

/**
 * Credit hold panel: alert banner + 5 auto-hold triggers + actions + history.
 * Data-dense, professional, minimal color.
 */
export function CreditHoldPanel({
  profile,
  onRelease,
  onReleaseOneTime,
  onEscalate,
}: CreditHoldPanelProps) {
  const { t } = useTranslation('finance')
  const { hold, triggers } = shouldAutoHold(profile)

  const triggeredCount = triggers.filter((tr) => tr.triggered).length

  return (
    <div className="space-y-4">
      {/* ─── Hold banner ───────────────────────────────── */}
      {hold && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-red-500/20 bg-red-500/[0.04]">
          <span className="size-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium text-red-700 dark:text-red-400 tracking-wider uppercase">
            {t('credit.holdBanner', 'Credit Hold -- New orders blocked')}
          </span>
        </div>
      )}

      {/* ─── Trigger list ──────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25">
            {t('credit.autoHoldTriggers', 'Auto-Hold Triggers')}
          </div>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/20 dark:text-white/20">
            {triggeredCount}/5
          </span>
        </div>

        <div className="space-y-1">
          {triggers.map((trigger) => (
            <div
              key={trigger.type}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                trigger.triggered
                  ? 'bg-red-500/[0.04] border border-red-500/10'
                  : 'bg-black/[0.01] dark:bg-white/[0.01] border border-transparent'
              }`}
            >
              {/* Status dot */}
              <span className={`size-1.5 rounded-full shrink-0 ${trigger.triggered ? 'bg-red-500' : 'bg-green-500'}`} />

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-black/60 dark:text-white/60">
                  {t(`credit.trigger.${trigger.type}`, TRIGGER_LABELS[trigger.type])}
                </div>
                <div className="text-[10px] text-black/25 dark:text-white/25 mt-0.5">
                  {getTriggerDescription(trigger)}
                </div>
              </div>

              {/* Current / Threshold values */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/30 dark:text-white/30">
                  {trigger.type === 'overdue_pct'
                    ? `${Math.round(trigger.currentValue)}%`
                    : trigger.type === 'limit_exceeded'
                      ? `${(trigger.currentValue / 1000).toFixed(0)}k`
                      : trigger.currentValue}
                </span>
                <span className="text-[8px] text-black/15 dark:text-white/15">/</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/20 dark:text-white/20">
                  {trigger.type === 'overdue_pct'
                    ? `${trigger.threshold}%`
                    : trigger.type === 'limit_exceeded'
                      ? `${(trigger.threshold / 1000).toFixed(0)}k`
                      : trigger.threshold}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Actions ───────────────────────────────────── */}
      {hold && (
        <div className="flex items-center gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
          <Button
            onPress={onRelease}
            className="rounded-md bg-[#2563EB] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 transition-colors"
          >
            {t('credit.releaseWithApproval', 'Release with Approval')}
          </Button>
          <Button
            onPress={onReleaseOneTime}
            className="rounded-md border border-black/[0.08] dark:border-white/[0.08] px-3 py-1.5 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
          >
            {t('credit.releaseOneTime', 'One-Time Release')}
          </Button>
          <div className="flex-1" />
          <Button
            onPress={onEscalate}
            className="rounded-md border border-red-500/20 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/[0.05] pressed:bg-red-500/[0.08] transition-colors"
          >
            {t('credit.escalate', 'Escalate')}
          </Button>
        </div>
      )}

      {/* ─── Limit change history ──────────────────────── */}
      <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-2">
          {t('credit.limitHistory', 'Limit History')}
        </div>
        <div className="space-y-0">
          {MOCK_CHANGE_HISTORY.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-1.5 border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0"
            >
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/30 dark:text-white/30 min-w-[70px]">
                {entry.date}
              </span>
              <CurrencyCell amount={entry.oldLimit} className="text-[11px] text-black/25 dark:text-white/25 min-w-[80px]" />
              <span className="text-[10px] text-black/15 dark:text-white/15">&rarr;</span>
              <CurrencyCell amount={entry.newLimit} className="text-[11px] min-w-[80px]" />
              <span className="text-[10px] text-black/25 dark:text-white/25 flex-1 text-end truncate">
                {entry.approvedBy}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
