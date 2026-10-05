import arCommon from '@hyperquote/i18n/locales/ar/common'
import enCommon from '@hyperquote/i18n/locales/en/common'
import { Info, X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { Dialog } from 'react-aria-components/Dialog'
import { Modal, ModalOverlay } from 'react-aria-components/Modal'
import { useTranslation } from 'react-i18next'
import demoAccounts from '../../../../supabase/showcase-accounts.json'

type PortfolioApp = 'website' | 'portal' | 'internal' | 'driver'

interface PortfolioEnvironment {
	DEV?: boolean
	VITE_PORTFOLIO_MODE?: string
	VITE_WEBSITE_URL?: string
	VITE_PORTAL_URL?: string
	VITE_INTERNAL_URL?: string
	VITE_DRIVER_URL?: string
}

const destinations = [
	{ id: 'website', variable: 'VITE_WEBSITE_URL', port: 3000 },
	{ id: 'portal', variable: 'VITE_PORTAL_URL', port: 3001 },
	{ id: 'internal', variable: 'VITE_INTERNAL_URL', port: 3002 },
	{ id: 'driver', variable: 'VITE_DRIVER_URL', port: 3003 },
] as const

export function portfolioLinks(env: PortfolioEnvironment) {
	return destinations.map(({ id, variable, port }) => {
		const configured = env[variable]?.trim()
		const candidate = configured || (env.DEV ? `http://localhost:${port}` : '')
		try {
			const url = new URL(candidate)
			const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
			const allowed =
				url.protocol === 'https:' ||
				(env.DEV && local && url.protocol === 'http:')
			return {
				id,
				href: allowed && !url.username && !url.password ? url.href : undefined,
			}
		} catch {
			return { id, href: undefined }
		}
	})
}

export function PortfolioShell({
	app,
	env,
	children,
}: {
	app: PortfolioApp
	env: PortfolioEnvironment
	children: ReactNode
}) {
	const { i18n } = useTranslation()
	const [expanded, setExpanded] = useState(false)
	const [infoOpen, setInfoOpen] = useState(false)
	const [ready, setReady] = useState(false)
	const dockRef = useRef<HTMLElement | null>(null)
	const currentButtonRef = useRef<HTMLButtonElement | null>(null)
	const dockId = useId()

	useEffect(() => setReady(true), [])

	useEffect(() => {
		if (!expanded) return
		currentButtonRef.current?.focus()
	}, [expanded])

	useEffect(() => {
		if (!expanded || infoOpen) return
		function dismiss(event: PointerEvent) {
			if (
				event.target instanceof Node &&
				!dockRef.current?.contains(event.target)
			)
				setExpanded(false)
		}
		document.addEventListener('pointerdown', dismiss)
		return () => document.removeEventListener('pointerdown', dismiss)
	}, [expanded, infoOpen])

	function collapse() {
		setExpanded(false)
		requestAnimationFrame(() => currentButtonRef.current?.focus())
	}
	const enabled =
		env.VITE_PORTFOLIO_MODE === undefined
			? env.DEV
			: env.VITE_PORTFOLIO_MODE === 'true'
	if (!enabled) return children

	const labels = i18n.language.startsWith('ar')
		? arCommon.portfolio
		: enCommon.portfolio

	return (
		<>
			{children}
			<nav
				ref={dockRef}
				id={dockId}
				className="hq-portfolio-launcher"
				data-expanded={expanded}
				aria-label={labels.navigation}
				dir={i18n.dir()}
				onKeyDown={(event) => {
					if (event.key === 'Escape') {
						event.stopPropagation()
						collapse()
					}
				}}
			>
				{!expanded ? (
					<button
						ref={currentButtonRef}
						type="button"
						className="hq-portfolio-toggle"
						disabled={!ready}
						aria-label={labels.open}
						aria-expanded={false}
						aria-controls={dockId}
						title={labels.open}
						onClick={() => setExpanded(true)}
					>
						<AppIcon app={app} />
					</button>
				) : (
					<div className="hq-portfolio-actions">
						{portfolioLinks(env).map(({ id, href }) =>
							id === app ? (
								<button
									key={id}
									ref={currentButtonRef}
									type="button"
									aria-label={`${labels[id]} · ${labels.close}`}
									title={`${labels[id]} · ${labels.close}`}
									aria-current="true"
									aria-expanded={true}
									aria-controls={dockId}
									onClick={collapse}
								>
									<AppIcon app={id} />
								</button>
							) : href ? (
								<a
									key={id}
									href={href}
									aria-label={labels[id]}
									title={labels[id]}
								>
									<AppIcon app={id} />
								</a>
							) : (
								<button
									key={id}
									type="button"
									disabled
									aria-label={labels[id]}
									title={labels.unavailable}
								>
									<AppIcon app={id} />
								</button>
							),
						)}
						<button
							type="button"
							aria-label={labels.info}
							title={labels.info}
							onClick={() => setInfoOpen(true)}
						>
							<Info size={22} strokeWidth={1.6} aria-hidden />
						</button>
					</div>
				)}
			</nav>
			<ModalOverlay
				isOpen={infoOpen}
				onOpenChange={setInfoOpen}
				isDismissable
				className="hq-portfolio-backdrop"
			>
				<Modal className="hq-portfolio-modal">
					<Dialog
						aria-label={labels.info}
						className="hq-portfolio-dialog"
						dir={i18n.dir()}
					>
						<header className="hq-portfolio-info-header">
							<div>
								<p className="hq-portfolio-eyebrow">{labels.title}</p>
								<h2>{labels.infoTitle}</h2>
							</div>
							<button
								type="button"
								onClick={() => setInfoOpen(false)}
								aria-label={labels.closeInfo}
							>
								<X size={20} aria-hidden />
							</button>
						</header>
						<p className="hq-portfolio-description">{labels.description}</p>
						<div className="hq-portfolio-flow">
							{destinations.map(({ id }) => (
								<div key={id}>
									<AppIcon app={id} />
									<h3>{labels[id]}</h3>
									<p>{labels.tour[id]}</p>
								</div>
							))}
						</div>
						<section className="hq-portfolio-accounts">
							<h3>{labels.accountsTitle}</h3>
							<p>{labels.loginTip}</p>
							{Object.entries(demoAccounts).map(([id, account]) => (
								<dl key={id}>
									<div>
										<dt>{labels.email}</dt>
										<dd>
											<code dir="ltr">{account.email}</code>
										</dd>
									</div>
									<div>
										<dt>{labels.password}</dt>
										<dd>
											<code dir="ltr">{account.password}</code>
										</dd>
									</div>
								</dl>
							))}
						</section>
						<p className="hq-portfolio-footnote">{labels.seedNote}</p>
					</Dialog>
				</Modal>
			</ModalOverlay>
		</>
	)
}

function AppIcon({ app }: { app: PortfolioApp }) {
	return <span className="hq-portfolio-app-icon" data-app={app} aria-hidden />
}
