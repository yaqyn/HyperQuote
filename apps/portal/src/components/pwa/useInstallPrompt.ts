import { useCallback, useEffect, useState } from 'react'

/**
 * BeforeInstallPromptEvent is not yet in the TypeScript lib.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[]
	readonly userChoice: Promise<{
		outcome: 'accepted' | 'dismissed'
		platform: string
	}>
	prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const VISIT_COUNT_KEY = 'hq-visit-count'
const INSTALL_DISMISSED_KEY = 'hq-install-dismissed'
const MIN_VISITS = 3

export function useInstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] =
		useState<BeforeInstallPromptEvent | null>(null)
	const [visitCount, setVisitCount] = useState(0)
	const [isDismissed, setIsDismissed] = useState(false)

	// Increment visit counter on mount
	useEffect(() => {
		const currentCount =
			parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) + 1
		localStorage.setItem(VISIT_COUNT_KEY, String(currentCount))
		setVisitCount(currentCount)

		// Check if user previously dismissed
		if (localStorage.getItem(INSTALL_DISMISSED_KEY)) {
			setIsDismissed(true)
		}
	}, [])

	// Capture beforeinstallprompt event
	useEffect(() => {
		const handler = (e: Event) => {
			e.preventDefault()
			setDeferredPrompt(e as BeforeInstallPromptEvent)
		}

		window.addEventListener('beforeinstallprompt', handler)
		return () => window.removeEventListener('beforeinstallprompt', handler)
	}, [])

	const canInstall =
		visitCount >= MIN_VISITS && deferredPrompt !== null && !isDismissed

	const install = useCallback(async () => {
		if (!deferredPrompt) return null

		const result = await deferredPrompt.prompt()
		setDeferredPrompt(null)
		return result.outcome
	}, [deferredPrompt])

	const dismiss = useCallback(() => {
		localStorage.setItem(INSTALL_DISMISSED_KEY, '1')
		setIsDismissed(true)
	}, [])

	return { canInstall, install, dismiss }
}
