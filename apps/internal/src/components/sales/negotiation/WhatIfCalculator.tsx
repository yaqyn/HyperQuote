import { useTranslation } from 'react-i18next'

interface WhatIfCalculatorProps {
	quoteId?: string
	onApplyMargins?: () => void
}

export function WhatIfCalculator({
	quoteId: _quoteId,
	onApplyMargins: _onApplyMargins,
}: WhatIfCalculatorProps) {
	const { t } = useTranslation('internal')

	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
				<h3 className="text-[13px] font-semibold text-[var(--color-text)]">
					{t('sales.negotiation.whatIfCalculator', 'What-If Calculator')}
				</h3>
			</div>
			<div className="flex flex-1 items-center justify-center px-5 py-10 text-center text-[13px] text-[var(--color-text-muted)]">
				{t(
					'sales.negotiation.noMarginData',
					'Quote line items are not available for margin simulation.',
				)}
			</div>
		</div>
	)
}
