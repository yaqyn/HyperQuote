/**
 * Referrals settings section.
 * "Data is the design" — stats as large monospace numbers in a row.
 * Referral code monospace. Copy as text link. No colored backgrounds.
 */

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import { getReferralStats } from '../../lib/server/referrals'

const labelClass =
	'text-[13px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]'

export function ReferralsSection() {
	const { t } = useTranslation('portal')

	const { data: stats, isLoading } = useQuery({
		queryKey: ['referralStats'],
		queryFn: () => getReferralStats(),
	})

	if (isLoading) {
		return (
			<div className="space-y-8">
				<div className="grid grid-cols-3 gap-8">
					{[1, 2, 3].map((i) => (
						<div key={i} className="space-y-2">
							<div className="h-3 w-16 bg-[var(--color-border)] animate-pulse" />
							<div className="h-8 w-12 bg-[var(--color-border)] animate-pulse" />
						</div>
					))}
				</div>
			</div>
		)
	}

	if (!stats) return null

	return (
		<div className="space-y-8">
			{/* Stats — three numbers in a row */}
			<div className="grid grid-cols-3 gap-8">
				<div className="space-y-1">
					<span className={labelClass}>
						{t('settings.referrals.totalReferrals')}
					</span>
					<p className="text-2xl font-mono text-[var(--color-text)]">
						{stats.totalReferrals.toLocaleString()}
					</p>
				</div>
				<div className="space-y-1">
					<span className={labelClass}>
						{t('settings.referrals.pendingCredits')}
					</span>
					<p className="text-2xl font-mono text-[var(--color-text)]">
						<span className="text-sm">EGP </span>
						{stats.pendingCredits.toLocaleString()}
					</p>
				</div>
				<div className="space-y-1">
					<span className={labelClass}>
						{t('settings.referrals.earnedCredits')}
					</span>
					<p className="text-2xl font-mono text-[var(--color-text)]">
						<span className="text-sm">EGP </span>
						{stats.earnedCredits.toLocaleString()}
					</p>
				</div>
			</div>

			{/* Referral code */}
			<div className="space-y-1.5">
				<span className={labelClass}>{t('settings.referrals.yourCode')}</span>
				<div className="flex items-center gap-4">
					<span className="font-mono text-sm text-[var(--color-text)]">
						{stats.referralCode}
					</span>
					<CopyLink text={stats.referralCode} />
				</div>
			</div>

			{/* Share link */}
			<div className="space-y-1.5">
				<span className={labelClass}>{t('settings.referrals.yourLink')}</span>
				<div className="flex items-center gap-4">
					<span className="flex-1 font-mono text-sm text-[var(--color-text-subtle)] border-b border-[var(--color-border)] py-2 truncate">
						{stats.referralLink}
					</span>
					<CopyLink
						text={stats.referralLink}
						label={t('settings.referrals.copyLink')}
					/>
				</div>
			</div>

			{/* Credit explanation */}
			<p className="text-[13px] text-[var(--color-text-subtle)]">
				{t('settings.referrals.creditExplanation')}
			</p>
		</div>
	)
}

// ============================================================================
// Copy Link — text link style
// ============================================================================

function CopyLink({ text, label }: { text: string; label?: string }) {
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
			className="text-[13px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded shrink-0"
		>
			{copied
				? t('settings.referrals.copied', { defaultValue: 'Copied' })
				: (label ?? t('settings.referrals.copy'))}
		</Button>
	)
}
