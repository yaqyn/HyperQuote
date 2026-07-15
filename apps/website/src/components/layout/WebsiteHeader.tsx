import {
	createQuoteCartSync,
	toQuoteRequestItemPayloads,
} from '@hyperquote/quote-cart'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
	ChevronDown,
	ExternalLink,
	LogOut,
	Menu,
	Package,
	PanelRightClose,
	ShoppingCart,
	Store,
	X,
} from 'lucide-react'
import {
	AnimatePresence,
	cubicBezier,
	motion,
	useReducedMotion,
} from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuoteCart } from '../../hooks/useQuoteCart'
import { useScrolled } from '../../hooks/useScrolled'
import { useWebsiteAccountState } from '../../hooks/useWebsiteAccountState'
import { signOutWebsiteAccount } from '../../lib/auth'
import { getPortalHref } from '../../lib/portal-url'
import {
	getWebsiteQuoteCart,
	saveWebsiteQuoteCart,
} from '../../lib/quote-cart-sync'
import { validateWebsiteQuoteItems } from '../../lib/quote-requests'
import { QuoteListActions } from '../quote/QuoteListActions'
import { WebsiteSavedDraftsPanel } from '../shared/SavedDraftsPanel'
import { LanguageToggle } from './LanguageToggle'
import { MobileNavOverlay } from './MobileNavOverlay'
import { ThemeToggle } from './ThemeToggle'

const CART_DRAWER_EASE = cubicBezier(0.22, 1, 0.36, 1)

export function WebsiteHeader() {
	const { t, i18n } = useTranslation('website')
	const isAr = i18n.language === 'ar'
	const scrolled = useScrolled(8)
	const shouldReduceMotion = useReducedMotion()
	const [mobileNavOpen, setMobileNavOpen] = useState(false)
	const [cartOpen, setCartOpen] = useState(false)
	const [emptySavedOrdersOpen, setEmptySavedOrdersOpen] = useState(false)
	const [atPageBottom, setAtPageBottom] = useState(false)
	const { items, remove, updateQuantity } = useQuoteCart()
	const quoteRequestItems = useMemo(
		() => toQuoteRequestItemPayloads(items, { isArabic: isAr }),
		[isAr, items],
	)
	const [unavailableCartItems, setUnavailableCartItems] = useState<string[]>([])
	const [cartValidationPending, setCartValidationPending] = useState(false)
	const [cartValidationFailed, setCartValidationFailed] = useState(false)
	const unavailableCartItemNames = useMemo(
		() => new Set(unavailableCartItems),
		[unavailableCartItems],
	)
	const navigateTo = useNavigate()
	const routerState = useRouterState()
	const isHome = routerState.location.pathname === '/'
	const wasHome = useRef(isHome)
	const [introDone, setIntroDone] = useState(!isHome)
	const { accountState, refreshAccountState } = useWebsiteAccountState()

	useEffect(() => {
		const controller = createQuoteCartSync({
			adapter: accountState.authenticated
				? {
						load: async () => {
							const result = await getWebsiteQuoteCart()
							return result.success ? result.cart : null
						},
						save: async (snapshot) => {
							const result = await saveWebsiteQuoteCart({
								data: { ...snapshot, source: 'website' },
							})
							return result.success ? result.cart : null
						},
					}
				: undefined,
			source: 'website',
			store: useQuoteCart,
		})
		return () => controller.stop()
	}, [accountState.authenticated])

	useEffect(() => {
		if (!cartOpen) {
			setEmptySavedOrdersOpen(false)
		}
	}, [cartOpen])

	useEffect(() => {
		if (isHome) {
			// On navigation TO home: briefly hide wordmark while hero intro plays
			setIntroDone(false)
			const delay = wasHome.current ? 650 : 800
			const timer = setTimeout(() => setIntroDone(true), delay)
			wasHome.current = true
			return () => clearTimeout(timer)
		}
		// Leaving home: show wordmark immediately
		wasHome.current = false
		setIntroDone(true)
	}, [isHome])
	const heroMode = isHome && !scrolled

	useEffect(() => {
		const compactFooterQuery = window.matchMedia('(max-width: 1023px)')

		function updateBottomState() {
			const remaining =
				document.documentElement.scrollHeight -
				window.innerHeight -
				window.scrollY
			setAtPageBottom(compactFooterQuery.matches && remaining <= 24)
		}

		updateBottomState()
		compactFooterQuery.addEventListener('change', updateBottomState)
		window.addEventListener('scroll', updateBottomState, { passive: true })
		window.addEventListener('resize', updateBottomState)
		return () => {
			compactFooterQuery.removeEventListener('change', updateBottomState)
			window.removeEventListener('scroll', updateBottomState)
			window.removeEventListener('resize', updateBottomState)
		}
	}, [])

	useEffect(() => {
		let active = true
		if (quoteRequestItems.length === 0) {
			setUnavailableCartItems([])
			setCartValidationPending(false)
			setCartValidationFailed(false)
			return () => {
				active = false
			}
		}

		setCartValidationPending(true)
		setCartValidationFailed(false)
		void validateWebsiteQuoteItems({ data: { items: quoteRequestItems } })
			.then((result) => {
				if (active) setUnavailableCartItems(result.unavailableItems)
			})
			.catch(() => {
				if (!active) return
				setUnavailableCartItems([])
				setCartValidationFailed(true)
			})
			.finally(() => {
				if (active) setCartValidationPending(false)
			})

		return () => {
			active = false
		}
	}, [quoteRequestItems])

	const navLinkClass =
		'border-b border-transparent px-3 py-2 text-[12px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]'
	const navLinkActiveClass = 'text-[var(--color-text)]'

	const scrollToProcess = useCallback(() => {
		document
			.getElementById('process')
			?.scrollIntoView({ behavior: 'smooth', block: 'start' })
	}, [])

	const handleHomeLogoClick = useCallback(() => {
		if (window.matchMedia('(max-width: 1023px)').matches) {
			scrollToProcess()
			return
		}
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}, [scrollToProcess])

	return (
		<>
			{/* Quiet home bar. The transformed hero owns the primary navigation. */}
			{isHome && (
				<div
					dir="ltr"
					className="pointer-events-none fixed inset-x-0 top-0 z-39 flex h-[68px] items-center justify-between overflow-hidden bg-transparent px-4 sm:px-6 lg:px-8"
					style={{
						opacity: scrolled ? 0 : 1,
						transition: 'opacity 0.7s ease-out',
					}}
				>
					<a
						href="/"
						aria-label={t('a11y.home')}
						className="pointer-events-auto transition-transform duration-700 ease-out"
						style={{
							transform: scrolled ? 'translateY(-100%)' : 'translateY(0)',
						}}
					>
						<span className="block overflow-hidden text-[18px] font-extrabold tracking-[-0.035em] text-[var(--color-text)] sm:text-[20px]">
							<span
								className="block"
								style={{
									transform:
										introDone && !scrolled
											? 'translateY(0)'
											: 'translateY(110%)',
									transition: introDone
										? 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1) 0.15s'
										: 'none',
								}}
							>
								HyperQuote
							</span>
						</span>
					</a>
					<div
						className="flex items-center gap-1 pointer-events-auto"
						style={{
							opacity: introDone && !scrolled ? 1 : 0,
							transition: introDone ? 'opacity 0.5s ease-out 0.3s' : 'none',
						}}
					>
						<LanguageToggle />
						<ThemeToggle />
						<button
							type="button"
							onClick={() => setMobileNavOpen(true)}
							aria-label={t('a11y.openNav')}
							className="rounded-lg p-2 text-[var(--color-text)] transition-colors hover:bg-[var(--site-concrete)] md:hidden"
						>
							<Menu size={22} />
						</button>
					</div>
				</div>
			)}

			{/* Full header — a precise procurement rail, shared by every route. */}
			<header
				dir="ltr"
				aria-hidden={heroMode || atPageBottom}
				inert={heroMode || atPageBottom}
				className="hq-site-header fixed inset-x-0 top-0 z-40 flex h-[68px] items-center justify-between border-b border-[var(--site-rule)] px-4 backdrop-blur-xl transition-transform duration-500 ease-out sm:px-6 lg:px-8"
				style={{
					transform:
						heroMode || atPageBottom ? 'translateY(-100%)' : 'translateY(0)',
				}}
			>
				{/* Logo */}
				{isHome ? (
					<button
						type="button"
						onClick={handleHomeLogoClick}
						className="flex items-center gap-3"
					>
						<span className="text-[18px] font-extrabold tracking-[-0.035em] text-[var(--color-text)] sm:text-[20px]">
							HyperQuote
						</span>
					</button>
				) : (
					<Link
						to="/"
						aria-label={t('a11y.home')}
						className="flex items-center gap-3"
					>
						<span className="text-[18px] font-extrabold tracking-[-0.035em] text-[var(--color-text)] sm:text-[20px]">
							HyperQuote
						</span>
					</Link>
				)}

				{/* Desktop Nav — absolute center, unaffected by siblings */}
				<nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:flex">
					<Link
						to="/market"
						className={navLinkClass}
						activeProps={{ className: navLinkActiveClass }}
					>
						{t('nav.market')}
					</Link>
					<Link
						to="/about"
						className={navLinkClass}
						activeProps={{ className: navLinkActiveClass }}
					>
						{t('nav.about')}
					</Link>
					<Link
						to="/support"
						className={navLinkClass}
						activeProps={{ className: navLinkActiveClass }}
					>
						{t('nav.support')}
					</Link>
					<Link
						to="/docs"
						className={navLinkClass}
						activeProps={{ className: navLinkActiveClass }}
					>
						{t('nav.docs')}
					</Link>
				</nav>

				{/* Right Cluster */}
				<div className="flex items-center gap-1">
					<LanguageToggle />
					<ThemeToggle />

					{/* Cart toggle */}
					<button
						type="button"
						onClick={() => setCartOpen(!cartOpen)}
						className="relative p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
						aria-label={t('cart.label')}
					>
						<ShoppingCart
							size={18}
							className="text-[var(--color-text-muted)]"
						/>
						{items.length > 0 && (
							<span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-[16px] rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold flex items-center justify-center px-0.5">
								{items.length}
							</span>
						)}
					</button>

					<span className="hidden md:block w-px h-4 bg-[var(--color-border)] ms-2" />
					{accountState.authenticated ? (
						<WebsiteAccountMenu
							companyName={accountState.companyName}
							onSignOut={async () => {
								await signOutWebsiteAccount()
								window.dispatchEvent(new Event('hyperquote-account-updated'))
								await refreshAccountState()
							}}
						/>
					) : (
						<button
							type="button"
							onClick={() => navigateTo({ to: '/login' })}
							className="hidden md:inline-flex items-center justify-center w-[100px] ms-2 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
						>
							{t('login.step1.heading')}
						</button>
					)}
					<button
						type="button"
						onClick={() => setMobileNavOpen(true)}
						aria-label={t('a11y.openNav')}
						className="rounded-lg p-2 text-[var(--color-text)] transition-colors hover:bg-[var(--site-concrete)] md:hidden"
					>
						<Menu size={24} />
					</button>
				</div>
			</header>

			{/* Cart drawer */}
			<AnimatePresence>
				{cartOpen && (
					<>
						<motion.button
							key="cart-backdrop"
							type="button"
							aria-label={t('a11y.close')}
							className="fixed inset-0 z-45 bg-black/20"
							onClick={() => setCartOpen(false)}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: shouldReduceMotion ? 0.01 : 0.18 }}
						/>
						<motion.div
							key="cart-drawer"
							className="fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-[min(100vw,420px)] flex-col overflow-hidden border-s border-[var(--color-text)]/[0.06] bg-[var(--color-base)] shadow-[0_24px_80px_rgba(0,0,0,0.12)] will-change-transform md:top-4 md:right-4 md:bottom-4 md:h-auto md:rounded-2xl"
							initial={{
								opacity: shouldReduceMotion ? 1 : 0,
								x: shouldReduceMotion ? 0 : '100%',
							}}
							animate={{ opacity: 1, x: 0 }}
							exit={{
								opacity: shouldReduceMotion ? 1 : 0,
								x: shouldReduceMotion ? 0 : '100%',
							}}
							transition={{
								duration: shouldReduceMotion ? 0.01 : 0.26,
								ease: CART_DRAWER_EASE,
							}}
						>
							{/* Header */}
							<div className="flex items-center justify-between px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-4 md:pt-5">
								<span className="text-[15px] font-semibold text-[var(--color-text)]">
									{t('cart.title')}
								</span>
								<button
									type="button"
									onClick={() => setCartOpen(false)}
									className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
								>
									<PanelRightClose size={16} strokeWidth={1.8} />
								</button>
							</div>

							{/* Items */}
							{items.length === 0 ? (
								emptySavedOrdersOpen ? (
									<WebsiteSavedDraftsPanel
										onAdded={() => setEmptySavedOrdersOpen(false)}
										onBack={() => setEmptySavedOrdersOpen(false)}
										onAuthRequired={() => navigateTo({ to: '/login' })}
									/>
								) : (
									<div className="flex flex-1 flex-col items-center justify-center px-8 pb-10 pt-4 text-center md:block md:flex-none md:px-5 md:pb-6">
										<p className="mb-4 text-[13px] text-[var(--color-text-muted)]">
											{t('cart.empty')}
										</p>
										<div className="flex flex-col items-center gap-3">
											<Link
												to="/market"
												onClick={() => setCartOpen(false)}
												className="text-[13px] font-medium text-[var(--color-primary)]"
											>
												{t('cart.browseCta')}
											</Link>
											<button
												type="button"
												onClick={() => setEmptySavedOrdersOpen(true)}
												className="h-9 rounded-lg border border-[var(--color-border)] px-4 text-[13px] font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
											>
												{t('cart.viewSavedOrders')}
											</button>
										</div>
									</div>
								)
							) : (
								<>
									<div className="flex-1 overflow-y-auto">
										{items.map((item, idx) => {
											const itemName =
												isAr && item.nameAr ? item.nameAr : item.name
											const itemUnavailable =
												unavailableCartItemNames.has(itemName)
											const categoryLabel =
												isAr && item.categoryNameAr
													? item.categoryNameAr
													: item.categoryName
											const unitLabel =
												isAr && item.unitOfMeasureAr
													? item.unitOfMeasureAr
													: item.unitOfMeasure

											return (
												<div
													key={item.productId}
													className={`px-4 py-3 md:px-5 ${idx > 0 ? 'border-t border-[var(--color-border)]' : ''} ${itemUnavailable ? 'opacity-55' : ''}`}
												>
													<div className="flex min-w-0 items-center gap-3">
														{item.imageUrl ? (
															<img
																src={item.imageUrl}
																alt=""
																loading="lazy"
																decoding="async"
																className="h-11 w-11 shrink-0 rounded-lg bg-[var(--color-surface)] object-cover ring-1 ring-inset ring-[var(--color-border)]"
															/>
														) : (
															<div
																aria-hidden="true"
																className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-text-subtle)] ring-1 ring-inset ring-[var(--color-border)]"
															>
																<Package size={15} strokeWidth={1.8} />
															</div>
														)}
														<div className="min-w-0 flex-1">
															<Link
																to="/market/$productSlug"
																params={{ productSlug: item.slug }}
																onClick={() => setCartOpen(false)}
																className="block truncate text-[13px] font-medium leading-snug text-[var(--color-text)] transition-colors hover:text-[var(--color-primary)]"
															>
																{itemName}
															</Link>
															<p className="mt-1 truncate text-[11px] text-[var(--color-text-muted)]">
																{categoryLabel}
															</p>
															{itemUnavailable && (
																<span className="mt-1 inline-flex rounded-full border border-[var(--color-error)]/25 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-error)]">
																	{t('market.outOfStock')}
																</span>
															)}
														</div>
														<label className="flex h-10 w-[144px] shrink-0 items-center justify-end gap-2 px-1">
															<span className="sr-only">
																{t('product.quantityLabel')}
															</span>
															<input
																type="number"
																inputMode="numeric"
																value={item.quantity}
																onKeyDown={(event) => {
																	if (
																		item.quantity !== 0 ||
																		!/^\d$/.test(event.key)
																	) {
																		return
																	}
																	event.preventDefault()
																	updateQuantity(
																		item.productId,
																		Number(event.key),
																	)
																}}
																onPaste={(event) => {
																	if (item.quantity !== 0) return
																	const pastedValue = event.clipboardData
																		.getData('text')
																		.trim()
																	if (!/^\d+$/.test(pastedValue)) return
																	event.preventDefault()
																	updateQuantity(
																		item.productId,
																		Number.parseInt(pastedValue, 10),
																	)
																}}
																onChange={(event) => {
																	const rawValue =
																		event.currentTarget.value.trim()
																	if (rawValue === '') {
																		updateQuantity(item.productId, 0)
																		return
																	}
																	const next = Number.parseInt(rawValue, 10)
																	if (Number.isFinite(next) && next >= 0) {
																		updateQuantity(item.productId, next)
																	}
																}}
																className="h-full min-w-0 flex-1 bg-transparent text-end font-mono text-[15px] font-semibold text-[var(--color-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
																min={0}
																style={{
																	fontVariantNumeric: 'tabular-nums',
																}}
															/>
															<span className="min-w-0 truncate text-[12px] text-[var(--color-text-muted)]">
																{unitLabel}
															</span>
														</label>
														<button
															type="button"
															onClick={() => remove(item.productId)}
															className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-error)]"
															aria-label={t('cart.remove')}
														>
															<X size={15} strokeWidth={1.8} />
														</button>
													</div>
												</div>
											)
										})}
									</div>

									<CartActionsPanel
										cartValidationFailed={cartValidationFailed}
										cartValidationPending={cartValidationPending}
										unavailableCartItems={unavailableCartItems}
									/>
								</>
							)}
						</motion.div>
					</>
				)}
			</AnimatePresence>

			<MobileNavOverlay
				isOpen={mobileNavOpen}
				onClose={() => setMobileNavOpen(false)}
			/>
		</>
	)
}

function CartActionsPanel({
	cartValidationFailed,
	cartValidationPending,
	unavailableCartItems,
}: {
	cartValidationFailed: boolean
	cartValidationPending: boolean
	unavailableCartItems: string[]
}) {
	const { t } = useTranslation('website')
	const navigateTo = useNavigate()
	const globalNote = useQuoteCart((state) => state.globalNote)
	const setGlobalNote = useQuoteCart((state) => state.setGlobalNote)
	const [notesOpen, setNotesOpen] = useState(false)
	const [savedDraftsOpen, setSavedDraftsOpen] = useState(false)
	const blocked =
		cartValidationFailed ||
		cartValidationPending ||
		unavailableCartItems.length > 0

	if (savedDraftsOpen) {
		return (
			<WebsiteSavedDraftsPanel
				onAdded={() => setSavedDraftsOpen(false)}
				onBack={() => setSavedDraftsOpen(false)}
				onAuthRequired={() => navigateTo({ to: '/login' })}
			/>
		)
	}

	return (
		<div className="shrink-0 border-t border-[var(--site-rule)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:px-5 md:pb-4">
			{notesOpen && (
				<label className="mb-3 block">
					<span className="sr-only">{t('cart.notes')}</span>
					<textarea
						value={globalNote}
						onChange={(event) => setGlobalNote(event.currentTarget.value)}
						rows={3}
						maxLength={2000}
						placeholder={t('cart.notesPlaceholder')}
						className="block max-h-32 min-h-20 w-full resize-none rounded-[10px] border border-[var(--site-rule)] bg-[var(--color-card)] px-3 py-2 text-[12px] leading-5 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]"
					/>
				</label>
			)}
			<QuoteListActions
				blocked={blocked}
				onOpenNotes={() => setNotesOpen((open) => !open)}
				onOpenSavedDrafts={() => setSavedDraftsOpen(true)}
				source="cart"
			/>
			{unavailableCartItems.length > 0 && (
				<p
					role="alert"
					className="mt-2 text-center text-[10px] text-[var(--color-error)]"
				>
					{t('cart.unavailableItems', {
						items: unavailableCartItems.join(', '),
					})}
				</p>
			)}
			{cartValidationFailed && (
				<p
					role="alert"
					className="mt-2 text-center text-[10px] text-[var(--color-error)]"
				>
					{t(
						'cart.validationFailed',
						'Could not confirm catalog availability. Try again.',
					)}
				</p>
			)}
			<p className="mt-2 text-center text-[10px] text-[var(--color-text-subtle)]">
				{t('cart.submitHint')}
			</p>
		</div>
	)
}

function WebsiteAccountMenu({
	companyName,
	onSignOut,
}: {
	companyName: string | null
	onSignOut: () => Promise<void>
}) {
	const { t } = useTranslation('website')
	const [open, setOpen] = useState(false)
	const [signingOut, setSigningOut] = useState(false)
	const menuRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return

		function closeOnOutsideClick(event: MouseEvent) {
			if (!menuRef.current?.contains(event.target as Node)) {
				setOpen(false)
			}
		}

		document.addEventListener('mousedown', closeOnOutsideClick)
		return () => document.removeEventListener('mousedown', closeOnOutsideClick)
	}, [open])

	async function handleSignOut() {
		if (signingOut) return
		setSigningOut(true)
		try {
			await onSignOut()
			setOpen(false)
		} finally {
			setSigningOut(false)
		}
	}

	return (
		<div ref={menuRef} className="relative hidden md:block ms-2">
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				aria-haspopup="menu"
				aria-expanded={open}
				className="inline-flex h-9 min-w-[112px] items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
			>
				<span>{t('nav.account')}</span>
				<ChevronDown
					size={14}
					className={`transition-transform ${open ? 'rotate-180' : ''}`}
					aria-hidden="true"
				/>
			</button>
			{open && (
				<div
					role="menu"
					aria-label={t('nav.account')}
					className="absolute end-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#151515]/95 p-1 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl"
				>
					{companyName && (
						<p className="truncate px-3 py-2 text-[11px] font-medium text-white/45">
							{companyName}
						</p>
					)}
					<Link
						role="menuitem"
						to="/market"
						onClick={() => setOpen(false)}
						className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-start text-[13px] font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white"
					>
						<Store size={15} strokeWidth={1.8} aria-hidden="true" />
						<span>{t('nav.market')}</span>
					</Link>
					<a
						role="menuitem"
						href={getPortalHref()}
						onClick={() => setOpen(false)}
						className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-start text-[13px] font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white"
					>
						<ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
						<span>{t('nav.portal')}</span>
					</a>
					<button
						role="menuitem"
						type="button"
						onClick={handleSignOut}
						disabled={signingOut}
						className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-start text-[13px] font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white disabled:opacity-50"
					>
						<LogOut size={15} strokeWidth={1.8} aria-hidden="true" />
						<span>{t('nav.signOut')}</span>
					</button>
				</div>
			)}
		</div>
	)
}
