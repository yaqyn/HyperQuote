type BadgeVariant = 'dot' | 'status' | 'tier'
type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'neutral'

interface BadgeProps {
	variant?: BadgeVariant
	color?: BadgeColor
	children: React.ReactNode
	className?: string
}

const colorMap: Record<BadgeColor, { dot: string; text: string }> = {
	green: { dot: 'bg-green-500', text: 'text-green-700 dark:text-green-400' },
	yellow: {
		dot: 'bg-yellow-500',
		text: 'text-yellow-700 dark:text-yellow-400',
	},
	red: { dot: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
	blue: {
		dot: 'bg-[var(--color-primary)]',
		text: 'text-[var(--color-primary)]',
	},
	neutral: {
		dot: 'bg-black/30 dark:bg-white/30',
		text: 'text-black/50 dark:text-white/50',
	},
}

function Badge({
	variant = 'status',
	color = 'neutral',
	children,
	className = '',
}: BadgeProps) {
	const colors = colorMap[color]

	if (variant === 'dot') {
		return (
			<span
				className={`inline-flex items-center gap-1.5 text-[12px] ${colors.text} ${className}`}
			>
				<span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
				{children}
			</span>
		)
	}

	if (variant === 'tier') {
		return (
			<span
				className={`rounded-full border border-black/[0.08] px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] font-medium tabular-nums dark:border-white/[0.08] ${className}`}
			>
				{children}
			</span>
		)
	}

	// variant === 'status'
	return (
		<span
			className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${colors.text} ${className}`}
		>
			{children}
		</span>
	)
}
