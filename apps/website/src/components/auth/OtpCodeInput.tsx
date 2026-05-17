import { motion } from 'motion/react'
import type { ClipboardEvent, KeyboardEvent, RefObject } from 'react'
import { OTP_LENGTH, OTP_SLOTS } from './authFields'

interface OtpCodeInputProps {
	code: string[]
	onCodeChange: (code: string[]) => void
	onComplete: (code: string[]) => void
	inputRefs: RefObject<(HTMLInputElement | null)[]>
	ariaLabel: (index: number) => string
	disabled?: boolean
	shaking?: boolean
	variant?: 'full' | 'compact'
}

export function OtpCodeInput({
	code,
	onCodeChange,
	onComplete,
	inputRefs,
	ariaLabel,
	disabled = false,
	shaking = false,
	variant = 'full',
}: OtpCodeInputProps) {
	function handleInput(index: number, value: string) {
		const digit = value.replace(/\D/g, '').slice(-1)
		const nextCode = [...code]
		nextCode[index] = digit
		onCodeChange(nextCode)
		if (digit && index < OTP_LENGTH - 1) {
			inputRefs.current[index + 1]?.focus()
		}
		if (digit && nextCode.every((d) => d !== '')) {
			onComplete(nextCode)
		}
	}

	function handleKeyDown(index: number, event: KeyboardEvent) {
		if (event.key === 'Backspace' && !code[index] && index > 0) {
			inputRefs.current[index - 1]?.focus()
		}
	}

	function handlePaste(event: ClipboardEvent) {
		event.preventDefault()
		const pasted = event.clipboardData.getData('text').replace(/\D/g, '')
		if (!pasted.length) return

		const chars = pasted.slice(0, OTP_LENGTH).split('')
		const nextCode = [...code]
		for (let i = 0; i < chars.length; i++) {
			nextCode[i] = chars[i]
		}
		onCodeChange(nextCode)

		const nextEmpty = nextCode.findIndex((d) => !d)
		if (nextEmpty >= 0) {
			inputRefs.current[nextEmpty]?.focus()
			return
		}

		inputRefs.current[OTP_LENGTH - 1]?.focus()
		onComplete(nextCode)
	}

	return (
		<motion.div
			dir="ltr"
			className={
				variant === 'compact'
					? 'flex justify-center gap-1.5'
					: 'mt-7 grid grid-cols-6 gap-2 sm:mt-8 sm:gap-2.5'
			}
			animate={shaking ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
			transition={{ duration: 0.2 }}
			onPaste={handlePaste}
		>
			{OTP_SLOTS.map((slot, i) => (
				<input
					key={slot}
					ref={(element) => {
						inputRefs.current[i] = element
					}}
					type="tel"
					inputMode="numeric"
					maxLength={1}
					value={code[i] ?? ''}
					onChange={(event) => handleInput(i, event.target.value)}
					onKeyDown={(event) => handleKeyDown(i, event)}
					disabled={disabled}
					aria-label={ariaLabel(i)}
					className={
						variant === 'compact'
							? 'h-9 w-9 rounded-lg border border-[var(--color-border)] bg-transparent text-center font-mono text-[15px] font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] disabled:opacity-50'
							: 'h-12 w-full rounded-xl border border-[var(--color-border)] bg-transparent text-center font-mono text-[21px] font-semibold text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] disabled:opacity-50 sm:h-14 sm:text-[22px]'
					}
				/>
			))}
		</motion.div>
	)
}
