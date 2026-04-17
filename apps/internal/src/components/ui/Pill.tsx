import type { RadioGroupProps } from 'react-aria-components'
import { Radio, RadioGroup } from 'react-aria-components'

interface PillGroupProps extends Omit<RadioGroupProps, 'className'> {
	className?: string
}

export function PillGroup({ className = '', ...props }: PillGroupProps) {
	return (
		<RadioGroup {...props} className={`flex flex-wrap gap-1 ${className}`} />
	)
}

interface PillProps {
	value: string
	children: React.ReactNode
	mono?: boolean
	className?: string
}

export function Pill({ value, children, mono, className = '' }: PillProps) {
	return (
		<Radio
			value={value}
			className={`cursor-pointer rounded-full px-3 py-1.5 text-[12px] font-medium outline-none transition-all
        text-black/40 data-[selected]:bg-[var(--color-primary)]/10 data-[selected]:text-[var(--color-primary)]
        data-[hovered]:text-black/50
        data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
        dark:text-white/40 dark:data-[selected]:bg-[var(--color-primary)]/15 dark:data-[selected]:text-[var(--color-primary)]
        dark:data-[hovered]:text-white/50
        ${mono ? 'font-[family-name:var(--font-geist-mono)] tabular-nums' : ''}
        ${className}`}
		>
			{children}
		</Radio>
	)
}
