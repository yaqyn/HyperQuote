import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function OfflineBanner() {
	const [isOffline, setIsOffline] = useState(false)
	const { t } = useTranslation('website')

	useEffect(() => {
		setIsOffline(!navigator.onLine)

		function handleOnline() {
			setIsOffline(false)
		}
		function handleOffline() {
			setIsOffline(true)
		}

		window.addEventListener('online', handleOnline)
		window.addEventListener('offline', handleOffline)

		return () => {
			window.removeEventListener('online', handleOnline)
			window.removeEventListener('offline', handleOffline)
		}
	}, [])

	if (!isOffline) return null

	return (
		<div className="fixed top-0 inset-x-0 z-50 h-8 bg-[var(--color-warning-bg)] flex items-center justify-center gap-2 text-sm text-[var(--color-warning)]">
			<WifiOff size={16} aria-hidden="true" />
			<span>{t('offline')}</span>
		</div>
	)
}
