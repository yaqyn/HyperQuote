import { useTranslation } from 'react-i18next'
import { calcWithholding } from '@/stores/external-driver'

interface EarningsBreakdownProps {
	breakdown: {
		basePay: number
		distanceBonus: number
		heavyLoadSurcharge: number
		nightPremium: number
	}
}

function formatCurrency(amount: number, locale: string): string {
	return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
		style: 'currency',
		currency: 'EGP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount)
}

export function EarningsBreakdown({ breakdown }: EarningsBreakdownProps) {
	const { t, i18n } = useTranslation('driver')
	const locale = i18n.language

	const total =
		breakdown.basePay +
		breakdown.distanceBonus +
		breakdown.heavyLoadSurcharge +
		breakdown.nightPremium

	const { withholding, net } = calcWithholding(total)

	return (
		<div className="flex flex-col gap-1.5 py-2 ps-4 text-sm">
			<div className="flex justify-between">
				<span className="text-[var(--text-secondary)]">
					{t('earnings.basePay', 'Base pay')}
				</span>
				<span className="font-[var(--font-mono)] font-normal">
					{formatCurrency(breakdown.basePay, locale)}
				</span>
			</div>

			{breakdown.distanceBonus > 0 && (
				<div className="flex justify-between">
					<span className="text-[var(--text-secondary)]">
						{t('earnings.distanceBonus', 'Distance bonus (>30km)')}
					</span>
					<span className="font-[var(--font-mono)] font-normal">
						{formatCurrency(breakdown.distanceBonus, locale)}
					</span>
				</div>
			)}

			{breakdown.heavyLoadSurcharge > 0 && (
				<div className="flex justify-between">
					<span className="text-[var(--text-secondary)]">
						{t('earnings.heavyLoad', 'Heavy load (>3,000kg)')}
					</span>
					<span className="font-[var(--font-mono)] font-normal">
						{formatCurrency(breakdown.heavyLoadSurcharge, locale)}
					</span>
				</div>
			)}

			{breakdown.nightPremium > 0 && (
				<div className="flex justify-between">
					<span className="text-[var(--text-secondary)]">
						{t('earnings.nightPremium', 'Night premium (10PM-6AM)')}
					</span>
					<span className="font-[var(--font-mono)] font-normal">
						{formatCurrency(breakdown.nightPremium, locale)}
					</span>
				</div>
			)}

			<div className="flex justify-between text-[var(--text-tertiary)]">
				<span>{t('earnings.withholding', '5% withholding tax')}</span>
				<span className="font-[var(--font-mono)] font-normal">
					-{formatCurrency(withholding, locale)}
				</span>
			</div>

			<div className="flex justify-between border-t border-[var(--border-color)] pt-1.5 font-medium">
				<span>{t('earnings.net', 'Net')}</span>
				<span className="font-[var(--font-mono)] font-bold">
					{formatCurrency(net, locale)}
				</span>
			</div>
		</div>
	)
}
