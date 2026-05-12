import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
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
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'

/**
 * Shared input controls for the admin registry. Edit mode uses substantial
 * fields that survive small screens; view mode keeps values readable without
 * pretending they are disabled form inputs.
 */

const INPUT_BASE =
	'w-full font-[family-name:var(--font-archivo)] text-[14px] text-[var(--color-text)] outline-none transition-colors'
const INPUT_EDITABLE =
	'min-h-11 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 py-2.5 placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]'
const INPUT_READONLY =
	'min-h-9 rounded-md border border-transparent bg-transparent py-1.5 text-[var(--color-text)] cursor-default select-text'

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
				className={`${INPUT_BASE} ${INPUT_READONLY} block whitespace-pre-wrap break-words`}
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
				className={`${INPUT_BASE} ${INPUT_EDITABLE} resize-none leading-relaxed`}
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
			<div className="flex min-w-0 items-center gap-2">
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
				<SelectValue className="min-w-0 break-words text-start leading-tight" />
				<ChevronDown
					size={14}
					strokeWidth={1.5}
					className="text-[var(--color-text-subtle)]"
				/>
			</AriaButton>
			<Popover
				placement="bottom start"
				offset={6}
				className="min-w-[var(--trigger-width)] max-w-[calc(100vw-2rem)] rounded-lg border border-black/[0.1] bg-[var(--color-surface)] p-1 shadow-lg outline-none transition-[opacity,transform] duration-150 entering:-translate-y-1 entering:opacity-0 dark:border-white/[0.12] max-lg:!fixed max-lg:!inset-x-4 max-lg:!bottom-4 max-lg:!top-auto max-lg:!w-auto max-lg:!max-w-none max-lg:rounded-xl max-lg:p-2"
			>
				<ListBox className="max-h-60 overflow-y-auto outline-none max-lg:max-h-[min(60vh,28rem)]">
					{options.map((o) => (
						<ListBoxItem
							key={o.value}
							id={o.value}
							textValue={o.label}
							className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 font-[family-name:var(--font-archivo)] text-[13px] text-[var(--color-text)] outline-none data-[focused]:bg-black/[0.04] data-[hovered]:bg-black/[0.04] data-[selected]:text-[var(--color-primary)] dark:data-[focused]:bg-white/[0.05] dark:data-[hovered]:bg-white/[0.05]"
						>
							{({ isSelected }) => (
								<>
									<span className="min-w-0 break-words leading-snug">
										{o.label}
									</span>
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

// ─── Footer actions and status primitives ───

interface LinkActionProps {
	onClick: () => void
	disabled?: boolean
	children: ReactNode
	tone?: 'primary' | 'subtle' | 'danger'
}

export function LinkAction({
	onClick,
	disabled,
	children,
	tone = 'subtle',
}: LinkActionProps) {
	return (
		<EmployeeActionButton
			onClick={onClick}
			disabled={disabled}
			tone={
				tone === 'primary'
					? 'primary'
					: tone === 'danger'
						? 'danger'
						: 'neutral'
			}
			size="sm"
			fullWidthOnMobile
		>
			{children}
		</EmployeeActionButton>
	)
}

export function StatusTag({
	label,
	tone = 'neutral',
}: {
	label: string
	tone?: 'neutral' | 'primary' | 'muted'
}) {
	return (
		<EmployeeStatusPill
			tone={tone === 'primary' ? 'success' : 'neutral'}
			className={`px-2.5 py-1.5 text-[11px] ${
				tone === 'muted' ? 'opacity-80' : ''
			}`}
		>
			{label}
		</EmployeeStatusPill>
	)
}
