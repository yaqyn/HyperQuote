import { useTranslation } from 'react-i18next'
import { DriverCard } from '@/components/shared/DriverCard'
import type { EarningsSummary as EarningsSummaryType } from '@/stores/external-driver'
import { calcWithholding } from '@/stores/external-driver'

interface EarningsSummaryProps {
	earnings: EarningsSummaryType
}

function formatCurrency(amount: number, locale: string): string {
	return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
		style: 'currency',
		currency: 'EGP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount)
}

interface SummaryCardProps {
	label: string
	amount: number
	locale: string
	highlight?: boolean
	subtitle?: string
}

function SummaryCard({
	label,
	amount,
	locale,
	highlight,
	subtitle,
}: SummaryCardProps) {
	const { t } = useTranslation('driver')
	const { gross, withholding, net } = calcWithholding(amount)

	return (
		<DriverCard>
			<div className="flex flex-col gap-1">
				<span className="text-xs text-[var(--text-secondary)]">{label}</span>
				<span
					className={`font-[var(--font-mono)] text-xl font-bold ${
						highlight
							? 'text-[var(--color-blue)]'
							: 'text-[var(--text-primary)]'
					}`}
				>
					{formatCurrency(net, locale)}
				</span>
				{subtitle && (
					<span className="text-xs text-[var(--text-tertiary)]">
						{subtitle}
					</span>
				)}
				<div className="mt-1 flex flex-col gap-0.5 text-xs text-[var(--text-tertiary)]">
					<span>
						{t('earnings.gross', 'Gross:')}{' '}
						<span className="font-[var(--font-mono)] font-normal">
							{formatCurrency(gross, locale)}
						</span>
					</span>
					<span>
						{t('earnings.tax', 'Tax (5%):')}{' '}
						<span className="font-[var(--font-mono)] font-normal">
							-{formatCurrency(withholding, locale)}
						</span>
					</span>
					<span>
						{t('earnings.net', 'Net:')}{' '}
						<span className="font-[var(--font-mono)] font-normal">
							{formatCurrency(net, locale)}
						</span>
					</span>
				</div>
			</div>
		</DriverCard>
	)
}

export function EarningsSummary({ earnings }: EarningsSummaryProps) {
	const { t, i18n } = useTranslation('driver')
	const locale = i18n.language

	return (
		<div className="grid grid-cols-2 gap-3">
			<SummaryCard
				label={t('earnings.thisWeek', 'This Week')}
				amount={earnings.thisWeek}
				locale={locale}
			/>
			<SummaryCard
				label={t('earnings.thisMonth', 'This Month')}
				amount={earnings.thisMonth}
				locale={locale}
			/>
			<SummaryCard
				label={t('earnings.pending', 'Pending')}
				amount={earnings.pending}
				locale={locale}
				subtitle={t(
					'earnings.pendingSubtitle',
					'Awaiting validation (48h hold)',
				)}
			/>
			<SummaryCard
				label={t('earnings.available', 'Available')}
				amount={earnings.available}
				locale={locale}
				highlight
			/>
		</div>
	)
}
