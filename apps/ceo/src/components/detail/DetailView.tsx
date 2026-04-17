import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface DetailViewProps {
	title: string
	subtitle?: string
	onBack: () => void
	deepLinkUrl?: string
	deepLinkLabel?: string
	actions?: ReactNode
	children: ReactNode
}

export function DetailView({
	title,
	subtitle,
	onBack,
	deepLinkUrl,
	deepLinkLabel,
	actions,
	children,
}: DetailViewProps) {
	return (
		<div className="h-full overflow-y-auto">
			<div className="mx-auto max-w-2xl p-6">
				{/* Back button + title */}
				<div className="mb-6 flex items-start gap-3">
					<button
						type="button"
						onClick={onBack}
						className="mt-1 flex-shrink-0 rounded-md p-1 text-[var(--color-text)] outline-none transition-colors hover:bg-[var(--color-surface)] focus-visible:bg-[var(--color-surface)]"
						aria-label="Go back"
					>
						<ArrowLeft size={20} />
					</button>
					<div className="flex flex-col gap-0.5">
						<h1 className="text-xl font-semibold text-[var(--color-text)]">
							{title}
						</h1>
						{subtitle && (
							<p className="text-base text-[var(--color-text-muted)]">
								{subtitle}
							</p>
						)}
					</div>
				</div>

				{/* Content sections */}
				<div className="flex flex-col gap-6">{children}</div>

				{/* Action buttons */}
				{actions && (
					<div className="mt-6 flex flex-wrap items-center gap-6">
						{actions}
					</div>
				)}

				{/* Deep link */}
				{deepLinkUrl && deepLinkLabel && (
					<div className="mt-6 border-t border-[var(--color-border)] pt-4">
						<a
							href={deepLinkUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
						>
							{deepLinkLabel} &rarr;
						</a>
					</div>
				)}
			</div>
		</div>
	)
}
