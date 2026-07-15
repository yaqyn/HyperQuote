import { Link } from '@tanstack/react-router'
import {
	ArrowDown,
	ArrowLeft,
	ArrowUpRight,
	Minus,
	Plus,
	X,
} from 'lucide-react'
import {
	AnimatePresence,
	cubicBezier,
	motion,
	useReducedMotion,
} from 'motion/react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DOC_CATEGORIES, WIZARDS } from '../../content/registry'
import { useChatWidget } from '../../hooks/useChatWidget'
import { useQuoteCart } from '../../hooks/useQuoteCart'
import type { PublicMarketPreviewCategory } from '../../lib/catalog'
import { COMPANY_LOCATION_HREF } from '../../lib/company'
import { DocsSearch as RealDocsSearch } from '../docs/DocsSearch'
import { QuoteListActions } from '../quote/QuoteListActions'
import { ContactForm } from '../support/ContactForm'
import { ContactInfo } from '../support/ContactInfo'

type HeroMode = 'hero' | 'contact' | 'docs' | 'chat'

const EASE = cubicBezier(0.22, 1, 0.36, 1)
const LyonHeroChat = lazy(() =>
	import('./LyonHeroChat').then((module) => ({
		default: module.LyonHeroChat,
	})),
)

export function HeroSection({
	categories,
}: {
	categories: PublicMarketPreviewCategory[]
}) {
	const { t, i18n } = useTranslation('website')
	const shouldReduceMotion = useReducedMotion()
	const [mode, setMode] = useState<HeroMode>('hero')
	const [chatInitialMessage, setChatInitialMessage] = useState('')
	const isArabic = i18n.language === 'ar'
	const closeBubble = useChatWidget((state) => state.close)
	const requestChatRuntime = useChatWidget((state) => state.requestRuntime)

	const transition = {
		duration: shouldReduceMotion ? 0.01 : 0.44,
		ease: EASE,
	}

	function openMode(nextMode: Exclude<HeroMode, 'hero'>) {
		if (nextMode === 'chat') requestChatRuntime()
		setMode(nextMode)
		closeBubble()
		window.scrollTo({
			top: 0,
			behavior: shouldReduceMotion ? 'auto' : 'smooth',
		})
	}

	function openChat(initialMessage = '') {
		setChatInitialMessage(initialMessage)
		openMode('chat')
	}

	return (
		<section className="relative flex h-svh min-h-0 flex-col overflow-hidden bg-[var(--color-base)]">
			<div
				aria-hidden="true"
				className="hq-dither-field hq-dither-field--hero"
			/>
			<div className="relative flex min-h-0 flex-1 overflow-hidden">
				<AnimatePresence mode="wait">
					{mode === 'hero' && (
						<motion.div
							key="hero"
							initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -18 }}
							transition={transition}
							className="relative h-full w-full overflow-y-auto"
						>
							<HeroMaterialAccents />
							<div className="relative z-[1] flex min-h-full items-center pb-8 pt-24 sm:pb-10 sm:pt-28 lg:pb-14 lg:pt-32">
								<div className="hq-page-shell hq-hero-shell grid items-center gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] lg:gap-16 xl:gap-24">
									<div className="max-w-[760px] text-center lg:text-start">
										<p className="hq-kicker mb-6 text-[var(--color-primary)]">
											{t('hero.eyebrow')}
										</p>
										<h1 className="hq-display hq-title-hero font-bold text-[var(--color-text)]">
											<span className="block">{t('hero.headlinePart1')}</span>
											<span className="hq-gradient-word mt-[0.08em] block">
												{t('hero.headlinePart2')}
											</span>
										</h1>
										<p className="mx-auto mt-7 max-w-[580px] text-[16px] leading-7 text-[var(--color-text-muted)] sm:text-[18px] sm:leading-8 lg:mx-0">
											{t('hero.subheadline')}
										</p>

										<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
											<Link
												to="/market"
												className="hq-action hq-action--primary h-13 w-full max-w-[210px]"
											>
												{t('cta.browseMarket')}
												<ArrowUpRight
													size={17}
													className="hq-action__icon icon-end"
												/>
											</Link>
											<button
												type="button"
												onClick={() =>
													document.getElementById('process')?.scrollIntoView({
														behavior: shouldReduceMotion ? 'auto' : 'smooth',
													})
												}
												className="hq-action hq-action--outline h-13 w-full max-w-[230px]"
											>
												{t('hero.seeProcess')}
												<ArrowDown size={16} className="hq-action__icon" />
											</button>
										</div>
									</div>

									<MaterialDocket categories={categories} isArabic={isArabic} />
								</div>
							</div>
						</motion.div>
					)}

					{mode === 'contact' && (
						<motion.div
							key="contact"
							initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 28 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -18 }}
							transition={transition}
							className="h-full w-full overflow-y-auto"
						>
							<div className="flex min-h-full items-center pb-4 pt-[76px] sm:pb-5 sm:pt-[80px]">
								<div className="hq-page-shell grid items-start gap-7 lg:grid-cols-[minmax(260px,0.58fr)_minmax(0,1.42fr)] lg:gap-12 xl:gap-16">
									<div className="text-start lg:pt-3">
										<p className="hq-kicker mb-4 text-[var(--color-primary)]">
											{t('support.sectionContact')}
										</p>
										<h2 className="hq-display hq-title-record font-bold text-[var(--color-text)]">
											{t('support.heroHeading')}
										</h2>
										<p className="mt-4 max-w-[420px] text-[14px] leading-6 text-[var(--color-text-muted)] sm:text-[15px]">
											{t('support.heroBody')}
										</p>
										<div className="mt-6">
											<ContactInfo variant="hero" />
										</div>
									</div>

									<div className="border border-[var(--site-rule)] bg-[var(--color-card)]/94 p-4 shadow-[var(--site-shadow)] sm:p-5">
										<div className="mb-3 flex items-center justify-between gap-4 border-b border-[var(--site-rule)] pb-3">
											<h3 className="text-[16px] font-semibold text-[var(--color-text)]">
												{t('support.formHeading')}
											</h3>
											<span className="hidden font-mono text-[10px] text-[var(--color-text-subtle)] sm:block">
												{t('support.responseTime')}
											</span>
										</div>
										<ContactForm variant="hero" />
									</div>
								</div>
							</div>
						</motion.div>
					)}

					{mode === 'docs' && (
						<motion.div
							key="docs"
							initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 28 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -18 }}
							transition={transition}
							className="h-full w-full overflow-y-auto"
						>
							<div className="grid min-h-full place-items-center px-5 pb-5 pt-[68px] sm:px-8">
								<div className="w-full max-w-[720px] text-center">
									<p className="hq-kicker mb-5 text-[var(--color-primary)]">
										HyperQuote / {t('nav.docs')}
									</p>
									<h2 className="hq-display hq-title-section font-bold text-[var(--color-text)]">
										{t('docs.heroHeading')}
									</h2>
									<p className="mx-auto mt-6 max-w-[500px] text-[16px] leading-7 text-[var(--color-text-muted)]">
										{t('docs.heroSubheading')}
									</p>
									<p className="mt-3 font-mono text-[11px] text-[var(--color-text-subtle)]">
										{DOC_CATEGORIES.reduce(
											(total, category) => total + category.articles.length,
											0,
										)}{' '}
										{t('docs.articles')} · {WIZARDS.length} {t('docs.guides')}
									</p>
									<div className="mx-auto mt-9 max-w-[520px]">
										<RealDocsSearch onAskLyon={(query) => openChat(query)} />
									</div>
								</div>
							</div>
						</motion.div>
					)}

					{mode === 'chat' && (
						<motion.div
							key="chat"
							initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 28 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -18 }}
							transition={transition}
							className="flex h-full min-h-0 w-full flex-col"
						>
							<Suspense fallback={null}>
								<LyonHeroChat initialMessage={chatInitialMessage} />
							</Suspense>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			<HeroModeRail
				mode={mode}
				onBack={() => setMode('hero')}
				onOpen={(nextMode) => {
					if (nextMode === 'chat') openChat()
					else openMode(nextMode)
				}}
			/>
		</section>
	)
}

function HeroMaterialAccents() {
	const shouldReduceMotion = useReducedMotion()
	const transition = {
		duration: shouldReduceMotion ? 0.01 : 0.8,
		ease: EASE,
	}

	return (
		<div
			aria-hidden="true"
			className="hq-hero-material-accents pointer-events-none absolute inset-0 overflow-hidden"
		>
			<motion.div
				initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -64 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.12 }}
				className="absolute -bottom-[9.5rem] -left-[29rem] w-[clamp(44rem,52vw,56rem)]"
			>
				<img
					src="/images/hero-loader-bucket.png"
					alt=""
					width={768}
					height={512}
					loading="lazy"
					decoding="async"
					fetchPriority="low"
					className="h-auto w-full max-w-none opacity-[0.32] saturate-[0.72] dark:brightness-[0.58] dark:opacity-[0.28]"
				/>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 64 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.2 }}
				className="absolute -right-[31rem] -bottom-[11.5rem] w-[clamp(46rem,55vw,60rem)]"
			>
				<img
					src="/images/hero-concrete-foundation.png"
					alt=""
					width={768}
					height={512}
					loading="lazy"
					decoding="async"
					fetchPriority="low"
					className="h-auto w-full max-w-none opacity-[0.58] saturate-[0.68] dark:brightness-[0.52] dark:contrast-[1.08] dark:opacity-[0.42]"
				/>
			</motion.div>
		</div>
	)
}

function MaterialDocket({
	categories,
	isArabic,
}: {
	categories: PublicMarketPreviewCategory[]
	isArabic: boolean
}) {
	const { t } = useTranslation('website')
	const items = useQuoteCart((state) => state.items)
	const remove = useQuoteCart((state) => state.remove)
	const updateQuantity = useQuoteCart((state) => state.updateQuantity)
	const visibleCategories = categories.slice(0, 4)
	const hasItems = items.length > 0

	return (
		<div className="hq-material-docket hq-photo-frame hidden overflow-hidden rounded-[24px] border border-[var(--site-rule)] bg-[var(--color-card)] text-start md:block lg:rotate-[0.7deg]">
			<div className="flex items-center justify-between border-b border-[var(--site-rule)] px-5 py-3.5 sm:px-6">
				<p className="hq-kicker text-[var(--color-primary)]">
					{t('hero.docket.label')}
				</p>
				<Link
					to="/market"
					aria-label={t('hero.docket.addMaterial')}
					className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[var(--site-rule)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)]/30 hover:bg-[var(--site-blue-wash)] hover:text-[var(--color-primary)]"
				>
					<Plus size={14} strokeWidth={1.8} />
				</Link>
			</div>

			<div className="border-b border-[var(--site-rule)] bg-[var(--site-concrete)]/70 px-5 py-5 sm:px-6">
				<h2 className="hq-display text-[24px] font-bold leading-tight text-[var(--color-text)] sm:text-[28px]">
					{hasItems ? t('hero.docket.cartTitle') : t('hero.docket.emptyTitle')}
				</h2>
				{!hasItems && (
					<p className="mt-2 max-w-[440px] text-[13px] leading-6 text-[var(--color-text-muted)]">
						{t('hero.docket.emptyDescription')}
					</p>
				)}
			</div>

			<div className="hq-docket-lines min-h-[192px]">
				{hasItems && (
					<div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-[var(--site-rule)] px-5 py-3 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-subtle)] sm:px-6">
						<span>{t('hero.docket.categoryColumn')}</span>
						<span>{t('hero.docket.quantityColumn')}</span>
						<span>{t('hero.docket.unitColumn')}</span>
					</div>
				)}

				{hasItems ? (
					<div className="max-h-[224px] overflow-y-auto overscroll-contain">
						{items.map((item) => (
							<div
								key={item.productId}
								className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-2.5 text-[13px] transition-colors hover:bg-[var(--site-blue-wash)] sm:px-6"
							>
								<Link
									to="/market/$productSlug"
									params={{ productSlug: item.slug }}
									className="min-w-0 truncate font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
								>
									{isArabic && item.nameAr ? item.nameAr : item.name}
								</Link>
								<div className="flex h-8 items-center overflow-hidden rounded-[8px] border border-[var(--site-rule)] bg-[var(--color-card)]">
									<button
										type="button"
										onClick={() =>
											updateQuantity(item.productId, item.quantity - 1)
										}
										aria-label={t('cart.decreaseQuantity')}
										className="flex h-8 w-7 items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--site-concrete)] hover:text-[var(--color-text)]"
									>
										<Minus size={11} strokeWidth={1.8} />
									</button>
									<input
										type="number"
										min={0}
										inputMode="numeric"
										value={item.quantity}
										onChange={(event) =>
											updateQuantity(
												item.productId,
												Number.parseInt(event.currentTarget.value || '0', 10),
											)
										}
										aria-label={t('product.quantityLabel')}
										className="h-8 w-8 bg-transparent text-center font-mono text-[11px] font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									/>
									<button
										type="button"
										onClick={() =>
											updateQuantity(item.productId, item.quantity + 1)
										}
										aria-label={t('cart.increaseQuantity')}
										className="flex h-8 w-7 items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--site-concrete)] hover:text-[var(--color-text)]"
									>
										<Plus size={11} strokeWidth={1.8} />
									</button>
								</div>
								<button
									type="button"
									onClick={() => remove(item.productId)}
									aria-label={t('cart.remove')}
									className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-text-subtle)] hover:bg-[var(--color-error)]/8 hover:text-[var(--color-error)]"
								>
									<X size={13} strokeWidth={1.8} />
								</button>
							</div>
						))}
					</div>
				) : (
					visibleCategories.map((category) => (
						<Link
							key={category.slug}
							to="/market"
							search={{ category: category.slug }}
							className="group flex min-h-12 items-center justify-between gap-4 px-5 py-3 text-[13px] transition-colors hover:bg-[var(--site-blue-wash)] sm:px-6"
						>
							<span className="font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
								{isArabic && category.name_ar
									? category.name_ar
									: category.name}
							</span>
							<span className="flex items-center gap-2 text-[10px] text-[var(--color-text-subtle)]">
								{t('hero.docket.browse')}
								<ArrowUpRight size={13} className="icon-end" />
							</span>
						</Link>
					))
				)}
			</div>

			<div className="flex items-center justify-end gap-3 border-t border-[var(--site-rule)] px-5 py-3.5 sm:px-6">
				{hasItems ? (
					<>
						<span className="me-auto hidden font-mono text-[10px] text-[var(--color-text-subtle)] sm:block">
							{t('cart.itemCount', { count: items.length })}
						</span>
						<QuoteListActions source="hero" />
					</>
				) : (
					<Link
						to="/market"
						className="inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--color-primary)]"
					>
						{t('cta.browseMarket')}
						<ArrowUpRight size={14} className="icon-end" />
					</Link>
				)}
			</div>
		</div>
	)
}

function HeroModeRail({
	mode,
	onBack,
	onOpen,
}: {
	mode: HeroMode
	onBack: () => void
	onOpen: (mode: Exclude<HeroMode, 'hero'>) => void
}) {
	const { t } = useTranslation('website')
	const shouldReduceMotion = useReducedMotion()
	const [showAddress, setShowAddress] = useState(false)
	const modes: Array<{
		id: Exclude<HeroMode, 'hero'>
		label: string
	}> = [
		{ id: 'contact', label: t('support.sectionContact') },
		{ id: 'docs', label: t('nav.docs') },
		{ id: 'chat', label: t('chat.header') },
	]

	useEffect(() => {
		const interval = window.setInterval(
			() => setShowAddress((current) => !current),
			3200,
		)
		return () => window.clearInterval(interval)
	}, [])

	return (
		<div className="relative z-10 shrink-0 border-t border-[var(--site-rule)] bg-[var(--color-base)]">
			<div className="hq-page-shell flex min-h-[76px] flex-col justify-center gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-0">
				{mode === 'hero' ? (
					<div className="hidden min-w-0 items-center gap-4 md:flex">
						<Link
							to="/support"
							className="shrink-0 text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-primary)]"
						>
							{t('hero.serviceRail')}
						</Link>
						<span
							aria-hidden="true"
							className="h-3 w-px shrink-0 bg-[var(--site-rule)]"
						/>
						<a
							href={COMPANY_LOCATION_HREF}
							target="_blank"
							rel="noopener noreferrer"
							className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-primary)]"
						>
							<span className="sr-only">
								{t('hero.visitUs')}: {t('hero.address')}
							</span>
							<span
								aria-hidden="true"
								className="block h-4 w-[190px] overflow-hidden lg:w-[260px]"
							>
								<AnimatePresence mode="wait" initial={false}>
									<motion.span
										key={showAddress ? 'address' : 'visit'}
										initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
										transition={{ duration: shouldReduceMotion ? 0 : 0.22 }}
										className="block truncate"
									>
										{showAddress ? t('hero.address') : t('hero.visitUs')}
									</motion.span>
								</AnimatePresence>
							</span>
						</a>
					</div>
				) : (
					<button
						type="button"
						onClick={onBack}
						className="inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
					>
						<ArrowLeft size={14} className="rtl:rotate-180" />
						{t('hero.backToOverview')}
					</button>
				)}

				<div className="grid w-fit grid-cols-3 self-center overflow-hidden rounded-xl border border-[var(--site-rule)] sm:self-auto">
					{modes.map((item) => (
						<button
							key={item.id}
							type="button"
							onClick={() => onOpen(item.id)}
							className={`min-h-10 border-e border-[var(--site-rule)] px-3 text-[11px] font-semibold transition-colors last:border-e-0 sm:min-w-[112px] ${
								mode === item.id
									? 'bg-[var(--site-blue-wash)] text-[var(--color-primary)]'
									: 'text-[var(--color-text-muted)] hover:bg-[var(--site-concrete)] hover:text-[var(--color-text)]'
							}`}
						>
							{item.label}
						</button>
					))}
				</div>
			</div>
		</div>
	)
}
