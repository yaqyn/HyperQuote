import { useMemo } from 'react'

/**
 * Smart Egyptian phone input:
 *   - Always pinned to the +20 country code
 *   - Accepts raw digits or leading 0; strips everything that isn't a digit
 *   - Masks the value as "+20 1xx xxx xxxx" as the user types
 *   - Caller gets the normalized national digits (10 chars, no country code)
 *
 * Usage: `<PhoneInput value={digits} onChange={setDigits} />`
 */

interface PhoneInputProps {
	value: string
	onChange: (digits: string) => void
	className?: string
	inputClassName?: string
	placeholder?: string
	id?: string
	/** aria-invalid passthrough for field-level error wiring. */
	ariaInvalid?: boolean
	/** aria-describedby passthrough — point at the inline error id. */
	ariaDescribedBy?: string
	/** Called when the field blurs — parents use this to fire validation. */
	onBlur?: () => void
}

/** Strip to digits and drop leading 0/20/+20 so we always hold 10 national digits. */
export function normalizeEGPhone(raw: string): string {
	let digits = raw.replace(/\D/g, '')
	if (digits.startsWith('20')) digits = digits.slice(2)
	if (digits.startsWith('0')) digits = digits.slice(1)
	return digits.slice(0, 10)
}

/** Pretty-print 10 national digits as "1xx xxx xxxx". */
export function formatEGPhone(digits: string): string {
	const n = normalizeEGPhone(digits)
	if (n.length === 0) return ''
	const parts: string[] = []
	if (n.length >= 3) parts.push(n.slice(0, 3))
	else parts.push(n)
	if (n.length > 3) {
		if (n.length >= 6) parts.push(n.slice(3, 6))
		else parts.push(n.slice(3))
	}
	if (n.length > 6) parts.push(n.slice(6, 10))
	return parts.join(' ')
}

/** Returns the full E.164-ish string the server stores. */
export function toFullPhone(digits: string): string {
	const n = normalizeEGPhone(digits)
	return n.length === 0 ? '' : `+20 ${formatEGPhone(n)}`
}

export function isValidEGPhone(digits: string): boolean {
	const n = normalizeEGPhone(digits)
	// Egyptian mobiles are 10 digits starting with 1 (010, 011, 012, 015 after 0-strip → 10/11/12/15)
	return n.length === 10 && n.startsWith('1')
}

export function PhoneInput({
	value,
	onChange,
	className = '',
	inputClassName = '',
	placeholder = '1xx xxx xxxx',
	id,
	ariaInvalid,
	ariaDescribedBy,
	onBlur,
}: PhoneInputProps) {
	const display = useMemo(() => formatEGPhone(value), [value])

	return (
		<div className={`flex items-baseline gap-2 ${className}`}>
			<span
				aria-hidden="true"
				className="font-[family-name:var(--font-geist-mono)] text-[14px] text-black/40 dark:text-white/40 select-none"
			>
				+20
			</span>
			<input
				id={id}
				type="tel"
				inputMode="numeric"
				autoComplete="tel"
				value={display}
				onChange={(e) => onChange(normalizeEGPhone(e.target.value))}
				onBlur={onBlur}
				placeholder={placeholder}
				aria-invalid={ariaInvalid}
				aria-describedby={ariaDescribedBy}
				className={`flex-1 bg-transparent font-[family-name:var(--font-geist-mono)] text-[14px] text-[var(--color-text)] placeholder:text-black/25 dark:placeholder:text-white/25 outline-none ${inputClassName}`}
			/>
		</div>
	)
}
