import { useOnlineStatus } from '../../hooks/useOnlineStatus'

/**
 * Subtle "Offline" text indicator. Renders nothing when online.
 * Not a banner -- calm, minimal, premium feel.
 */
export function OfflineIndicator() {
	const { isOnline } = useOnlineStatus()

	if (isOnline) return null

	return (
		<div className="px-4 py-2 text-center">
			<span className="text-sm text-[var(--color-text-subtle)]">Offline</span>
		</div>
	)
}
