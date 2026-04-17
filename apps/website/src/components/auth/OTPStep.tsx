import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLoginModal } from '../../hooks/useLoginModal'
import { sendOTP, verifyOTP } from '../../lib/auth'

const OTP_LENGTH = 6
const OTP_SLOTS = Array.from(
	{ length: OTP_LENGTH },
	(_, i) => `otp-slot-${i}` as const,
)
const RESEND_COOLDOWN = 30

export function OTPStep() {
	const { t } = useTranslation('website')
	const { phone, setStep, setClaimableCompany, close } = useLoginModal()
	const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''))
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [shaking, setShaking] = useState(false)
	const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN)
	const inputRefs = useRef<(HTMLInputElement | null)[]>([])

	// Resend countdown timer
	useEffect(() => {
		if (resendCountdown <= 0) return
		const timer = setInterval(() => {
			setResendCountdown((prev) => Math.max(0, prev - 1))
		}, 1000)
		return () => clearInterval(timer)
	}, [resendCountdown])

	// Focus first input on mount
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
					if (result.error === 'rate_limited') {
						setError(t('login.rateLimit'))
					} else {
						setError(t('login.wrongCode'))
					}
					// Shake and clear
					setShaking(true)
					setTimeout(() => {
						setShaking(false)
						setCode(Array(OTP_LENGTH).fill(''))
						inputRefs.current[0]?.focus()
					}, 300)
					return
				}

				// Determine next step
				if (result.claimableCompany) {
					setClaimableCompany(result.claimableCompany)
					setStep('claiming')
				} else if (result.needsAccount) {
					setStep('create')
				} else {
					// Existing user with account -- close modal
					close()
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
		[phone, t, setStep, setClaimableCompany, close],
	)

	function handleInput(index: number, value: string) {
		// Accept only digits
		const digit = value.replace(/\D/g, '').slice(-1)
		const newCode = [...code]
		newCode[index] = digit
		setCode(newCode)

		if (digit && index < OTP_LENGTH - 1) {
			// Auto-advance to next box
			inputRefs.current[index + 1]?.focus()
		}

		// Auto-submit when all filled
		if (digit && newCode.every((d) => d !== '')) {
			submitCode(newCode)
		}
	}

	function handleKeyDown(index: number, e: React.KeyboardEvent) {
		if (e.key === 'Backspace' && !code[index] && index > 0) {
			// Focus previous on backspace with empty value
			inputRefs.current[index - 1]?.focus()
		}
	}

	function handlePaste(e: React.ClipboardEvent) {
		e.preventDefault()
		const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
		if (pasted.length === 0) return

		const chars = pasted.slice(0, OTP_LENGTH).split('')
		const newCode = [...code]
		for (let i = 0; i < chars.length; i++) {
			newCode[i] = chars[i]
		}
		setCode(newCode)

		// Focus appropriate input
		const nextEmpty = newCode.findIndex((d) => !d)
		if (nextEmpty >= 0) {
			inputRefs.current[nextEmpty]?.focus()
		} else {
			inputRefs.current[OTP_LENGTH - 1]?.focus()
			// Auto-submit
			submitCode(newCode)
		}
	}

	async function handleResend() {
		setError(null)
		setResendCountdown(RESEND_COOLDOWN)
		try {
			await sendOTP({ data: { phone, method: 'whatsapp' } })
		} catch {
			setError(
				t('login.sendFailed', 'Failed to resend code. Please try again.'),
			)
		}
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Heading */}
			<div>
				<h2 className="text-[30px] font-bold leading-[1.2]">
					{t('login.step2.heading')}
				</h2>
				<p className="mt-2 text-sm text-[var(--color-text-muted)]">
					{t('login.codeSent', 'Code sent to')}
					<span className="ms-1 font-[family-name:var(--font-geist-mono)]">
						+20{phone}
					</span>
				</p>
			</div>

			{/* OTP Input Boxes -- ALWAYS LTR */}
			<motion.div
				dir="ltr"
				className="flex justify-center gap-2"
				animate={shaking ? { x: [0, -4, 4, -4, 4, 0] } : { x: 0 }}
				transition={{ duration: 0.15 }}
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
						className="h-12 w-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-center font-[family-name:var(--font-geist-mono)] text-base outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-50"
					/>
				))}
			</motion.div>

			{/* Error */}
			{error && (
				<p className="text-center text-sm text-[var(--color-error)]">{error}</p>
			)}

			{/* Loading indicator */}
			{loading && (
				<div className="flex justify-center">
					<span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]" />
				</div>
			)}

			{/* Resend */}
			<div className="text-center text-sm">
				{resendCountdown > 0 ? (
					<span className="text-[var(--color-text-muted)]">
						{t('login.resendIn', 'Resend in')}{' '}
						<span className="font-[family-name:var(--font-geist-mono)]">
							{resendCountdown}s
						</span>
					</span>
				) : (
					<button
						type="button"
						onClick={handleResend}
						className="text-[var(--color-primary)] hover:underline"
					>
						{t('login.resend')}
					</button>
				)}
			</div>
		</div>
	)
}
