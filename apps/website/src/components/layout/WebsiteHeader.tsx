import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
	ArrowLeft,
	Menu,
	MessageCircle,
	Minus,
	Plus,
	ShoppingCart,
	X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuoteCart } from '../../hooks/useQuoteCart'
import { useScrolled } from '../../hooks/useScrolled'
import { sendOTP } from '../../lib/auth'
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
import { LanguageToggle } from './LanguageToggle'
import { MobileNavOverlay } from './MobileNavOverlay'
import { ThemeToggle } from './ThemeToggle'

export function WebsiteHeader() {
	const { t } = useTranslation('website')
	const scrolled = useScrolled(8)
	const [mobileNavOpen, setMobileNavOpen] = useState(false)
	const [cartOpen, setCartOpen] = useState(false)
	const [atPageBottom, setAtPageBottom] = useState(false)
	const { items, updateQuantity, remove } = useQuoteCart()
	const navigateTo = useNavigate()
	const routerState = useRouterState()
	const isHome = routerState.location.pathname === '/'
	const wasHome = useRef(isHome)
	const [introDone, setIntroDone] = useState(!isHome)

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
					<button
						type="button"
						onClick={() => navigateTo({ to: '/login' })}
						className="hidden md:inline-flex items-center justify-center w-[100px] ms-2 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
					>
						{t('login.step1.heading')}
					</button>
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

			{/* Cart dropdown panel */}
			{cartOpen && (
				<>
					<button
						type="button"
						aria-label={t('a11y.close')}
						className="fixed inset-0 z-45 bg-black/20 backdrop-blur-[2px]"
						onClick={() => setCartOpen(false)}
					/>
					<div className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden border border-[var(--color-text)]/[0.06] bg-[var(--color-base)] shadow-[0_24px_80px_rgba(0,0,0,0.12)] md:inset-auto md:top-16 md:right-4 md:max-h-[calc(100dvh-5rem)] md:w-[420px] md:rounded-2xl">
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
								<X size={15} />
							</button>
						</div>

						{/* Items */}
						{items.length === 0 ? (
							<div className="flex flex-1 flex-col items-center justify-center px-8 pb-10 pt-4 text-center md:block md:flex-none md:px-5 md:pb-6">
								<p className="text-[13px] text-[var(--color-text-muted)] mb-4">
									{t('cart.empty')}
								</p>
								<Link
									to="/market"
									onClick={() => setCartOpen(false)}
									className="text-[13px] font-medium text-[var(--color-primary)]"
								>
									{t('cart.browseCta')}
								</Link>
							</div>
						) : (
							<>
								<div className="flex-1 overflow-y-auto">
									{items.map((item, idx) => (
										<div
											key={item.productId}
											className={`px-5 py-4 ${idx > 0 ? 'border-t border-[var(--color-text)]/[0.04]' : ''}`}
										>
											{/* Name + remove */}
											<div className="flex items-start gap-3">
												{item.imageUrl && (
													<img
														src={item.imageUrl}
														alt=""
														className="h-11 w-11 shrink-0 rounded-lg bg-[var(--color-surface)] object-cover"
													/>
												)}
												<div className="min-w-0 flex-1">
													<Link
														to="/market/$productSlug"
														params={{ productSlug: item.slug }}
														onClick={() => setCartOpen(false)}
														className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--color-text)] transition-colors hover:text-[var(--color-primary)]"
													>
														{item.name}
													</Link>
												</div>
												<button
													type="button"
													onClick={() => remove(item.productId)}
													className="text-[var(--color-text-subtle)] hover:text-[var(--color-error)] transition-colors shrink-0 mt-0.5"
													aria-label={t('cart.remove')}
												>
													<X size={13} />
												</button>
											</div>

											{/* Unified stepper — matches product page */}
											<div className="flex items-center rounded-xl border border-[var(--color-text)]/[0.06] bg-[var(--color-surface)] overflow-hidden mt-3 h-10">
												<button
													type="button"
													onClick={() =>
														updateQuantity(item.productId, item.quantity - 1)
													}
													className="w-10 h-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors border-e border-[var(--color-text)]/[0.06]"
												>
													<Minus size={13} />
												</button>
												<div className="flex flex-1 items-center justify-center gap-2">
													<input
														type="number"
														value={item.quantity}
														onChange={(e) => {
															const v = parseInt(e.target.value, 10)
															if (!Number.isNaN(v) && v >= 0)
																updateQuantity(item.productId, v)
														}}
														className="w-12 bg-transparent text-center font-mono text-[15px] font-semibold text-[var(--color-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
														min={1}
													/>
													<span className="text-[12px] text-[var(--color-text-subtle)]">
														{t(
															`units.${item.unitOfMeasure}`,
															item.unitOfMeasure,
														)}
													</span>
												</div>
												<button
													type="button"
													onClick={() =>
														updateQuantity(item.productId, item.quantity + 1)
													}
													className="w-10 h-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors border-s border-[var(--color-text)]/[0.06]"
												>
													<Plus size={13} />
												</button>
											</div>
										</div>
									))}
								</div>

								{/* Submit / Inline Auth */}
								<CartSubmit itemCount={items.length} />
							</>
						)}
					</div>
				</>
			)}

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

function CartSubmit({ itemCount }: { itemCount: number }) {
	const { t } = useTranslation('website')
	const [step, setStep] = useState<CartAuthStep>('submit')
	const [phone, setPhone] = useState('')
	const [code, setCode] = useState<string[]>(() => emptyOtpCode())
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const { resendCountdown, setResendCountdown } = useResendCountdown(0)
	const phoneRef = useRef<HTMLInputElement>(null)
	const otpRefs = useRef<(HTMLInputElement | null)[]>([])

	useEffect(() => {
		if (step === 'phone') phoneRef.current?.focus()
		if (step === 'otp') otpRefs.current[0]?.focus()
	}, [step])

	async function handleSendOTP() {
		if (!EGYPT_MOBILE_REGEX.test(phone)) {
			setError(t('login.phoneInvalid'))
			return
		}
		setLoading(true)
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
			setLoading(false)
		}
	}

	const submitCode = useCallback(
		async (digits: string[]) => {
			setLoading(true)
			setError(null)
			try {
				const result = await verifyOtpCode(phone, digits)
				if (result.status === 'incomplete') return
				if (result.status === 'error') {
					setError(t('login.wrongCode'))
					resetOtpCode(otpRefs, setCode)
					return
				}
				window.location.reload()
			} catch {
				setError(t('login.wrongCode'))
				resetOtpCode(otpRefs, setCode)
			} finally {
				setLoading(false)
			}
		},
		[phone, t],
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
		return (
			<div className="border-t border-[var(--color-border)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
				<button
					type="button"
					onClick={() => setStep('phone')}
					className="w-full h-10 rounded-lg bg-[var(--color-primary)] text-white font-semibold text-[14px] hover:bg-[var(--color-primary-hover)] transition-colors"
				>
					{t('cart.submit')} — {t('cart.itemCount', { count: itemCount })}
				</button>
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
					disabled={loading}
					className="mt-3 w-full h-9 rounded-lg bg-[#25D366] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
				>
					{loading ? (
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
				disabled={loading}
				ariaLabel={(index) => t('login.otpDigit', { n: index + 1 })}
				variant="compact"
			/>
			{error && (
				<p className="mt-2 text-center text-[11px] text-[var(--color-error)]">
					{error}
				</p>
			)}
			{loading && (
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
