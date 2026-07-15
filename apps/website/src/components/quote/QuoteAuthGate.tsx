import { ArrowLeft, LoaderCircle, MessageCircle } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	claimAccount,
	createAccount,
	sendOTP,
	signInWithEmailPassword,
} from '../../lib/auth'
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

const RESEND_COOLDOWN = 30
const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AuthGateStep = 'claim' | 'create' | 'email' | 'otp' | 'phone'

export function QuoteAuthGate({
	onAuthenticated,
}: {
	onAuthenticated: () => Promise<void> | void
}) {
	const { t } = useTranslation('website')
	const [step, setStep] = useState<AuthGateStep>('phone')
	const [phone, setPhone] = useState('')
	const [claimableCompany, setClaimableCompany] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [code, setCode] = useState<string[]>(() => emptyOtpCode())
	const otpRefs = useRef<(HTMLInputElement | null)[]>([])
	const { resendCountdown, setResendCountdown } = useResendCountdown(0)

	const finishAuthentication = useCallback(async () => {
		window.dispatchEvent(new Event('hyperquote-account-updated'))
		await onAuthenticated()
	}, [onAuthenticated])

	async function handleSendOtp() {
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
				const verification = await verifyOtpCode(phone, digits)
				if (verification.status === 'incomplete') return
				if (verification.status === 'error') {
					setError(
						verification.error === 'rate_limited'
							? t('login.rateLimit')
							: t('login.wrongCode'),
					)
					resetOtpCode(otpRefs, setCode)
					return
				}
				if (verification.result.claimableCompany) {
					setClaimableCompany(verification.result.claimableCompany)
					setStep('claim')
					return
				}
				if (verification.result.needsAccount) {
					setStep('create')
					return
				}
				await finishAuthentication()
			} catch {
				setError(t('login.wrongCode'))
				resetOtpCode(otpRefs, setCode)
			} finally {
				setLoading(false)
			}
		},
		[finishAuthentication, phone, t],
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

	if (step === 'email') {
		return (
			<QuoteEmailSignIn
				onBack={() => {
					setError(null)
					setStep('phone')
				}}
				onAuthenticated={finishAuthentication}
			/>
		)
	}

	if (step === 'create') {
		return (
			<QuoteCreateAccount
				phone={phone}
				onAuthenticated={finishAuthentication}
			/>
		)
	}

	if (step === 'claim') {
		return (
			<QuoteClaimAccount
				company={claimableCompany}
				phone={phone}
				onAuthenticated={finishAuthentication}
				onCreateInstead={() => setStep('create')}
			/>
		)
	}

	if (step === 'otp') {
		return (
			<div className="mx-auto w-full max-w-[420px]">
				<button
					type="button"
					onClick={() => {
						setStep('phone')
						setError(null)
						resetOtpCode(otpRefs, setCode)
					}}
					className="mb-6 inline-flex items-center gap-2 text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
				>
					<ArrowLeft size={13} className="rtl:rotate-180" />
					<span dir="ltr" className="font-mono">
						{EGYPT_COUNTRY_CODE} {phone}
					</span>
				</button>
				<h3 className="text-[22px] font-semibold tracking-[-0.025em] text-[var(--color-text)]">
					{t('login.step2.heading')}
				</h3>
				<p className="mt-2 text-[13px] leading-6 text-[var(--color-text-muted)]">
					{t('login.codeSent')}{' '}
					<span dir="ltr" className="font-mono text-[var(--color-text)]">
						{EGYPT_COUNTRY_CODE} {phone}
					</span>
				</p>
				<OtpCodeInput
					code={code}
					onCodeChange={setCode}
					onComplete={submitCode}
					inputRefs={otpRefs}
					disabled={loading}
					ariaLabel={(index) => t('login.otpDigit', { n: index + 1 })}
				/>
				{error && <AuthError>{error}</AuthError>}
				{loading && <LoadingMark />}
				<OtpResendControl countdown={resendCountdown} onResend={handleResend} />
			</div>
		)
	}

	return (
		<div className="mx-auto w-full max-w-[420px]">
			<p className="hq-kicker text-[var(--color-primary)]">
				{t('quoteFlow.auth.eyebrow')}
			</p>
			<h3 className="mt-3 text-[22px] font-semibold tracking-[-0.025em] text-[var(--color-text)]">
				{t('quoteFlow.auth.heading')}
			</h3>
			<p className="mt-2 text-[13px] leading-6 text-[var(--color-text-muted)]">
				{t('quoteFlow.auth.body')}
			</p>
			<div className="mt-6">
				<PhoneNumberInput
					ariaLabel={t('login.phoneLabel')}
					value={phone}
					onChange={(nextPhone) => {
						setPhone(nextPhone)
						setError(null)
					}}
					onEnter={handleSendOtp}
				/>
			</div>
			{error && <AuthError>{error}</AuthError>}
			<button
				type="button"
				onClick={handleSendOtp}
				disabled={loading}
				className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#11773a] bg-[#168a43] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#11773a] disabled:opacity-50"
			>
				{loading ? (
					<LoaderCircle size={15} className="animate-spin" />
				) : (
					<MessageCircle size={15} aria-hidden="true" />
				)}
				{t('login.whatsappCTA')}
			</button>
			<button
				type="button"
				onClick={() => setStep('email')}
				disabled={loading}
				className="mt-3 h-10 w-full text-[12px] font-semibold text-[var(--color-primary)] hover:text-[var(--color-text)] disabled:opacity-50"
			>
				{t('login.emailSwitch')}
			</button>
		</div>
	)
}

function QuoteEmailSignIn({
	onAuthenticated,
	onBack,
}: {
	onAuthenticated: () => Promise<void>
	onBack: () => void
}) {
	const { t } = useTranslation('website')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	async function signIn() {
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
		try {
			const result = await signInWithEmailPassword({
				data: { email: email.trim(), password },
			})
			if (!result.success) {
				setError(t('login.emailSignInFailed'))
				return
			}
			await onAuthenticated()
		} catch {
			setError(t('login.emailSignInFailed'))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="mx-auto w-full max-w-[420px]">
			<AuthBack onClick={onBack}>{t('login.phoneFirst')}</AuthBack>
			<h3 className="text-[22px] font-semibold tracking-[-0.025em] text-[var(--color-text)]">
				{t('login.emailSignInHeading')}
			</h3>
			<p className="mt-2 text-[13px] leading-6 text-[var(--color-text-muted)]">
				{t('login.emailSignInSubtitle')}
			</p>
			<div className="mt-6 grid gap-4">
				<AuthInput
					id="quote-auth-email"
					label={t('login.emailLabel')}
					type="email"
					value={email}
					onChange={setEmail}
					onEnter={signIn}
				/>
				<AuthInput
					id="quote-auth-password"
					label={t('login.passwordLabel')}
					type="password"
					value={password}
					onChange={setPassword}
					onEnter={signIn}
				/>
			</div>
			{error && <AuthError>{error}</AuthError>}
			<AuthPrimaryButton loading={loading} onClick={signIn}>
				{t('login.emailSignInButton')}
			</AuthPrimaryButton>
		</div>
	)
}

function QuoteCreateAccount({
	onAuthenticated,
	phone,
}: {
	onAuthenticated: () => Promise<void>
	phone: string
}) {
	const { t } = useTranslation('website')
	const [companyName, setCompanyName] = useState('')
	const [fullName, setFullName] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	async function create() {
		if (!companyName.trim() || !fullName.trim()) {
			setError(t('quoteFlow.auth.accountFieldsRequired'))
			return
		}
		setLoading(true)
		setError(null)
		try {
			const result = await createAccount({
				data: {
					companyName: companyName.trim(),
					fullName: fullName.trim(),
					method: 'phone_otp',
					phone,
				},
			})
			if (!result.success) {
				setError(t('login.createFailed'))
				return
			}
			await onAuthenticated()
		} catch {
			setError(t('login.createFailed'))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="mx-auto w-full max-w-[420px]">
			<h3 className="text-[22px] font-semibold tracking-[-0.025em] text-[var(--color-text)]">
				{t('login.step3.heading')}
			</h3>
			<p className="mt-2 text-[13px] leading-6 text-[var(--color-text-muted)]">
				{t('login.step3.subtitle')}
			</p>
			<p
				dir="ltr"
				className="mt-5 border-y border-[var(--site-rule)] py-3 text-[12px] font-mono text-[var(--color-text-muted)]"
			>
				{EGYPT_COUNTRY_CODE} {phone}
			</p>
			<div className="mt-5 grid gap-4">
				<AuthInput
					id="quote-account-company"
					label={t('login.companyName')}
					value={companyName}
					onChange={setCompanyName}
					onEnter={create}
				/>
				<AuthInput
					id="quote-account-name"
					label={t('login.fullName')}
					value={fullName}
					onChange={setFullName}
					onEnter={create}
				/>
			</div>
			{error && <AuthError>{error}</AuthError>}
			<AuthPrimaryButton loading={loading} onClick={create}>
				{t('login.createButton')}
			</AuthPrimaryButton>
		</div>
	)
}

function QuoteClaimAccount({
	company,
	onAuthenticated,
	onCreateInstead,
	phone,
}: {
	company: string | null
	onAuthenticated: () => Promise<void>
	onCreateInstead: () => void
	phone: string
}) {
	const { t } = useTranslation('website')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function claim() {
		setLoading(true)
		setError(null)
		try {
			const result = await claimAccount({ data: { phone } })
			if (!result.success) {
				setError(t('login.claimFailed'))
				return
			}
			await onAuthenticated()
		} catch {
			setError(t('login.claimFailed'))
		} finally {
			setLoading(false)
		}
	}

	const maskedCompany = (company ?? '****')
		.split(' ')
		.map((word) =>
			word.length <= 1 ? word : `${word[0]}${'*'.repeat(word.length - 1)}`,
		)
		.join(' ')

	return (
		<div className="mx-auto w-full max-w-[420px] text-center">
			<h3 className="text-[22px] font-semibold tracking-[-0.025em] text-[var(--color-text)]">
				{t('login.claiming.heading')}
			</h3>
			<p className="mt-2 text-[13px] leading-6 text-[var(--color-text-muted)]">
				{t('login.claiming.subtitle')}
			</p>
			<p className="mt-5 border-y border-[var(--site-rule)] py-4 font-mono text-[16px] font-semibold text-[var(--color-text)]">
				{maskedCompany}
			</p>
			{error && <AuthError>{error}</AuthError>}
			<AuthPrimaryButton loading={loading} onClick={claim}>
				{t('login.claiming.confirm')}
			</AuthPrimaryButton>
			<button
				type="button"
				disabled={loading}
				onClick={onCreateInstead}
				className="mt-2 h-10 w-full text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-50"
			>
				{t('login.claiming.deny')}
			</button>
		</div>
	)
}

function AuthInput({
	id,
	label,
	onChange,
	onEnter,
	type = 'text',
	value,
}: {
	id: string
	label: string
	onChange: (value: string) => void
	onEnter: () => void
	type?: 'email' | 'password' | 'text'
	value: string
}) {
	return (
		<label htmlFor={id} className="block text-start">
			<span className="mb-1.5 block text-[11px] font-semibold text-[var(--color-text-muted)]">
				{label}
			</span>
			<input
				id={id}
				type={type}
				value={value}
				onChange={(event) => onChange(event.currentTarget.value)}
				onKeyDown={(event) => {
					if (event.key === 'Enter') onEnter()
				}}
				className="h-11 w-full rounded-[10px] border border-[var(--site-rule)] bg-transparent px-3 text-[14px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
			/>
		</label>
	)
}

function AuthBack({
	children,
	onClick,
}: {
	children: React.ReactNode
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="mb-6 inline-flex items-center gap-2 text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
		>
			<ArrowLeft size={13} className="rtl:rotate-180" />
			{children}
		</button>
	)
}

function AuthPrimaryButton({
	children,
	loading,
	onClick,
}: {
	children: React.ReactNode
	loading: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			disabled={loading}
			onClick={onClick}
			className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#1d4ed8] bg-[#2563eb] px-4 text-[12px] font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
		>
			{loading && <LoaderCircle size={15} className="animate-spin" />}
			{children}
		</button>
	)
}

function AuthError({ children }: { children: React.ReactNode }) {
	return (
		<p role="alert" className="mt-3 text-[12px] text-[var(--color-error)]">
			{children}
		</p>
	)
}

function LoadingMark() {
	return (
		<div className="mt-3 flex justify-center">
			<LoaderCircle
				size={16}
				className="animate-spin text-[var(--color-primary)]"
			/>
		</div>
	)
}
