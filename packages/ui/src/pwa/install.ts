import { useEffect, useState } from 'react'

type InstallOutcome = 'accepted' | 'dismissed'

interface BeforeInstallPromptChoice {
	outcome: InstallOutcome
	platform: string
}

interface BeforeInstallPromptEvent extends Event {
	readonly platforms?: readonly string[]
	readonly userChoice: Promise<BeforeInstallPromptChoice>
	prompt(): Promise<BeforeInstallPromptChoice | undefined>
}

export type PwaInstallGuideKind =
	| 'browser'
	| 'firefox'
	| 'ios'
	| 'safari-desktop'

export interface PwaInstallGuide {
	caption: string
	note: string
	steps: string[]
	title: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function isBeforeInstallPromptEvent(
	event: Event,
): event is BeforeInstallPromptEvent {
	if (!isRecord(event)) return false
	return typeof event.prompt === 'function' && 'userChoice' in event
}

function hasStandaloneNavigator(
	value: Navigator,
): value is Navigator & { standalone: boolean } {
	return 'standalone' in value && typeof value.standalone === 'boolean'
}

export function isPwaStandaloneMode() {
	if (typeof window === 'undefined') return false
	if (window.matchMedia('(display-mode: standalone)').matches) return true
	if (window.matchMedia('(display-mode: fullscreen)').matches) return true
	if (hasStandaloneNavigator(navigator)) return navigator.standalone === true
	return false
}

function subscribeToMediaQuery(
	media: MediaQueryList,
	listener: () => void,
): () => void {
	if (typeof media.addEventListener === 'function') {
		media.addEventListener('change', listener)
		return () => media.removeEventListener('change', listener)
	}

	media.addListener(listener)
	return () => media.removeListener(listener)
}

export function detectPwaInstallGuideKind(): PwaInstallGuideKind {
	if (typeof navigator === 'undefined') return 'browser'

	const ua = navigator.userAgent.toLowerCase()
	const isIos =
		/iphone|ipad|ipod/.test(ua) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
	const isSafari = /safari/.test(ua) && !/chrome|chromium|crios|fxios/.test(ua)
	const isFirefox = /firefox|fxios/.test(ua)

	if (isIos) return 'ios'
	if (isSafari) return 'safari-desktop'
	if (isFirefox) return 'firefox'
	return 'browser'
}

export function getPwaInstallGuide({
	appName,
	kind = detectPwaInstallGuideKind(),
}: {
	appName: string
	kind?: PwaInstallGuideKind
}): PwaInstallGuide {
	if (kind === 'ios') {
		return {
			title: `Add ${appName} to Home Screen`,
			caption: 'Apple keeps install inside the Safari share menu.',
			steps: [
				'Open this page in Safari.',
				'Tap the Share button.',
				'Tap Add to Home Screen.',
				'Tap Add.',
			],
			note: `${appName} opens from the Home Screen in its own app window.`,
		}
	}

	if (kind === 'safari-desktop') {
		return {
			title: `Add ${appName} to Dock`,
			caption: 'Safari keeps install inside the browser menu.',
			steps: [
				'Open this page in Safari.',
				'Choose File from the menu bar.',
				'Choose Add to Dock.',
				`Confirm the ${appName} app name.`,
			],
			note: `${appName} opens from the Dock in its own app window.`,
		}
	}

	if (kind === 'firefox') {
		return {
			title: `Install ${appName}`,
			caption: 'Firefox support depends on platform and settings.',
			steps: [
				'Open the browser menu.',
				'Look for Install or Add to Home Screen.',
				`Confirm ${appName}.`,
			],
			note: 'If Firefox does not show install, open the same link in Chrome, Edge, or Safari.',
		}
	}

	return {
		title: `Install ${appName}`,
		caption: 'The browser has not exposed its one-click install prompt yet.',
		steps: [
			'Look for the install icon in the address bar.',
			'If it is not visible, open the browser menu.',
			`Choose Install ${appName} or Add to Home Screen.`,
		],
		note: 'Chrome and Edge usually enable the one-click prompt after the app is loaded from production HTTPS.',
	}
}

export function usePwaInstallPrompt() {
	const [promptEvent, setPromptEvent] =
		useState<BeforeInstallPromptEvent | null>(null)
	const [isInstalled, setIsInstalled] = useState(false)
	const [status, setStatus] = useState<string | null>(null)

	useEffect(() => {
		function updateInstalledState() {
			setIsInstalled(isPwaStandaloneMode())
		}

		function handleBeforeInstallPrompt(event: Event) {
			if (!isBeforeInstallPromptEvent(event)) return
			event.preventDefault()
			setPromptEvent(event)
			setStatus(null)
		}

		function handleAppInstalled() {
			setPromptEvent(null)
			setIsInstalled(true)
			setStatus('Installed')
		}

		updateInstalledState()
		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
		window.addEventListener('appinstalled', handleAppInstalled)

		const standalone = window.matchMedia('(display-mode: standalone)')
		const fullscreen = window.matchMedia('(display-mode: fullscreen)')
		const unsubscribeStandalone = subscribeToMediaQuery(
			standalone,
			updateInstalledState,
		)
		const unsubscribeFullscreen = subscribeToMediaQuery(
			fullscreen,
			updateInstalledState,
		)

		return () => {
			window.removeEventListener(
				'beforeinstallprompt',
				handleBeforeInstallPrompt,
			)
			window.removeEventListener('appinstalled', handleAppInstalled)
			unsubscribeStandalone()
			unsubscribeFullscreen()
		}
	}, [])

	async function install(): Promise<boolean> {
		if (isInstalled) {
			setStatus('Installed')
			return true
		}
		if (!promptEvent) {
			setStatus('Needs browser install step')
			return false
		}

		try {
			await promptEvent.prompt()
			const choice = await promptEvent.userChoice
			setStatus(choice.outcome === 'accepted' ? 'Installing' : 'Dismissed')
			return choice.outcome === 'accepted'
		} catch {
			setStatus('Blocked by browser')
			return false
		} finally {
			setPromptEvent(null)
		}
	}

	return {
		canPrompt: promptEvent !== null,
		install,
		isInstalled,
		status,
	}
}
