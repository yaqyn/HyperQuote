import {
	getQuoteCartFingerprint,
	toQuoteRequestItemPayloads,
} from '@hyperquote/quote-cart'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
	ArrowLeft,
	ChevronDown,
	CircleCheck,
	ExternalLink,
	FileText,
	LogOut,
	Menu,
	MessageCircle,
	Package,
	PanelRightClose,
	Save,
	ShoppingCart,
	StickyNote,
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
import { sendOTP, signOutWebsiteAccount } from '../../lib/auth'
import { getPortalHref } from '../../lib/portal-url'
import {
	saveWebsiteQuoteDraft,
	submitWebsiteQuoteRequest,
	validateWebsiteQuoteItems,
} from '../../lib/quote-requests'
import {
	EGYPT_COUNTRY_CODE,
	EGYPT_MOBILE_REGEX,
	emptyOtpCode,
	resetOtpCode,
} from '../auth/authFields'
import { OtpCodeInput } from '../auth/OtpCodeInput'
import { OtpResendControl } from '../auth/OtpResendControl'
import { PhoneNumberInput } from '../auth/PhoneNumberInput'
import { useResendCountdown } from '../auth/useResendCountdown'
import { verifyOtpCode } from '../auth/verifyOtpCode'
import { WebsiteSavedDraftsPanel } from '../shared/SavedDraftsPanel'
import { LanguageToggle } from './LanguageToggle'
import { MobileNavOverlay } from './MobileNavOverlay'
import { ThemeToggle } from './ThemeToggle'

const CART_DRAWER_EASE = cubicBezier(0.22, 1, 0.36, 1)
const CART_NOTES_RAIL_OPEN_Y = -104
const CART_NOTES_PANEL_CLOSED_Y = -72
const CART_NOTES_PANEL_OPEN_Y = -92

type WebsiteQuoteRequestItemPayload = ReturnType<
	typeof toQuoteRequestItemPayloads
>[number]

function cartTransition(shouldReduceMotion: boolean | null, duration = 0.14) {
	return {
		duration: shouldReduceMotion ? 0.01 : duration,
		ease: CART_DRAWER_EASE,
	}
}

function cartRevealMotion(shouldReduceMotion: boolean | null) {
	return {
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: shouldReduceMotion ? 0 : -4 },
		initial: { opacity: 0, y: shouldReduceMotion ? 0 : 4 },
		transition: cartTransition(shouldReduceMotion),
	}
}

function cartNotesPanelMotion(shouldReduceMotion: boolean | null) {
	return {
		animate: { opacity: 1, y: CART_NOTES_PANEL_OPEN_Y },
		exit: {
			opacity: 0,
			y: shouldReduceMotion
				? CART_NOTES_PANEL_OPEN_Y
				: CART_NOTES_PANEL_CLOSED_Y,
		},
		initial: {
			opacity: 0,
			y: shouldReduceMotion
				? CART_NOTES_PANEL_OPEN_Y
				: CART_NOTES_PANEL_CLOSED_Y,
		},
		transition: cartTransition(shouldReduceMotion, 0.18),
	}
}

function getDefaultDraftName(baseName: string, isArabic: boolean) {
	const date = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(new Date())
	return `${baseName} ${date}`
}

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
	const [cartSuccess, setCartSuccess] = useState<{
		reference: string
		type: 'draft' | 'submit'
	} | null>(null)
	const navigateTo = useNavigate()
	const routerState = useRouterState()
	const isHome = routerState.location.pathname === '/'
	const wasHome = useRef(isHome)
	const [introDone, setIntroDone] = useState(!isHome)
	const { accountState, refreshAccountState } = useWebsiteAccountState()

	useEffect(() => {
		if (items.length > 0 && cartSuccess?.type === 'submit') {
			setCartSuccess(null)
		}
	}, [items.length, cartSuccess])

	useEffect(() => {
		if (!cartOpen || !cartSuccess) return
		const timer = window.setTimeout(() => setCartOpen(false), 3000)
		return () => window.clearTimeout(timer)
	}, [cartOpen, cartSuccess])

	useEffect(() => {
		if (cartOpen || !cartSuccess) return
		setCartSuccess(null)
	}, [cartOpen, cartSuccess])

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
		'text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors'
	const navLinkActiveClass =
		'text-sm font-medium text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] pb-1'

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
			{/* Hero bar — wordmark left, toggles right. Visible on home before scroll */}
			{isHome && (
				<div
					dir="ltr"
					className="fixed top-0 inset-x-0 z-39 h-16 max-md:h-14 flex items-center justify-between px-6 pointer-events-none overflow-hidden"
					style={{
						opacity: scrolled ? 0 : 1,
						transition: 'opacity 0.7s ease-out',
					}}
				>
					<button
						type="button"
						onClick={scrollToProcess}
						className="pointer-events-auto transition-transform duration-700 ease-out"
						style={{
							transform: scrolled ? 'translateY(-100%)' : 'translateY(0)',
						}}
					>
						<span className="text-[20px] max-md:text-[17px] font-extrabold tracking-normal text-[var(--color-text)] block overflow-hidden">
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
					</button>
					<div
						className="flex items-center gap-1 pointer-events-auto"
						style={{
							opacity: introDone && !scrolled ? 1 : 0,
							transition: introDone ? 'opacity 0.5s ease-out 0.3s' : 'none',
						}}
					>
						<LanguageToggle />
						<ThemeToggle />
					</div>
				</div>
			)}

			{/* Full header — slides down from top on scroll */}
			<header
				dir="ltr"
				data-theme="dark"
				className="fixed top-0 inset-x-0 z-40 h-16 max-md:h-14 flex items-center justify-between px-6 bg-[#101010] transition-all duration-700 ease-out"
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
						<span className="text-[20px] max-md:text-[17px] font-extrabold tracking-normal text-white">
							HyperQuote
						</span>
					</button>
				) : (
					<Link
						to="/"
						aria-label={t('a11y.home')}
						className="flex items-center gap-3"
					>
						<span className="text-[20px] max-md:text-[17px] font-extrabold tracking-normal text-white">
							HyperQuote
						</span>
					</Link>
				)}

				{/* Desktop Nav — absolute center, unaffected by siblings */}
				<nav className="hidden md:flex items-center gap-6 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
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
						className="rounded-lg p-2 text-white transition-colors hover:bg-white/10 md:hidden"
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
							{cartSuccess ? (
								<CartSuccessMessage
									onContinue={() => {
										setCartSuccess(null)
										setCartOpen(false)
									}}
									reference={cartSuccess.reference}
									type={cartSuccess.type}
								/>
							) : (
								<>
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

											{/* Submit / Inline Auth */}
											<CartSubmit
												cartValidationFailed={cartValidationFailed}
												cartValidationPending={cartValidationPending}
												itemCount={items.length}
												onDraftSaved={(reference) =>
													setCartSuccess({ reference, type: 'draft' })
												}
												onSubmitted={(reference) =>
													setCartSuccess({ reference, type: 'submit' })
												}
												quoteRequestItems={quoteRequestItems}
												unavailableCartItems={unavailableCartItems}
											/>
										</>
									)}
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

// --------------------------------------------------------------------------
// Cart Submit — inline auth when not signed in
// --------------------------------------------------------------------------

const RESEND_COOLDOWN = 30

type CartAuthStep = 'submit' | 'phone' | 'otp'

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

function CartSuccessMessage({
	onContinue,
	reference,
	type,
}: {
	onContinue: () => void
	reference: string
	type: 'draft' | 'submit'
}) {
	const { t } = useTranslation('website')
	const shouldReduceMotion = useReducedMotion()

	return (
		<motion.div
			key="cart-submit-success"
			role="status"
			aria-live="assertive"
			className="flex flex-1 flex-col items-center justify-center px-8 text-center"
			initial={{
				opacity: 0,
				y: shouldReduceMotion ? 0 : 10,
				scale: shouldReduceMotion ? 1 : 0.98,
			}}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
			transition={{
				duration: shouldReduceMotion ? 0.01 : 0.22,
				ease: CART_DRAWER_EASE,
			}}
		>
			<motion.div
				className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success)]/12 text-[var(--color-success)] ring-1 ring-inset ring-[var(--color-success)]/20"
				initial={{ scale: shouldReduceMotion ? 1 : 0.82 }}
				animate={{ scale: 1 }}
				transition={{
					duration: shouldReduceMotion ? 0.01 : 0.28,
					ease: CART_DRAWER_EASE,
				}}
			>
				<CircleCheck size={30} strokeWidth={1.8} aria-hidden="true" />
			</motion.div>
			<h3 className="text-[19px] font-semibold text-[var(--color-text)]">
				{type === 'draft' ? t('cart.draftSaved') : t('cart.submitSuccess')}
			</h3>
			<p className="mt-3 max-w-[300px] text-[13px] leading-6 text-[var(--color-text-muted)]">
				{type === 'draft'
					? t('cart.draftSavedBody')
					: t('cart.submitSuccessBody')}
			</p>
			<p className="mt-4 font-mono text-[12px] text-[var(--color-text-subtle)]">
				{reference}
			</p>
			<a
				href={getPortalHref('/orders')}
				className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-[var(--color-text)] px-4 text-[12px] font-semibold text-[var(--color-base)] transition-colors hover:opacity-90"
			>
				{t('nav.portal')}
			</a>
			<button
				type="button"
				onClick={onContinue}
				className="mt-3 text-[12px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
			>
				{t('cart.continueBrowsing')}
			</button>
			<p className="mt-5 text-[11px] text-[var(--color-text-subtle)]">
				{t('cart.autoClose')}
			</p>
		</motion.div>
	)
}

function CartSubmit({
	cartValidationFailed,
	cartValidationPending,
	itemCount,
	onDraftSaved,
	onSubmitted,
	quoteRequestItems,
	unavailableCartItems,
}: {
	cartValidationFailed: boolean
	cartValidationPending: boolean
	itemCount: number
	onDraftSaved: (reference: string) => void
	onSubmitted: (reference: string) => void
	quoteRequestItems: WebsiteQuoteRequestItemPayload[]
	unavailableCartItems: string[]
}) {
	const { t, i18n } = useTranslation('website')
	const navigateTo = useNavigate()
	const shouldReduceMotion = useReducedMotion()
	const [step, setStep] = useState<CartAuthStep>('submit')
	const [phone, setPhone] = useState('')
	const [code, setCode] = useState<string[]>(() => emptyOtpCode())
	const [error, setError] = useState<string | null>(null)
	const [loadingAction, setLoadingAction] = useState<
		'submit' | 'save' | 'auth' | null
	>(null)
	const [authSuccessVisible, setAuthSuccessVisible] = useState(false)
	const [draftNameEntryOpen, setDraftNameEntryOpen] = useState(false)
	const [notesOpen, setNotesOpen] = useState(false)
	const [savedOrdersOpen, setSavedOrdersOpen] = useState(false)
	const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false)
	const { resendCountdown, setResendCountdown } = useResendCountdown(0)
	const phoneRef = useRef<HTMLInputElement>(null)
	const otpRefs = useRef<(HTMLInputElement | null)[]>([])
	const authSuccessRef = useRef<HTMLDivElement>(null)
	const { clear, globalNote, items, setGlobalNote } = useQuoteCart()
	const [savedDraftFingerprint, setSavedDraftFingerprint] = useState<
		string | null
	>(null)
	const [savedDraftId, setSavedDraftId] = useState<string | null>(null)
	const defaultDraftName = getDefaultDraftName(
		t('cart.defaultDraftName'),
		i18n.language === 'ar',
	)
	const [draftName, setDraftName] = useState('')
	const [persistedDraftName, setPersistedDraftName] = useState(defaultDraftName)
	const draftFingerprint = useMemo(
		() => getQuoteCartFingerprint(items, globalNote),
		[globalNote, items],
	)
	const isDraftSaved =
		quoteRequestItems.length > 0 && savedDraftFingerprint === draftFingerprint
	const hasUnavailableCartItems = unavailableCartItems.length > 0
	const isCartValidationBlocked =
		hasUnavailableCartItems || cartValidationPending || cartValidationFailed
	const unavailableCartText = t('cart.unavailableItems', {
		items: unavailableCartItems.join(', '),
	})
	const cartValidationFailedText = t(
		'cart.validationFailed',
		'Could not confirm catalog availability. Try again.',
	)

	useEffect(() => {
		if (step === 'phone') phoneRef.current?.focus()
		if (step === 'otp') otpRefs.current[0]?.focus()
	}, [step])

	useEffect(() => {
		if (step === 'submit' && authSuccessVisible) {
			authSuccessRef.current?.focus()
		}
	}, [authSuccessVisible, step])

	async function handleSendOTP() {
		if (!EGYPT_MOBILE_REGEX.test(phone)) {
			setError(t('login.phoneInvalid'))
			return
		}
		setLoadingAction('auth')
		setAuthSuccessVisible(false)
		setError(null)
		try {
			const result = await sendOTP({ data: { phone, method: 'whatsapp' } })
			if (!result.success) {
				setError(
					result.error === 'rate_limited'
						? t('login.rateLimit')
						: t('login.sendFailed'),
				)
				return
			}
			setResendCountdown(RESEND_COOLDOWN)
			setStep('otp')
		} catch {
			setError(t('login.sendFailed'))
		} finally {
			setLoadingAction(null)
		}
	}

	const submitCode = useCallback(
		async (digits: string[]) => {
			setLoadingAction('auth')
			setError(null)
			try {
				const result = await verifyOtpCode(phone, digits)
				if (result.status === 'incomplete') return
				if (result.status === 'error') {
					setError(t('login.wrongCode'))
					resetOtpCode(otpRefs, setCode)
					return
				}
				if (result.result.needsAccount) {
					navigateTo({ to: '/login' })
					return
				}
				window.dispatchEvent(new Event('hyperquote-account-updated'))
				setAuthSuccessVisible(true)
				setStep('submit')
				resetOtpCode(otpRefs, setCode)
			} catch {
				setError(t('login.wrongCode'))
				resetOtpCode(otpRefs, setCode)
			} finally {
				setLoadingAction(null)
			}
		},
		[phone, t, navigateTo],
	)

	async function handleResend() {
		setError(null)
		setResendCountdown(RESEND_COOLDOWN)
		try {
			await sendOTP({ data: { phone, method: 'whatsapp' } })
		} catch {
			setError(t('login.sendFailed'))
		}
	}

	if (step === 'submit') {
		async function handleSubmitQuote() {
			if (
				quoteRequestItems.length === 0 ||
				isCartValidationBlocked ||
				loadingAction
			)
				return
			setSubmitConfirmOpen(false)
			setLoadingAction('submit')
			setAuthSuccessVisible(false)
			setError(null)
			try {
				const result = await submitWebsiteQuoteRequest({
					data: {
						draftId: savedDraftId ?? undefined,
						items: quoteRequestItems,
						name: draftName.trim() || persistedDraftName || defaultDraftName,
						notes: globalNote.trim() || undefined,
						idempotencyKey: crypto.randomUUID(),
					},
				})
				if (result.success) {
					onSubmitted(result.reference)
					clear()
					setSavedDraftId(null)
					window.dispatchEvent(new Event('hyperquote-account-updated'))
					return
				}
				if (result.error === 'items_unavailable') {
					setError(
						t('cart.unavailableItems', {
							items: result.unavailableItems?.join(', ') || defaultDraftName,
						}),
					)
					return
				}
				if (
					result.error === 'not_authenticated' ||
					result.error === 'customer_required'
				) {
					setAuthSuccessVisible(false)
					setStep('phone')
					return
				}
				setError(t('cart.submitFailed'))
			} catch {
				setError(t('cart.submitFailed'))
			} finally {
				setLoadingAction(null)
			}
		}

		function handleRequestSubmitQuote() {
			if (
				quoteRequestItems.length === 0 ||
				isCartValidationBlocked ||
				loadingAction
			)
				return
			setSubmitConfirmOpen(true)
		}

		async function handleConfirmSaveDraft() {
			if (
				quoteRequestItems.length === 0 ||
				isCartValidationBlocked ||
				loadingAction ||
				isDraftSaved
			)
				return
			setSubmitConfirmOpen(false)
			const nextName = draftName.trim() || defaultDraftName
			setLoadingAction('save')
			setAuthSuccessVisible(false)
			setError(null)
			try {
				const result = await saveWebsiteQuoteDraft({
					data: {
						draftId: savedDraftId ?? undefined,
						items: quoteRequestItems,
						name: nextName,
						notes: globalNote.trim() || undefined,
					},
				})
				if (result.success) {
					setDraftName(nextName)
					setPersistedDraftName(nextName)
					setDraftNameEntryOpen(false)
					setSavedDraftId(result.requestId)
					setSavedDraftFingerprint(draftFingerprint)
					onDraftSaved(result.reference)
					window.dispatchEvent(new Event('hyperquote-account-updated'))
					return
				}
				if (
					result.error === 'not_authenticated' ||
					result.error === 'customer_required'
				) {
					setAuthSuccessVisible(false)
					setStep('phone')
					return
				}
				if (result.error === 'items_unavailable') {
					setError(
						t('cart.unavailableItems', {
							items: result.unavailableItems?.join(', ') || defaultDraftName,
						}),
					)
					return
				}
				setError(t('cart.saveDraftFailed'))
			} catch {
				setError(t('cart.saveDraftFailed'))
			} finally {
				setLoadingAction(null)
			}
		}

		if (savedOrdersOpen) {
			return (
				<WebsiteSavedDraftsPanel
					onAdded={() => setSavedOrdersOpen(false)}
					onBack={() => setSavedOrdersOpen(false)}
					onAuthRequired={() => {
						setSavedOrdersOpen(false)
						setAuthSuccessVisible(false)
						setStep('phone')
					}}
				/>
			)
		}

		const notesRailY = notesOpen ? CART_NOTES_RAIL_OPEN_Y : 0

		return (
			<div className="relative px-4 pt-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
				<motion.div
					aria-hidden="true"
					className="absolute inset-x-0 top-0 z-10 h-px bg-[var(--color-border)]"
					initial={false}
					animate={{ y: notesRailY }}
					transition={cartTransition(shouldReduceMotion, 0.2)}
				/>
				<AnimatePresence initial={false}>
					{authSuccessVisible && (
						<motion.div
							ref={authSuccessRef}
							tabIndex={-1}
							role="status"
							aria-live="polite"
							className="mb-3 rounded-xl border border-[var(--color-success)]/25 bg-[var(--color-success)]/10 px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-success)]/35"
							initial={{
								opacity: 0,
								y: shouldReduceMotion ? 0 : 8,
								scale: shouldReduceMotion ? 1 : 0.98,
							}}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{
								opacity: 0,
								y: shouldReduceMotion ? 0 : -6,
								scale: shouldReduceMotion ? 1 : 0.98,
							}}
							transition={cartTransition(shouldReduceMotion, 0.2)}
						>
							<div className="flex items-start gap-2.5">
								<motion.span
									initial={{ scale: shouldReduceMotion ? 1 : 0.8 }}
									animate={{ scale: 1 }}
									transition={cartTransition(shouldReduceMotion, 0.22)}
									className="mt-0.5 shrink-0 text-[var(--color-success)]"
								>
									<CircleCheck size={17} strokeWidth={1.8} aria-hidden="true" />
								</motion.span>
								<div className="min-w-0 text-start">
									<p className="text-[13px] font-semibold text-[var(--color-text)]">
										{t('cart.authSuccessTitle')}
									</p>
									<p className="mt-0.5 text-[11px] leading-5 text-[var(--color-text-muted)]">
										{t('cart.authSuccessBody')}
									</p>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
				<motion.button
					type="button"
					onClick={() => setNotesOpen((value) => !value)}
					className={`absolute -top-5 end-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border bg-[var(--color-base)] shadow-sm transition-colors ${
						notesOpen
							? 'border-[var(--color-primary)] text-[var(--color-primary)]'
							: 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
					}`}
					aria-label={t('cart.notes')}
					aria-expanded={notesOpen}
					aria-pressed={notesOpen}
					initial={false}
					animate={{ y: notesRailY }}
					whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
					transition={cartTransition(shouldReduceMotion, 0.2)}
				>
					<StickyNote size={16} strokeWidth={1.8} />
				</motion.button>
				<AnimatePresence initial={false}>
					{notesOpen && (
						<motion.div
							key="cart-notes"
							className="absolute inset-x-4 top-0 z-10"
							{...cartNotesPanelMotion(shouldReduceMotion)}
						>
							<label className="block">
								<span className="sr-only">{t('cart.notes')}</span>
								<textarea
									value={globalNote}
									onChange={(event) => setGlobalNote(event.currentTarget.value)}
									rows={3}
									placeholder={t('cart.notesPlaceholder')}
									className="block max-h-32 min-h-20 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] leading-5 text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]"
								/>
							</label>
						</motion.div>
					)}
				</AnimatePresence>

				<AnimatePresence initial={false}>
					{submitConfirmOpen && (
						<motion.div
							key="submit-confirm"
							className="mt-3 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
							{...cartRevealMotion(shouldReduceMotion)}
						>
							<p className="text-[13px] font-semibold text-[var(--color-text)]">
								{t('cart.confirmSubmitTitle')}
							</p>
							<p className="mt-1 text-[12px] leading-5 text-[var(--color-text-muted)]">
								{t('cart.confirmSubmitBody')}
							</p>
							<div className="mt-3 grid grid-cols-2 gap-2">
								<motion.button
									type="button"
									onClick={() => setSubmitConfirmOpen(false)}
									className="flex h-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-base)]"
									whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
								>
									{t('cart.cancel')}
								</motion.button>
								<motion.button
									type="button"
									onClick={handleSubmitQuote}
									disabled={isCartValidationBlocked}
									className="flex h-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-[12px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:pointer-events-none disabled:opacity-50"
									whileTap={
										shouldReduceMotion || isCartValidationBlocked
											? undefined
											: { scale: 0.98 }
									}
								>
									{t('cart.confirmSubmitAction')}
								</motion.button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				<AnimatePresence initial={false}>
					{draftNameEntryOpen && !isDraftSaved && (
						<motion.div
							key="draft-name-entry"
							className="mt-2 flex items-center gap-2 overflow-hidden"
							{...cartRevealMotion(shouldReduceMotion)}
						>
							<input
								type="text"
								value={draftName}
								onChange={(event) => setDraftName(event.currentTarget.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault()
										handleConfirmSaveDraft()
									}
								}}
								maxLength={120}
								aria-label={t('cart.draftNameLabel')}
								placeholder={defaultDraftName}
								className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-[13px] font-semibold text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]"
							/>
						</motion.div>
					)}
				</AnimatePresence>

				<div className="mt-3 grid grid-cols-[minmax(0,1fr)_2.5rem_2.5rem] gap-2">
					<motion.button
						type="button"
						onClick={handleRequestSubmitQuote}
						disabled={
							loadingAction !== null ||
							quoteRequestItems.length === 0 ||
							isCartValidationBlocked
						}
						className="flex h-10 min-w-0 items-center justify-center rounded-lg bg-[var(--color-primary)] px-3 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:pointer-events-none disabled:opacity-70"
						whileTap={
							shouldReduceMotion ||
							loadingAction !== null ||
							isCartValidationBlocked
								? undefined
								: { scale: 0.985 }
						}
						transition={cartTransition(shouldReduceMotion, 0.16)}
					>
						<span className="truncate">
							{loadingAction === 'submit'
								? t('cart.submitting')
								: `${t('cart.submit')} — ${t('cart.itemCount', { count: itemCount })}`}
						</span>
					</motion.button>
					<motion.button
						type="button"
						onClick={() => setSavedOrdersOpen(true)}
						className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
						aria-label={t('cart.viewSavedOrders')}
						whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
						transition={cartTransition(shouldReduceMotion, 0.16)}
					>
						<FileText size={16} strokeWidth={1.8} />
					</motion.button>
					<motion.button
						type="button"
						onClick={() => {
							if (isDraftSaved) return
							if (draftNameEntryOpen) {
								handleConfirmSaveDraft()
								return
							}
							setDraftName(savedDraftId ? persistedDraftName : '')
							setDraftNameEntryOpen(true)
						}}
						disabled={
							loadingAction !== null ||
							quoteRequestItems.length === 0 ||
							isCartValidationBlocked ||
							isDraftSaved
						}
						title={isDraftSaved ? persistedDraftName : undefined}
						className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors disabled:pointer-events-none ${
							draftNameEntryOpen && !isDraftSaved
								? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500'
								: 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] disabled:bg-[var(--color-surface)] disabled:text-[var(--color-text-subtle)] disabled:opacity-60'
						}`}
						aria-label={isDraftSaved ? persistedDraftName : t('cart.saveDraft')}
						whileTap={
							shouldReduceMotion ||
							loadingAction !== null ||
							isCartValidationBlocked ||
							isDraftSaved
								? undefined
								: { scale: 0.94 }
						}
						transition={cartTransition(shouldReduceMotion, 0.16)}
					>
						{loadingAction === 'save' ? (
							<span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
						) : (
							<Save size={16} strokeWidth={1.8} />
						)}
					</motion.button>
				</div>
				{error && (
					<p className="mt-2 text-center text-[11px] text-[var(--color-error)]">
						{error}
					</p>
				)}
				{hasUnavailableCartItems && (
					<p className="mt-2 text-center text-[11px] text-[var(--color-error)]">
						{unavailableCartText}
					</p>
				)}
				{cartValidationFailed && (
					<p className="mt-2 text-center text-[11px] text-[var(--color-error)]">
						{cartValidationFailedText}
					</p>
				)}
				<p className="text-[11px] text-[var(--color-text-subtle)] text-center mt-2">
					{t('cart.submitHint')}
				</p>
			</div>
		)
	}

	if (step === 'phone') {
		return (
			<div className="px-4 py-3 border-t border-[var(--color-border)]">
				<div className="flex items-center gap-2 mb-3">
					<button
						type="button"
						onClick={() => {
							setStep('submit')
							setError(null)
						}}
						className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
					>
						<ArrowLeft size={14} />
					</button>
					<span className="text-[13px] font-medium text-[var(--color-text)]">
						{t('login.step1.heading')}
					</span>
				</div>
				<PhoneNumberInput
					inputRef={phoneRef}
					ariaLabel={t('login.phoneLabel')}
					value={phone}
					onChange={(nextPhone) => {
						setPhone(nextPhone)
						if (error) setError(null)
					}}
					onEnter={handleSendOTP}
					variant="compact"
				/>
				{error && (
					<p className="mt-2 text-[11px] text-[var(--color-error)]">{error}</p>
				)}
				<button
					type="button"
					onClick={handleSendOTP}
					disabled={loadingAction !== null}
					className="mt-3 w-full h-9 rounded-lg bg-[#25D366] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
				>
					{loadingAction === 'auth' ? (
						<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
					) : (
						<>
							<MessageCircle size={14} aria-hidden="true" />
							{t('login.whatsappCTA')}
						</>
					)}
				</button>
			</div>
		)
	}

	return (
		<div className="px-4 py-3 border-t border-[var(--color-border)]">
			<div className="flex items-center gap-2 mb-3">
				<button
					type="button"
					onClick={() => {
						setStep('phone')
						setError(null)
						resetOtpCode(otpRefs, setCode)
					}}
					className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
				>
					<ArrowLeft size={14} />
				</button>
				<span className="text-[13px] font-medium text-[var(--color-text)]">
					{t('login.step2.heading')}
				</span>
				<span className="font-mono text-[11px] text-[var(--color-text-subtle)] ms-auto">
					{EGYPT_COUNTRY_CODE}
					{phone}
				</span>
			</div>
			<OtpCodeInput
				code={code}
				onCodeChange={setCode}
				onComplete={submitCode}
				inputRefs={otpRefs}
				disabled={loadingAction !== null}
				ariaLabel={(index) => t('login.otpDigit', { n: index + 1 })}
				variant="compact"
			/>
			{error && (
				<p className="mt-2 text-center text-[11px] text-[var(--color-error)]">
					{error}
				</p>
			)}
			{loadingAction === 'auth' && (
				<div className="mt-2 flex justify-center">
					<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]" />
				</div>
			)}
			<OtpResendControl
				countdown={resendCountdown}
				onResend={handleResend}
				variant="compact"
			/>
		</div>
	)
}
