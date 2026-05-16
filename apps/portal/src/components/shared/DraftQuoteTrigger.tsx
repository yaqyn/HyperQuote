import { cn } from '@hyperquote/ui'
import { Link } from '@tanstack/react-router'
import { FilePenLine } from 'lucide-react'
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'

type DraftQuoteTriggerProps = {
	count: number
	isAr: boolean
	className?: string
	compact?: boolean
	isActive?: boolean
	ariaControls?: string
	ariaExpanded?: boolean
	onClick?: () => void
	to?: '/market'
}

export const DraftQuoteTrigger = forwardRef<
	HTMLButtonElement,
	DraftQuoteTriggerProps
>(function DraftQuoteTrigger(
	{
		count,
		isAr,
		className,
		compact = false,
		isActive = false,
		ariaControls,
		ariaExpanded,
		onClick,
		to,
	},
	ref,
) {
	const { t } = useTranslation('portal')
	const label = t('market.draftQuote')
	const visibleLabel = t('market.draft')
	const formattedCount = count.toLocaleString(isAr ? 'ar-EG' : 'en-EG')
	const triggerClassName = cn(
		'group relative flex shrink-0 items-center rounded-xl border text-start transition-colors',
		compact ? 'h-12 w-12 justify-center' : 'min-h-11 w-full gap-3 px-3 py-2.5',
		isActive
			? 'border-[var(--p-border-strong)] bg-[var(--p-accent-dim)] text-[var(--p-accent)]'
			: 'border-[var(--p-border)] bg-[var(--p-card)] text-[var(--p-text-secondary)] hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]',
		className,
	)
	const content = (
		<>
			<span
				className={cn(
					'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--p-accent-dim)] text-[var(--p-accent)]',
					isActive && 'bg-[var(--p-card)]',
				)}
			>
				<FilePenLine size={15} strokeWidth={1.7} />
			</span>
			{!compact && (
				<span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
					{visibleLabel}
				</span>
			)}
			<span
				className={cn(
					'flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--p-accent)] px-1.5 font-mono text-[11px] font-semibold leading-none text-[var(--p-accent-contrast)]',
					compact && 'absolute -end-1.5 -top-1.5',
				)}
				style={{ fontVariantNumeric: 'tabular-nums' }}
			>
				{formattedCount}
			</span>
		</>
	)

	if (to) {
		return (
			<Link
				to={to}
				aria-label={label}
				title={label}
				className={triggerClassName}
			>
				{content}
			</Link>
		)
	}

	return (
		<button
			ref={ref}
			type="button"
			onClick={onClick}
			aria-controls={ariaControls}
			aria-expanded={ariaExpanded}
			aria-label={label}
			title={label}
			className={triggerClassName}
		>
			{content}
		</button>
	)
})
