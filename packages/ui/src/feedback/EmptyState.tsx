import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

interface EmptyStateProps {
	title: string
	description?: string
	action?: { label: string; onClick: () => void }
	icon?: ReactNode
	className?: string
}

export function EmptyState({
	title,
	description,
	action,
	icon,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center py-16 px-4 text-center',
				className,
			)}
		>
			{icon && (
				<div className="mb-4 text-[var(--color-text-muted)]">{icon}</div>
			)}
			<h3 className="text-[var(--text-lg)] font-semibold text-[var(--color-text)]">
				{title}
			</h3>
			{description && (
				<p className="mt-1 text-[var(--text-sm)] text-[var(--color-text-muted)] max-w-sm">
					{description}
				</p>
			)}
			{action && (
				<button
					type="button"
					onClick={action.onClick}
					className="mt-4 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-[var(--text-sm)] font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
				>
					{action.label}
				</button>
			)}
		</div>
	)
}
