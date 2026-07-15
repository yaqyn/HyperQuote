import { Link } from '@tanstack/react-router'
import { ArrowDown, ArrowLeft, ArrowUpRight } from 'lucide-react'
import {
	AnimatePresence,
	cubicBezier,
	motion,
	useReducedMotion,
} from 'motion/react'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DOC_CATEGORIES, WIZARDS } from '../../content/registry'
import { useChatWidget } from '../../hooks/useChatWidget'
import { useQuoteCart } from '../../hooks/useQuoteCart'
import type { PublicMarketPreviewCategory } from '../../lib/catalog'
import { DocsSearch as RealDocsSearch } from '../docs/DocsSearch'
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
		<section className="relative flex min-h-svh flex-col overflow-hidden bg-[var(--color-base)]">
			<div className="relative flex min-h-0 flex-1">
				<AnimatePresence mode="wait">
					{mode === 'hero' && (
						<motion.div
							key="hero"
							initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -18 }}
							transition={transition}
							className="flex w-full items-center pb-8 pt-24 sm:pb-10 sm:pt-28 lg:pb-14 lg:pt-32"
						>
							<div className="hq-page-shell grid items-center gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] lg:gap-16 xl:gap-24">
								<div className="max-w-[760px] text-center lg:text-start">
									<p className="hq-kicker mb-6 text-[var(--color-primary)]">
										{t('hero.eyebrow')}
									</p>
									<h1 className="hq-display hq-title-hero font-bold text-[var(--color-text)]">
										<span className="block">{t('hero.headlinePart1')}</span>
										<span className="mt-[0.08em] block text-[var(--color-primary)]">
											{t('hero.headlinePart2')}
										</span>
									</h1>
									<p className="mx-auto mt-7 max-w-[580px] text-[16px] leading-7 text-[var(--color-text-muted)] sm:text-[18px] sm:leading-8 lg:mx-0">
										{t('hero.subheadline')}
									</p>

									<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
										<Link
											to="/market"
											className="group inline-flex h-13 w-full items-center justify-between rounded-xl bg-[var(--color-primary)] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] sm:w-[210px]"
										>
											{t('cta.browseMarket')}
											<ArrowUpRight
												size={17}
												className="icon-end transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
											/>
										</Link>
										<button
											type="button"
											onClick={() =>
												document.getElementById('process')?.scrollIntoView({
													behavior: shouldReduceMotion ? 'auto' : 'smooth',
												})
											}
											className="inline-flex h-13 w-full items-center justify-between rounded-xl border border-[var(--site-rule)] px-5 text-[14px] font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--site-concrete)] sm:w-[230px]"
										>
											{t('hero.seeProcess')}
											<ArrowDown size={16} />
										</button>
									</div>
								</div>

								<MaterialDocket categories={categories} isArabic={isArabic} />
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
							<div className="hq-page-shell pb-12 pt-24 sm:pt-28 lg:pt-32">
								<div className="mb-10 max-w-[720px] text-center lg:text-start">
									<p className="hq-kicker mb-4 text-[var(--color-primary)]">
										{t('support.sectionContact')}
									</p>
									<h2 className="hq-display hq-title-section font-bold text-[var(--color-text)]">
										{t('support.formHeading')}
									</h2>
								</div>
								<div className="grid grid-cols-1 gap-12 border-t border-[var(--site-rule)] pt-10 lg:grid-cols-[1fr_1fr] lg:gap-24">
									<ContactForm />
									<ContactInfo />
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
							className="flex h-full w-full items-center justify-center px-5 pb-20 pt-24 sm:px-8"
						>
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
						</motion.div>
					)}

					{mode === 'chat' && (
						<motion.div
							key="chat"
							initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 28 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -18 }}
							transition={transition}
							className="flex h-full w-full flex-col"
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

function MaterialDocket({
	categories,
	isArabic,
}: {
	categories: PublicMarketPreviewCategory[]
	isArabic: boolean
}) {
	const { t } = useTranslation('website')
	const items = useQuoteCart((state) => state.items)
	const visibleItems = items.slice(0, 4)
	const visibleCategories = categories.slice(0, 4)
	const hasItems = visibleItems.length > 0

	return (
		<div className="hq-photo-frame overflow-hidden rounded-[24px] border border-[var(--site-rule)] bg-[var(--color-card)] text-start lg:rotate-[0.7deg]">
			<div className="border-b border-[var(--site-rule)] px-5 py-4 sm:px-6">
				<p className="hq-kicker text-[var(--color-primary)]">
					{t('hero.docket.label')}
				</p>
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

			<div className="hq-docket-lines min-h-[216px]">
				{hasItems && (
					<div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-[var(--site-rule)] px-5 py-3 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-subtle)] sm:px-6">
						<span>{t('hero.docket.categoryColumn')}</span>
						<span>{t('hero.docket.quantityColumn')}</span>
						<span>{t('hero.docket.unitColumn')}</span>
					</div>
				)}

				{hasItems
					? visibleItems.map((item) => (
							<Link
								key={item.productId}
								to="/market/$productSlug"
								params={{ productSlug: item.slug }}
								className="group grid min-h-12 grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 text-[13px] transition-colors hover:bg-[var(--site-blue-wash)] sm:px-6"
							>
								<span className="min-w-0 truncate font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
									{isArabic && item.nameAr ? item.nameAr : item.name}
								</span>
								<span className="font-mono text-[12px] text-[var(--color-text-muted)]">
									{item.quantity}
								</span>
								<span className="min-w-12 text-end font-mono text-[10px] text-[var(--color-text-subtle)]">
									{isArabic && item.unitOfMeasureAr
										? item.unitOfMeasureAr
										: item.unitOfMeasure}
								</span>
							</Link>
						))
					: visibleCategories.map((category) => (
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
						))}
			</div>

			<div className="flex items-center justify-end gap-4 border-t border-[var(--site-rule)] px-5 py-4 sm:px-6">
				{hasItems && (
					<span className="me-auto font-mono text-[10px] text-[var(--color-text-subtle)]">
						{items.length} {t('hero.docket.items')}
					</span>
				)}
				<Link
					to="/market"
					className="inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--color-primary)]"
				>
					{hasItems ? t('hero.docket.continue') : t('cta.browseMarket')}
					<ArrowUpRight size={14} className="icon-end" />
				</Link>
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
	const modes: Array<{
		id: Exclude<HeroMode, 'hero'>
		label: string
	}> = [
		{ id: 'contact', label: t('support.sectionContact') },
		{ id: 'docs', label: t('nav.docs') },
		{ id: 'chat', label: t('chat.header') },
	]

	return (
		<div className="shrink-0 border-t border-[var(--site-rule)] bg-[var(--color-base)]">
			<div className="hq-page-shell flex min-h-[76px] flex-col justify-center gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-0">
				{mode === 'hero' ? (
					<p className="hq-kicker hidden text-[var(--color-text-subtle)] sm:block">
						{t('hero.serviceRail')}
					</p>
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

				<div className="grid grid-cols-3 overflow-hidden rounded-xl border border-[var(--site-rule)]">
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
