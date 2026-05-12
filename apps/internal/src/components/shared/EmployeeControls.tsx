import { Search, X } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type EmployeeActionTone = 'primary' | 'success' | 'neutral' | 'danger'
type EmployeeActionSize = 'sm' | 'md'
type EmployeeStatusTone = 'success' | 'warning' | 'danger' | 'neutral'
type EmployeeFilterTone =
	| 'neutral'
	| 'primary'
	| 'success'
	| 'warning'
	| 'danger'

interface EmployeeActionButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement> {
	tone?: EmployeeActionTone
	size?: EmployeeActionSize
	leading?: ReactNode
	trailing?: ReactNode
	fullWidthOnMobile?: boolean
	children: ReactNode
}

const actionToneClass: Record<EmployeeActionTone, string> = {
	primary:
		'border-transparent bg-[var(--color-primary)] text-white hover:bg-blue-700 focus-visible:ring-[var(--color-primary)]/40 disabled:bg-[var(--color-primary)]/35 disabled:text-white/80',
	success:
		'border-transparent bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/35 disabled:bg-emerald-600/35 disabled:text-white/80',
	neutral:
		'border-black/[0.1] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)]/45 hover:bg-[var(--color-primary)]/[0.06] focus-visible:ring-[var(--color-primary)]/35 dark:border-white/[0.12]',
	danger:
		'border-red-600/25 bg-red-600/[0.06] text-red-700 hover:border-red-600/40 hover:bg-red-600/[0.1] focus-visible:ring-red-600/25 dark:text-red-300',
}

const actionSizeClass: Record<EmployeeActionSize, string> = {
	sm: 'min-h-9 px-3 py-2 text-[10.5px]',
	md: 'min-h-11 px-4 py-2.5 text-[11px]',
}

export function EmployeeActionButton({
	tone = 'primary',
	size = 'md',
	type = 'button',
	leading,
	trailing,
	fullWidthOnMobile = false,
	className = '',
	children,
	...props
}: EmployeeActionButtonProps) {
	return (
		<button
			{...props}
			type={type}
			className={`inline-flex max-w-full items-center justify-center gap-2 rounded-md border font-[family-name:var(--font-archivo)] font-semibold uppercase tracking-[0.11em] outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed ${fullWidthOnMobile ? 'w-full sm:w-auto' : ''} ${actionSizeClass[size]} ${actionToneClass[tone]} ${className}`}
		>
			{leading && <span className="shrink-0">{leading}</span>}
			<span className="min-w-0 break-words text-center leading-tight">
				{children}
			</span>
			{trailing && <span className="shrink-0">{trailing}</span>}
		</button>
	)
}

interface EmployeeStatusPillProps {
	tone?: EmployeeStatusTone
	leading?: ReactNode
	children: ReactNode
	className?: string
}

const statusToneClass: Record<EmployeeStatusTone, string> = {
	success: 'bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-400',
	warning: 'bg-amber-500/[0.1] text-amber-700 dark:text-amber-400',
	danger: 'bg-red-600/[0.08] text-red-700 dark:text-red-300',
	neutral:
		'bg-black/[0.04] text-[var(--color-text-muted)] dark:bg-white/[0.06]',
}

export function EmployeeStatusPill({
	tone = 'neutral',
	leading,
	children,
	className = '',
}: EmployeeStatusPillProps) {
	return (
		<div
			className={`inline-flex max-w-full items-center gap-2 rounded-lg px-3 py-2 font-[family-name:var(--font-archivo)] text-[12px] font-semibold ${statusToneClass[tone]} ${className}`}
		>
			{leading && <span className="shrink-0">{leading}</span>}
			<span className="min-w-0 break-words leading-snug">{children}</span>
		</div>
	)
}

interface EmployeeSearchFieldProps {
	value: string
	onChange: (value: string) => void
	placeholder: string
	label?: string
	clearLabel?: string
	className?: string
}

export function EmployeeSearchField({
	value,
	onChange,
	placeholder,
	label = 'Search',
	clearLabel = 'Clear search',
	className = '',
}: EmployeeSearchFieldProps) {
	return (
		<label
			className={`flex min-h-11 w-full items-center gap-2 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 text-[var(--color-text)] focus-within:border-[var(--color-primary)]/55 focus-within:ring-2 focus-within:ring-[var(--color-primary)]/15 dark:border-white/[0.12] ${className}`}
		>
			<Search
				aria-hidden="true"
				size={15}
				strokeWidth={2}
				className="shrink-0 text-[var(--color-text-subtle)]"
			/>
			<span className="sr-only">{label}</span>
			<input
				type="search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-archivo)] text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
			/>
			{value.trim().length > 0 && (
				<button
					type="button"
					onClick={() => onChange('')}
					aria-label={clearLabel}
					className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-text-subtle)] transition-colors hover:bg-black/[0.04] hover:text-[var(--color-text)] dark:hover:bg-white/[0.06]"
				>
					<X aria-hidden="true" size={14} strokeWidth={2.2} />
				</button>
			)}
		</label>
	)
}

interface EmployeeFilterChipProps
	extends ButtonHTMLAttributes<HTMLButtonElement> {
	active: boolean
	count?: number
	tone?: EmployeeFilterTone
	children: ReactNode
}

const filterToneClass: Record<EmployeeFilterTone, string> = {
	neutral: 'text-[var(--color-text)]',
	primary: 'text-[var(--color-primary)]',
	success: 'text-emerald-700 dark:text-emerald-400',
	warning: 'text-amber-700 dark:text-amber-400',
	danger: 'text-red-700 dark:text-red-300',
}

export function EmployeeFilterChip({
	active,
	count,
	tone = 'neutral',
	type = 'button',
	className = '',
	children,
	...props
}: EmployeeFilterChipProps) {
	return (
		<button
			{...props}
			type={type}
			aria-pressed={active}
			className={`inline-flex min-h-9 max-w-full items-center justify-center gap-2 rounded-md border px-3 py-2 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.1em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 ${
				active
					? `border-current bg-black/[0.04] dark:bg-white/[0.06] ${filterToneClass[tone]}`
					: 'border-black/[0.1] text-[var(--color-text-subtle)] hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-primary)]/[0.05] hover:text-[var(--color-text)] dark:border-white/[0.12]'
			} ${className}`}
		>
			<span className="min-w-0 break-words leading-tight">{children}</span>
			{typeof count === 'number' && (
				<span
					className={`shrink-0 rounded-full px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums ${
						active
							? 'bg-white/70 text-current dark:bg-black/25'
							: 'bg-black/[0.06] text-[var(--color-text-muted)] dark:bg-white/[0.08]'
					}`}
				>
					{count.toString().padStart(2, '0')}
				</span>
			)}
		</button>
	)
}
