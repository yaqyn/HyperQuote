import { standardSchemaResolver } from '@hyperquote/forms'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, X } from 'lucide-react'
import { AnimatePresence, cubicBezier, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { PRIVACY_SECTIONS, TERMS_SECTIONS } from '../../content/legal'
import { claimAccount, createAccount, sendOTP, verifyOTP } from '../../lib/auth'

export const Route = createFileRoute('/_website/login')({
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

type AuthStep = 'phone' | 'otp' | 'create' | 'claiming'

const PHONE_REGEX = /^(10|11|12|15)\d{8}$/
const OTP_LENGTH = 6
const OTP_SLOTS = Array.from(
	{ length: OTP_LENGTH },
	(_, i) => `otp-slot-${i}` as const,
)
const RESEND_COOLDOWN = 30

const EASE = cubicBezier(0.25, 0.1, 0.25, 1)
const transition = { duration: 0.25, ease: EASE }

// --------------------------------------------------------------------------

function LoginPage() {
	const navigate = useNavigate()
	const [step, setStep] = useState<AuthStep>('phone')
	const [phone, setPhone] = useState('')
	const [claimableCompany, setClaimableCompany] = useState<string | null>(null)

	const handleComplete = () => {
		navigate({ to: '/market' })
	}

	return (
		<div className="relative flex min-h-svh items-center justify-center px-6 py-24">
			{/* Noise texture overlay */}
			<div
				className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
				style={{
					backgroundImage: 'url(/noise.png)',
					backgroundRepeat: 'repeat',
				}}
			/>

			<div className="relative z-10 w-full max-w-[400px]">
				{/* Auth steps */}
				<AnimatePresence mode="wait" initial={false}>
					{step === 'phone' && (
						<StepWrapper key="phone">
							<PhoneStep
								phone={phone}
								setPhone={setPhone}
								onNext={() => setStep('otp')}
							/>
						</StepWrapper>
					)}
					{step === 'otp' && (
						<StepWrapper key="otp">
							<OTPStep
								phone={phone}
								onBack={() => setStep('phone')}
								onNeedsAccount={() => setStep('create')}
								onClaimable={(company) => {
									setClaimableCompany(company)
									setStep('claiming')
								}}
								onComplete={handleComplete}
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
			</div>

			{/* Legal — fixed bottom */}
			<div className="fixed bottom-0 inset-x-0 z-10 pb-6 pointer-events-none">
				<LegalFooter />
			</div>
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
	onNext,
}: {
	phone: string
	setPhone: (v: string) => void
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
		if (!PHONE_REGEX.test(phone)) {
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
			<h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
				{t('login.step1.heading')}
			</h1>

			<div className="mt-10">
				{/* Phone input */}
				<div className="flex items-center gap-3">
					<div className="flex h-14 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4">
						<span className="text-[15px]" aria-hidden="true">
							🇪🇬
						</span>
						<span className="font-mono text-[15px] text-[var(--color-text-muted)]">
							+20
						</span>
					</div>
					<input
						ref={inputRef}
						type="tel"
						inputMode="numeric"
						placeholder=""
						value={phone}
						onChange={(e) => {
							const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
							setPhone(digits)
							if (error) setError(null)
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleSend('whatsapp')
						}}
						className="h-14 flex-1 rounded-xl border border-[var(--color-border)] bg-transparent px-4 font-mono text-[18px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none transition-colors focus:border-[var(--color-primary)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					/>
				</div>

				{/* Error */}
				{error && (
					<p className="mt-3 text-[13px] text-[var(--color-error)]">{error}</p>
				)}

				{/* WhatsApp button */}
				<button
					type="button"
					onClick={() => handleSend('whatsapp')}
					disabled={loading}
					className="mt-6 flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					{loading && sendingMethod === 'whatsapp' ? (
						<Spinner />
					) : (
						<>
							<svg
								width={20}
								height={20}
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden="true"
							>
								<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
							</svg>
							{t('login.whatsappCTA')}
						</>
					)}
				</button>

				{/* SMS fallback */}
				<button
					type="button"
					onClick={() => handleSend('sms')}
					disabled={loading}
					className="mt-4 w-full text-center text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
				>
					{loading && sendingMethod === 'sms' ? (
						<Spinner size={14} />
					) : (
						t('login.smsFallback')
					)}
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
	const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''))
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [shaking, setShaking] = useState(false)
	const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN)
	const inputRefs = useRef<(HTMLInputElement | null)[]>([])

	useEffect(() => {
		if (resendCountdown <= 0) return
		const timer = setInterval(
			() => setResendCountdown((p) => Math.max(0, p - 1)),
			1000,
		)
		return () => clearInterval(timer)
	}, [resendCountdown])

	useEffect(() => {
		inputRefs.current[0]?.focus()
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
					setShaking(true)
					setTimeout(() => {
						setShaking(false)
						setCode(Array(OTP_LENGTH).fill(''))
						inputRefs.current[0]?.focus()
					}, 300)
					return
				}
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
					setCode(Array(OTP_LENGTH).fill(''))
					inputRefs.current[0]?.focus()
				}, 300)
			} finally {
				setLoading(false)
			}
		},
		[phone, t, onClaimable, onNeedsAccount, onComplete],
	)

	function handleInput(index: number, value: string) {
		const digit = value.replace(/\D/g, '').slice(-1)
		const newCode = [...code]
		newCode[index] = digit
		setCode(newCode)
		if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
		if (digit && newCode.every((d) => d !== '')) submitCode(newCode)
	}

	function handleKeyDown(index: number, e: React.KeyboardEvent) {
		if (e.key === 'Backspace' && !code[index] && index > 0)
			inputRefs.current[index - 1]?.focus()
	}

	function handlePaste(e: React.ClipboardEvent) {
		e.preventDefault()
		const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
		if (!pasted.length) return
		const chars = pasted.slice(0, OTP_LENGTH).split('')
		const newCode = [...code]
		for (let i = 0; i < chars.length; i++) newCode[i] = chars[i]
		setCode(newCode)
		const nextEmpty = newCode.findIndex((d) => !d)
		if (nextEmpty >= 0) inputRefs.current[nextEmpty]?.focus()
		else {
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
		<div>
			<button
				type="button"
				onClick={onBack}
				className="mb-8 flex items-center gap-2 text-[13px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
			>
				<ArrowLeft size={14} className="icon-end" />
				<span className="font-mono">+20{phone}</span>
			</button>

			<h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
				{t('login.step2.heading')}
			</h1>
			<p className="mt-3 text-[14px] text-[var(--color-text-muted)]">
				{t('login.codeSent')}{' '}
				<span className="font-mono text-[var(--color-text)]">+20{phone}</span>
			</p>

			{/* OTP boxes — always LTR */}
			<motion.div
				dir="ltr"
				className="mt-10 flex justify-center gap-2.5"
				animate={shaking ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
				transition={{ duration: 0.2 }}
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
						aria-label={t('login.otpDigit', { n: i + 1 })}
						className="h-14 w-12 rounded-xl border border-[var(--color-border)] bg-transparent text-center font-mono text-[22px] font-semibold text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] disabled:opacity-50"
					/>
				))}
			</motion.div>

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

			<div className="mt-6 text-center text-[13px]">
				{resendCountdown > 0 ? (
					<span className="text-[var(--color-text-subtle)]">
						{t('login.resendIn')}{' '}
						<span className="font-mono">{resendCountdown}s</span>
					</span>
				) : (
					<button
						type="button"
						onClick={handleResend}
						className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
					>
						{t('login.resend')}
					</button>
				)}
			</div>
		</div>
	)
}

// --------------------------------------------------------------------------
// Create Account Step
// --------------------------------------------------------------------------

const accountSchema = z.object({
	companyName: z.string().min(1).max(200),
	fullName: z.string().min(1).max(100),
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
		control,
		formState: { errors },
	} = useForm<AccountFormData>({
		resolver: standardSchemaResolver(accountSchema),
		defaultValues: { companyName: '', fullName: '' },
	})

	const _companyName = useWatch({ control, name: 'companyName' })
	const _fullName = useWatch({ control, name: 'fullName' })

	async function onSubmit(data: AccountFormData) {
		setLoading(true)
		setServerError(null)
		try {
			const result = await createAccount({
				data: { phone, companyName: data.companyName, fullName: data.fullName },
			})
			if (!result.success) {
				setServerError(t('login.createFailed'))
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
			<h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
				{t('login.step3.heading')}
			</h1>

			<form
				onSubmit={handleSubmit(onSubmit)}
				className="mt-10 flex flex-col gap-5"
				noValidate
			>
				<div>
					<span className="mb-2 block text-[13px] font-medium text-[var(--color-text-muted)]">
						{t('login.companyName')}
					</span>
					<input
						{...register('companyName')}
						className="h-14 w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 text-[16px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]"
					/>
					{errors.companyName && (
						<p className="mt-1.5 text-[12px] text-[var(--color-error)]">
							{errors.companyName.message}
						</p>
					)}
				</div>

				<div>
					<span className="mb-2 block text-[13px] font-medium text-[var(--color-text-muted)]">
						{t('login.fullName')}
					</span>
					<input
						{...register('fullName')}
						className="h-14 w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 text-[16px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]"
					/>
					{errors.fullName && (
						<p className="mt-1.5 text-[12px] text-[var(--color-error)]">
							{errors.fullName.message}
						</p>
					)}
				</div>

				{serverError && (
					<p className="text-[13px] text-[var(--color-error)]">{serverError}</p>
				)}

				<button
					type="submit"
					disabled={loading}
					className="mt-2 h-14 w-full rounded-xl bg-[var(--color-primary)] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
			<h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
				{t('login.claiming.heading')}
			</h1>

			<div className="mt-10 rounded-xl bg-[var(--color-surface)] py-5 text-center">
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
				className="mt-6 h-14 w-full rounded-xl bg-[var(--color-primary)] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{loading ? <Spinner /> : t('login.claiming.confirm')}
			</button>

			<button
				type="button"
				onClick={onCreateInstead}
				disabled={loading}
				className="mt-3 h-14 w-full rounded-xl border border-[var(--color-border)] text-[15px] font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)] disabled:opacity-50"
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
			<motion.p
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ ...transition, delay: 0.3 }}
				className="text-center text-[12px] leading-relaxed text-[var(--color-text-subtle)] pointer-events-auto"
			>
				{t('login.legalPrefix')}{' '}
				<button
					type="button"
					onClick={() => {
						setTab('terms')
						setOpen(true)
					}}
					className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
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
					className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
				>
					{t('login.privacyLink')}
				</button>
			</motion.p>

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
							className="fixed inset-x-0 top-[12vh] bottom-[12vh] z-50 mx-auto flex w-[min(88vw,480px)] flex-col overflow-hidden rounded-2xl bg-[var(--color-base)] shadow-2xl"
						>
							{/* Header with tab switcher */}
							<div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5">
								<div className="flex items-center gap-1 rounded-lg bg-[var(--color-surface)] p-1">
									<button
										type="button"
										onClick={() => setTab('terms')}
										className={`h-8 rounded-md px-4 text-[13px] font-medium transition-colors ${
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
										className={`h-8 rounded-md px-4 text-[13px] font-medium transition-colors ${
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
									className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
								>
									<X size={16} />
								</button>
							</div>

							{/* Scrollable content */}
							<div className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
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
