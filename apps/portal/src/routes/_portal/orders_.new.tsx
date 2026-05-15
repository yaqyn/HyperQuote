import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { DraftResumeBanner } from '../../components/quote-builder/DraftResumeBanner'
import { QuoteBuilderFlow } from '../../components/quote-builder/QuoteBuilderFlow'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'
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
			<div className="w-full max-w-[800px] mx-auto px-4 pb-8 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5">
				<PortalTitleRow
					title={t('quoteBuilder.windowTitle')}
					fixed
					className="-mx-4 mb-6 px-4 sm:-mx-6 sm:px-6"
				/>

				{hasDraft && !isRestoring && (
					<DraftResumeBanner onStartFresh={clearDraft} />
				)}
				<QuoteBuilderFlow />
			</div>
			<FloatingAIButton />
		</div>
	)
}
