import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DriverCard } from '@/components/shared/DriverCard'
import type { EarningsHistoryItem } from '@/stores/external-driver'
import { EarningsBreakdown } from './EarningsBreakdown'

interface EarningsHistoryProps {
	history: EarningsHistoryItem[]
}

const statusColors: Record<EarningsHistoryItem['status'], string> = {
	pending: 'bg-yellow-100 text-yellow-800',
	approved: 'bg-[var(--color-blue)]/10 text-[var(--color-blue)]',
	paid: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
	processing: 'bg-gray-100 text-gray-600',
}

function formatCurrency(amount: number, locale: string): string {
	return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
		style: 'currency',
		currency: 'EGP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount)
}

function formatDate(dateStr: string, locale: string): string {
	return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
		month: 'short',
		day: 'numeric',
	}).format(new Date(dateStr))
}

export function EarningsHistory({ history }: EarningsHistoryProps) {
	const { t, i18n } = useTranslation('driver')
	const locale = i18n.language
	const [expandedId, setExpandedId] = useState<string | null>(null)

	if (history.length === 0) {
		return (
			<div className="flex flex-col items-center py-8">
				<p className="text-sm text-[var(--text-secondary)]">
					{t('earnings.noHistory', 'No earnings history yet.')}
				</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-3">
			{history.map((item) => {
				const isExpanded = expandedId === item.id
				return (
					<DriverCard key={item.id}>
						<button
							type="button"
							className="flex w-full items-center justify-between text-start"
							onClick={() => setExpandedId(isExpanded ? null : item.id)}
						>
							<div className="flex items-center gap-3">
								<span className="font-[var(--font-mono)] text-xs text-[var(--text-secondary)]">
									{formatDate(item.date, locale)}
								</span>
								<span className="max-w-[80px] truncate font-[var(--font-mono)] text-xs text-[var(--text-tertiary)]">
									{item.jobId}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="font-[var(--font-mono)] font-bold">
									{formatCurrency(item.amount, locale)}
								</span>
								<span
									className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status]}`}
								>
									{t(`earnings.status.${item.status}`, item.status)}
								</span>
							</div>
						</button>
						{isExpanded && (
							<div className="mt-3 border-t border-[var(--border-color)] pt-2">
								<EarningsBreakdown breakdown={item.breakdown} />
							</div>
						)}
					</DriverCard>
				)
			})}
		</div>
	)
}
