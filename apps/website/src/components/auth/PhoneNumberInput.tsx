import type { RefObject } from 'react'
import { EGYPT_COUNTRY_CODE, sanitizeAuthPhoneInput } from './authFields'

interface PhoneNumberInputProps {
	value: string
	onChange: (value: string) => void
	ariaLabel: string
	id?: string
	inputRef?: RefObject<HTMLInputElement | null>
	onEnter?: () => void
	variant?: 'full' | 'compact'
}

export function PhoneNumberInput({
	value,
	onChange,
	ariaLabel,
	id,
	inputRef,
	onEnter,
	variant = 'full',
}: PhoneNumberInputProps) {
	const handleChange = (nextValue: string) => {
		onChange(sanitizeAuthPhoneInput(nextValue))
	}

	const input = (
		<input
			id={id}
			ref={inputRef}
			type="tel"
			inputMode="numeric"
			aria-label={ariaLabel}
			value={value}
			onChange={(event) => handleChange(event.target.value)}
			onKeyDown={(event) => {
				if (event.key === 'Enter') onEnter?.()
			}}
			className={
				variant === 'compact'
					? 'h-9 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-3 font-mono text-[14px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]'
					: 'h-[54px] min-w-0 rounded-xl border border-[var(--color-border)] bg-transparent px-4 font-mono text-[18px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] sm:h-14 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
			}
		/>
	)

	if (variant === 'compact') {
		return (
			<div className="flex items-center gap-2">
				<CountryCodePill variant="compact" />
				{input}
			</div>
		)
	}

	return (
		<div
			className="grid grid-cols-[6.75rem_minmax(0,1fr)] items-center gap-2.5 sm:grid-cols-[7.25rem_minmax(0,1fr)] sm:gap-3"
			dir="ltr"
		>
			<CountryCodePill variant="full" />
			{input}
		</div>
	)
}

function CountryCodePill({ variant }: { variant: 'full' | 'compact' }) {
	if (variant === 'compact') {
		return (
			<span className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-[12px] text-[var(--color-text-muted)]">
				<span aria-hidden="true">🇪🇬</span>
				<span className="font-mono">{EGYPT_COUNTRY_CODE}</span>
			</span>
		)
	}

	return (
		<div className="flex h-[54px] shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 sm:h-14 sm:px-4">
			<span className="text-[15px]" aria-hidden="true">
				🇪🇬
			</span>
			<span className="font-mono text-[15px] text-[var(--color-text-muted)]">
				{EGYPT_COUNTRY_CODE}
			</span>
		</div>
	)
}
