/**
 * Submit confirmation view.
 * Replaces the form after successful quote submission.
 * Shows CheckCircle with spring animation, reference number, and navigation.
 */
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { CheckCircle } from 'lucide-react'
import { Button } from 'react-aria-components'
import { clearLocalDraft } from '../../../lib/quote-draft'
import { useQuoteBuilderStore } from '../../../stores/quote-builder'

// ============================================================================
// Component
// ============================================================================

interface SubmitConfirmationProps {
  requestId: string
  reference: string
}

export function SubmitConfirmation({
  requestId,
  reference,
}: SubmitConfirmationProps) {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()

  // Clear draft on mount
  useEffect(() => {
    clearLocalDraft()
    useQuoteBuilderStore.getState().reset()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Animated CheckCircle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
        }}
        className="mb-6"
      >
        <CheckCircle
          size={48}
          className="text-[var(--color-success,#16a34a)]"
          strokeWidth={1.5}
        />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="text-lg font-semibold text-[var(--color-text)] mb-2"
      >
        {t('quoteBuilder.submitSuccess', 'Quote Request Submitted!')}
      </motion.h2>

      {/* Reference number */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="font-mono text-base text-[var(--color-primary)] mb-4"
      >
        {t('quoteBuilder.referenceLabel', 'Reference:')} {reference}
      </motion.p>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
        className="text-sm text-[var(--color-text-muted)] mb-8 max-w-sm"
      >
        {t(
          'quoteBuilder.submitSubtitle',
          "We'll have your quote ready within 4 hours. You'll receive a notification on WhatsApp.",
        )}
      </motion.p>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.3 }}
        className="flex flex-col items-center gap-3"
      >
        <Button
          onPress={() => navigate({ to: '/orders' })}
          className="h-11 px-6 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          {t('quoteBuilder.trackQuote', 'Track Quote')}
        </Button>

        <Button
          onPress={() => navigate({ to: '/orders' })}
          className="text-sm text-[var(--color-primary)] hover:underline cursor-pointer outline-none"
        >
          {t('quoteBuilder.backToOrders', 'Back to Orders')}
        </Button>
      </motion.div>
    </div>
  )
}
