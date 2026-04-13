import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Menu, ShoppingCart, X, Minus, Plus, Trash2, Copy, StickyNote, ChevronDown, ArrowLeft, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useScrolled } from '../../hooks/useScrolled'
import { LanguageToggle } from './LanguageToggle'
import { ThemeToggle } from './ThemeToggle'
import { MobileNavOverlay } from './MobileNavOverlay'
import { useQuoteCart } from '../../hooks/useQuoteCart'
import { useNavigate } from '@tanstack/react-router'
import { sendOTP, verifyOTP } from '../../lib/auth'

export function WebsiteHeader() {
	const { t } = useTranslation('website')
	const scrolled = useScrolled(8)
	const [mobileNavOpen, setMobileNavOpen] = useState(false)
	const [cartOpen, setCartOpen] = useState(false)
	const [isDark, setIsDark] = useState(false)
	const { items, updateQuantity, updateNote, remove, clear, duplicate, globalNote, setGlobalNote } = useQuoteCart()
	const navigateTo = useNavigate()
	const [showGlobalNote, setShowGlobalNote] = useState(false)
	const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
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
		function checkTheme() {
			setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
		}
		checkTheme()
		const observer = new MutationObserver(checkTheme)
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme'],
		})
		return () => observer.disconnect()
	}, [])

	const navLinkClass =
		'text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors'
	const navLinkActiveClass =
		'text-sm font-medium text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] pb-1'

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
						onClick={() => document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' })}
						className="pointer-events-auto transition-transform duration-700 ease-out"
						style={{
							transform: scrolled ? 'translateY(-100%)' : 'translateY(0)',
						}}
					>
						<span className="text-[20px] max-md:text-[17px] font-extrabold tracking-[-0.02em] text-[var(--color-text)] block overflow-hidden">
							<span className="block" style={{
								transform: introDone && !scrolled ? 'translateY(0)' : 'translateY(110%)',
								transition: introDone ? 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1) 0.15s' : 'none',
							}}>HyperQuote</span>
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
					transform: heroMode ? 'translateY(-100%)' : 'translateY(0)',
				}}
			>
				{/* Logo */}
				{isHome ? (
					<button
						type="button"
						onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
						className="flex items-center gap-3"
					>
						<span className="text-[20px] max-md:text-[17px] font-extrabold tracking-[-0.02em] text-white">
							HyperQuote
						</span>
					</button>
				) : (
					<Link to="/" aria-label={t('a11y.home')} className="flex items-center gap-3">
						<span className="text-[20px] max-md:text-[17px] font-extrabold tracking-[-0.02em] text-white">
							HyperQuote
						</span>
					</Link>
				)}

				{/* Desktop Nav — absolute center, unaffected by siblings */}
				<nav className="hidden md:flex items-center gap-6 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
					<Link to="/market" className={navLinkClass} activeProps={{ className: navLinkActiveClass }}>
						{t('nav.market')}
					</Link>
					<Link to="/about" className={navLinkClass} activeProps={{ className: navLinkActiveClass }}>
						{t('nav.about')}
					</Link>
					<Link to="/support" className={navLinkClass} activeProps={{ className: navLinkActiveClass }}>
						{t('nav.support')}
					</Link>
					<Link to="/docs" className={navLinkClass} activeProps={{ className: navLinkActiveClass }}>
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
						<ShoppingCart size={18} className="text-[var(--color-text-muted)]" />
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
						className="md:hidden p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
					>
						<Menu size={24} />
					</button>
				</div>
			</header>

			{/* Cart dropdown panel */}
			{cartOpen && (
				<>
					<div
						className="fixed inset-0 z-45 bg-black/20 backdrop-blur-[2px]"
						onClick={() => setCartOpen(false)}
						onKeyDown={() => {}}
						role="presentation"
					/>
					<div className="fixed top-14 right-4 z-50 w-[360px] max-h-[75vh] bg-[var(--color-base)] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col border border-[var(--color-text)]/[0.06]">
						{/* Header */}
						<div className="flex items-center justify-between px-5 pt-5 pb-4">
							<span className="text-[15px] font-semibold text-[var(--color-text)]">
								{t('cart.title')}
							</span>
							<button type="button" onClick={() => setCartOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors">
								<X size={15} />
							</button>
						</div>

						{/* Items */}
						{items.length === 0 ? (
							<div className="px-5 pb-6 pt-4 text-center">
								<p className="text-[13px] text-[var(--color-text-muted)] mb-4">{t('cart.empty')}</p>
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
										<div key={item.productId} className={`px-5 py-4 ${idx > 0 ? 'border-t border-[var(--color-text)]/[0.04]' : ''}`}>
											{/* Name + remove */}
											<div className="flex items-start justify-between gap-3">
												<Link to="/market/$productSlug" params={{ productSlug: item.slug }} onClick={() => setCartOpen(false)} className="text-[13px] font-medium text-[var(--color-text)] line-clamp-1 hover:text-[var(--color-primary)] transition-colors">
													{item.name}
												</Link>
												<button type="button" onClick={() => remove(item.productId)} className="text-[var(--color-text-subtle)] hover:text-[var(--color-error)] transition-colors shrink-0 mt-0.5">
													<X size={13} />
												</button>
											</div>

											{/* Unified stepper — matches product page */}
											<div className="flex items-center rounded-xl border border-[var(--color-text)]/[0.06] bg-[var(--color-surface)] overflow-hidden mt-3 h-10">
												<button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-10 h-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors border-e border-[var(--color-text)]/[0.06]">
													<Minus size={13} />
												</button>
												<div className="flex flex-1 items-center justify-center gap-2">
													<input
														type="number"
														value={item.quantity}
														onChange={(e) => {
															const v = parseInt(e.target.value, 10)
															if (!isNaN(v) && v >= 0) updateQuantity(item.productId, v)
														}}
														className="w-12 bg-transparent text-center font-mono text-[15px] font-semibold text-[var(--color-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
														min={1}
													/>
													<span className="text-[12px] text-[var(--color-text-subtle)]">
														{t(`units.${item.unitOfMeasure}`, item.unitOfMeasure)}
													</span>
												</div>
												<button type="button" onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-10 h-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors border-s border-[var(--color-text)]/[0.06]">
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

const PHONE_REGEX = /^(10|11|12|15)\d{8}$/
const OTP_LENGTH = 6
const RESEND_COOLDOWN = 30

type CartAuthStep = 'submit' | 'phone' | 'otp'

function CartSubmit({ itemCount }: { itemCount: number }) {
	const { t } = useTranslation('website')
	const [step, setStep] = useState<CartAuthStep>('submit')
	const [phone, setPhone] = useState('')
	const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''))
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [resendCountdown, setResendCountdown] = useState(0)
	const phoneRef = useRef<HTMLInputElement>(null)
	const otpRefs = useRef<(HTMLInputElement | null)[]>([])

	useEffect(() => {
		if (resendCountdown <= 0) return
		const timer = setInterval(() => setResendCountdown((p) => Math.max(0, p - 1)), 1000)
		return () => clearInterval(timer)
	}, [resendCountdown])

	useEffect(() => {
		if (step === 'phone') phoneRef.current?.focus()
		if (step === 'otp') otpRefs.current[0]?.focus()
	}, [step])

	async function handleSendOTP() {
		if (!PHONE_REGEX.test(phone)) { setError(t('login.phoneInvalid')); return }
		setLoading(true); setError(null)
		try {
			const result = await sendOTP({ data: { phone, method: 'whatsapp' } })
			if (!result.success) { setError(result.error === 'rate_limited' ? t('login.rateLimit') : t('login.sendFailed')); return }
			setResendCountdown(RESEND_COOLDOWN)
			setStep('otp')
		} catch { setError(t('login.sendFailed')) }
		finally { setLoading(false) }
	}

	const submitCode = useCallback(async (digits: string[]) => {
		const fullCode = digits.join('')
		if (fullCode.length !== OTP_LENGTH) return
		setLoading(true); setError(null)
		try {
			const result = await verifyOTP({ data: { phone, code: fullCode } })
			if (!result.success) {
				setError(t('login.wrongCode'))
				setCode(Array(OTP_LENGTH).fill(''))
				otpRefs.current[0]?.focus()
				return
			}
			window.location.reload()
		} catch {
			setError(t('login.wrongCode'))
			setCode(Array(OTP_LENGTH).fill(''))
			otpRefs.current[0]?.focus()
		} finally { setLoading(false) }
	}, [phone, t])

	function handleOTPInput(index: number, value: string) {
		const digit = value.replace(/\D/g, '').slice(-1)
		const newCode = [...code]
		newCode[index] = digit
		setCode(newCode)
		if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus()
		if (digit && newCode.every((d) => d !== '')) submitCode(newCode)
	}

	function handleOTPKeyDown(index: number, e: React.KeyboardEvent) {
		if (e.key === 'Backspace' && !code[index] && index > 0) otpRefs.current[index - 1]?.focus()
	}

	function handleOTPPaste(e: React.ClipboardEvent) {
		e.preventDefault()
		const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
		if (!pasted.length) return
		const chars = pasted.slice(0, OTP_LENGTH).split('')
		const newCode = [...code]
		for (let i = 0; i < chars.length; i++) newCode[i] = chars[i]
		setCode(newCode)
		const next = newCode.findIndex((d) => !d)
		if (next >= 0) otpRefs.current[next]?.focus()
		else { otpRefs.current[OTP_LENGTH - 1]?.focus(); submitCode(newCode) }
	}

	async function handleResend() {
		setError(null); setResendCountdown(RESEND_COOLDOWN)
		try { await sendOTP({ data: { phone, method: 'whatsapp' } }) }
		catch { setError(t('login.sendFailed')) }
	}

	if (step === 'submit') {
		return (
			<div className="px-4 py-3 border-t border-[var(--color-border)]">
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
					<button type="button" onClick={() => { setStep('submit'); setError(null) }} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
						<ArrowLeft size={14} />
					</button>
					<span className="text-[13px] font-medium text-[var(--color-text)]">{t('login.step1.heading')}</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="flex h-9 items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-[12px] text-[var(--color-text-muted)] shrink-0">
						<span aria-hidden>🇪🇬</span>
						<span className="font-mono">+20</span>
					</span>
					<input
						ref={phoneRef}
						type="tel"
						inputMode="numeric"
						value={phone}
						onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); if (error) setError(null) }}
						onKeyDown={(e) => { if (e.key === 'Enter') handleSendOTP() }}
						className="h-9 flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-3 font-mono text-[14px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
					/>
				</div>
				{error && <p className="mt-2 text-[11px] text-[var(--color-error)]">{error}</p>}
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
							<svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
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
				<button type="button" onClick={() => { setStep('phone'); setError(null); setCode(Array(OTP_LENGTH).fill('')) }} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
					<ArrowLeft size={14} />
				</button>
				<span className="text-[13px] font-medium text-[var(--color-text)]">{t('login.step2.heading')}</span>
				<span className="font-mono text-[11px] text-[var(--color-text-subtle)] ms-auto">+20{phone}</span>
			</div>
			<div dir="ltr" className="flex justify-center gap-1.5" onPaste={handleOTPPaste}>
				{Array.from({ length: OTP_LENGTH }).map((_, i) => (
					<input
						key={i}
						ref={(el) => { otpRefs.current[i] = el }}
						type="tel"
						inputMode="numeric"
						maxLength={1}
						value={code[i]}
						onChange={(e) => handleOTPInput(i, e.target.value)}
						onKeyDown={(e) => handleOTPKeyDown(i, e)}
						disabled={loading}
						className="h-9 w-9 rounded-lg border border-[var(--color-border)] bg-transparent text-center font-mono text-[15px] font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
					/>
				))}
			</div>
			{error && <p className="mt-2 text-center text-[11px] text-[var(--color-error)]">{error}</p>}
			{loading && (
				<div className="mt-2 flex justify-center">
					<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]" />
				</div>
			)}
			<div className="mt-2 text-center text-[11px]">
				{resendCountdown > 0 ? (
					<span className="text-[var(--color-text-subtle)]">{t('login.resendIn')} <span className="font-mono">{resendCountdown}s</span></span>
				) : (
					<button type="button" onClick={handleResend} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">{t('login.resend')}</button>
				)}
			</div>
		</div>
	)
}
