import { useTranslation } from 'react-i18next'

interface OfflineBannerProps {
	isOffline: boolean
}

/**
 * Subtle top-of-viewport offline indicator.
 * STUB: No service worker logic. Renders based on isOffline prop only.
 */
export function OfflineBanner({ isOffline }: OfflineBannerProps) {
	const { t } = useTranslation()

	if (!isOffline) return null

	return (
		<div className="fixed top-0 inset-x-0 z-50 bg-[var(--color-warning-bg)] text-[var(--color-warning)] text-center py-1 text-[var(--text-xs)] font-medium">
			{t('offline_message', "You're offline -- showing cached data.")}
		</div>
	)
}
