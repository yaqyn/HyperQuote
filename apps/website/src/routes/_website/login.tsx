import { standardSchemaResolver } from '@hyperquote/forms'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import {
	ArrowLeft,
	Building2,
	Check,
	FileCheck2,
	MessageCircle,
	ShieldCheck,
	Truck,
	X,
} from 'lucide-react'
import { AnimatePresence, cubicBezier, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import {
	EGYPT_COUNTRY_CODE,
	EGYPT_MOBILE_REGEX,
	emptyOtpCode,
	resetOtpCode,
} from '../../components/auth/authFields'
import { OtpCodeInput } from '../../components/auth/OtpCodeInput'
import { OtpResendControl } from '../../components/auth/OtpResendControl'
import { PhoneNumberInput } from '../../components/auth/PhoneNumberInput'
import { useResendCountdown } from '../../components/auth/useResendCountdown'
import { verifyOtpCode } from '../../components/auth/verifyOtpCode'
import { PRIVACY_SECTIONS, TERMS_SECTIONS } from '../../content/legal'
import {
	claimAccount,
	completePasswordReset,
	createAccount,
	requestPasswordReset,
	sendOTP,
	signInWithEmailPassword,
} from '../../lib/auth'
import { getPortalHref } from '../../lib/portal-url'

export const Route = createFileRoute('/_website/login')({
	validateSearch: z.object({
		token_hash: z.string().optional(),
		type: z.string().optional(),
	}),
	component: LoginPage,
	head: () => ({
		meta: [
			{ title: 'Sign In — HyperQuote' },
			{
				name: 'description',
				content: 'Sign in to HyperQuote to get quotes for building materials.',
			},
		],
	}),
})

type AuthStep = 'phone' | 'otp' | 'email' | 'create' | 'claiming' | 'reset'

const RESEND_COOLDOWN = 30
const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const EASE = cubicBezier(0.25, 0.1, 0.25, 1)
const transition = { duration: 0.25, ease: EASE }

// --------------------------------------------------------------------------

function LoginPage() {
	const { t } = useTranslation('website')
	const navigate = useNavigate()
	const search = useSearch({ from: '/_website/login' })
	const recoveryToken =
		search.type === 'recovery' ? search.token_hash : undefined
	const [step, setStep] = useState<AuthStep>(() =>
		recoveryToken ? 'reset' : 'phone',
	)
	const [phone, setPhone] = useState('')
	const [claimableCompany, setClaimableCompany] = useState<string | null>(null)

	useEffect(() => {
		if (recoveryToken) setStep('reset')
	}, [recoveryToken])

	const handleComplete = () => {
		window.dispatchEvent(new Event('hyperquote-account-updated'))
		navigate({ to: '/market' })
	}

	return (
		<div className="relative min-h-svh overflow-hidden bg-[var(--color-base)] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+2rem)] sm:px-6 sm:pt-[calc(4rem+2.75rem)] md:px-8 md:pb-12 md:pt-[calc(4rem+4rem)] lg:px-12 lg:py-[calc(4rem+4vw)]">
			{/* Noise texture overlay */}
			<div
				className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
				style={{
					backgroundImage: 'url(/noise.png)',
					backgroundRepeat: 'repeat',
				}}
			/>

			<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[var(--color-border)]" />

			<div className="relative z-10 mx-auto grid min-h-[calc(100svh-8rem)] w-full max-w-[1180px] grid-cols-1 gap-8 lg:min-h-[min(760px,calc(100svh-8rem))] lg:grid-cols-[minmax(0,1fr)_minmax(420px,460px)] lg:items-center lg:gap-12 xl:gap-16">
				<div className="order-2 lg:order-1">
					<AuthContextPanel />
				</div>

				<div className="order-1 mx-auto flex min-h-[calc(100svh-8rem)] w-full max-w-[460px] items-center justify-center lg:order-2 lg:mx-0 lg:min-h-0 lg:block">
					<div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-base)]/88 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-5 md:p-6 lg:p-7">
						<div className="mb-7 flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-5">
							<div className="min-w-0">
								<p className="text-[12px] font-semibold uppercase tracking-normal text-[var(--color-primary)]">
									{t('login.cardEyebrow')}
								</p>
								<p className="mt-1 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
									{t('login.cardSubtitle')}
								</p>
							</div>
							<div
								className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]"
								aria-hidden="true"
							>
								<ShieldCheck size={18} />
							</div>
						</div>

						{/* Auth steps */}
						<AnimatePresence mode="wait" initial={false}>
							{step === 'phone' && (
								<StepWrapper key="phone">
									<PhoneStep
										phone={phone}
										setPhone={setPhone}
										onEmail={() => setStep('email')}
										onNext={() => setStep('otp')}
									/>
								</StepWrapper>
							)}
							{step === 'otp' && (
								<StepWrapper key="otp">
									<OTPStep
										phone={phone}
										onBack={() => setStep('phone')}
										onNeedsAccount={() => {
											setStep('create')
										}}
										onClaimable={(company) => {
											setClaimableCompany(company)
											setStep('claiming')
										}}
										onComplete={handleComplete}
									/>
								</StepWrapper>
							)}
							{step === 'email' && (
								<StepWrapper key="email">
									<EmailPasswordStep
										onBack={() => setStep('phone')}
										onComplete={handleComplete}
									/>
								</StepWrapper>
							)}
							{step === 'reset' && (
								<StepWrapper key="reset">
									<PasswordResetStep
										tokenHash={recoveryToken ?? ''}
										onBack={() => setStep('email')}
									/>
								</StepWrapper>
							)}
							{step === 'create' && (
								<StepWrapper key="create">
									<CreateStep phone={phone} onComplete={handleComplete} />
								</StepWrapper>
							)}
							{step === 'claiming' && (
								<StepWrapper key="claiming">
									<ClaimStep
										phone={phone}
										company={claimableCompany}
										onCreateInstead={() => setStep('create')}
										onComplete={handleComplete}
									/>
								</StepWrapper>
							)}
						</AnimatePresence>
						<div className="mt-8 border-t border-[var(--color-border)] pt-5">
							<LegalFooter />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

function AuthContextPanel() {
	const { t } = useTranslation('website')

	return (
		<section className="mx-auto flex w-full max-w-[660px] flex-col text-center lg:mx-0 lg:text-start">
			<p className="text-[12px] font-semibold uppercase tracking-normal text-[var(--color-primary)]">
				{t('login.context.eyebrow')}
			</p>
			<h1 className="mt-4 text-[clamp(2.25rem,8vw,4.75rem)] font-extrabold leading-[0.98] tracking-normal text-[var(--color-text)]">
				{t('login.context.heading')}
			</h1>
			<p className="mx-auto mt-5 max-w-[560px] text-[15px] leading-[1.75] text-[var(--color-text-muted)] sm:text-[16px] lg:mx-0">
				{t('login.context.body')}
			</p>

			<div className="mt-8 grid grid-cols-1 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 text-start sm:grid-cols-3 lg:mt-10">
				<AuthBenefit
					icon={<FileCheck2 size={18} />}
					title={t('login.context.benefits.quotes.title')}
					description={t('login.context.benefits.quotes.description')}
				/>
				<AuthBenefit
					icon={<Building2 size={18} />}
					title={t('login.context.benefits.projects.title')}
					description={t('login.context.benefits.projects.description')}
				/>
				<AuthBenefit
					icon={<Truck size={18} />}
					title={t('login.context.benefits.delivery.title')}
					description={t('login.context.benefits.delivery.description')}
				/>
			</div>

			<div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-[var(--color-text-subtle)] lg:justify-start">
				<span className="font-mono">{t('login.context.stat1')}</span>
				<span className="h-1 w-1 rounded-full bg-[var(--color-border)]" />
				<span className="font-mono">{t('login.context.stat2')}</span>
			</div>
		</section>
	)
}

function AuthBenefit({
	icon,
	title,
	description,
}: {
	icon: React.ReactNode
	title: string
	description: string
}) {
	return (
		<div className="border-b border-[var(--color-border)] p-4 last:border-b-0 sm:border-e sm:border-b-0 sm:last:border-e-0 md:p-5">
			<div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
				{icon}
			</div>
			<p className="text-[14px] font-semibold text-[var(--color-text)]">
				{title}
			</p>
			<p className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
				{description}
			</p>
		</div>
	)
}

// --------------------------------------------------------------------------
// Step wrapper — handles enter/exit animation
// --------------------------------------------------------------------------

function StepWrapper({ children }: { children: React.ReactNode }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -8 }}
			transition={transition}
		>
			{children}
		</motion.div>
	)
}

// --------------------------------------------------------------------------
// Phone Step
// --------------------------------------------------------------------------

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
	const { t } = useTranslation('website')
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [sendingMethod, setSendingMethod] = useState<'whatsapp' | 'sms' | null>(
		null,
	)
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	function validate(): boolean {
		if (!phone) {
			setError(t('login.phoneRequired'))
			return false
		}
		if (!EGYPT_MOBILE_REGEX.test(phone)) {
			setError(t('login.phoneInvalid'))
			return false
		}
		setError(null)
		return true
	}

	async function handleSend(method: 'whatsapp' | 'sms') {
		if (!validate()) return
		setLoading(true)
		setSendingMethod(method)
		setError(null)
		try {
			const result = await sendOTP({ data: { phone, method } })
			if (!result.success) {
				setError(
					result.error === 'rate_limited'
						? t('login.rateLimit')
						: t('login.sendFailed'),
				)
				return
			}
			onNext()
		} catch {
			setError(t('login.sendFailed'))
		} finally {
			setLoading(false)
			setSendingMethod(null)
		}
	}

	return (
		<div>
			<h2 className="text-[28px] font-bold leading-[1.08] tracking-normal text-[var(--color-text)] sm:text-[32px]">
				{t('login.step1.heading')}
			</h2>
			<p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
				{t('login.step1.subtitle')}
			</p>

			<div className="mt-7 sm:mt-8">
				{/* Phone input */}
				<label
					htmlFor="login-phone"
					className="mb-2 block text-start text-[13px] font-medium text-[var(--color-text-muted)]"
				>
					{t('login.phoneLabel')}
				</label>
				<PhoneNumberInput
					id="login-phone"
					inputRef={inputRef}
					ariaLabel={t('login.phoneLabel')}
					value={phone}
					onChange={(nextPhone) => {
						setPhone(nextPhone)
						if (error) setError(null)
					}}
					onEnter={() => handleSend('whatsapp')}
				/>
				<p className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-subtle)]">
					{t('login.phoneHint')}
				</p>

				{/* Error */}
				{error && (
					<p className="mt-3 text-start text-[13px] text-[var(--color-error)]">
						{error}
					</p>
				)}

				{/* WhatsApp button */}
				<button
					type="button"
					onClick={() => handleSend('whatsapp')}
					disabled={loading}
					className="mt-5 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:mt-6 sm:h-14"
				>
					{loading && sendingMethod === 'whatsapp' ? (
						<Spinner />
					) : (
						<>
							<MessageCircle size={20} aria-hidden="true" />
							{t('login.whatsappCTA')}
						</>
					)}
				</button>

				{/* SMS fallback */}
				<button
					type="button"
					onClick={() => handleSend('sms')}
					disabled={loading}
					className="mt-3 min-h-10 w-full text-center text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-50 sm:mt-4"
				>
					{loading && sendingMethod === 'sms' ? (
						<Spinner size={14} />
					) : (
						t('login.smsFallback')
					)}
				</button>

				<button
					type="button"
					onClick={onEmail}
					disabled={loading}
					className="mt-2 min-h-10 w-full text-center text-[13px] font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-text)] disabled:opacity-50"
				>
					{t('login.emailSwitch')}
				</button>
			</div>
		</div>
	)
}

// --------------------------------------------------------------------------
// OTP Step
// --------------------------------------------------------------------------

function OTPStep({
	phone,
	onBack,
	onNeedsAccount,
	onClaimable,
	onComplete,
}: {
	phone: string
	onBack: () => void
	onNeedsAccount: () => void
	onClaimable: (company: string) => void
	onComplete: () => void
}) {
	const { t } = useTranslation('website')
	const [code, setCode] = useState<string[]>(() => emptyOtpCode())
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [shaking, setShaking] = useState(false)
	const { resendCountdown, setResendCountdown } =
		useResendCountdown(RESEND_COOLDOWN)
	const inputRefs = useRef<(HTMLInputElement | null)[]>([])

	useEffect(() => {
		inputRefs.current[0]?.focus()
	}, [])

	const submitCode = useCallback(
		async (digits: string[]) => {
			setLoading(true)
			setError(null)
			try {
				const verification = await verifyOtpCode(phone, digits)
				if (verification.status === 'incomplete') return
				if (verification.status === 'error') {
					setError(
						verification.error === 'rate_limited'
							? t('login.rateLimit')
							: t('login.wrongCode'),
					)
					setShaking(true)
					setTimeout(() => {
						setShaking(false)
						resetOtpCode(inputRefs, setCode)
					}, 300)
					return
				}
				const { result } = verification
				if (result.claimableCompany) {
					onClaimable(result.claimableCompany)
				} else if (result.needsAccount) {
					onNeedsAccount()
				} else {
					onComplete()
				}
			} catch {
				setError(t('login.wrongCode'))
				setShaking(true)
				setTimeout(() => {
					setShaking(false)
					resetOtpCode(inputRefs, setCode)
				}, 300)
			} finally {
				setLoading(false)
			}
		},
		[phone, t, onClaimable, onNeedsAccount, onComplete],
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

	return (
		<div>
			<button
				type="button"
				onClick={onBack}
				className="mb-6 flex items-center gap-2 text-[13px] text-[var(--color-text-subtle)] transition-colors hover:text-[var(--color-text)]"
			>
				<ArrowLeft size={14} className="icon-end" />
				<span className="font-mono">
					{EGYPT_COUNTRY_CODE}
					{phone}
				</span>
			</button>

			<h2 className="text-[28px] font-bold leading-[1.08] tracking-normal text-[var(--color-text)] sm:text-[32px]">
				{t('login.step2.heading')}
			</h2>
			<p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
				{t('login.codeSent')}{' '}
				<span className="font-mono text-[var(--color-text)]">
					{EGYPT_COUNTRY_CODE}
					{phone}
				</span>
			</p>

			{/* OTP boxes — always LTR */}
			<OtpCodeInput
				code={code}
				onCodeChange={setCode}
				onComplete={submitCode}
				inputRefs={inputRefs}
				disabled={loading}
				shaking={shaking}
				ariaLabel={(index) => t('login.otpDigit', { n: index + 1 })}
			/>

			{error && (
				<p className="mt-4 text-center text-[13px] text-[var(--color-error)]">
					{error}
				</p>
			)}

			{loading && (
				<div className="mt-4 flex justify-center">
					<Spinner />
				</div>
			)}

			<OtpResendControl countdown={resendCountdown} onResend={handleResend} />
		</div>
	)
}

// --------------------------------------------------------------------------
// Email/password step
// --------------------------------------------------------------------------

function EmailPasswordStep({
	onBack,
	onComplete,
}: {
	onBack: () => void
	onComplete: () => void
}) {
	const { t } = useTranslation('website')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [notice, setNotice] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [resetLoading, setResetLoading] = useState(false)

	function validateEmailPassword(): boolean {
		if (!EMAIL_ADDRESS_REGEX.test(email.trim())) {
			setError(t('login.emailInvalid'))
			return false
		}
		if (password.length < 6) {
			setError(t('login.passwordInvalid'))
			return false
		}
		return true
	}

	async function handleSignIn() {
		if (!validateEmailPassword()) return
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
		<div>
			<button
				type="button"
				onClick={onBack}
				className="mb-6 flex items-center gap-2 text-[13px] text-[var(--color-text-subtle)] transition-colors hover:text-[var(--color-text)]"
			>
				<ArrowLeft size={14} className="icon-end" />
				<span>{t('login.phoneFirst')}</span>
			</button>

			<h2 className="text-[28px] font-bold leading-[1.08] tracking-normal text-[var(--color-text)] sm:text-[32px]">
				{t('login.emailSignInHeading')}
			</h2>
			<p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
				{t('login.emailSignInSubtitle')}
			</p>

			<div className="mt-7 flex flex-col gap-4">
				<AuthTextInput
					id="email-auth-email"
					label={t('login.emailLabel')}
					type="email"
					value={email}
					onChange={setEmail}
					onEnter={handleSignIn}
				/>
				<AuthTextInput
					id="email-auth-password"
					label={t('login.passwordLabel')}
					type="password"
					value={password}
					onChange={setPassword}
					onEnter={handleSignIn}
				/>
			</div>

			{error && (
				<p role="alert" className="mt-4 text-[13px] text-[var(--color-error)]">
					{error}
				</p>
			)}
			{notice && (
				<p
					role="status"
					className="mt-4 text-[13px] text-[var(--color-text-muted)]"
				>
					{notice}
				</p>
			)}

			<button
				type="button"
				onClick={handleSignIn}
				disabled={loading || resetLoading}
				className="mt-6 h-[54px] w-full rounded-xl bg-[var(--color-primary)] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:h-14"
			>
				{loading ? <Spinner /> : t('login.emailSignInButton')}
			</button>
			<button
				type="button"
				onClick={handlePasswordResetRequest}
				disabled={loading || resetLoading}
				className="mt-3 min-h-10 w-full text-center text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-50"
			>
				{resetLoading ? <Spinner size={14} /> : t('login.forgotPassword')}
			</button>
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
	const { t } = useTranslation('website')
	const [password, setPassword] = useState('')
	const [passwordConfirmation, setPasswordConfirmation] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
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

	if (complete) return <PasswordResetSuccessStep />

	return (
		<div>
			<button
				type="button"
				onClick={onBack}
				className="mb-6 flex items-center gap-2 text-[13px] text-[var(--color-text-subtle)] transition-colors hover:text-[var(--color-text)]"
			>
				<ArrowLeft size={14} className="icon-end" />
				<span>{t('login.emailSignInHeading')}</span>
			</button>
			<h2 className="text-[28px] font-bold leading-[1.08] tracking-normal text-[var(--color-text)] sm:text-[32px]">
				{t('login.resetPasswordHeading')}
			</h2>
			<p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
				{t('login.resetPasswordSubtitle')}
			</p>
			<div className="mt-7 flex flex-col gap-4">
				<AuthTextInput
					id="reset-password"
					label={t('login.newPasswordLabel')}
					type="password"
					value={password}
					onChange={setPassword}
					onEnter={handleResetPassword}
				/>
				<AuthTextInput
					id="reset-password-confirmation"
					label={t('login.confirmNewPasswordLabel')}
					type="password"
					value={passwordConfirmation}
					onChange={setPasswordConfirmation}
					onEnter={handleResetPassword}
				/>
			</div>
			{error && (
				<p role="alert" className="mt-4 text-[13px] text-[var(--color-error)]">
					{error}
				</p>
			)}
			<button
				type="button"
				onClick={handleResetPassword}
				disabled={loading}
				className="mt-6 h-[54px] w-full rounded-xl bg-[var(--color-primary)] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:h-14"
			>
				{loading ? <Spinner /> : t('login.resetPasswordButton')}
			</button>
		</div>
	)
}

function PasswordResetSuccessStep() {
	const { t } = useTranslation('website')
	return (
		<div className="text-center">
			<div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]">
				<Check size={22} />
			</div>
			<h2 className="text-[28px] font-bold leading-[1.08] tracking-normal text-[var(--color-text)] sm:text-[32px]">
				{t('login.passwordResetCompleteHeading')}
			</h2>
			<p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
				{t('login.passwordResetCompleteSubtitle')}
			</p>
			<div className="mt-7 grid gap-3 sm:grid-cols-2">
				<a
					href="/"
					className="flex h-12 items-center justify-center rounded-xl border border-[var(--color-border)] px-4 text-[14px] font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
				>
					{t('login.websiteButton')}
				</a>
				<a
					href={getPortalHref('/')}
					className="flex h-12 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
				>
					{t('login.portalButton')}
				</a>
			</div>
		</div>
	)
}

function AuthTextInput({
	id,
	label,
	type = 'text',
	value,
	onChange,
	onEnter,
}: {
	id: string
	label: string
	type?: 'email' | 'password' | 'text'
	value: string
	onChange: (value: string) => void
	onEnter: () => void
}) {
	return (
		<div>
			<label
				htmlFor={id}
				className="mb-2 block text-start text-[13px] font-medium text-[var(--color-text-muted)]"
			>
				{label}
			</label>
			<input
				id={id}
				type={type}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === 'Enter') onEnter()
				}}
				className="h-[54px] w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 text-[16px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] sm:h-14"
			/>
		</div>
	)
}

// --------------------------------------------------------------------------
// Create Account Step
// --------------------------------------------------------------------------

const accountSchema = z.object({
	companyName: z.string().min(1).max(200),
	fullName: z.string().min(1).max(100),
	email: z.string().optional(),
	password: z.string().optional(),
	passwordConfirmation: z.string().optional(),
})

type AccountFormData = z.infer<typeof accountSchema>

function CreateStep({
	phone,
	onComplete,
}: {
	phone: string
	onComplete: () => void
}) {
	const { t } = useTranslation('website')
	const [serverError, setServerError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<AccountFormData>({
		resolver: standardSchemaResolver(accountSchema),
		defaultValues: {
			companyName: '',
			email: '',
			fullName: '',
			password: '',
			passwordConfirmation: '',
		},
	})

	async function onSubmit(data: AccountFormData) {
		if (!EGYPT_MOBILE_REGEX.test(phone)) {
			setServerError(t('login.phoneInvalid'))
			return
		}
		const email = data.email?.trim() ?? ''
		const password = data.password ?? ''
		const passwordConfirmation = data.passwordConfirmation ?? ''
		const wantsEmailPassword = Boolean(
			email || password || passwordConfirmation,
		)
		if (wantsEmailPassword && !EMAIL_ADDRESS_REGEX.test(email)) {
			setServerError(t('login.emailInvalid'))
			return
		}
		if (wantsEmailPassword && password.length < 6) {
			setServerError(t('login.passwordInvalid'))
			return
		}
		if (wantsEmailPassword && password !== passwordConfirmation) {
			setServerError(t('login.passwordMismatch'))
			return
		}
		setLoading(true)
		setServerError(null)
		try {
			const result = await createAccount({
				data: {
					phone,
					companyName: data.companyName,
					fullName: data.fullName,
					method: 'phone_otp',
					...(wantsEmailPassword ? { email, password } : {}),
				},
			})
			if (!result.success) {
				setServerError(
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
			setServerError(t('login.createFailed'))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div>
			<h2 className="text-[28px] font-bold leading-[1.08] tracking-normal text-[var(--color-text)] sm:text-[32px]">
				{t('login.step3.heading')}
			</h2>
			<p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
				{t('login.step3.subtitle')}
			</p>

			<form
				onSubmit={handleSubmit(onSubmit)}
				className="mt-7 flex flex-col gap-5 sm:mt-8"
				noValidate
			>
				<div>
					<p className="mb-2 text-start text-[13px] font-medium text-[var(--color-text-muted)]">
						{t('login.verifiedPhone')}
					</p>
					<p className="h-[54px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-[15px] font-mono text-[16px] text-[var(--color-text)] sm:h-14">
						+20 {phone}
					</p>
				</div>
				<div>
					<label
						htmlFor="signup-company-name"
						className="mb-2 block text-start text-[13px] font-medium text-[var(--color-text-muted)]"
					>
						{t('login.companyName')}
					</label>
					<input
						id="signup-company-name"
						{...register('companyName')}
						className="h-[54px] w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 text-[16px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] sm:h-14"
					/>
					{errors.companyName && (
						<p className="mt-1.5 text-[12px] text-[var(--color-error)]">
							{errors.companyName.message}
						</p>
					)}
				</div>

				<div>
					<label
						htmlFor="signup-full-name"
						className="mb-2 block text-start text-[13px] font-medium text-[var(--color-text-muted)]"
					>
						{t('login.fullName')}
					</label>
					<input
						id="signup-full-name"
						{...register('fullName')}
						className="h-[54px] w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 text-[16px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] sm:h-14"
					/>
					{errors.fullName && (
						<p className="mt-1.5 text-[12px] text-[var(--color-error)]">
							{errors.fullName.message}
						</p>
					)}
				</div>

				<div className="border-y border-[var(--color-border)] py-5">
					<p className="text-start text-[13px] font-semibold text-[var(--color-text)]">
						{t('login.emailPasswordOptional')}
					</p>
					<div className="mt-4 flex flex-col gap-4">
						<div>
							<label
								htmlFor="signup-email"
								className="mb-2 block text-start text-[13px] font-medium text-[var(--color-text-muted)]"
							>
								{t('login.optionalEmailLabel')}
							</label>
							<input
								id="signup-email"
								type="email"
								{...register('email')}
								className="h-[54px] w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 text-[16px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] sm:h-14"
							/>
						</div>
						<div>
							<label
								htmlFor="signup-password"
								className="mb-2 block text-start text-[13px] font-medium text-[var(--color-text-muted)]"
							>
								{t('login.optionalPasswordLabel')}
							</label>
							<input
								id="signup-password"
								type="password"
								{...register('password')}
								className="h-[54px] w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 text-[16px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] sm:h-14"
							/>
						</div>
						<div>
							<label
								htmlFor="signup-password-confirmation"
								className="mb-2 block text-start text-[13px] font-medium text-[var(--color-text-muted)]"
							>
								{t('login.passwordConfirmLabel')}
							</label>
							<input
								id="signup-password-confirmation"
								type="password"
								{...register('passwordConfirmation')}
								className="h-[54px] w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 text-[16px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] sm:h-14"
							/>
						</div>
					</div>
				</div>

				{serverError && (
					<p className="text-[13px] text-[var(--color-error)]">{serverError}</p>
				)}

				<button
					type="submit"
					disabled={loading}
					className="mt-2 h-[54px] w-full rounded-xl bg-[var(--color-primary)] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:h-14"
				>
					{loading ? <Spinner /> : t('login.createButton')}
				</button>
			</form>
		</div>
	)
}

// --------------------------------------------------------------------------
// Claim Account Step
// --------------------------------------------------------------------------

function maskCompanyName(name: string): string {
	return name
		.split(' ')
		.map((word) => {
			if (word.length <= 1) return word
			return word[0] + '*'.repeat(word.length - 1)
		})
		.join(' ')
}

function ClaimStep({
	phone,
	company,
	onCreateInstead,
	onComplete,
}: {
	phone: string
	company: string | null
	onCreateInstead: () => void
	onComplete: () => void
}) {
	const { t } = useTranslation('website')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const masked = company ? maskCompanyName(company) : '****'

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
		<div>
			<h2 className="text-[28px] font-bold leading-[1.08] tracking-normal text-[var(--color-text)] sm:text-[32px]">
				{t('login.claiming.heading')}
			</h2>
			<p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
				{t('login.claiming.subtitle')}
			</p>

			<div className="mt-7 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-5 text-center sm:mt-8">
				<p className="font-mono text-[20px] font-semibold text-[var(--color-text)]">
					{masked}
				</p>
			</div>

			{error && (
				<p className="mt-4 text-center text-[13px] text-[var(--color-error)]">
					{error}
				</p>
			)}

			<button
				type="button"
				onClick={handleClaim}
				disabled={loading}
				className="mt-6 h-[54px] w-full rounded-xl bg-[var(--color-primary)] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:h-14"
			>
				{loading ? <Spinner /> : t('login.claiming.confirm')}
			</button>

			<button
				type="button"
				onClick={onCreateInstead}
				disabled={loading}
				className="mt-3 h-[54px] w-full rounded-xl border border-[var(--color-border)] text-[15px] font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)] disabled:opacity-50 sm:h-14"
			>
				{t('login.claiming.deny')}
			</button>
		</div>
	)
}

// --------------------------------------------------------------------------
// Legal footer + floating dialog with tab switcher
// --------------------------------------------------------------------------

type LegalTab = 'terms' | 'privacy'

function LegalFooter() {
	const { t } = useTranslation('website')
	const [open, setOpen] = useState(false)
	const [tab, setTab] = useState<LegalTab>('terms')

	const sections = tab === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS

	useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden'
			return () => {
				document.body.style.overflow = ''
			}
		}
	}, [open])

	return (
		<>
			<p className="px-2 text-center text-[11px] leading-relaxed text-[var(--color-text-muted)] sm:text-[12px]">
				{t('login.legalPrefix')}{' '}
				<button
					type="button"
					onClick={() => {
						setTab('terms')
						setOpen(true)
					}}
					className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
				>
					{t('login.termsLink')}
				</button>{' '}
				{t('login.and')}{' '}
				<button
					type="button"
					onClick={() => {
						setTab('privacy')
						setOpen(true)
					}}
					className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
				>
					{t('login.privacyLink')}
				</button>
			</p>

			<AnimatePresence>
				{open && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.15 }}
							className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
							onClick={() => setOpen(false)}
							onWheel={(e) => e.stopPropagation()}
						/>
						<motion.div
							initial={{ opacity: 0, y: 24, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 12, scale: 0.98 }}
							transition={{ duration: 0.2, ease: EASE }}
							className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[var(--color-base)] shadow-2xl sm:inset-x-0 sm:bottom-[10vh] sm:top-[10vh] sm:mx-auto sm:w-[min(88vw,520px)] sm:rounded-2xl md:bottom-[12vh] md:top-[12vh]"
						>
							{/* Header with tab switcher */}
							<div className="flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-end justify-between gap-3 border-b border-[var(--color-border)] px-4 pb-3 sm:h-14 sm:items-center sm:px-5 sm:pb-0">
								<div className="flex min-w-0 items-center gap-1 rounded-lg bg-[var(--color-surface)] p-1">
									<button
										type="button"
										onClick={() => setTab('terms')}
										className={`h-8 min-w-0 rounded-md px-3 text-[13px] font-medium transition-colors sm:px-4 ${
											tab === 'terms'
												? 'bg-[var(--color-base)] text-[var(--color-text)] shadow-sm'
												: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
										}`}
									>
										{t('login.termsLink')}
									</button>
									<button
										type="button"
										onClick={() => setTab('privacy')}
										className={`h-8 min-w-0 rounded-md px-3 text-[13px] font-medium transition-colors sm:px-4 ${
											tab === 'privacy'
												? 'bg-[var(--color-base)] text-[var(--color-text)] shadow-sm'
												: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
										}`}
									>
										{t('login.privacyLink')}
									</button>
								</div>
								<button
									type="button"
									onClick={() => setOpen(false)}
									aria-label={t('a11y.close')}
									className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
								>
									<X size={16} />
								</button>
							</div>

							{/* Scrollable content */}
							<div className="flex-1 overflow-y-auto px-5 py-7 pb-[calc(1.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:px-10">
								<div className="mx-auto max-w-[640px]">
									{sections.map((section, i) => (
										<div
											key={`${tab}-${section.number}`}
											className={i > 0 ? 'mt-10' : ''}
										>
											<p className="font-mono text-[11px] text-[var(--color-text-subtle)]">
												{section.number}
											</p>
											<h3 className="mt-1 text-[15px] font-semibold text-[var(--color-text)]">
												{section.title}
											</h3>
											<div className="mt-3 space-y-3">
												{section.content.map((p) => (
													<p
														key={p}
														className="text-[13px] leading-[1.75] text-[var(--color-text-muted)]"
													>
														{p}
													</p>
												))}
											</div>
											{i < sections.length - 1 && (
												<div className="mt-10 h-px bg-[var(--color-border)]" />
											)}
										</div>
									))}
								</div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	)
}

// --------------------------------------------------------------------------
// Shared spinner
// --------------------------------------------------------------------------

function Spinner({ size = 20 }: { size?: number }) {
	return (
		<span
			className="inline-block animate-spin rounded-full border-2 border-current/30 border-t-current"
			style={{ width: size, height: size }}
		/>
	)
}
