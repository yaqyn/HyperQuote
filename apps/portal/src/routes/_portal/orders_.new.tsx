import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { QuoteBuilderFlow } from '../../components/quote-builder/QuoteBuilderFlow'
import { useQuoteDraft } from '../../hooks/useQuoteDraft'
import { DraftResumeBanner } from '../../components/quote-builder/DraftResumeBanner'

export const Route = createFileRoute('/_portal/orders_/new')({
  component: NewQuoteRoute,
})

function NewQuoteRoute() {
  const { t } = useTranslation('portal')
  const { hasDraft, clearDraft, isRestoring } = useQuoteDraft()

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-auto">
      <div className="w-full max-w-[800px] mx-auto px-6 max-md:px-4 py-8 max-md:py-5">
        <h1
          className="text-[22px] font-semibold tracking-tight mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.25) 100%)',
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
