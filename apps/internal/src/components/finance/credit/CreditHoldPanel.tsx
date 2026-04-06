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

const TRIGGER_ICONS: Record<CreditHoldType, string> = {
  limit_exceeded: '\u26A0',
  overdue_30: '\u23F0',
  overdue_pct: '\u{1F4CA}',
  bounced_cheque: '\u2716',
  limit_expired: '\u{1F4C5}',
}

const TRIGGER_LABELS: Record<CreditHoldType, string> = {
  limit_exceeded: 'Credit limit exceeded',
  overdue_30: 'Invoice overdue >30 days',
  overdue_pct: 'Overdue exceeds % of limit',
  bounced_cheque: 'Bounced cheques threshold',
  limit_expired: 'Credit limit expired',
}

function getTriggerDescription(trigger: AutoHoldTrigger, profile: CreditProfile): string {
  switch (trigger.type) {
    case 'limit_exceeded':
      return `Exposure EGP ${trigger.currentValue.toLocaleString()} exceeds limit EGP ${trigger.threshold.toLocaleString()}`
    case 'overdue_30':
      return `Average ${trigger.currentValue} days to pay (threshold: ${trigger.threshold} days)`
    case 'overdue_pct':
      return `Overdue ${Math.round(trigger.currentValue)}% of credit limit (threshold: ${trigger.threshold}%)`
    case 'bounced_cheque':
      return `${trigger.currentValue} bounced cheques in 12mo (threshold: ${trigger.threshold})`
    case 'limit_expired':
      return 'Credit limit has expired and needs renewal'
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
 * Credit hold panel: shows all 5 auto-hold trigger types.
 * Uses shouldAutoHold from credit-scoring to evaluate triggers.
 * Actions: Release with Approval, Release One-Time, Escalate.
 * Shows credit limit change history table.
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
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-6 space-y-5">
      <h3 className="text-base font-semibold">
        {t('credit.holdPanel', 'Credit Hold Status')}
      </h3>

      {/* Hold banner */}
      {hold && (
        <div className="rounded-lg bg-red-500/15 border border-red-500/30 p-3 text-sm font-medium text-red-700 dark:text-red-400 text-center">
          {t(
            'credit.holdBanner',
            'CUSTOMER ON CREDIT HOLD \u2014 New orders blocked',
          )}
        </div>
      )}

      {/* Trigger list */}
      <div className="space-y-2">
        <div className="text-xs text-black/50 dark:text-white/50 mb-2">
          {t('credit.autoHoldTriggers', 'Auto-Hold Triggers')} ({triggeredCount}/5{' '}
          {t('credit.triggered', 'triggered')})
        </div>
        {triggers.map((trigger) => (
          <div
            key={trigger.type}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              trigger.triggered
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]'
            }`}
          >
            <span className="text-base shrink-0 mt-0.5">{TRIGGER_ICONS[trigger.type]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {t(`credit.trigger.${trigger.type}`, TRIGGER_LABELS[trigger.type])}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    trigger.triggered
                      ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                      : 'bg-green-500/20 text-green-700 dark:text-green-400'
                  }`}
                >
                  {trigger.triggered ? t('credit.yes', 'Yes') : t('credit.no', 'No')}
                </span>
              </div>
              <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                {getTriggerDescription(trigger, profile)}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-black/40 dark:text-white/40">
                  {t('credit.currentValue', 'Current')}:{' '}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {trigger.type === 'overdue_pct'
                      ? `${Math.round(trigger.currentValue)}%`
                      : trigger.type === 'limit_exceeded'
                        ? `EGP ${trigger.currentValue.toLocaleString()}`
                        : trigger.currentValue}
                  </span>
                </span>
                <span className="text-black/40 dark:text-white/40">
                  {t('credit.threshold', 'Threshold')}:{' '}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {trigger.type === 'overdue_pct'
                      ? `${trigger.threshold}%`
                      : trigger.type === 'limit_exceeded'
                        ? `EGP ${trigger.threshold.toLocaleString()}`
                        : trigger.threshold}
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {hold && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-black/10 dark:border-white/10">
          <Button
            onPress={onRelease}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#2563EB] text-white hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 transition-colors"
          >
            {t('credit.releaseWithApproval', 'Release with Approval')}
          </Button>
          <Button
            onPress={onReleaseOneTime}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80 hover:bg-black/5 dark:hover:bg-white/5 pressed:bg-black/10 dark:pressed:bg-white/10 transition-colors"
          >
            {t('credit.releaseOneTime', 'Release One-Time')}
          </Button>
          <Button
            onPress={onEscalate}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-500/5 pressed:bg-red-500/10 transition-colors"
          >
            {t('credit.escalate', 'Escalate')}
          </Button>
        </div>
      )}

      {/* Credit Limit Change History */}
      <div>
        <div className="text-xs text-black/50 dark:text-white/50 mb-2">
          {t('credit.limitHistory', 'Credit Limit Change History')}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-black/50 dark:text-white/50">
                <th className="text-start py-1.5 pe-3 font-medium">{t('credit.date', 'Date')}</th>
                <th className="text-end py-1.5 pe-3 font-medium">
                  {t('credit.oldLimit', 'Old Limit')}
                </th>
                <th className="text-end py-1.5 pe-3 font-medium">
                  {t('credit.newLimit', 'New Limit')}
                </th>
                <th className="text-start py-1.5 font-medium">
                  {t('credit.approvedBy', 'Approved By')}
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CHANGE_HISTORY.map((entry, i) => (
                <tr
                  key={i}
                  className="border-b border-black/5 dark:border-white/5 last:border-b-0"
                >
                  <td className="py-1.5 pe-3 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {entry.date}
                  </td>
                  <td className="py-1.5 pe-3 text-end">
                    <CurrencyCell amount={entry.oldLimit} className="text-xs" />
                  </td>
                  <td className="py-1.5 pe-3 text-end">
                    <CurrencyCell amount={entry.newLimit} className="text-xs" />
                  </td>
                  <td className="py-1.5">{entry.approvedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
