/**
 * Quote builder 3-step flow orchestrator.
 * Reads step from Zustand store, renders step content with transitions.
 * Back button, step indicator, step-specific content, and action bar.
 */
import { useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from 'react-aria-components'
import { useQuoteBuilderStore } from '../../stores/quote-builder'
import { StepIndicator } from './StepIndicator'
import { BuildListStep } from './step1/BuildListStep'
import { DetailsStep } from './step2/DetailsStep'
import { saveDraft } from '../../lib/server/quote-requests'

export function QuoteBuilderFlow() {
  const { t, i18n } = useTranslation('portal')
  const navigate = useNavigate()
  const step = useQuoteBuilderStore((s) => s.step)
  const items = useQuoteBuilderStore((s) => s.items)
  const setStep = useQuoteBuilderStore((s) => s.setStep)
  const isRTL = i18n.dir() === 'rtl'

  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  const handleSaveDraft = useCallback(async () => {
    const state = useQuoteBuilderStore.getState()
    try {
      await saveDraft({
        data: {
          draftId: state.draftId ?? undefined,
          items: state.items.map((item) => ({
            productId: item.productId,
            customerDescription: item.customerDescription,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            notes: item.notes,
            sortOrder: item.sortOrder,
            matchConfidence: item.matchConfidence,
            isUnmatched: item.isUnmatched,
          })),
          deliveryAddressId: state.deliveryAddressId ?? undefined,
          deliveryDate: state.deliveryDate ?? undefined,
          notes: state.notes || undefined,
          projectId: state.projectId ?? undefined,
        },
      })
      // TODO: show toast "Draft saved"
    } catch {
      // Silently fail -- localStorage is primary
    }
  }, [])

  const handleContinue = useCallback(() => {
    if (step === 1 && items.length > 0) {
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }, [step, items.length, setStep])

  return (
    <div className="flex flex-col h-full">
      {/* Back to Orders row */}
      <div className="flex items-center h-14 px-6">
        <Button
          onPress={() => navigate({ to: '/orders' })}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
        >
          <BackArrow size={16} />
          <span>{t('quoteBuilder.backToOrders')}</span>
        </Button>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={step} />

      {/* Step content with transitions */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <BuildListStep />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="px-6 py-4"
            >
              <DetailsStep />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="px-6 py-4"
            >
              {/* Step 3: Review -- placeholder for Plan 05 */}
              <div className="text-sm text-[var(--color-text-muted)]">
                {t('quoteBuilder.step3')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action bar at bottom -- Step 1 specific */}
      {step === 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] shrink-0">
          {/* Item count */}
          <span className="text-sm text-[var(--color-text)]">
            <span className="font-mono">{items.length}</span>{' '}
            {t('quoteBuilder.itemCount', { count: items.length }).replace(
              String(items.length),
              '',
            )}
          </span>

          <div className="flex items-center gap-3">
            {/* Save as Draft */}
            <Button
              onPress={handleSaveDraft}
              className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
            >
              {t('quoteBuilder.saveAsDraft')}
            </Button>

            {/* Continue */}
            <Button
              onPress={handleContinue}
              isDisabled={items.length === 0}
              className="h-11 px-6 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold transition-opacity cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {t('quoteBuilder.continue')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
