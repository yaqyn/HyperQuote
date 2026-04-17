import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useLoginModal } from '../../hooks/useLoginModal'
import { claimAccount } from '../../lib/auth'

/**
 * Mask a company name: show first character of each word, asterisks for rest.
 * e.g., "Alpha Construction" -> "A**** C***********"
 */
function maskCompanyName(name: string): string {
	return name
		.split(' ')
		.map((word) => {
			if (word.length <= 1) return word
			return word[0] + '*'.repeat(word.length - 1)
		})
		.join(' ')
}

export function AccountClaiming() {
	const { t } = useTranslation('website')
	const { phone, claimableCompany, redirectTo, setStep, close } =
		useLoginModal()
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const maskedCompany = claimableCompany
		? maskCompanyName(claimableCompany)
		: '****'

	async function handleClaim() {
		setLoading(true)
		setError(null)

		try {
			const result = await claimAccount({ data: { phone } })

			if (!result.success) {
				setError(
					t('login.claimFailed', 'Failed to claim account. Please try again.'),
				)
				return
			}

			close()
			if (redirectTo) {
				window.location.href = redirectTo
			}
		} catch {
			setError(
				t('login.claimFailed', 'Failed to claim account. Please try again.'),
			)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Heading */}
			<h2 className="text-[30px] font-bold leading-[1.2]">
				{t('login.claiming.heading')}
			</h2>

			{/* Masked company hint */}
			<div className="rounded-lg bg-[var(--color-surface)] p-4 text-center">
				<p className="font-[family-name:var(--font-geist-mono)] text-lg">
					{maskedCompany}
				</p>
			</div>

			{/* Error */}
			{error && (
				<p className="text-center text-sm text-[var(--color-error)]">{error}</p>
			)}

			{/* Confirm: Yes, that's me */}
			<Button
				onPress={handleClaim}
				isDisabled={loading}
				className="flex h-12 w-full items-center justify-center rounded-lg bg-[var(--color-primary)] font-semibold text-white transition-opacity hover:opacity-90 pressed:opacity-80 disabled:opacity-50"
			>
				{loading ? (
					<span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
				) : (
					t('login.claiming.confirm')
				)}
			</Button>

			{/* Deny: No, create a new account */}
			<Button
				onPress={() => setStep('create')}
				isDisabled={loading}
				className="flex h-12 w-full items-center justify-center rounded-lg border border-[var(--color-border)] font-semibold text-[var(--color-text)] transition-opacity hover:bg-[var(--color-surface)] pressed:opacity-80 disabled:opacity-50"
			>
				{t('login.claiming.deny')}
			</Button>
		</div>
	)
}
