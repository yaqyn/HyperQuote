import { Check, ChevronDown } from 'lucide-react'
import {
	Button as AriaButton,
	Input as AriaInput,
	Label,
	ListBox,
	ListBoxItem,
	NumberField,
	Popover,
	Select,
	SelectValue,
	TextArea,
	TextField,
} from 'react-aria-components'

/**
 * Shared input controls for the admin registry. All share the same
 * aesthetic: a hairline bottom border, transparent background, small
 * type. Disabled / read-only state shows the value without the
 * border treatment so view mode feels like printed text.
 */

const INPUT_BASE =
	'w-full bg-transparent font-[family-name:var(--font-inter)] text-[14px] text-[var(--color-text)] outline-none transition-colors'
const INPUT_EDITABLE =
	'border-b border-[var(--color-border)] py-1.5 focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-subtle)]'
const INPUT_READONLY =
	'border-b border-transparent py-1.5 text-[var(--color-text)] cursor-default select-text'

interface TextControlProps {
	value: string
	onChange: (v: string) => void
	placeholder?: string
	readOnly?: boolean
	ariaLabel: string
	type?: 'text' | 'email' | 'tel'
}

export function TextControl({
	value,
	onChange,
	placeholder,
	readOnly,
	ariaLabel,
	type = 'text',
}: TextControlProps) {
	if (readOnly) {
		return (
			<span className={`${INPUT_BASE} ${INPUT_READONLY} block`}>
				{value || '—'}
			</span>
		)
	}
	return (
		<TextField
			aria-label={ariaLabel}
			value={value}
			onChange={onChange}
			type={type}
		>
			<AriaInput
				placeholder={placeholder}
				className={`${INPUT_BASE} ${INPUT_EDITABLE}`}
			/>
		</TextField>
	)
}

interface TextAreaControlProps {
	value: string
	onChange: (v: string) => void
	readOnly?: boolean
	ariaLabel: string
	rows?: number
	placeholder?: string
}

export function TextAreaControl({
	value,
	onChange,
	readOnly,
	ariaLabel,
	rows = 3,
	placeholder,
}: TextAreaControlProps) {
	if (readOnly) {
		return (
			<span
				className={`${INPUT_BASE} ${INPUT_READONLY} block whitespace-pre-wrap`}
			>
				{value || '—'}
			</span>
		)
	}
	return (
		<TextField aria-label={ariaLabel} value={value} onChange={onChange}>
			<TextArea
				placeholder={placeholder}
				rows={rows}
				className={`${INPUT_BASE} ${INPUT_EDITABLE} resize-none`}
			/>
		</TextField>
	)
}

interface NumberControlProps {
	value: number
	onChange: (v: number) => void
	readOnly?: boolean
	ariaLabel: string
	min?: number
	max?: number
	step?: number
	suffix?: string
	/** If true, render the value in Geist Mono (for currency, counts) */
	mono?: boolean
}

export function NumberControl({
	value,
	onChange,
	readOnly,
	ariaLabel,
	min,
	max,
	step = 1,
	suffix,
	mono = true,
}: NumberControlProps) {
	const monoClass = mono
		? 'font-[family-name:var(--font-geist-mono)] tabular-nums'
		: ''

	if (readOnly) {
		return (
			<span
				className={`${INPUT_BASE} ${INPUT_READONLY} ${monoClass} inline-flex items-baseline gap-1`}
			>
				<span>{Number.isFinite(value) ? value.toLocaleString() : '—'}</span>
				{suffix && (
					<span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
						{suffix}
					</span>
				)}
			</span>
		)
	}
	return (
		<NumberField
			aria-label={ariaLabel}
			value={value}
			onChange={onChange}
			minValue={min}
			maxValue={max}
			step={step}
		>
			<div className="flex items-baseline gap-2">
				<AriaInput className={`${INPUT_BASE} ${INPUT_EDITABLE} ${monoClass}`} />
				{suffix && (
					<span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)] shrink-0">
						{suffix}
					</span>
				)}
			</div>
		</NumberField>
	)
}

interface SelectControlProps<T extends string> {
	value: T
	onChange: (v: T) => void
	options: Array<{ value: T; label: string }>
	readOnly?: boolean
	ariaLabel: string
}

export function SelectControl<T extends string>({
	value,
	onChange,
	options,
	readOnly,
	ariaLabel,
}: SelectControlProps<T>) {
	if (readOnly) {
		const selected = options.find((o) => o.value === value)
		return (
			<span className={`${INPUT_BASE} ${INPUT_READONLY} block`}>
				{selected?.label ?? value ?? '—'}
			</span>
		)
	}
	return (
		<Select
			aria-label={ariaLabel}
			selectedKey={value}
			onSelectionChange={(k) => onChange(k as T)}
		>
			<Label className="sr-only">{ariaLabel}</Label>
			<AriaButton
				className={`${INPUT_BASE} ${INPUT_EDITABLE} flex items-center justify-between gap-2 outline-none data-[focus-visible]:border-[var(--color-primary)]`}
			>
				<SelectValue />
				<ChevronDown
					size={14}
					strokeWidth={1.5}
					className="text-[var(--color-text-subtle)]"
				/>
			</AriaButton>
			<Popover
				placement="bottom start"
				offset={6}
				className="min-w-[var(--trigger-width)] rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-[var(--color-surface)] shadow-lg p-1 outline-none entering:opacity-0 entering:-translate-y-1 transition-[opacity,transform] duration-150"
			>
				<ListBox className="outline-none max-h-60 overflow-y-auto">
					{options.map((o) => (
						<ListBoxItem
							key={o.value}
							id={o.value}
							textValue={o.label}
							className="flex items-center justify-between gap-3 px-3 py-1.5 text-[13px] rounded-md outline-none cursor-pointer font-[family-name:var(--font-inter)] text-[var(--color-text)] data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.05] data-[selected]:text-[var(--color-primary)] data-[focused]:bg-black/[0.04] dark:data-[focused]:bg-white/[0.05]"
						>
							{({ isSelected }) => (
								<>
									<span>{o.label}</span>
									{isSelected && <Check size={14} strokeWidth={1.75} />}
								</>
							)}
						</ListBoxItem>
					))}
				</ListBox>
			</Popover>
		</Select>
	)
}

// ─── Action links — save/cancel/delete footer primitives ───

interface LinkActionProps {
	onClick: () => void
	disabled?: boolean
	children: React.ReactNode
	tone?: 'primary' | 'subtle' | 'danger'
}

export function LinkAction({
	onClick,
	disabled,
	children,
	tone = 'subtle',
}: LinkActionProps) {
	const toneClass =
		tone === 'primary'
			? 'text-[var(--color-primary)] hover:border-[var(--color-primary)]'
			: tone === 'danger'
				? 'text-[#B3261E] hover:border-[#B3261E] dark:text-[#E46B63]'
				: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`font-[family-name:var(--font-inter)] text-[13px] font-medium border-b border-transparent transition-colors outline-none focus-visible:border-[var(--color-primary)] disabled:opacity-40 ${toneClass}`}
		>
			{children}
		</button>
	)
}

// ─── Status tag — typographic only, no colored pills ───

export function StatusTag({
	label,
	tone = 'neutral',
}: {
	label: string
	tone?: 'neutral' | 'primary' | 'muted'
}) {
	const color =
		tone === 'primary'
			? 'text-[var(--color-primary)]'
			: tone === 'muted'
				? 'text-[var(--color-text-subtle)]'
				: 'text-[var(--color-text-muted)]'
	const dot =
		tone === 'primary'
			? 'bg-[var(--color-primary)]'
			: tone === 'muted'
				? 'bg-[var(--color-text-subtle)]'
				: 'bg-[var(--color-text-muted)]'

	return (
		<span
			className={`inline-flex items-center gap-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em] ${color}`}
		>
			<span aria-hidden className={`w-[5px] h-[5px] rounded-full ${dot}`} />
			{label}
		</span>
	)
}
