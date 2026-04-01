/**
 * AI reorder suggestion card.
 * Contextual card above AI chat input (not a chat message).
 * Background: var(--color-info-bg), rounded-xl, p-12px.
 * Dismissed suggestions don't reappear for 7 days (localStorage cooldown).
 * Maximum 1 visible at a time.
 */
import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { X } from 'lucide-react'

interface AIReorderSuggestionProps {
  productId: string
  productName: string
  daysSinceOrder: number
  onReorder: (productId: string) => void
}

const COOLDOWN_DAYS = 7

function getDismissKey(productId: string) {
  return `hq-reorder-dismissed-${productId}`
}

function isDismissed(productId: string): boolean {
  try {
    const stored = localStorage.getItem(getDismissKey(productId))
    if (!stored) return false
    const dismissedDate = new Date(stored)
    const now = new Date()
    const diffMs = now.getTime() - dismissedDate.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays < COOLDOWN_DAYS
  } catch {
    return false
  }
}

function dismiss(productId: string) {
  try {
    localStorage.setItem(getDismissKey(productId), new Date().toISOString())
  } catch {
    // localStorage not available
  }
}

export function AIReorderSuggestion({
  productId,
  productName,
  daysSinceOrder,
  onReorder,
}: AIReorderSuggestionProps) {
  const { t } = useTranslation('portal')

  const initiallyDismissed = useMemo(() => isDismissed(productId), [productId])
  const [hidden, setHidden] = useState(initiallyDismissed)

  const handleDismiss = useCallback(() => {
    dismiss(productId)
    setHidden(true)
  }, [productId])

  const handleReorder = useCallback(() => {
    onReorder(productId)
  }, [productId, onReorder])

  if (hidden) return null

  return (
    <div className="bg-[var(--color-info-bg)] rounded-xl p-3 flex items-center gap-3">
      <p className="flex-1 text-sm text-[var(--color-text)]">
        {t('tracking.aiSuggestion', {
          product: productName,
          days: daysSinceOrder,
        })}
      </p>

      <Button
        onPress={handleReorder}
        className="shrink-0 h-8 px-4 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
      >
        {t('tracking.reorder')}
      </Button>

      <Button
        onPress={handleDismiss}
        aria-label={t('window.close')}
        className="shrink-0 flex items-center justify-center w-5 h-5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
      >
        <X size={12} />
      </Button>
    </div>
  )
}
