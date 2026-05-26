import {
	detectPwaInstallGuideKind,
	getPwaInstallGuide,
	usePwaInstallPrompt,
} from '@hyperquote/ui/pwa/install'
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
	const install = usePwaInstallPrompt()
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
							label="Install Base"
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
	const guide = getPwaInstallGuide({
		appName: 'Base',
		kind: detectPwaInstallGuideKind(),
	})

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
