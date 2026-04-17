import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { QuoteTimelineStep } from '../../types/quote'

interface QuoteTimelineProps {
	steps: QuoteTimelineStep[]
}

export function QuoteTimeline({ steps }: QuoteTimelineProps) {
	const { t } = useTranslation('portal')

	if (steps.length === 0) return null

	return (
		<div>
			{/* Desktop: vertical layout */}
			<div className="hidden md:flex flex-col gap-0">
				{steps.map((step, index) => (
					<div key={step.key} className="flex items-start gap-3">
						{/* Indicator column */}
						<div className="flex flex-col items-center">
							{/* Circle */}
							{step.status === 'completed' && (
								<div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-success)]">
									<Check size={14} className="text-white" />
								</div>
							)}
							{step.status === 'current' && (
								<div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-[var(--color-primary)] animate-pulse">
									<div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
								</div>
							)}
							{step.status === 'future' && (
								<div className="flex items-center justify-center w-6 h-6">
									<div className="w-2 h-2 rounded-full bg-[var(--color-text-subtle)]" />
								</div>
							)}

							{/* Connecting line (not after last) */}
							{index < steps.length - 1 && (
								<div
									className={[
										'w-0.5 h-6',
										step.status === 'completed'
											? 'bg-[var(--color-success)]'
											: 'bg-[var(--color-border)]',
									].join(' ')}
								/>
							)}
						</div>

						{/* Label + timestamp */}
						<div className="flex flex-col pb-2">
							<span
								className={[
									'text-sm',
									step.status === 'current'
										? 'font-semibold text-[var(--color-text)]'
										: step.status === 'future'
											? 'text-[var(--color-text-muted)]'
											: 'text-[var(--color-text)]',
								].join(' ')}
							>
								{t(`quoteDetail.timeline.${step.key}`)}
							</span>
							{step.timestamp && (
								<span className="font-mono text-[13px] text-[var(--color-text-muted)]">
									{new Intl.DateTimeFormat(undefined, {
										dateStyle: 'medium',
										timeStyle: 'short',
									}).format(new Date(step.timestamp))}
								</span>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Mobile: horizontal layout */}
			<div className="flex md:hidden overflow-x-auto gap-4 pb-2">
				{steps.map((step) => (
					<div
						key={step.key}
						className="flex flex-col items-center gap-1 min-w-[72px]"
					>
						{/* Circle */}
						{step.status === 'completed' && (
							<div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-success)]">
								<Check size={14} className="text-white" />
							</div>
						)}
						{step.status === 'current' && (
							<div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-[var(--color-primary)] animate-pulse">
								<div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
							</div>
						)}
						{step.status === 'future' && (
							<div className="flex items-center justify-center w-6 h-6">
								<div className="w-2 h-2 rounded-full bg-[var(--color-text-subtle)]" />
							</div>
						)}

						{/* Label */}
						<span
							className={[
								'text-[13px] text-center leading-tight',
								step.status === 'current'
									? 'font-semibold text-[var(--color-text)]'
									: step.status === 'future'
										? 'text-[var(--color-text-muted)]'
										: 'text-[var(--color-text)]',
							].join(' ')}
						>
							{t(`quoteDetail.timeline.${step.key}`)}
						</span>
					</div>
				))}
			</div>
		</div>
	)
}
