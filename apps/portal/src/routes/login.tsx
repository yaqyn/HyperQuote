import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { AtelierScene } from '../components/atelier/AtelierScene'
import { WaxSeal } from '../components/atelier/WaxSeal'
import {
	checkSession,
	claimAccount,
	createAccount,
	sendOTP,
	verifyOTP,
} from '../lib/auth'
import { usePortalStore } from '../stores/portal'

// ============================================================================
// Route
// ============================================================================

export const Route = createFileRoute('/login')({
	validateSearch: z.object({
		redirect: z.string().optional(),
	}),
	beforeLoad: async () => {
		const result = await checkSession()
		if (result.authenticated) {
			throw new Response(null, {
				status: 302,
				headers: { Location: '/' },
			})
		}
	},
	component: LoginPage,
})

// ============================================================================
// Types
// ============================================================================

type AuthStep = 'phone' | 'otp' | 'create' | 'claiming' | 'farewell'
type Stage = 'dark' | 'logo' | 'scene' | 'leaving'

// ============================================================================
// Helpers
// ============================================================================

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
	day: '2-digit',
	month: 'short',
	year: 'numeric',
})

function formatToday(): string {
	return DATE_FORMATTER.format(new Date()).toUpperCase()
}

// ============================================================================
// Login Page — THE ATELIER
// ============================================================================
//
// A small broker's office at night. A single pendant lights the desk.
// On the desk sits an open order book. The login IS a page in the book,
// not a card on a backdrop. Every detail serves that metaphor.

function LoginPage() {
	const navigate = useNavigate()
	const search = useSearch({ from: '/login' })
	const [step, setStep] = useState<AuthStep>('phone')
	const [phone, setPhone] = useState('')
	const [claimableCompany, setClaimableCompany] = useState<string | null>(null)
	const [stage, setStage] = useState<Stage>('dark')

	const setSigningOut = usePortalStore((s) => s.setSigningOut)
	useEffect(() => {
		setSigningOut(false)
	}, [setSigningOut])

	useEffect(() => {
		const t1 = setTimeout(() => setStage('logo'), 300)
		const t2 = setTimeout(() => setStage('scene'), 1700)
		return () => {
			clearTimeout(t1)
			clearTimeout(t2)
		}
	}, [])

	function handleAuthComplete(redirectPath?: string) {
		const target = search.redirect ?? redirectPath ?? '/'
		setStage('leaving')
		// Wait for the full-room fade to complete (1.2s) before navigating —
		// the user sees the atelier dissolve completely before the portal blooms.
		setTimeout(() => navigate({ to: target }), 1300)
	}

	const showScene = stage === 'scene' || stage === 'leaving'

	const leaving = stage === 'leaving'

	return (
		<motion.div
			className="atelier-scene relative min-h-dvh w-full overflow-hidden"
			animate={{ opacity: leaving ? 0 : 1 }}
			transition={{ duration: leaving ? 1.2 : 0, ease: 'easeInOut' }}
		>
			<div className="atelier-vignette" />

			<div className="relative flex min-h-dvh w-full items-center justify-center">
				<AnimatePresence mode="wait">
					{stage === 'logo' && (
						<motion.div
							key="logo"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.6, ease: 'easeOut' }}
							className="relative z-20"
						>
							<img
								src="/brand/LyonWhite.svg"
								alt="HyperQuote"
								className="h-24 w-24 opacity-90 md:h-28 md:w-28"
								draggable={false}
							/>
						</motion.div>
					)}

					{showScene && (
						<motion.div
							key="scene"
							initial={{ opacity: 0 }}
							animate={{ opacity: stage === 'leaving' ? 0 : 1 }}
							transition={{
								duration: stage === 'leaving' ? 0.7 : 0.9,
								ease: 'easeOut',
							}}
							className="absolute inset-0"
						>
							<AtelierScene lit>
								<OrderBookPage>
									<AutoHeight>
										<AnimatePresence mode="wait" initial={false}>
											{step === 'phone' && (
												<StepFrame key="phone">
													<PhoneStep
														phone={phone}
														setPhone={setPhone}
														onNext={() => setStep('otp')}
													/>
												</StepFrame>
											)}
											{step === 'otp' && (
												<StepFrame key="otp">
													<OTPStep
														phone={phone}
														onVerified={(result) => {
															if (result.claimableCompany) {
																setClaimableCompany(result.claimableCompany)
																setStep('claiming')
															} else if (result.needsAccount) {
																setStep('create')
															} else {
																handleAuthComplete()
															}
														}}
														onBack={() => setStep('phone')}
													/>
												</StepFrame>
											)}
											{step === 'create' && (
												<StepFrame key="create">
													<AccountCreationStep
														phone={phone}
														onComplete={() => setStep('farewell')}
													/>
												</StepFrame>
											)}
											{step === 'claiming' && (
												<StepFrame key="claiming">
													<AccountClaimingStep
														phone={phone}
														claimableCompany={claimableCompany}
														onComplete={() => setStep('farewell')}
														onCreateNew={() => setStep('create')}
													/>
												</StepFrame>
											)}
											{step === 'farewell' && (
												<StepFrame key="farewell">
													<FarewellStep onDone={() => handleAuthComplete()} />
												</StepFrame>
											)}
										</AnimatePresence>
									</AutoHeight>
								</OrderBookPage>
							</AtelierScene>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{showScene && <LegalFooter leaving={stage === 'leaving'} />}
		</motion.div>
	)
}

// ============================================================================
// Order Book Page — shared chrome around every step
// ============================================================================

function OrderBookPage({ children }: { children: ReactNode }) {
	const { t } = useTranslation('portal')
	return (
		<div className="atelier-page atelier-page-enter">
			<p className="atelier-mono text-center text-[10px] uppercase tracking-[0.32em] text-[var(--atelier-ink-faint)]">
				{t('login.atelier.caption', 'Lyon · Broker of Record · Est. 2026')}
			</p>

			<div className="atelier-rule-draw mt-3 h-px origin-left bg-[var(--atelier-rule)]" />

			<div className="relative mt-6">{children}</div>

			<div className="mt-6 h-px bg-[var(--atelier-rule)]" />

			<div className="mt-3 flex items-baseline justify-between gap-3">
				<p className="atelier-mono text-[10px] uppercase tracking-[0.18em] text-[var(--atelier-ink-faint)]">
					{t('login.atelier.pageNo', 'No. 0001')}
				</p>
				<p className="atelier-mono text-[10px] uppercase tracking-[0.18em] text-[var(--atelier-ink-faint)]">
					{formatToday()}
				</p>
				<p className="atelier-serif text-[13px] italic leading-none text-[var(--atelier-ink-muted)]">
					{t('login.atelier.signature', 'Prepared by L.')}
				</p>
			</div>
		</div>
	)
}

// ============================================================================
// Auto-height animated container — smooths height changes between steps
// ============================================================================

function AutoHeight({ children }: { children: ReactNode }) {
	const contentRef = useRef<HTMLDivElement>(null)
	const [height, setHeight] = useState<number | 'auto'>('auto')

	useEffect(() => {
		const el = contentRef.current
		if (!el) return
		const ro = new ResizeObserver(() => {
			setHeight(el.scrollHeight)
		})
		ro.observe(el)
		return () => ro.disconnect()
	}, [])

	return (
		<motion.div
			animate={{ height }}
			transition={{ duration: 0.4, ease: 'easeOut' }}
			style={{ overflow: 'hidden' }}
		>
			<div ref={contentRef}>{children}</div>
		</motion.div>
	)
}

// ============================================================================
// Step frame — slide + ink-compose transition between pages
// ============================================================================

function StepFrame({ children }: { children: ReactNode }) {
	return (
		<motion.div
			initial={{ opacity: 0, x: 18 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -20, filter: 'blur(1.5px)' }}
			transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
		>
			{children}
		</motion.div>
	)
}

// ============================================================================
// Phone Step — "Who shall I prepare this for?"
// ============================================================================

function PhoneStep({
	phone,
	setPhone,
	onNext,
}: {
	phone: string
	setPhone: (v: string) => void
	onNext: () => void
}) {
	const { t } = useTranslation('portal')
	const [hintKey, setHintKey] = useState(0)
	const [loading, setLoading] = useState(false)
	const [sendingMethod, setSendingMethod] = useState<'whatsapp' | 'sms' | null>(
		null,
	)
	const inputRef = useRef<HTMLInputElement | null>(null)

	function triggerHint() {
		setHintKey((k) => k + 1)
		inputRef.current?.focus()
	}

	useEffect(() => {
		const id = setTimeout(() => inputRef.current?.focus(), 150)
		return () => clearTimeout(id)
	}, [])

	const phoneRegex = /^(10|11|12|15)\d{8}$/

	function validatePhone(value: string): boolean {
		if (!value || !phoneRegex.test(value)) {
			triggerHint()
			return false
		}
		return true
	}

	async function handleSend(method: 'whatsapp' | 'sms') {
		if (!validatePhone(phone)) return
		setLoading(true)
		setSendingMethod(method)
		try {
			const result = await sendOTP({ data: { phone, method } })
			if (!result.success) {
				triggerHint()
				return
			}
			onNext()
		} catch {
			triggerHint()
		} finally {
			setLoading(false)
			setSendingMethod(null)
		}
	}

	return (
		<div className="flex flex-col">
			<h1 className="atelier-serif text-[28px] leading-[1.1] tracking-[-0.01em] text-[var(--atelier-ink)]">
				{t('login.atelier.step1.heading', 'Who shall I prepare this for?')}
			</h1>

			<div className="mt-8">
				<label
					htmlFor="atelier-phone"
					className="atelier-mono block text-[10px] uppercase tracking-[0.28em] text-[var(--atelier-ink-faint)]"
				>
					{t('login.phoneLabel', 'Phone')}
				</label>

				<div
					key={hintKey}
					className={`atelier-rule-line mt-3 flex items-baseline gap-3 pb-2 ${hintKey > 0 ? 'atelier-border-hint' : ''}`}
				>
					<span className="atelier-mono text-[13px] text-[var(--atelier-ink-muted)]">
						+20
					</span>
					<input
						id="atelier-phone"
						ref={inputRef}
						type="tel"
						inputMode="numeric"
						value={phone}
						onChange={(e) => {
							let digits = e.target.value.replace(/\D/g, '')
							if (/^20(10|11|12|15)/.test(digits)) digits = digits.slice(2)
							if (digits.startsWith('0')) digits = digits.slice(1)
							setPhone(digits.slice(0, 10))
						}}
						placeholder="10 xxxx xxxx"
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleSend('whatsapp')
						}}
						aria-label={t('login.phoneLabel', 'Phone')}
						className="atelier-mono w-full bg-transparent text-[15px] tracking-[0.02em] text-[var(--atelier-ink)] outline-none placeholder:text-[var(--atelier-ink-faint)]"
					/>
				</div>
			</div>

			<div className="mt-10 flex flex-col gap-1">
				<Button
					onPress={() => handleSend('whatsapp')}
					isDisabled={loading}
					className="atelier-command"
				>
					{loading && sendingMethod === 'whatsapp' ? (
						<AtelierDots />
					) : (
						t('login.whatsappCTA', 'Continue with WhatsApp')
					)}
				</Button>
				<button
					type="button"
					onClick={() => handleSend('sms')}
					disabled={loading}
					className="atelier-quiet"
				>
					{loading && sendingMethod === 'sms' ? (
						<AtelierDots />
					) : (
						t('login.smsFallback', 'Send via SMS instead')
					)}
				</button>
			</div>
		</div>
	)
}

// ============================================================================
// OTP Step — "Enter the six figures I sent."
// ============================================================================

const OTP_LENGTH = 6
const OTP_SLOTS = [
	'otp-0',
	'otp-1',
	'otp-2',
	'otp-3',
	'otp-4',
	'otp-5',
] as const
const RESEND_COOLDOWN = 30

interface VerifyResult {
	needsAccount: boolean
	claimableCompany: string | null
}

function OTPStep({
	phone,
	onVerified,
	onBack,
}: {
	phone: string
	onVerified: (result: VerifyResult) => void
	onBack: () => void
}) {
	const { t } = useTranslation('portal')
	const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''))
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [striking, setStriking] = useState(false)
	const [focusedIndex, setFocusedIndex] = useState<number>(-1)
	const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN)
	const inputRefs = useRef<(HTMLInputElement | null)[]>([])

	useEffect(() => {
		if (resendCountdown <= 0) return
		const timer = setInterval(() => {
			setResendCountdown((prev) => Math.max(0, prev - 1))
		}, 1000)
		return () => clearInterval(timer)
	}, [resendCountdown])

	useEffect(() => {
		const id = setTimeout(() => inputRefs.current[0]?.focus(), 150)
		return () => clearTimeout(id)
	}, [])

	const submitCode = useCallback(
		async (digits: string[]) => {
			const fullCode = digits.join('')
			if (fullCode.length !== OTP_LENGTH) return
			setLoading(true)
			setError(null)
			try {
				const result = await verifyOTP({ data: { phone, code: fullCode } })
				if (!result.success) {
					setError(
						result.error === 'rate_limited'
							? t('login.rateLimit', 'Too many attempts. Wait a moment.')
							: t('login.wrongCode', 'Incorrect code'),
					)
					setStriking(true)
					setTimeout(() => {
						setStriking(false)
						setCode(Array(OTP_LENGTH).fill(''))
						inputRefs.current[0]?.focus()
					}, 500)
					return
				}
				onVerified({
					needsAccount: result.needsAccount ?? false,
					claimableCompany: result.claimableCompany ?? null,
				})
			} catch {
				setError(t('login.wrongCode', 'Incorrect code'))
				setStriking(true)
				setTimeout(() => {
					setStriking(false)
					setCode(Array(OTP_LENGTH).fill(''))
					inputRefs.current[0]?.focus()
				}, 500)
			} finally {
				setLoading(false)
			}
		},
		[phone, t, onVerified],
	)

	function handleInput(index: number, value: string) {
		const digit = value.replace(/\D/g, '').slice(-1)
		const newCode = [...code]
		newCode[index] = digit
		setCode(newCode)
		if (digit && index < OTP_LENGTH - 1) {
			inputRefs.current[index + 1]?.focus()
		}
		if (digit && newCode.every((d) => d !== '')) {
			submitCode(newCode)
		}
	}

	function handleKeyDown(index: number, e: React.KeyboardEvent) {
		if (e.key === 'Backspace' && !code[index] && index > 0) {
			inputRefs.current[index - 1]?.focus()
		}
	}

	function handlePaste(e: React.ClipboardEvent) {
		e.preventDefault()
		const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
		if (!pasted.length) return
		const chars = pasted.slice(0, OTP_LENGTH).split('')
		const newCode = [...code]
		for (let i = 0; i < chars.length; i++) {
			newCode[i] = chars[i]
		}
		setCode(newCode)
		const nextEmpty = newCode.findIndex((d) => !d)
		if (nextEmpty >= 0) {
			inputRefs.current[nextEmpty]?.focus()
		} else {
			inputRefs.current[OTP_LENGTH - 1]?.focus()
			submitCode(newCode)
		}
	}

	async function handleResend() {
		setError(null)
		setResendCountdown(RESEND_COOLDOWN)
		try {
			await sendOTP({ data: { phone, method: 'whatsapp' } })
		} catch {
			setError(t('login.sendFailed', 'Could not resend code.'))
		}
	}

	return (
		<div className="flex flex-col">
			<h1 className="atelier-serif text-[28px] leading-[1.1] tracking-[-0.01em] text-[var(--atelier-ink)]">
				{t('login.atelier.step2.heading', 'Enter the six figures I sent.')}
			</h1>
			<p className="atelier-mono mt-3 text-[11px] uppercase tracking-[0.22em] text-[var(--atelier-ink-muted)]">
				{t('login.codeSent', 'Sent to')}{' '}
				<span className="text-[var(--atelier-ink)]">+20 {phone}</span>
			</p>

			<div dir="ltr" className="mt-8 flex gap-3" onPaste={handlePaste}>
				{OTP_SLOTS.map((slot, i) => (
					<div
						key={slot}
						className={`atelier-otp-cell relative flex-1 ${striking ? 'atelier-otp-strike' : ''}`}
						data-focused={focusedIndex === i}
					>
						{code[i] && (
							<span
								key={`${slot}-${code[i]}`}
								className="atelier-ink-bleed atelier-serif pointer-events-none text-[28px] italic leading-none text-[var(--atelier-ink)]"
							>
								{code[i]}
							</span>
						)}
						<input
							ref={(el) => {
								inputRefs.current[i] = el
							}}
							type="tel"
							inputMode="numeric"
							maxLength={1}
							value={code[i]}
							onChange={(e) => handleInput(i, e.target.value)}
							onKeyDown={(e) => handleKeyDown(i, e)}
							onFocus={() => setFocusedIndex(i)}
							onBlur={() => setFocusedIndex(-1)}
							disabled={loading}
							aria-label={`Digit ${i + 1}`}
							className="atelier-serif absolute inset-0 h-full w-full bg-transparent text-center text-[28px] italic leading-none text-transparent outline-none caret-[var(--atelier-ink)] disabled:opacity-40"
						/>
					</div>
				))}
			</div>

			{error && (
				<p
					role="alert"
					className="atelier-mono mt-4 text-[11px] uppercase tracking-[0.18em] text-[var(--atelier-ink-error)]"
				>
					{error}
				</p>
			)}

			<div className="atelier-mono mt-8 flex items-center justify-between text-[11px] uppercase tracking-[0.18em]">
				<button
					type="button"
					onClick={onBack}
					className="text-[var(--atelier-ink-muted)] transition-colors hover:text-[var(--atelier-ink)]"
				>
					{t('login.changePhone', 'Change number')}
				</button>
				{resendCountdown > 0 ? (
					<span className="tabular-nums text-[var(--atelier-ink-faint)]">
						{String(resendCountdown).padStart(2, '0')}
					</span>
				) : (
					<button
						type="button"
						onClick={handleResend}
						className="text-[var(--atelier-ink-muted)] transition-colors hover:text-[var(--atelier-ink)]"
					>
						{t('login.resend', 'Resend code')}
					</button>
				)}
			</div>
		</div>
	)
}

// ============================================================================
// Account Creation Step — "Record your details."
// ============================================================================

function AccountCreationStep({
	phone,
	onComplete,
}: {
	phone: string
	onComplete: () => void
}) {
	const { t } = useTranslation('portal')
	const [loading, setLoading] = useState(false)
	const [companyName, setCompanyName] = useState('')
	const [fullName, setFullName] = useState('')
	const [hintNameKey, setHintNameKey] = useState(0)
	const [hintCompanyKey, setHintCompanyKey] = useState(0)
	const fullNameRef = useRef<HTMLInputElement | null>(null)
	const companyRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		const id = setTimeout(() => fullNameRef.current?.focus(), 150)
		return () => clearTimeout(id)
	}, [])

	async function handleCreate() {
		const nameOk = fullName.trim().length > 0
		const companyOk = companyName.trim().length > 0
		if (!nameOk) setHintNameKey((k) => k + 1)
		if (!companyOk) setHintCompanyKey((k) => k + 1)
		if (!nameOk || !companyOk) return

		setLoading(true)
		try {
			const result = await createAccount({
				data: {
					phone,
					companyName: companyName.trim(),
					fullName: fullName.trim(),
				},
			})
			if (!result.success) {
				setHintCompanyKey((k) => k + 1)
				return
			}
			onComplete()
		} catch {
			setHintCompanyKey((k) => k + 1)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex flex-col">
			<h1 className="atelier-serif text-[28px] leading-[1.1] tracking-[-0.01em] text-[var(--atelier-ink)]">
				{t('login.atelier.step3.heading', 'Record your details.')}
			</h1>

			<div className="mt-8 flex flex-col gap-5">
				<div>
					<label
						htmlFor="atelier-name"
						className="atelier-mono block text-[10px] uppercase tracking-[0.28em] text-[var(--atelier-ink-faint)]"
					>
						{t('login.fullName', 'Full name')}
					</label>
					<div
						key={hintNameKey}
						className={`atelier-rule-line mt-3 pb-2 ${hintNameKey > 0 ? 'atelier-border-hint' : ''}`}
					>
						<input
							id="atelier-name"
							ref={fullNameRef}
							type="text"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									if (!companyName.trim()) {
										companyRef.current?.focus()
									} else {
										handleCreate()
									}
								}
							}}
							aria-label={t('login.fullName', 'Full name')}
							className="atelier-mono w-full bg-transparent text-[15px] tracking-[0.02em] text-[var(--atelier-ink)] outline-none placeholder:text-[var(--atelier-ink-faint)]"
						/>
					</div>
				</div>

				<div>
					<label
						htmlFor="atelier-company"
						className="atelier-mono block text-[10px] uppercase tracking-[0.28em] text-[var(--atelier-ink-faint)]"
					>
						{t('login.companyName', 'Company name')}
					</label>
					<div
						key={hintCompanyKey}
						className={`atelier-rule-line mt-3 pb-2 ${hintCompanyKey > 0 ? 'atelier-border-hint' : ''}`}
					>
						<input
							id="atelier-company"
							ref={companyRef}
							type="text"
							value={companyName}
							onChange={(e) => setCompanyName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleCreate()
							}}
							aria-label={t('login.companyName', 'Company name')}
							className="atelier-mono w-full bg-transparent text-[15px] tracking-[0.02em] text-[var(--atelier-ink)] outline-none placeholder:text-[var(--atelier-ink-faint)]"
						/>
					</div>
				</div>

				<div className="mt-4">
					<Button
						onPress={handleCreate}
						isDisabled={loading}
						className="atelier-command"
					>
						{loading ? (
							<AtelierDots />
						) : (
							t('login.createButton', 'Create Account')
						)}
					</Button>
				</div>
			</div>
		</div>
	)
}

// ============================================================================
// Account Claiming Step — "A page already exists."
// ============================================================================

function AccountClaimingStep({
	phone,
	claimableCompany,
	onComplete,
	onCreateNew,
}: {
	phone: string
	claimableCompany: string | null
	onComplete: () => void
	onCreateNew: () => void
}) {
	const { t } = useTranslation('portal')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const initial = claimableCompany
		? claimableCompany.trim().charAt(0) || '?'
		: '?'

	async function handleClaim() {
		setLoading(true)
		setError(null)
		try {
			const result = await claimAccount({ data: { phone } })
			if (!result.success) {
				setError(t('login.claimFailed', 'Could not claim account. Try again.'))
				return
			}
			onComplete()
		} catch {
			setError(t('login.claimFailed', 'Could not claim account. Try again.'))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex flex-col items-center">
			<h1 className="atelier-serif text-center text-[28px] leading-[1.1] tracking-[-0.01em] text-[var(--atelier-ink)]">
				{t('login.atelier.claiming.heading', 'A page already exists.')}
			</h1>
			<p className="atelier-mono mt-3 text-center text-[11px] uppercase tracking-[0.22em] text-[var(--atelier-ink-muted)]">
				{t('login.atelier.claiming.sub', 'Bearing this mark')}
			</p>

			<div className="mt-7">
				<WaxSeal initial={initial.toUpperCase()} />
			</div>

			{error && (
				<p
					role="alert"
					className="atelier-mono mt-4 text-[11px] uppercase tracking-[0.18em] text-[var(--atelier-ink-error)]"
				>
					{error}
				</p>
			)}

			<div className="mt-6 flex w-full flex-col gap-1">
				<Button
					onPress={handleClaim}
					isDisabled={loading}
					className="atelier-command"
				>
					{loading ? (
						<AtelierDots />
					) : (
						t('login.atelier.claiming.confirm', 'Yes, claim this page')
					)}
				</Button>
				<button
					type="button"
					onClick={onCreateNew}
					disabled={loading}
					className="atelier-quiet"
				>
					{t('login.atelier.claiming.deny', 'No, open a new page')}
				</button>
			</div>
		</div>
	)
}

// ============================================================================
// Farewell Step — "Pleasure doing business." The handshake after signing.
// ============================================================================
//
// Fires after a successful create or claim. Holds for ~1.8s, then hands off
// to handleAuthComplete which runs the leaving fade and navigates.

const FAREWELL_HOLD_MS = 1800

function FarewellStep({ onDone }: { onDone: () => void }) {
	const { t } = useTranslation('portal')

	useEffect(() => {
		const id = setTimeout(onDone, FAREWELL_HOLD_MS)
		return () => clearTimeout(id)
	}, [onDone])

	return (
		<div className="flex flex-col items-center py-6">
			<p className="atelier-serif text-center text-[30px] italic leading-[1.15] tracking-[-0.01em] text-[var(--atelier-ink)]">
				{t('login.atelier.farewell.heading', 'Pleasure doing business.')}
			</p>
			<div className="atelier-rule-draw mt-7 h-px w-14 origin-left bg-[var(--atelier-rule-strong)]" />
			<p className="atelier-serif mt-5 text-[20px] italic leading-none text-[var(--atelier-ink-muted)]">
				{t('login.atelier.farewell.signature', '— L.')}
			</p>
		</div>
	)
}

// ============================================================================
// Legal footer
// ============================================================================

function LegalFooter({ leaving }: { leaving: boolean }) {
	const { t } = useTranslation('portal')
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: leaving ? 0 : 1 }}
			transition={{
				duration: leaving ? 0.6 : 1,
				delay: leaving ? 0 : 0.9,
				ease: 'easeOut',
			}}
			className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center pb-6 pt-3"
		>
			<p className="atelier-mono pointer-events-auto text-center text-[10px] uppercase tracking-[0.22em] text-[var(--atelier-ink-faint)]">
				{t(
					'login.atelier.legalPrefix',
					"On this page, you agree to HyperQuote's",
				)}{' '}
				<a
					href="https://www.hyperquote.net/docs/legal/terms-of-service"
					target="_blank"
					rel="noopener noreferrer"
					className="atelier-link"
				>
					{t('login.termsLink', 'Terms of Use')}
				</a>{' '}
				{t('login.and', 'and')}{' '}
				<a
					href="https://www.hyperquote.net/docs/legal/privacy-policy"
					target="_blank"
					rel="noopener noreferrer"
					className="atelier-link"
				>
					{t('login.privacyLink', 'Privacy Policy')}
				</a>
				.
			</p>
		</motion.div>
	)
}

// ============================================================================
// Dots — quiet loading indicator in mono, three dots ticking
// ============================================================================

function AtelierDots() {
	return (
		<span className="atelier-mono inline-flex items-baseline gap-[3px] text-[14px] leading-none">
			<span className="atelier-dot">·</span>
			<span className="atelier-dot" style={{ animationDelay: '0.2s' }}>
				·
			</span>
			<span className="atelier-dot" style={{ animationDelay: '0.4s' }}>
				·
			</span>
		</span>
	)
}
