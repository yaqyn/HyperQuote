import { Link, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, cubicBezier, motion } from 'motion/react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DOC_CATEGORIES, WIZARDS } from '../../content/registry'
import { useChatWidget } from '../../hooks/useChatWidget'
import { DocsSearch as RealDocsSearch } from '../docs/DocsSearch'
import { ContactForm } from '../support/ContactForm'
import { ContactInfo } from '../support/ContactInfo'

const MAPS_URL = 'https://maps.google.com/?q=Arkan+Plaza+Sheikh+Zayed+Egypt'

type HeroMode = 'hero' | 'contact' | 'docs' | 'chat'

const EASE = cubicBezier(0.25, 0.1, 0.25, 1)
const transition = { duration: 0.5, ease: EASE }
const LyonHeroChat = lazy(() =>
	import('./LyonHeroChat').then((module) => ({
		default: module.LyonHeroChat,
	})),
)

export function HeroSection() {
	const { t } = useTranslation('website')
	const navigateTo = useNavigate()
	const [stage, setStage] = useState(0)
	const [mode, setMode] = useState<HeroMode>('hero')
	const [chatInitialMessage, setChatInitialMessage] = useState('')

	const closeBubble = useChatWidget((s) => s.close)
	const requestChatRuntime = useChatWidget((s) => s.requestRuntime)

	function openChat(initialMessage = '') {
		setChatInitialMessage(initialMessage)
		requestChatRuntime()
		setMode('chat')
		closeBubble()
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	useEffect(() => {
		const t1 = setTimeout(() => setStage(1), 500)
		const t2 = setTimeout(() => setStage(2), 650)
		const t3 = setTimeout(() => setStage(3), 1200)
		return () => {
			clearTimeout(t1)
			clearTimeout(t2)
			clearTimeout(t3)
		}
	}, [])

	const isExpanded = mode !== 'hero'

	return (
		<>
			{/* Intro overlay */}
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-base)]"
				style={{
					opacity: stage >= 2 ? 0 : 1,
					transition: 'opacity 0.6s ease-out',
					pointerEvents: stage >= 2 ? 'none' : 'auto',
				}}
			>
				<div className="overflow-hidden">
					<span
						className="block text-[56px] max-md:text-[40px] font-extrabold tracking-normal text-[var(--color-text)]"
						style={{
							transform: stage >= 1 ? 'translateY(-120%)' : 'translateY(0)',
							transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
						}}
					>
						HyperQuote
					</span>
				</div>
			</div>

			{/* Hero section — compact default, full screen when a mode is active */}
			<section
				className="relative flex flex-col bg-[var(--color-base)] overflow-hidden"
				style={{
					height: stage < 2 || isExpanded ? '100svh' : 'min(820px, 78svh)',
					transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
				}}
			>
				{/* Rings */}
				<div
					className="absolute inset-0 flex items-center justify-center pointer-events-none"
					aria-hidden="true"
				>
					<div className="relative h-[min(800px,120vw)] w-[min(800px,120vw)]">
						<div
							className="absolute inset-0 rounded-full border border-[var(--color-text)] opacity-[0.03]"
							style={{ animation: 'hero-ring 12s linear infinite' }}
						/>
						<div
							className="absolute inset-0 rounded-full border border-[var(--color-text)] opacity-[0.03]"
							style={{ animation: 'hero-ring 12s linear infinite 4s' }}
						/>
						<div
							className="absolute inset-0 rounded-full border border-[var(--color-text)] opacity-[0.03]"
							style={{ animation: 'hero-ring 12s linear infinite 8s' }}
						/>
					</div>
				</div>

				{/* Content area */}
				<div className="flex-1 min-h-0 flex items-center justify-center relative px-5 sm:px-8">
					<AnimatePresence mode="wait">
						{mode === 'hero' && (
							<motion.div
								key="hero"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -30 }}
								transition={transition}
								className="text-center"
							>
								<h1 className="text-[48px] sm:text-[56px] md:text-[64px] lg:text-[80px] leading-[1.08] font-extrabold tracking-normal">
									<span className="block overflow-hidden">
										<span
											className="block text-[var(--color-text)]"
											style={{
												transform:
													stage >= 2 ? 'translateY(0)' : 'translateY(110%)',
												transition:
													'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)',
											}}
										>
											{t('hero.headlinePart1')}
										</span>
									</span>
									<span className="block overflow-hidden">
										<span
											className="block bg-clip-text text-transparent"
											style={{
												backgroundImage:
													'linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #1D4ED8 100%)',
												transform:
													stage >= 2 ? 'translateY(0)' : 'translateY(110%)',
												transition:
													'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1) 0.15s',
											}}
										>
											{t('hero.headlinePart2')}
										</span>
									</span>
								</h1>

								{/* Mode buttons */}
								<div
									dir="ltr"
									className="mt-7 flex flex-wrap items-center justify-center gap-x-1 gap-y-2 sm:mt-8"
									style={{
										opacity: stage >= 3 ? 1 : 0,
										transform:
											stage >= 3 ? 'translateY(0)' : 'translateY(12px)',
										transition:
											'opacity 0.5s ease-out 0.1s, transform 0.5s ease-out 0.1s',
									}}
								>
									<button
										type="button"
										onClick={() => {
											setMode('contact')
											window.scrollTo({ top: 0, behavior: 'smooth' })
										}}
										className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface)]"
									>
										{t('support.sectionContact')}
									</button>
									<span className="text-[var(--color-border)] text-[10px]">
										|
									</span>
									<button
										type="button"
										onClick={() => {
											setMode('docs')
											window.scrollTo({ top: 0, behavior: 'smooth' })
										}}
										className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface)]"
									>
										{t('nav.docs')}
									</button>
									<span className="text-[var(--color-border)] text-[10px]">
										|
									</span>
									<button
										type="button"
										onClick={() => openChat()}
										className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-subtle)]"
									>
										{t('chat.header')}
									</button>
								</div>
							</motion.div>
						)}

						{mode === 'contact' && (
							<motion.div
								key="contact"
								initial={{ opacity: 0, y: 40 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -30 }}
								transition={transition}
								className="w-full h-full flex flex-col"
							>
								<div className="flex-1 overflow-y-auto">
									<div className="mx-auto max-w-[1200px] px-4 pb-12 pt-24 sm:px-6 md:px-8 lg:px-12">
										{/* Header */}
										<div className="mb-10 text-center md:mb-12 lg:text-start">
											<p className="mb-2 text-[12px] font-semibold uppercase tracking-normal text-[var(--color-primary)]">
												{t('support.sectionContact')}
											</p>
											<h2 className="text-[32px] lg:text-[44px] font-extrabold text-[var(--color-text)] tracking-normal leading-[1.05]">
												{t('support.formHeading')}
											</h2>
										</div>

										{/* Two-column: form + info */}
										<div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1fr] lg:gap-24">
											<ContactForm />
											<ContactInfo />
										</div>
									</div>
								</div>
							</motion.div>
						)}

						{mode === 'docs' && (
							<motion.div
								key="docs"
								initial={{ opacity: 0, y: 40 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -30 }}
								transition={transition}
								className="w-full h-full flex flex-col items-center justify-center px-6"
							>
								<div className="w-full max-w-[600px] text-center">
									<h2 className="text-[48px] lg:text-[64px] font-extrabold tracking-normal text-[var(--color-text)] leading-[1]">
										{t('docs.heroHeading')}
									</h2>
									<p className="mt-5 text-[16px] text-[var(--color-text-muted)] leading-relaxed mx-auto max-w-[440px]">
										{t('docs.heroSubheading')}
									</p>
									<p className="mt-2 font-mono text-[12px] tracking-normal text-[var(--color-text-subtle)]">
										{DOC_CATEGORIES.reduce((n, c) => n + c.articles.length, 0)}{' '}
										{t('docs.articles')} · {WIZARDS.length} {t('docs.guides')}
									</p>
									<div className="mt-10 flex justify-center">
										<div className="w-full max-w-[480px]">
											<RealDocsSearch onAskLyon={(q) => openChat(q)} />
										</div>
									</div>
								</div>
							</motion.div>
						)}

						{mode === 'chat' && (
							<motion.div
								key="chat"
								initial={{ opacity: 0, y: 40 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -30 }}
								transition={transition}
								className="w-full h-full flex flex-col"
							>
								<Suspense fallback={null}>
									<LyonHeroChat initialMessage={chatInitialMessage} />
								</Suspense>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Bottom bar */}
				<div
					dir="ltr"
					className="w-full border-t border-[var(--color-border)] shrink-0"
					style={{
						opacity: stage >= 3 ? 1 : 0,
						transform: stage >= 3 ? 'translateY(0)' : 'translateY(8px)',
						transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
					}}
				>
					<div className="max-w-7xl mx-auto px-6 lg:px-12 py-5">
						<AnimatePresence mode="wait">
							{isExpanded ? (
								<motion.div
									key="expanded-bar"
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									transition={{ duration: 0.3, ease: EASE }}
									className="flex items-center justify-between gap-4 max-sm:flex-col"
								>
									<button
										type="button"
										onClick={() => setMode('hero')}
										className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
									>
										← {t('product.back')}
									</button>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => {
												setMode('contact')
												window.scrollTo({ top: 0, behavior: 'smooth' })
											}}
											className={`text-[13px] px-3 py-1 rounded-lg transition-colors ${mode === 'contact' ? 'text-[var(--color-text)] font-semibold bg-[var(--color-surface)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
										>
											{t('support.sectionContact')}
										</button>
										<button
											type="button"
											onClick={() => {
												setMode('docs')
												window.scrollTo({ top: 0, behavior: 'smooth' })
											}}
											className={`text-[13px] px-3 py-1 rounded-lg transition-colors ${mode === 'docs' ? 'text-[var(--color-text)] font-semibold bg-[var(--color-surface)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
										>
											{t('nav.docs')}
										</button>
										<button
											type="button"
											onClick={() => openChat()}
											className={`text-[13px] px-3 py-1 rounded-lg transition-colors ${mode === 'chat' ? 'text-[var(--color-primary)] font-semibold bg-[var(--color-subtle)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}`}
										>
											{t('chat.header')}
										</button>
									</div>
								</motion.div>
							) : (
								<motion.div
									key="default-bar"
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									transition={{ duration: 0.3, ease: EASE }}
									className="flex items-center justify-center gap-4 md:justify-between"
								>
									<div className="hidden flex-wrap items-center justify-center gap-x-4 gap-y-2 md:flex">
										<Link
											to="/support"
											hash="faq"
											className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
										>
											{t('support.sectionFaq')}
										</Link>
										<AddressCycle />
									</div>
									<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
										<Link
											to="/market"
											className="inline-flex items-center text-[13px] font-semibold text-[var(--color-primary)] hover:text-white rounded-full border border-[var(--color-primary)]/30 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] px-3 py-1 transition-colors"
										>
											{t('cta.browseMarket')}
										</Link>
										<button
											type="button"
											onClick={() => navigateTo({ to: '/login' })}
											className="hidden text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] md:inline-flex"
										>
											{t('login.step1.heading')}
										</button>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</section>
		</>
	)
}

/* ── Address Cycle ── */
function AddressCycle() {
	const { t } = useTranslation('website')
	const [index, setIndex] = useState(0)
	const [prevIndex, setPrevIndex] = useState(-1)
	const [ready, setReady] = useState(false)
	const items = [t('hero.address'), t('hero.visitUs')]

	// Delay cycle start so it doesn't animate during the bar's fade-in
	useEffect(() => {
		const delay = setTimeout(() => setReady(true), 600)
		return () => clearTimeout(delay)
	}, [])

	useEffect(() => {
		if (!ready) return
		const id = setInterval(() => {
			setIndex((p) => {
				setPrevIndex(p)
				return (p + 1) % items.length
			})
		}, 3000)
		return () => clearInterval(id)
	}, [items.length, ready])

	useEffect(() => {
		if (prevIndex === -1) return
		const timeout = setTimeout(() => setPrevIndex(-1), 500)
		return () => clearTimeout(timeout)
	}, [prevIndex])

	return (
		<a
			href={MAPS_URL}
			target="_blank"
			rel="noopener noreferrer"
			className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors relative h-5 overflow-hidden inline-flex items-center"
		>
			{items.map((text, i) => {
				const isActive = i === index
				const isLeaving = i === prevIndex
				let y = '100%'
				let t2 = 'none'
				if (isActive) {
					y = '0%'
					t2 = 'transform 0.5s ease-in-out'
				} else if (isLeaving) {
					y = '-100%'
					t2 = 'transform 0.5s ease-in-out'
				}
				return (
					<span
						key={text}
						className={`block ${i === 0 ? '' : 'absolute inset-x-0'}`}
						style={{ transform: `translateY(${y})`, transition: t2 }}
					>
						{text}
					</span>
				)
			})}
		</a>
	)
}
