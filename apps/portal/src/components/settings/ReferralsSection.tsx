/**
 * Referrals settings section.
 * Stats display via useQuery with getReferralStats.
 * Referral code + link with copy-to-clipboard.
 * Credit explanation. All numbers in Geist Mono.
 */
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Copy, Check, Gift, Users, Clock, Award } from 'lucide-react'
import { getReferralStats } from '../../lib/server/referrals'
import type { ReferralStats } from '../../types/settings'

export function ReferralsSection() {
  const { t } = useTranslation('portal')

  const { data: stats, isLoading } = useQuery({
    queryKey: ['referralStats'],
    queryFn: () => getReferralStats(),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">
          {t('settings.referrals.title')}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-[var(--color-surface)] animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[var(--color-text)]">
        {t('settings.referrals.title')}
      </h2>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label={t('settings.referrals.totalReferrals')}
          value={stats.totalReferrals}
        />
        <StatCard
          icon={Clock}
          label={t('settings.referrals.pendingCredits')}
          value={stats.pendingCredits}
          prefix="EGP "
        />
        <StatCard
          icon={Award}
          label={t('settings.referrals.earnedCredits')}
          value={stats.earnedCredits}
          prefix="EGP "
        />
      </div>

      {/* Referral code */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--color-text)]">
          {t('settings.referrals.yourCode')}
        </label>
        <div className="flex items-center gap-3">
          <span className="px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-primary)]">
            {stats.referralCode}
          </span>
          <CopyButton text={stats.referralCode} />
        </div>
      </div>

      {/* Referral link */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--color-text)]">
          {t('settings.referrals.yourLink')}
        </label>
        <div className="flex items-center gap-3">
          <span className="flex-1 px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] truncate font-mono">
            {stats.referralLink}
          </span>
          <CopyButton
            text={stats.referralLink}
            label={t('settings.referrals.copyLink')}
          />
        </div>
      </div>

      {/* Share CTA */}
      <div className="p-4 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10">
        <div className="flex items-start gap-3">
          <Gift size={20} className="text-[var(--color-primary)] mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">
              {t('settings.referrals.shareCTA')}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {t('settings.referrals.creditExplanation')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Stat Card
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  prefix = '',
}: {
  icon: typeof Users
  label: string
  value: number
  prefix?: string
}) {
  return (
    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)]">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-[var(--color-text-muted)]" />
        <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      </div>
      <span className="text-xl font-mono font-semibold text-[var(--color-text)]">
        {prefix}
        {value.toLocaleString()}
      </span>
    </div>
  )
}

// ============================================================================
// Copy Button
// ============================================================================

function CopyButton({
  text,
  label,
}: {
  text: string
  label?: string
}) {
  const { t } = useTranslation('portal')
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: do nothing
    }
  }

  return (
    <Button
      onPress={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {label ?? t('settings.referrals.copy')}
    </Button>
  )
}
