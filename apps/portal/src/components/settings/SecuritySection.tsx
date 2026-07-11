import { useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import { signOutPortalAccount } from '../../lib/auth'
import { usePortalStore } from '../../stores/portal'

export function SecuritySection() {
	const { t } = useTranslation('portal')
	const setSigningOut = usePortalStore((state) => state.setSigningOut)
	const [error, setError] = useState(false)
	const [isPending, setIsPending] = useState(false)

	async function signOutCurrentDevice() {
		setError(false)
		setIsPending(true)
		setSigningOut(true)
		try {
			await signOutPortalAccount()
			window.location.assign('/login')
		} catch {
			setError(true)
			setIsPending(false)
			setSigningOut(false)
		}
	}

	return (
		<div className="space-y-4">
			<div className="border-b border-[var(--color-border)] pb-4">
				<p className="text-sm font-medium text-[var(--color-text)]">
					{t('settings.security.currentSession')}
				</p>
				<p className="mt-1 text-[13px] text-[var(--color-text-subtle)]">
					{t('settings.security.currentSessionDescription')}
				</p>
			</div>
			<Button
				onPress={signOutCurrentDevice}
				isDisabled={isPending}
				className="text-[13px] text-[var(--color-text-subtle)] outline-none transition-colors hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--p-focus-ring)] disabled:opacity-50"
			>
				{isPending
					? t('settings.security.signingOut')
					: t('settings.security.signOut')}
			</Button>
			{error && (
				<p className="text-sm text-red-600 dark:text-red-400" role="alert">
					{t('settings.security.signOutError')}
				</p>
			)}
		</div>
	)
}
