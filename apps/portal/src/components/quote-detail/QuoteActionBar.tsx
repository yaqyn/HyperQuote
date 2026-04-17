import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { QuoteStatus } from '../../types/quote'

interface QuoteActionBarProps {
	status: QuoteStatus
	onAccept: () => void
	onCounter: () => void
	onPartial: () => void
	onDecline: () => void
	isAccepting?: boolean
}

export function QuoteActionBar({
	status,
	onAccept,
	onCounter,
	onPartial,
	onDecline,
	isAccepting,
}: QuoteActionBarProps) {
	const { t } = useTranslation('portal')

	if (status !== 'sent') return null

	return (
		<div className="sticky bottom-0 z-20 bg-[var(--color-base)] border-t border-[var(--color-border)] p-4">
			{/* Desktop: row, end-aligned */}
			<div className="hidden md:flex flex-row gap-3 justify-end">
				<Button
					onPress={onDecline}
					className="border-2 border-[var(--color-error)] text-[var(--color-error)] h-12 px-6 rounded-lg font-semibold cursor-pointer transition-opacity hover:opacity-80"
				>
					{t('quoteDetail.declineQuote')}
				</Button>
				<Button
					onPress={onPartial}
					className="border-2 border-[var(--color-primary)] text-[var(--color-primary)] h-12 px-6 rounded-lg font-semibold cursor-pointer transition-opacity hover:opacity-80"
				>
					{t('quoteDetail.partialAccept')}
				</Button>
				<Button
					onPress={onCounter}
					className="border-2 border-[var(--color-warning)] text-[var(--color-warning)] h-12 px-6 rounded-lg font-semibold cursor-pointer transition-opacity hover:opacity-80"
				>
					{t('quoteDetail.counterOffer')}
				</Button>
				<Button
					onPress={onAccept}
					isDisabled={isAccepting}
					className="bg-[var(--color-success)] text-white h-12 px-6 rounded-lg font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
				>
					{t('quoteDetail.acceptQuote')}
				</Button>
			</div>

			{/* Mobile: column, full width */}
			<div className="flex md:hidden flex-col gap-2">
				<Button
					onPress={onAccept}
					isDisabled={isAccepting}
					className="bg-[var(--color-success)] text-white h-12 rounded-lg font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 w-full"
				>
					{t('quoteDetail.acceptQuote')}
				</Button>
				<Button
					onPress={onCounter}
					className="border-2 border-[var(--color-warning)] text-[var(--color-warning)] h-12 rounded-lg font-semibold cursor-pointer transition-opacity hover:opacity-80 w-full"
				>
					{t('quoteDetail.counterOffer')}
				</Button>
				<Button
					onPress={onPartial}
					className="border-2 border-[var(--color-primary)] text-[var(--color-primary)] h-12 rounded-lg font-semibold cursor-pointer transition-opacity hover:opacity-80 w-full"
				>
					{t('quoteDetail.partialAccept')}
				</Button>
				<Button
					onPress={onDecline}
					className="border-2 border-[var(--color-error)] text-[var(--color-error)] h-12 rounded-lg font-semibold cursor-pointer transition-opacity hover:opacity-80 w-full"
				>
					{t('quoteDetail.declineQuote')}
				</Button>
			</div>
		</div>
	)
}
