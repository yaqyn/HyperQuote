import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { DraftResumeBanner } from '../../components/quote-builder/DraftResumeBanner'
import { QuoteBuilderFlow } from '../../components/quote-builder/QuoteBuilderFlow'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { useQuoteDraft } from '../../hooks/useQuoteDraft'

export const Route = createFileRoute('/_portal/orders_/new')({
	component: NewQuoteRoute,
})

function NewQuoteRoute() {
	const { t } = useTranslation('portal')
	const { hasDraft, clearDraft, isRestoring } = useQuoteDraft()

	return (
		<div className="flex-1 flex flex-col h-full min-h-0 overflow-auto">
			<div className="w-full max-w-[800px] mx-auto px-4 pb-8 pt-[calc(env(safe-area-inset-top)+4.25rem)] sm:px-6 sm:pt-8">
				<h1
					className="mb-6 break-words text-[20px] font-semibold tracking-tight sm:text-[22px]"
					style={{
						background:
							'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.25) 100%)',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
						backgroundClip: 'text',
					}}
				>
					{t('quoteBuilder.windowTitle')}
				</h1>

				{hasDraft && !isRestoring && (
					<DraftResumeBanner onStartFresh={clearDraft} />
				)}
				<QuoteBuilderFlow />
			</div>
			<FloatingAIButton />
		</div>
	)
}
