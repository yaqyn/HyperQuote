import {
	createFileRoute,
	redirect,
	useNavigate,
	useSearch,
} from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import { ArrowUpRight, Check, Globe, Moon, Sun } from 'lucide-react'
import { AnimatePresence, cubicBezier, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import whatsappLightUrl from '../../../../essential/brand/whatsapp-light.svg'
import { AtelierScene } from '../components/atelier/AtelierScene'
import { usePortalThemeSnapshot } from '../hooks/usePortalThemeSnapshot'
import {
	checkSession,
	claimAccount,
	completePasswordReset,
	createAccount,
	requestPasswordReset,
	sendOTP,
	signInWithEmailPassword,
	verifyOTP,
} from '../lib/auth'
import { type PortalTheme, setPortalTheme } from '../lib/theme'
import { usePortalStore } from '../stores/portal'

// ============================================================================
// Route
// ============================================================================

export const Route = createFileRoute('/login')({
	validateSearch: z.object({
		redirect: z.string().optional(),
		token_hash: z.string().optional(),
		type: z.string().optional(),
	}),
	beforeLoad: async ({ search }) => {
		if (search.type === 'recovery' && search.token_hash) return
		const result = await checkSession()
		if (result.authenticated) {
			throw redirect({ to: '/' })
		}
	},
	component: LoginPage,
})

// ============================================================================
// Types
// ============================================================================

type AuthStep =
	| 'phone'
	| 'otp'
	| 'email'
	| 'create'
	| 'claiming'
	| 'farewell'
	| 'reset'
type Stage = 'dark' | 'logo' | 'scene' | 'leaving'
const STEP_EASE = cubicBezier(0.2, 0.8, 0.2, 1)
const INTRO_LOGO_IN_MS = 300
const INTRO_LOGO_OUT_MS = 1450
const INTRO_SCENE_IN_MS = 2150
const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ============================================================================
// Login Page
// ============================================================================

function LoginPage() {
	const navigate = useNavigate()
	const search = useSearch({ from: '/login' })
	const theme = usePortalThemeSnapshot()
	const recoveryToken =
		search.type === 'recovery' ? search.token_hash : undefined
	const [step, setStep] = useState<AuthStep>(() =>
		recoveryToken ? 'reset' : 'email',
	)
	const [phone, setPhone] = useState('')
	const [claimableCompany, setClaimableCompany] = useState<string | null>(null)
	const [stage, setStage] = useState<Stage>('dark')

	const setSigningOut = usePortalStore((s) => s.setSigningOut)
	useEffect(() => {
		setSigningOut(false)
	}, [setSigningOut])

	useEffect(() => {
		if (recoveryToken) setStep('reset')
	}, [recoveryToken])

	useEffect(() => {
		const t1 = setTimeout(() => setStage('logo'), INTRO_LOGO_IN_MS)
		const t2 = setTimeout(() => setStage('dark'), INTRO_LOGO_OUT_MS)
		const t3 = setTimeout(() => setStage('scene'), INTRO_SCENE_IN_MS)
		return () => {
			clearTimeout(t1)
			clearTimeout(t2)
			clearTimeout(t3)
		}
	}, [])

	function handleAuthComplete(redirectPath?: string) {
		const target = search.redirect ?? redirectPath ?? '/'
		setStage('leaving')
		// Let the exit fade complete before the portal route mounts.
		setTimeout(() => navigate({ to: target }), 1300)
	}

	const showScene = stage === 'scene' || stage === 'leaving'

	const leaving = stage === 'leaving'
	const isDark = theme === 'dark'

	return (
		<motion.div
			className={`atelier-scene ${isDark ? 'atelier-scene-dark' : 'atelier-scene-light'} relative min-h-dvh w-full overflow-x-hidden overflow-y-auto overscroll-none`}
			animate={{ opacity: leaving ? 0 : 1 }}
			transition={{ duration: leaving ? 1.2 : 0, ease: 'easeInOut' }}
		>
			<div className="atelier-vignette" />
			<AuthTopControls theme={theme} />

			<div className="relative min-h-dvh w-full">
				<AnimatePresence>
					{stage === 'logo' && (
						<motion.div
							key="logo"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.6, ease: 'easeOut' }}
							className="absolute inset-0 z-20 flex items-center justify-center"
						>
							<img
								src={isDark ? '/brand/LyonWhite.svg' : '/brand/LyonBlack.svg'}
								alt="HyperQuote"
								className="h-20 w-20 opacity-90 md:h-24 md:w-24"
								draggable={false}
							/>
						</motion.div>
					)}

					{showScene && (
						<motion.div
							key="scene"
							initial={false}
							animate={{ opacity: stage === 'leaving' ? 0 : 1 }}
							transition={{
								duration: stage === 'leaving' ? 0.7 : 0.9,
								ease: 'easeOut',
							}}
							className="relative min-h-dvh w-full"
						>
							<AtelierScene lit={isDark}>
								<div className="auth-layout">
									<AuthDesktopStory />
									<AuthPanel>
										<AutoHeight>
											<AnimatePresence mode="wait" initial={false}>
												{step === 'phone' && (
													<StepFrame key="phone">
														<PhoneStep
															phone={phone}
															setPhone={setPhone}
															onEmail={() => setStep('email')}
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
												{step === 'email' && (
													<StepFrame key="email">
														<EmailPasswordStep
															onBack={() => setStep('phone')}
															onComplete={() => handleAuthComplete()}
														/>
													</StepFrame>
												)}
												{step === 'reset' && (
													<StepFrame key="reset">
														<PasswordResetStep
															tokenHash={recoveryToken ?? ''}
															onBack={() => setStep('email')}
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
									</AuthPanel>
								</div>
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
// Auth controls
// ============================================================================

function AuthTopControls({ theme }: { theme: PortalTheme }) {
	const { t, i18n } = useTranslation('portal')
	const locale = i18n.language?.startsWith('ar') ? 'ar' : 'en'
	const nextTheme = theme === 'dark' ? 'light' : 'dark'
	const nextLocale = locale === 'ar' ? 'en' : 'ar'
	const ThemeIcon = theme === 'dark' ? Sun : Moon

	function transition(apply: () => void) {
		const vtDoc = document as Document & {
			startViewTransition?: (cb: () => void) => void
		}
		if (vtDoc.startViewTransition) {
			vtDoc.startViewTransition(apply)
		} else {
			apply()
		}
	}

	function handleThemeToggle() {
		transition(() => setPortalTheme(nextTheme))
	}

	function handleLanguageToggle() {
		transition(() => {
			i18n.changeLanguage(nextLocale)
			localStorage.setItem('hq-locale', nextLocale)
			const doc = document as unknown as Record<'cookie', string>
			doc.cookie = `hq-locale=${nextLocale};path=/;max-age=31536000`
			document.documentElement.setAttribute('lang', nextLocale)
			document.documentElement.setAttribute(
				'dir',
				nextLocale === 'ar' ? 'rtl' : 'ltr',
			)
			document.body.className = document.body.className.replace(
				/font-(sans|arabic)/,
				nextLocale === 'ar' ? 'font-arabic' : 'font-sans',
			)
		})
	}

	return (
		<fieldset className="auth-top-controls">
			<legend className="sr-only">{t('login.controls.label')}</legend>
			<button
				type="button"
				onClick={handleThemeToggle}
				className="auth-icon-button"
				aria-label={t(
					nextTheme === 'dark'
						? 'login.controls.switchToDark'
						: 'login.controls.switchToLight',
				)}
			>
				<ThemeIcon size={17} strokeWidth={1.7} />
			</button>
			<button
				type="button"
				onClick={handleLanguageToggle}
				className="auth-icon-button auth-language-button"
				aria-label={t(
					nextLocale === 'ar'
						? 'login.controls.switchToArabic'
						: 'login.controls.switchToEnglish',
				)}
			>
				<Globe size={17} strokeWidth={1.7} />
				<span>{nextLocale.toUpperCase()}</span>
			</button>
		</fieldset>
	)
}

// ============================================================================
// Auth panel — shared chrome around every step
// ============================================================================

function AuthDesktopStory() {
	const { t } = useTranslation('portal')
	const links = [
		{
			key: 'login.story.links.website',
			href: 'https://www.hyperquote.net',
		},
		{
			key: 'login.story.links.support',
			href: 'https://www.hyperquote.net/docs/support',
		},
		{
			key: 'login.story.links.terms',
			href: 'https://www.hyperquote.net/docs/legal/terms-of-service',
		},
		{
			key: 'login.story.links.privacy',
			href: 'https://www.hyperquote.net/docs/legal/privacy-policy',
		},
	] satisfies Array<{ key: ParseKeys<'portal'>; href: string }>

	return (
		<aside className="auth-desktop-story" aria-label={t('login.story.label')}>
			<p className="auth-story-eyebrow">{t('login.story.eyebrow')}</p>
			<h2 className="auth-story-heading">{t('login.story.heading')}</h2>
			<p className="auth-story-tagline">{t('login.story.tagline')}</p>
			<p className="auth-story-body">{t('login.story.body')}</p>
			<AuthWorkspaceVector />
			<nav
				className="auth-story-links"
				aria-label={t('login.story.linksLabel')}
			>
				{links.map((link) => (
					<a
						key={link.key}
						href={link.href}
						target="_blank"
						rel="noopener noreferrer"
						className="auth-story-link"
					>
						<span>{t(link.key)}</span>
						<ArrowUpRight size={15} strokeWidth={1.7} aria-hidden />
					</a>
				))}
			</nav>
		</aside>
	)
}

function AuthWorkspaceVector() {
	return (
		<div className="auth-vector" aria-hidden>
			<span className="auth-vector-node auth-vector-node-primary" />
			<span className="auth-vector-node auth-vector-node-quote" />
			<span className="auth-vector-node auth-vector-node-delivery" />
			<span className="auth-vector-line auth-vector-line-a" />
			<span className="auth-vector-line auth-vector-line-b" />
			<span className="auth-vector-label auth-vector-label-top" />
			<span className="auth-vector-label auth-vector-label-bottom" />
		</div>
	)
}

function AuthPanel({ children }: { children: ReactNode }) {
	return <div className="atelier-page atelier-page-enter">{children}</div>
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
			transition={{ duration: 0.22, ease: 'easeOut' }}
			style={{ overflow: 'hidden' }}
		>
			<div ref={contentRef}>{children}</div>
		</motion.div>
	)
}

// ============================================================================
// Step frame — slide transition between auth steps
// ============================================================================

function StepFrame({ children }: { children: ReactNode }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -3 }}
			transition={{ duration: 0.18, ease: STEP_EASE }}
		>
			{children}
		</motion.div>
	)
}

function AuthStepIntro({
	heading,
	body,
	align = 'start',
}: {
	heading: ReactNode
	body?: ReactNode
	align?: 'start' | 'center'
}) {
	return (
		<div className={align === 'center' ? 'text-center' : ''}>
			<h1 className="auth-step-heading">{heading}</h1>
			{body && <p className="auth-step-body">{body}</p>}
		</div>
	)
}

// ============================================================================
// Phone step
// ============================================================================

function PhoneStep({
	phone,
	setPhone,
	onEmail,
	onNext,
}: {
	phone: string
	setPhone: (v: string) => void
	onEmail: () => void
	onNext: () => void
}) {
	const { t } = useTranslation('portal')
	const [hintKey, setHintKey] = useState(0)
	const [loading, setLoading] = useState(false)
	const [sendingMethod, setSendingMethod] = useState<'whatsapp' | 'sms' | null>(
		null,
	)
	const [error, setError] = useState<string | null>(null)
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
			setError(t('login.phoneInvalid'))
			triggerHint()
			return false
		}
		setError(null)
		return true
	}

	async function handleSend(method: 'whatsapp' | 'sms') {
		if (!validatePhone(phone)) return
		setLoading(true)
		setSendingMethod(method)
		try {
			const result = await sendOTP({ data: { phone, method } })
			if (!result.success) {
				setError(t('login.sendFailed'))
				triggerHint()
				return
			}
			onNext()
		} catch {
			setError(t('login.sendFailed'))
			triggerHint()
		} finally {
			setLoading(false)
			setSendingMethod(null)
		}
	}

	return (
		<div className="flex flex-col">
			<AuthStepIntro
				heading={t('login.atelier.step1.heading')}
				body={t('login.atelier.step1.body')}
			/>

			<div className="mt-7">
				<label htmlFor="atelier-phone" className="auth-field-label">
					{t('login.phoneLabel')}
				</label>

				<div
					key={hintKey}
					dir="ltr"
					className={`atelier-rule-line mt-2 flex items-center gap-3 ${hintKey > 0 ? 'atelier-border-hint' : ''}`}
				>
					<span className="auth-country-code">+20</span>
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
							if (error) setError(null)
						}}
						placeholder={t('login.phonePlaceholder')}
						dir="ltr"
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleSend('whatsapp')
						}}
						aria-label={t('login.phoneLabel')}
						className="auth-field-input auth-phone-input min-w-0 flex-1"
					/>
				</div>
				{error && (
					<p role="alert" className="auth-field-error">
						{error}
					</p>
				)}
			</div>

			<div className="mt-8 flex flex-col gap-2">
				<Button
					onPress={() => handleSend('whatsapp')}
					isDisabled={loading}
					className="atelier-whatsapp-command"
				>
					{loading && sendingMethod === 'whatsapp' ? (
						<AtelierDots />
					) : (
						<>
							<img
								src={whatsappLightUrl}
								alt=""
								width={22}
								height={22}
								className="atelier-whatsapp-icon"
								draggable={false}
							/>
							<span>{t('login.whatsappCTA')}</span>
						</>
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
						t('login.smsFallback')
					)}
				</button>
				<button
					type="button"
					onClick={onEmail}
					disabled={loading}
					className="atelier-quiet"
				>
					{t('login.emailSwitch')}
				</button>
			</div>
		</div>
	)
}

// ============================================================================
// OTP step
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
							? t('login.rateLimit')
							: t('login.wrongCode'),
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
				setError(t('login.wrongCode'))
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
			setError(t('login.sendFailed'))
		}
	}

	return (
		<div className="flex flex-col">
			<AuthStepIntro
				heading={t('login.atelier.step2.heading')}
				body={t('login.atelier.step2.body', { phone: `+20 ${phone}` })}
			/>

			<div
				dir="ltr"
				className="mt-7 grid grid-cols-6 gap-2 sm:gap-3"
				onPaste={handlePaste}
			>
				{OTP_SLOTS.map((slot, i) => (
					<div
						key={slot}
						className={`atelier-otp-cell relative min-w-0 ${striking ? 'atelier-otp-strike' : ''}`}
						data-focused={focusedIndex === i}
					>
						{code[i] && (
							<span
								key={`${slot}-${code[i]}`}
								className="atelier-ink-bleed pointer-events-none text-[22px] font-semibold leading-none text-[var(--atelier-ink)] sm:text-[24px]"
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
							aria-label={t('login.otpDigitLabel', { index: i + 1 })}
							className="absolute inset-0 h-full w-full bg-transparent text-center text-[22px] font-semibold leading-none text-transparent outline-none caret-[var(--atelier-ink)] disabled:opacity-40 sm:text-[24px]"
						/>
					</div>
				))}
			</div>

			{error && (
				<p role="alert" className="auth-field-error mt-4">
					{error}
				</p>
			)}

			<div className="mt-7 flex flex-col gap-3 text-[13px] sm:flex-row sm:items-center sm:justify-between">
				<button type="button" onClick={onBack} className="auth-text-action">
					{t('login.changePhone')}
				</button>
				{resendCountdown > 0 ? (
					<span className="auth-countdown tabular-nums">
						{t('login.resendIn')} {String(resendCountdown).padStart(2, '0')}
					</span>
				) : (
					<button
						type="button"
						onClick={handleResend}
						className="auth-text-action"
					>
						{t('login.resend')}
					</button>
				)}
			</div>
		</div>
	)
}

// ============================================================================
// Email/password step
// ============================================================================

function EmailPasswordStep({
	onBack,
	onComplete,
}: {
	onBack: () => void
	onComplete: () => void
}) {
	const { t } = useTranslation('portal')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [resetLoading, setResetLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [notice, setNotice] = useState<string | null>(null)
	const emailRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		const id = setTimeout(() => emailRef.current?.focus(), 150)
		return () => clearTimeout(id)
	}, [])

	async function handleSignIn() {
		if (!EMAIL_ADDRESS_REGEX.test(email.trim())) {
			setError(t('login.emailInvalid'))
			return
		}
		if (password.length < 6) {
			setError(t('login.passwordInvalid'))
			return
		}
		setLoading(true)
		setError(null)
		setNotice(null)
		try {
			const result = await signInWithEmailPassword({
				data: { email: email.trim(), password },
			})
			if (!result.success) {
				if (result.error === 'email_not_confirmed') {
					setError(t('login.emailNotConfirmed'))
				} else if (result.error === 'phone_verification_required') {
					setError(t('login.phoneVerificationRequired'))
				} else {
					setError(t('login.emailSignInFailed'))
				}
				return
			}
			onComplete()
		} catch {
			setError(t('login.emailSignInFailed'))
		} finally {
			setLoading(false)
		}
	}

	async function handlePasswordResetRequest() {
		if (!EMAIL_ADDRESS_REGEX.test(email.trim())) {
			setError(t('login.emailInvalid'))
			setNotice(null)
			return
		}
		setResetLoading(true)
		setError(null)
		setNotice(null)
		try {
			const result = await requestPasswordReset({
				data: { email: email.trim() },
			})
			if (!result.success) {
				setError(t('login.passwordResetFailed'))
				return
			}
			setNotice(t('login.passwordResetSent'))
		} catch {
			setError(t('login.passwordResetFailed'))
		} finally {
			setResetLoading(false)
		}
	}

	return (
		<div className="flex flex-col">
			<AuthStepIntro
				heading={t('login.emailSignInHeading')}
				body={t('login.emailSignInSubtitle')}
			/>

			<div className="mt-7 flex flex-col gap-5">
				<AtelierTextField
					id="atelier-email"
					inputRef={emailRef}
					label={t('login.emailLabel')}
					type="email"
					value={email}
					onChange={setEmail}
					onEnter={handleSignIn}
				/>
				<AtelierTextField
					id="atelier-password"
					label={t('login.passwordLabel')}
					type="password"
					value={password}
					onChange={setPassword}
					onEnter={handleSignIn}
				/>
			</div>

			{error && (
				<p role="alert" className="auth-field-error mt-4">
					{error}
				</p>
			)}
			{notice && (
				<p
					role="status"
					className="mt-4 text-[13px] leading-5 text-[var(--atelier-muted)]"
				>
					{notice}
				</p>
			)}

			<div className="mt-7 flex flex-col gap-3">
				<Button
					onPress={handleSignIn}
					isDisabled={loading || resetLoading}
					className="atelier-command"
				>
					{loading ? <AtelierDots /> : t('login.emailSignInButton')}
				</Button>
				<button
					type="button"
					onClick={handlePasswordResetRequest}
					disabled={loading || resetLoading}
					className="auth-text-action"
				>
					{resetLoading
						? t('login.sendPasswordReset')
						: t('login.forgotPassword')}
				</button>
				<button type="button" onClick={onBack} className="auth-text-action">
					{t('login.phoneFirst')}
				</button>
			</div>
		</div>
	)
}

function PasswordResetStep({
	tokenHash,
	onBack,
}: {
	tokenHash: string
	onBack: () => void
}) {
	const { t } = useTranslation('portal')
	const [password, setPassword] = useState('')
	const [passwordConfirmation, setPasswordConfirmation] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [complete, setComplete] = useState(false)

	async function handleResetPassword() {
		if (!tokenHash) {
			setError(t('login.passwordResetInvalid'))
			return
		}
		if (password.length < 6) {
			setError(t('login.passwordInvalid'))
			return
		}
		if (password !== passwordConfirmation) {
			setError(t('login.passwordMismatch'))
			return
		}
		setLoading(true)
		setError(null)
		try {
			const result = await completePasswordReset({
				data: { tokenHash, password },
			})
			if (!result.success) {
				setError(t('login.passwordResetInvalid'))
				return
			}
			setComplete(true)
		} catch {
			setError(t('login.passwordResetFailed'))
		} finally {
			setLoading(false)
		}
	}

	if (complete) {
		return <PasswordResetSuccessStep />
	}

	return (
		<div className="flex flex-col">
			<AuthStepIntro
				heading={t('login.resetPasswordHeading')}
				body={t('login.resetPasswordSubtitle')}
			/>
			<div className="mt-7 flex flex-col gap-5">
				<AtelierTextField
					id="atelier-reset-password"
					label={t('login.newPasswordLabel')}
					type="password"
					value={password}
					onChange={setPassword}
					onEnter={handleResetPassword}
				/>
				<AtelierTextField
					id="atelier-reset-password-confirmation"
					label={t('login.confirmNewPasswordLabel')}
					type="password"
					value={passwordConfirmation}
					onChange={setPasswordConfirmation}
					onEnter={handleResetPassword}
				/>
			</div>
			{error && (
				<p role="alert" className="auth-field-error mt-4">
					{error}
				</p>
			)}
			<div className="mt-7 flex flex-col gap-3">
				<Button
					onPress={handleResetPassword}
					isDisabled={loading}
					className="atelier-command"
				>
					{loading ? <AtelierDots /> : t('login.resetPasswordButton')}
				</Button>
				<button type="button" onClick={onBack} className="auth-text-action">
					{t('login.emailSignInHeading')}
				</button>
			</div>
		</div>
	)
}

function PasswordResetSuccessStep() {
	const { t } = useTranslation('portal')
	return (
		<div className="flex flex-col">
			<div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--atelier-line)] text-[var(--atelier-ink)]">
				<Check size={22} strokeWidth={1.8} />
			</div>
			<AuthStepIntro
				align="center"
				heading={t('login.passwordResetCompleteHeading')}
				body={t('login.passwordResetCompleteSubtitle')}
			/>
			<div className="mt-7 grid gap-3 sm:grid-cols-2">
				<a
					href={getWebsiteHref('/')}
					className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--atelier-line)] px-4 text-[14px] font-semibold text-[var(--atelier-ink)] transition-colors hover:bg-[var(--atelier-paper-soft)]"
				>
					{t('login.websiteButton')}
				</a>
				<a
					href={getPortalHref('/')}
					className="atelier-command inline-flex h-12 items-center justify-center"
				>
					{t('login.portalButton')}
				</a>
			</div>
		</div>
	)
}

function getWebsiteHref(path = '/') {
	const suffix = path.startsWith('/') ? path : `/${path}`
	const configured = import.meta.env.VITE_WEBSITE_URL
	if (typeof configured === 'string' && configured.length > 0) {
		return new URL(suffix, configured).toString()
	}
	if (
		typeof window !== 'undefined' &&
		(window.location.hostname === 'localhost' ||
			window.location.hostname === '127.0.0.1')
	) {
		return new URL(suffix, 'http://localhost:3000/').toString()
	}
	return new URL(suffix, 'https://www.hyperquote.net/').toString()
}

function getPortalHref(path = '/') {
	const suffix = path.startsWith('/') ? path : `/${path}`
	if (typeof window !== 'undefined') {
		return new URL(suffix, window.location.origin).toString()
	}
	return new URL(suffix, 'https://portal.hyperquote.net/').toString()
}

const AtelierTextField = ({
	id,
	label,
	type = 'text',
	value,
	onChange,
	onEnter,
	inputRef,
}: {
	id: string
	label: string
	type?: 'email' | 'password' | 'tel' | 'text'
	value: string
	onChange: (value: string) => void
	onEnter: () => void
	inputRef?: React.Ref<HTMLInputElement>
}) => (
	<div>
		<label htmlFor={id} className="auth-field-label">
			{label}
		</label>
		<div className="atelier-rule-line mt-2">
			<input
				id={id}
				ref={inputRef}
				type={type}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === 'Enter') onEnter()
				}}
				aria-label={label}
				className="auth-field-input w-full"
			/>
		</div>
	</div>
)

// ============================================================================
// Account creation step
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
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [passwordConfirmation, setPasswordConfirmation] = useState('')
	const [formError, setFormError] = useState<string | null>(null)
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
		if (!/^(10|11|12|15)\d{8}$/.test(phone)) {
			setFormError(t('login.phoneInvalid'))
			return
		}
		const authEmail = email.trim()
		const wantsEmailPassword = Boolean(
			authEmail || password || passwordConfirmation,
		)
		if (wantsEmailPassword && !EMAIL_ADDRESS_REGEX.test(authEmail)) {
			setFormError(t('login.emailInvalid'))
			return
		}
		if (wantsEmailPassword && password.length < 6) {
			setFormError(t('login.passwordInvalid'))
			return
		}
		if (wantsEmailPassword && password !== passwordConfirmation) {
			setFormError(t('login.passwordMismatch'))
			return
		}

		setLoading(true)
		setFormError(null)
		try {
			const result = await createAccount({
				data: {
					phone,
					companyName: companyName.trim(),
					fullName: fullName.trim(),
					method: 'phone_otp',
					...(wantsEmailPassword ? { email: authEmail, password } : {}),
				},
			})
			if (!result.success) {
				setFormError(
					result.error === 'email_setup_failed'
						? t('login.emailSetupFailed')
						: result.error === 'phone_mismatch'
							? t('login.phoneVerificationRequired')
							: t('login.createFailed'),
				)
				return
			}
			onComplete()
		} catch {
			setFormError(t('login.createFailed'))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex flex-col">
			<AuthStepIntro
				heading={t('login.atelier.step3.heading')}
				body={t('login.atelier.step3.body')}
			/>

			<div className="mt-7 flex flex-col gap-5">
				<div>
					<p className="auth-field-label">{t('login.verifiedPhone')}</p>
					<div
						dir="ltr"
						className="atelier-rule-line mt-2 flex items-center gap-3"
					>
						<span className="auth-country-code">+20</span>
						<span className="auth-field-input auth-phone-input flex min-w-0 flex-1 items-center">
							{phone}
						</span>
					</div>
				</div>
				<div>
					<label htmlFor="atelier-name" className="auth-field-label">
						{t('login.fullName')}
					</label>
					<div
						key={hintNameKey}
						className={`atelier-rule-line mt-2 ${hintNameKey > 0 ? 'atelier-border-hint' : ''}`}
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
							aria-label={t('login.fullName')}
							className="auth-field-input w-full"
						/>
					</div>
				</div>

				<div>
					<label htmlFor="atelier-company" className="auth-field-label">
						{t('login.companyName')}
					</label>
					<div
						key={hintCompanyKey}
						className={`atelier-rule-line mt-2 ${hintCompanyKey > 0 ? 'atelier-border-hint' : ''}`}
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
							aria-label={t('login.companyName')}
							className="auth-field-input w-full"
						/>
					</div>
				</div>

				<div className="border-y border-[var(--atelier-rule)] py-5">
					<p className="auth-field-label">{t('login.emailPasswordOptional')}</p>
					<div className="mt-4 flex flex-col gap-5">
						<AtelierTextField
							id="atelier-profile-email"
							label={t('login.optionalEmailLabel')}
							type="email"
							value={email}
							onChange={setEmail}
							onEnter={handleCreate}
						/>
						<AtelierTextField
							id="atelier-profile-password"
							label={t('login.optionalPasswordLabel')}
							type="password"
							value={password}
							onChange={setPassword}
							onEnter={handleCreate}
						/>
						<AtelierTextField
							id="atelier-profile-password-confirmation"
							label={t('login.passwordConfirmLabel')}
							type="password"
							value={passwordConfirmation}
							onChange={setPasswordConfirmation}
							onEnter={handleCreate}
						/>
					</div>
				</div>

				{formError && (
					<p role="alert" className="auth-field-error">
						{formError}
					</p>
				)}

				<div className="mt-2">
					<Button
						onPress={handleCreate}
						isDisabled={loading}
						className="atelier-command"
					>
						{loading ? <AtelierDots /> : t('login.createButton')}
					</Button>
				</div>
			</div>
		</div>
	)
}

// ============================================================================
// Account claiming step
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

	const companyName =
		claimableCompany?.trim() || t('login.atelier.claiming.fallbackCompany')
	const initial = claimableCompany
		? claimableCompany.trim().charAt(0) || '?'
		: '?'

	async function handleClaim() {
		setLoading(true)
		setError(null)
		try {
			const result = await claimAccount({ data: { phone } })
			if (!result.success) {
				setError(t('login.claimFailed'))
				return
			}
			onComplete()
		} catch {
			setError(t('login.claimFailed'))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex flex-col items-center">
			<AuthStepIntro
				align="center"
				heading={t('login.atelier.claiming.heading')}
				body={t('login.atelier.claiming.body', { company: companyName })}
			/>

			<div className="mt-6">
				<CompanyInitialBadge initial={initial.toUpperCase()} />
			</div>

			{error && (
				<p role="alert" className="auth-field-error mt-4 text-center">
					{error}
				</p>
			)}

			<div className="mt-6 flex w-full flex-col gap-1">
				<Button
					onPress={handleClaim}
					isDisabled={loading}
					className="atelier-command"
				>
					{loading ? <AtelierDots /> : t('login.atelier.claiming.confirm')}
				</Button>
				<button
					type="button"
					onClick={onCreateNew}
					disabled={loading}
					className="atelier-quiet"
				>
					{t('login.atelier.claiming.deny')}
				</button>
			</div>
		</div>
	)
}

// ============================================================================
// Farewell step
// ============================================================================

const FAREWELL_HOLD_MS = 1800

function FarewellStep({ onDone }: { onDone: () => void }) {
	const { t } = useTranslation('portal')

	useEffect(() => {
		const id = setTimeout(onDone, FAREWELL_HOLD_MS)
		return () => clearTimeout(id)
	}, [onDone])

	return (
		<div className="flex flex-col items-center py-6 text-center">
			<span className="auth-success-mark" aria-hidden>
				<Check size={28} strokeWidth={1.8} />
			</span>
			<AuthStepIntro
				align="center"
				heading={t('login.atelier.farewell.heading')}
				body={t('login.atelier.farewell.signature')}
			/>
		</div>
	)
}

function CompanyInitialBadge({ initial }: { initial: string }) {
	return <span className="auth-company-badge">{initial}</span>
}

// ============================================================================
// Legal footer
// ============================================================================

function LegalFooter({ leaving }: { leaving: boolean }) {
	const { t } = useTranslation('portal')
	return (
		<motion.div
			initial={false}
			animate={{ opacity: leaving ? 0 : 1 }}
			transition={{
				duration: leaving ? 0.6 : 1,
				delay: leaving ? 0 : 0.9,
				ease: 'easeOut',
			}}
			className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:px-6 sm:pb-6"
		>
			<p className="atelier-legal-copy pointer-events-auto max-w-[36rem] text-center">
				{t('login.atelier.legalPrefix')}{' '}
				<a
					href="https://www.hyperquote.net/docs/legal/terms-of-service"
					target="_blank"
					rel="noopener noreferrer"
					className="atelier-link"
				>
					{t('login.atelier.termsLink')}
				</a>{' '}
				{t('login.and')}{' '}
				<a
					href="https://www.hyperquote.net/docs/legal/privacy-policy"
					target="_blank"
					rel="noopener noreferrer"
					className="atelier-link"
				>
					{t('login.atelier.privacyLink')}
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
