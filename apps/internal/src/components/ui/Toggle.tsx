import type { ButtonHTMLAttributes } from 'react'

interface ToggleProps
	extends Omit<
		ButtonHTMLAttributes<HTMLButtonElement>,
		'children' | 'className' | 'onChange' | 'role' | 'type'
	> {
	label?: string
	className?: string
	isSelected: boolean
	isDisabled?: boolean
	onChange?: (selected: boolean) => void
}

export function Toggle({
	label,
	className = '',
	isSelected,
	isDisabled,
	disabled,
	onChange,
	onClick,
	'aria-label': ariaLabel,
	...props
}: ToggleProps) {
	const isUnavailable = Boolean(disabled || isDisabled)
	const switchLabel = ariaLabel ?? label

	return (
		<button
			{...props}
			type="button"
			role="switch"
			aria-checked={isSelected}
			aria-label={switchLabel}
			disabled={isUnavailable}
			onClick={(event) => {
				onClick?.(event)
				if (event.defaultPrevented || isUnavailable) return
				onChange?.(!isSelected)
			}}
			className={`flex items-center gap-1.5 rounded-sm outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
		>
			<div
				aria-hidden="true"
				className={`h-4 w-7 rounded-full p-0.5 transition-colors ${
					isSelected
						? 'bg-[var(--color-primary)]'
						: 'bg-black/[0.06] dark:bg-white/[0.08]'
				}`}
			>
				<div
					className={`h-3 w-3 rounded-full bg-white shadow transition-transform dark:bg-black ${
						isSelected ? 'translate-x-3' : ''
					}`}
				/>
			</div>
			{label && (
				<span className="text-[12px] text-[var(--color-text-muted)]">
					{label}
				</span>
			)}
		</button>
	)
}
