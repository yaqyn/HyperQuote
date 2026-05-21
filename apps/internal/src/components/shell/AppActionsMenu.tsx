import {
	ChevronDown,
	Download,
	LogOut,
	type LucideIcon,
	Maximize2,
	Minimize2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { DialogTrigger } from 'react-aria-components/Dialog'
import { Popover } from 'react-aria-components/Popover'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../shared/DispatchDialog'

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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function isBeforeInstallPromptEvent(
	event: Event,
): event is BeforeInstallPromptEvent {
	if (!isRecord(event)) return false
	return typeof event.prompt === 'function' && 'userChoice' in event
}

function isStandaloneMode() {
	if (window.matchMedia('(display-mode: standalone)').matches) return true
	if (window.matchMedia('(display-mode: fullscreen)').matches) return true
	if ('standalone' in navigator) return navigator.standalone === true
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

type InstallGuideKind = 'ios' | 'safari-desktop' | 'firefox' | 'browser'

function getInstallGuideKind(): InstallGuideKind {
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

function useInstallPrompt() {
	const [promptEvent, setPromptEvent] =
		useState<BeforeInstallPromptEvent | null>(null)
	const [isInstalled, setIsInstalled] = useState(false)
	const [status, setStatus] = useState<string | null>(null)

	useEffect(() => {
		function updateInstalledState() {
			setIsInstalled(isStandaloneMode())
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

function useFullscreenState() {
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [canFullscreen, setCanFullscreen] = useState(false)
	const [status, setStatus] = useState<string | null>(null)

	useEffect(() => {
		function updateFullscreenState() {
			setIsFullscreen(document.fullscreenElement !== null)
			setCanFullscreen(
				document.fullscreenEnabled &&
					typeof document.documentElement.requestFullscreen === 'function',
			)
		}

		updateFullscreenState()
		document.addEventListener('fullscreenchange', updateFullscreenState)
		document.addEventListener('fullscreenerror', updateFullscreenState)
		return () => {
			document.removeEventListener('fullscreenchange', updateFullscreenState)
			document.removeEventListener('fullscreenerror', updateFullscreenState)
		}
	}, [])

	async function toggle() {
		if (!canFullscreen) {
			setStatus('Unavailable in this browser')
			return
		}

		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen()
			} else {
				await document.documentElement.requestFullscreen()
			}
			setStatus(null)
		} catch {
			setStatus('Blocked by browser')
		}
	}

	return { canFullscreen, isFullscreen, status, toggle }
}

export function AppActionsMenu() {
	const [isOpen, setIsOpen] = useState(false)
	const [installGuideOpen, setInstallGuideOpen] = useState(false)
	const install = useInstallPrompt()
	const fullscreen = useFullscreenState()

	const menuStatus = useMemo(() => {
		if (install.status) return install.status
		if (fullscreen.status) return fullscreen.status
		if (install.isInstalled) return 'Installed app mode'
		if (install.canPrompt) return 'Ready to install'
		return null
	}, [
		fullscreen.status,
		install.canPrompt,
		install.isInstalled,
		install.status,
	])

	return (
		<>
			<DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
				<Button
					aria-label="Open internal ops menu"
					className={`inline-flex items-baseline gap-1 rounded-sm text-[var(--color-text-subtle)] outline-none transition-colors hover:text-[var(--color-primary)] focus-visible:text-[var(--color-primary)] ${
						isOpen ? 'text-[var(--color-primary)]' : ''
					}`}
				>
					<span
						className="font-[family-name:var(--font-archivo)] italic"
						style={{ fontSize: '11px', lineHeight: 1 }}
					>
						· internal ops
					</span>
					<ChevronDown
						aria-hidden="true"
						size={10}
						strokeWidth={2}
						className={`relative top-px transition-transform ${
							isOpen ? 'rotate-180' : 'rotate-0'
						}`}
					/>
				</Button>
				<Popover
					placement="bottom start"
					offset={8}
					aria-label="Internal ops menu"
					className="panel-menu-popover rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-xl shadow-black/10 outline-none"
					style={{ width: 'min(296px, calc(100vw - 32px))' }}
				>
					<div className="flex flex-col gap-1">
						<AppMenuItem
							icon={Download}
							label="Install as PWA"
							detail={
								install.isInstalled
									? 'Installed'
									: install.canPrompt
										? 'Native prompt'
										: 'Guided install'
							}
							onPress={() => {
								setIsOpen(false)
								void install.install().then((handled) => {
									if (!handled) {
										window.setTimeout(() => setInstallGuideOpen(true), 140)
									}
								})
							}}
						/>
						<AppMenuItem
							icon={fullscreen.isFullscreen ? Minimize2 : Maximize2}
							label="Full screen mode"
							detail={fullscreen.isFullscreen ? 'Exit' : 'Enter'}
							onPress={() => {
								void fullscreen.toggle()
								setIsOpen(false)
							}}
						/>
						<div className="my-1 h-px bg-[var(--color-border)]" />
						<AppMenuItem
							icon={LogOut}
							label="Sign out"
							detail="Return to login"
							tone="danger"
							onPress={() => {
								setIsOpen(false)
								window.location.assign('/login')
							}}
						/>
						{menuStatus && (
							<div
								className="px-3 pt-1 pb-1.5 font-[family-name:var(--font-plex-mono)] text-[var(--color-text-subtle)]"
								style={{ fontSize: '10px', letterSpacing: 0 }}
							>
								{menuStatus}
							</div>
						)}
					</div>
				</Popover>
			</DialogTrigger>
			<InstallGuideDialog
				isOpen={installGuideOpen}
				onClose={() => setInstallGuideOpen(false)}
			/>
		</>
	)
}

function AppMenuItem({
	detail,
	icon: Icon,
	label,
	onPress,
	tone = 'default',
}: {
	detail: string
	icon: LucideIcon
	label: string
	onPress: () => void
	tone?: 'default' | 'danger'
}) {
	const isDanger = tone === 'danger'

	return (
		<Button
			onPress={onPress}
			className={`group flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-start outline-none transition-colors ${
				isDanger
					? 'hover:bg-[var(--color-signal-red)]/8 focus-visible:bg-[var(--color-signal-red)]/8'
					: 'hover:bg-[var(--color-primary)]/8 focus-visible:bg-[var(--color-primary)]/8'
			}`}
		>
			<span
				className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
					isDanger
						? 'bg-[var(--color-signal-red)]/8 text-[var(--color-signal-red)]'
						: 'bg-[var(--color-primary)]/8 text-[var(--color-primary)]'
				}`}
			>
				<Icon aria-hidden="true" size={17} strokeWidth={1.8} />
			</span>
			<span className="min-w-0 flex-1">
				<span
					className={`block truncate font-[family-name:var(--font-archivo)] ${
						isDanger
							? 'text-[var(--color-signal-red)]'
							: 'text-[var(--color-text)]'
					}`}
					style={{ fontSize: '14px', fontWeight: 600, letterSpacing: 0 }}
				>
					{label}
				</span>
				<span
					className="block truncate font-[family-name:var(--font-plex-mono)] text-[var(--color-text-subtle)]"
					style={{ fontSize: '10px', letterSpacing: 0 }}
				>
					{detail}
				</span>
			</span>
		</Button>
	)
}

function InstallGuideDialog({
	isOpen,
	onClose,
}: {
	isOpen: boolean
	onClose: () => void
}) {
	const [copyStatus, setCopyStatus] = useState<string | null>(null)
	const guide = getInstallGuide(getInstallGuideKind())

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href)
			setCopyStatus('Link copied')
		} catch {
			setCopyStatus('Copy from the address bar')
		}
	}

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={onClose}
			title={guide.title}
			eyebrow="Install app"
			caption={guide.caption}
			size="sm"
		>
			<DispatchBody className="space-y-4">
				<ol className="space-y-3">
					{guide.steps.map((step, index) => (
						<li key={step} className="flex gap-3">
							<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)] text-white font-[family-name:var(--font-plex-mono)] text-[11px]">
								{index + 1}
							</span>
							<span className="pt-0.5 font-[family-name:var(--font-archivo)] text-[14px] leading-snug text-[var(--color-text)]">
								{step}
							</span>
						</li>
					))}
				</ol>
				<p className="rounded-md border border-[var(--color-border)] bg-black/[0.02] px-3 py-2 font-[family-name:var(--font-archivo)] text-[12px] leading-snug text-[var(--color-text-muted)]">
					{guide.note}
				</p>
			</DispatchBody>
			<DispatchFooter leading={copyStatus}>
				<DispatchAction tone="ghost" onPress={copyLink}>
					Copy link
				</DispatchAction>
				<DispatchAction onPress={onClose}>Got it</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}

function getInstallGuide(kind: InstallGuideKind) {
	if (kind === 'ios') {
		return {
			title: 'Add HyperQuote to Home Screen',
			caption: 'Apple does not allow websites to install themselves.',
			steps: [
				'Open this page in Safari.',
				'Tap the Share button.',
				'Tap Add to Home Screen.',
				'Tap Add.',
			],
			note: 'After this, HyperQuote opens from the Home Screen like an app.',
		}
	}

	if (kind === 'safari-desktop') {
		return {
			title: 'Add HyperQuote to Dock',
			caption: 'Safari keeps install inside the browser menu.',
			steps: [
				'Open this page in Safari.',
				'Choose File from the menu bar.',
				'Choose Add to Dock.',
				'Confirm the HyperQuote app name.',
			],
			note: 'After this, HyperQuote opens from the Dock in its own app window.',
		}
	}

	if (kind === 'firefox') {
		return {
			title: 'Install HyperQuote',
			caption: 'Firefox support depends on platform and settings.',
			steps: [
				'Open the browser menu.',
				'Look for Install or Add to Home Screen.',
				'Confirm HyperQuote Internal Ops.',
			],
			note: 'If Firefox does not show install, open the same link in Chrome, Edge, or Safari.',
		}
	}

	return {
		title: 'Install HyperQuote',
		caption: 'The browser has not exposed its one-click install prompt yet.',
		steps: [
			'Look for the install icon in the address bar.',
			'If it is not visible, open the browser menu.',
			'Choose Install HyperQuote or Add to Home Screen.',
		],
		note: 'Chrome and Edge usually enable the one-click prompt after the app is loaded from production HTTPS.',
	}
}
