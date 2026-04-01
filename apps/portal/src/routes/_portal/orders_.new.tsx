import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { WindowShell } from '../../components/windows/WindowShell'
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
    <>
      <WindowShell title={t('quoteBuilder.windowTitle')}>
        {hasDraft && !isRestoring && (
          <DraftResumeBanner onStartFresh={clearDraft} />
        )}
        <QuoteBuilderFlow />
      </WindowShell>
      <FloatingAIButton />
    </>
  )
}
