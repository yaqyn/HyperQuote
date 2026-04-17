import { LampContainer } from '@hyperquote/ui'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
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

type AuthStep = 'phone' | 'otp' | 'create' | 'claiming'

// ============================================================================
// Login Page
// ============================================================================

function LoginPage() {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const search = useSearch({ from: '/login' })
	const [step, setStep] = useState<AuthStep>('phone')
	const [phone, setPhone] = useState('')
	const [claimableCompany, setClaimableCompany] = useState<string | null>(null)

	// Reset sign-out state if coming from portal
	const setSigningOut = usePortalStore((s) => s.setSigningOut)
	useEffect(() => {
		setSigningOut(false)
	}, [setSigningOut])

	// Cinematic stages: darkness → logo → reveal (lamp + glass) → leaving
	const [stage, setStage] = useState<'dark' | 'logo' | 'reveal' | 'leaving'>(
		'dark',
	)
	const [glassContent, setGlassContent] = useState<'welcome' | 'form'>(
		'welcome',
	)

	useEffect(() => {
		const t1 = setTimeout(() => setStage('logo'), 300)
		const t2 = setTimeout(() => setStage('reveal'), 1200)
		const t3 = setTimeout(() => setGlassContent('form'), 1700)
		return () => {
			clearTimeout(t1)
			clearTimeout(t2)
			clearTimeout(t3)
		}
	}, [])

	const [glassExiting, setGlassExiting] = useState(false)

	function handleAuthComplete(redirectPath?: string) {
		const target = search.redirect ?? redirectPath ?? '/'
		// 1. Glass fades out top-to-bottom (1s)
		setGlassExiting(true)
		// 2. Lamp fades out (starts at 0.8s, overlaps slightly)
		setTimeout(() => setStage('leaving'), 800)
		// 3. Navigate after everything is dark
		setTimeout(() => navigate({ to: target }), 2000)
	}

	return (
		<div className="min-h-dvh bg-[#060606] flex items-center justify-center overflow-hidden">
			<AnimatePresence mode="wait">
				{/* ── Stage 1: Logo in darkness ── */}
				{stage === 'logo' && (
					<motion.div
						key="logo"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.6, ease: 'easeOut' }}
						className="flex flex-col items-center"
					>
						<div className="w-24 h-24 md:w-32 md:h-32">
							<img
								src="/brand/LyonWhite.svg"
								alt="HyperQuote"
								className="w-full h-full object-contain"
								draggable={false}
							/>
						</div>
					</motion.div>
				)}

				{/* ── Stage 2: Lamp + Glass Window ── */}
				{(stage === 'reveal' || stage === 'leaving') && (
					<motion.div
						key="reveal"
						initial={{ opacity: 0 }}
						animate={{ opacity: stage === 'leaving' ? 0 : 1 }}
						transition={{
							duration: stage === 'leaving' ? 1 : 0.8,
							ease: 'easeOut',
						}}
						className="w-full h-dvh flex flex-col overflow-hidden"
					>
						{/* Lamp — top of viewport, fixed height, never moves */}
						<div className="h-[40vh] shrink-0">
							<LampContainer className="h-full" />
						</div>

						{/* Glass window — below lamp, centered in remaining space */}
						<div className="flex-1 flex items-start justify-center px-6 -mt-16">
							<div
								className={`w-full max-w-[400px] rounded-2xl p-8 glass-border-glow ${glassExiting ? 'fade-exit-up' : 'fade-reveal-down'}`}
								style={{
									background:
										'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
									backdropFilter: 'blur(48px) saturate(1.2)',
									WebkitBackdropFilter: 'blur(48px) saturate(1.2)',
									border: '1px solid rgba(255, 255, 255, 0.12)',
									boxShadow:
										'0 8px 40px rgba(0, 0, 0, 0.5), 0 0 80px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(255, 255, 255, 0.03)',
								}}
							>
								<AutoHeight>
									<AnimatePresence mode="wait">
										{glassContent === 'welcome' && (
											<motion.div
												key="welcome"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												transition={{ duration: 0.3 }}
												className="flex flex-col items-center justify-center py-8"
											>
												<h1 className="text-xl md:text-2xl font-medium text-[var(--p-text)] tracking-tight text-center">
													{t('login.welcomeGlass', 'Welcome to HyperQuote')}
												</h1>
											</motion.div>
										)}

										{glassContent === 'form' && (
											<motion.div
												key="form"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												transition={{ duration: 0.3 }}
											>
												<AnimatePresence mode="wait" initial={false}>
													{step === 'phone' && (
														<StepMotion key="phone">
															<PhoneStep
																phone={phone}
																setPhone={setPhone}
																onNext={() => setStep('otp')}
															/>
														</StepMotion>
													)}
													{step === 'otp' && (
														<StepMotion key="otp">
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
														</StepMotion>
													)}
													{step === 'create' && (
														<StepMotion key="create">
															<AccountCreationStep
																phone={phone}
																onComplete={() => handleAuthComplete()}
															/>
														</StepMotion>
													)}
													{step === 'claiming' && (
														<StepMotion key="claiming">
															<AccountClaimingStep
																phone={phone}
																claimableCompany={claimableCompany}
																onComplete={() => handleAuthComplete()}
																onCreateNew={() => setStep('create')}
															/>
														</StepMotion>
													)}
												</AnimatePresence>
											</motion.div>
										)}
									</AnimatePresence>
								</AutoHeight>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Legal — fixed at bottom, fades in after glass reveal */}
			{(stage === 'reveal' || stage === 'leaving') && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: stage === 'leaving' ? 0 : 1 }}
					transition={{
						duration: stage === 'leaving' ? 0.6 : 1,
						delay: stage === 'leaving' ? 0 : 1,
						ease: 'easeOut',
					}}
					className="fixed bottom-0 inset-x-0 z-[60] pb-5 pt-3 flex justify-center pointer-events-none"
				>
					<p className="text-[13px] leading-relaxed text-[var(--p-text-muted)] text-center pointer-events-auto">
						{t(
							'login.legalPrefix',
							'By creating an account, you agree to HyperQuote',
						)}{' '}
						<a
							href="https://www.hyperquote.net/docs/legal/terms-of-service"
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-2 hover:text-[var(--p-text-secondary)] transition-colors"
						>
							{t('login.termsLink', 'Terms of Use')}
						</a>{' '}
						{t('login.and', 'and')}{' '}
						<a
							href="https://www.hyperquote.net/docs/legal/privacy-policy"
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-2 hover:text-[var(--p-text-secondary)] transition-colors"
						>
							{t('login.privacyLink', 'Privacy Policy')}
						</a>
					</p>
				</motion.div>
			)}
		</div>
	)
}

// ============================================================================
// Auto-height animated container
// ============================================================================

function AutoHeight({ children }: { children: React.ReactNode }) {
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
// Step transition
// ============================================================================

function StepMotion({ children }: { children: React.ReactNode }) {
	return <div>{children}</div>
}

// ============================================================================
// Phone Step
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
	const inputRef = useRef<HTMLInputElement>(null)

	function triggerHint() {
		setHintKey((k) => k + 1)
		inputRef.current?.focus()
	}

	useEffect(() => {
		const id = setTimeout(() => inputRef.current?.focus(), 100)
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
			<h1 className="text-lg font-semibold text-[var(--p-text)] tracking-tight">
				{t('login.step1.heading', 'Sign in to your account')}
			</h1>

			<div className="mt-6">
				<div>
					<span className="mb-1.5 block text-[13px] font-medium uppercase tracking-[0.15em] text-[var(--p-text-muted)]">
						{t('login.phoneLabel', 'Phone')}
					</span>
					<div
						key={hintKey}
						className={`flex items-center gap-2.5 rounded-xl border border-[var(--p-border)] bg-[var(--p-input)] px-4 py-3 transition-colors focus-within:border-[var(--p-border-strong)] ${hintKey > 0 ? 'border-hint' : ''}`}
					>
						<span className="font-mono text-sm text-[var(--p-text-muted)]">
							+20
						</span>
						<input
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
							className="w-full bg-transparent font-mono text-sm text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-muted)]"
						/>
					</div>
				</div>
			</div>

			<div className="mt-6 flex flex-col gap-1.5">
				<Button
					onPress={() => handleSend('whatsapp')}
					isDisabled={loading}
					className="flex h-10 w-full items-center justify-center rounded-xl bg-[var(--p-text)] text-[13px] font-medium text-[var(--p-bg)] transition-opacity hover:opacity-90 pressed:opacity-80 disabled:opacity-40"
				>
					{loading && sendingMethod === 'whatsapp' ? (
						<Spinner />
					) : (
						t('login.whatsappCTA', 'Continue with WhatsApp')
					)}
				</Button>
				<button
					type="button"
					onClick={() => handleSend('sms')}
					disabled={loading}
					className="flex h-9 items-center justify-center text-[13px] text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text-secondary)] disabled:opacity-40"
				>
					{loading && sendingMethod === 'sms' ? (
						<Spinner accent />
					) : (
						t('login.smsFallback', 'Send via SMS instead')
					)}
				</button>
			</div>
		</div>
	)
}

// ============================================================================
// OTP Step
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
	const [shaking, setShaking] = useState(false)
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
		const id = setTimeout(() => inputRefs.current[0]?.focus(), 100)
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
					setShaking(true)
					setTimeout(() => {
						setShaking(false)
						setCode(Array(OTP_LENGTH).fill(''))
						inputRefs.current[0]?.focus()
					}, 400)
					return
				}
				onVerified({
					needsAccount: result.needsAccount ?? false,
					claimableCompany: result.claimableCompany ?? null,
				})
			} catch {
				setError(t('login.wrongCode', 'Incorrect code'))
				setShaking(true)
				setTimeout(() => {
					setShaking(false)
					setCode(Array(OTP_LENGTH).fill(''))
					inputRefs.current[0]?.focus()
				}, 400)
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
			<h1 className="text-xl font-semibold text-[var(--p-text)] tracking-tight">
				{t('login.step2.heading', 'Enter the code')}
			</h1>
			<p className="mt-2 text-[13px] text-[var(--p-text-muted)]">
				{t('login.codeSent', 'Sent to')}{' '}
				<span className="font-mono text-[var(--p-text)]">+20 {phone}</span>
			</p>

			<motion.div
				dir="ltr"
				className="mt-8 flex gap-2"
				animate={shaking ? { x: [0, -5, 5, -5, 5, 0] } : { x: 0 }}
				transition={{ duration: 0.3, ease: 'easeInOut' }}
				onPaste={handlePaste}
			>
				{OTP_SLOTS.map((slot, i) => (
					<input
						key={slot}
						ref={(el) => {
							inputRefs.current[i] = el
						}}
						type="tel"
						inputMode="numeric"
						maxLength={1}
						value={code[i]}
						onChange={(e) => handleInput(i, e.target.value)}
						onKeyDown={(e) => handleKeyDown(i, e)}
						disabled={loading}
						aria-label={`Digit ${i + 1}`}
						className="w-full aspect-square max-w-[48px] rounded-xl border border-[var(--p-border)] bg-[var(--p-input)] text-center font-mono text-lg text-[var(--p-text)] outline-none transition-colors focus:border-[var(--p-border-strong)] disabled:opacity-40"
					/>
				))}
			</motion.div>

			{error && (
				<p className="mt-3 text-[13px] text-[var(--p-error)]">{error}</p>
			)}
			{loading && (
				<div className="mt-3">
					<Spinner accent />
				</div>
			)}

			<div className="mt-8 flex items-center justify-between text-[13px]">
				<button
					type="button"
					onClick={onBack}
					className="text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text-secondary)]"
				>
					{t('login.changePhone', 'Change number')}
				</button>
				{resendCountdown > 0 ? (
					<span className="font-mono tabular-nums text-[var(--p-text-muted)]">
						{String(resendCountdown).padStart(2, '0')}
					</span>
				) : (
					<button
						type="button"
						onClick={handleResend}
						className="text-[var(--p-text-secondary)] transition-colors hover:text-[var(--p-text)]"
					>
						{t('login.resend', 'Resend code')}
					</button>
				)}
			</div>
		</div>
	)
}

// ============================================================================
// Account Creation Step
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
	const [hintKey, setHintKey] = useState(0)
	const fullNameRef = useRef<HTMLInputElement>(null)
	const companyRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		const id = setTimeout(() => fullNameRef.current?.focus(), 100)
		return () => clearTimeout(id)
	}, [])

	function triggerHint() {
		setHintKey((k) => k + 1)
	}

	async function handleCreate() {
		if (!companyName.trim() || !fullName.trim()) {
			triggerHint()
			return
		}
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
				triggerHint()
				return
			}
			onComplete()
		} catch {
			triggerHint()
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex flex-col">
			<h1 className="text-lg font-semibold text-[var(--p-text)] tracking-tight">
				{t('login.step3.heading', 'Create your account')}
			</h1>

			<div className="mt-6 flex flex-col gap-4">
				<div>
					<span className="mb-1.5 block text-[13px] font-medium uppercase tracking-[0.15em] text-[var(--p-text-muted)]">
						{t('login.fullName', 'Full name')}
					</span>
					<input
						ref={fullNameRef}
						key={`name-${hintKey}`}
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
						className={`w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-input)] px-4 py-3 text-sm text-[var(--p-text)] outline-none focus-within:border-[var(--p-border-strong)] ${hintKey > 0 && !fullName.trim() ? 'border-hint' : ''}`}
					/>
				</div>

				<div>
					<span className="mb-1.5 block text-[13px] font-medium uppercase tracking-[0.15em] text-[var(--p-text-muted)]">
						{t('login.companyName', 'Company name')}
					</span>
					<input
						ref={companyRef}
						key={`company-${hintKey}`}
						type="text"
						value={companyName}
						onChange={(e) => setCompanyName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleCreate()
						}}
						className={`w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-input)] px-4 py-3 text-sm text-[var(--p-text)] outline-none focus-within:border-[var(--p-border-strong)] ${hintKey > 0 && !companyName.trim() ? 'border-hint' : ''}`}
					/>
				</div>

				<Button
					onPress={handleCreate}
					isDisabled={loading}
					className="flex h-10 w-full items-center justify-center rounded-xl bg-[var(--p-text)] text-[13px] font-medium text-[var(--p-bg)] transition-opacity hover:opacity-90 pressed:opacity-80 disabled:opacity-40"
				>
					{loading ? <Spinner /> : t('login.createButton', 'Create Account')}
				</Button>
			</div>
		</div>
	)
}

// ============================================================================
// Account Claiming Step
// ============================================================================

function maskCompanyName(name: string): string {
	return name
		.split(' ')
		.map((word) => {
			if (word.length <= 1) return word
			return word[0] + '\u2022'.repeat(Math.min(word.length - 1, 6))
		})
		.join(' ')
}

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

	const maskedCompany = claimableCompany
		? maskCompanyName(claimableCompany)
		: '\u2022\u2022\u2022\u2022'

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
		<div className="flex flex-col">
			<h1 className="text-xl font-semibold text-[var(--p-text)] tracking-tight">
				{t('login.claiming.heading', 'Is this you?')}
			</h1>
			<p className="mt-2 text-[13px] text-[var(--p-text-muted)]">
				{t(
					'login.claiming.sub',
					'We found an existing account for this number',
				)}
			</p>

			<div className="mt-8 rounded-xl border border-[var(--p-border)] bg-[var(--p-input)] px-4 py-3">
				<p className="font-mono text-lg tracking-wider text-[var(--p-text)]">
					{maskedCompany}
				</p>
			</div>

			{error && (
				<p className="mt-3 text-[13px] text-[var(--p-error)]">{error}</p>
			)}

			<div className="mt-8 flex flex-col gap-2">
				<Button
					onPress={handleClaim}
					isDisabled={loading}
					className="flex h-11 w-full items-center justify-center rounded-xl bg-[var(--p-text)] text-sm font-medium text-[var(--p-bg)] transition-opacity hover:opacity-90 pressed:opacity-80 disabled:opacity-40"
				>
					{loading ? (
						<Spinner />
					) : (
						t('login.claiming.confirm', "Yes, that's me")
					)}
				</Button>
				<button
					type="button"
					onClick={onCreateNew}
					disabled={loading}
					className="flex h-9 items-center justify-center text-[13px] text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text-secondary)] disabled:opacity-40"
				>
					{t('login.claiming.deny', 'No, create a new account')}
				</button>
			</div>
		</div>
	)
}

// ============================================================================
// Spinner
// ============================================================================

function Spinner({ accent }: { accent?: boolean }) {
	const color = accent
		? 'border-[var(--p-text-secondary)]/20 border-t-[var(--p-text-secondary)]'
		: 'border-[var(--p-bg)]/30 border-t-[var(--p-bg)]'
	return (
		<span
			className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] ${color}`}
		/>
	)
}
