import { useTranslation } from 'react-i18next'

interface SideBySideComparisonProps {
	versionAId: string
	versionBId: string
}

export function SideBySideComparison({
	versionAId: _versionAId,
	versionBId: _versionBId,
}: SideBySideComparisonProps) {
	const { t } = useTranslation('internal')

	return (
		<div className="flex flex-1 flex-col overflow-auto">
			<div className="border-b border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
				<h3 className="text-[13px] font-semibold text-[var(--color-text)]">
					{t('sales.negotiation.comparison', 'Comparison')}
				</h3>
			</div>
			<div className="flex flex-1 items-center justify-center px-5 py-10 text-center text-[13px] text-[var(--color-text-muted)]">
				{t(
					'sales.negotiation.noVersionComparison',
					'Quote version comparison is not available for this quote.',
				)}
			</div>
		</div>
	)
}
