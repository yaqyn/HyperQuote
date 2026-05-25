import { AlertTriangle } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import { LoginScreen } from './components/LoginScreen'
import { getCurrentDriverSession } from './lib/auth'
import { setDriverLanguage } from './lib/i18n'
import { useAuthStore } from './stores/auth'
import { usePreferencesStore } from './stores/preferences'

const DriverShell = lazy(() =>
	import('./components/DriverShell').then((module) => ({
		default: module.DriverShell,
	})),
)

const ROOT_SCROLL_KEYS = new Set([
	' ',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'ArrowUp',
	'End',
	'Home',
	'PageDown',
	'PageUp',
])

function isEditableTarget(target: EventTarget | null) {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		(target instanceof HTMLElement && target.isContentEditable)
	)
}

export function DriverApp() {
	const session = useAuthStore((state) => state.session)
	const signIn = useAuthStore((state) => state.signIn)
	const language = usePreferencesStore((state) => state.language)
	const theme = usePreferencesStore((state) => state.theme)
	const [isRestoringSession, setIsRestoringSession] = useState(true)
	const documentTitle = isRestoringSession
		? 'Loading Driver Dashboard — HyperQuote Driver'
		: session
			? 'HyperQuote Driver'
			: 'Driver Sign In — HyperQuote Driver'

	useEffect(() => {
		setDriverLanguage(language)
		document.documentElement.dataset.theme = theme
	}, [language, theme])

	useEffect(() => {
		document.title = documentTitle
	}, [documentTitle])

	useEffect(() => {
		function handleContextMenu(event: MouseEvent) {
			event.preventDefault()
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (!ROOT_SCROLL_KEYS.has(event.key) || isEditableTarget(event.target)) {
				return
			}
			event.preventDefault()
		}

		function handleWindowScroll() {
			if (window.scrollX === 0 && window.scrollY === 0) return
			window.scrollTo(0, 0)
		}

		document.addEventListener('contextmenu', handleContextMenu)
		document.addEventListener('keydown', handleKeyDown)
		window.addEventListener('scroll', handleWindowScroll, { passive: true })
		return () => {
			document.removeEventListener('contextmenu', handleContextMenu)
			document.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('scroll', handleWindowScroll)
		}
	}, [])

	useEffect(() => {
		let cancelled = false
		getCurrentDriverSession()
			.then((restoredSession) => {
				if (cancelled) return
				if (restoredSession) signIn(restoredSession)
			})
			.finally(() => {
				if (!cancelled) setIsRestoringSession(false)
			})

		return () => {
			cancelled = true
		}
	}, [signIn])

	if (isRestoringSession) {
		return <DriverAppLoading />
	}

	return session ? (
		<Suspense fallback={<DriverAppLoading />}>
			<DriverShell session={session} />
		</Suspense>
	) : (
		<LoginScreen />
	)
}

function DriverAppLoading() {
	const { t } = useTranslation('driver')

	return (
		<main className="grid min-h-dvh place-items-center bg-[var(--color-surface)] text-[var(--color-text)]">
			<div className="driver-loading-mark" role="status">
				<span className="sr-only">{t('state.loading')}</span>
			</div>
		</main>
	)
}

export function DriverRouteError() {
	const { t } = useTranslation('driver')

	return (
		<main className="grid min-h-dvh place-items-center bg-[var(--color-surface)] p-6 text-[var(--color-text)]">
			<section className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
				<div className="flex items-center gap-3">
					<AlertTriangle
						aria-hidden="true"
						size={22}
						className="text-[#B91C1C]"
					/>
					<h1 className="font-[family-name:var(--font-archivo)] text-xl font-semibold">
						{t('error.title')}
					</h1>
				</div>
				<p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
					{t('error.body')}
				</p>
				<Button
					className="driver-action-button mt-5 inline-flex h-11 items-center justify-center border px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
					onPress={() => window.location.assign('/')}
				>
					{t('error.action')}
				</Button>
			</section>
		</main>
	)
}
