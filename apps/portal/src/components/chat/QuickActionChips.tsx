/**
 * QuickActionChips -- minimal text prompts below chat input.
 * No pills, no borders. Just quiet text suggestions separated by middots.
 */
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { QUICK_ACTION_CHIPS } from '../../lib/chat-types'
import { useChatStore } from '../../stores/chat'

interface QuickActionChipsProps {
  sendMessage: (msg: string) => void
}

export function QuickActionChips({ sendMessage }: QuickActionChipsProps) {
  const { t } = useTranslation('portal')
  const context = useChatStore((s) => s.quickActionContext)

  const chipKeys =
    context === 'product' || context === 'order'
      ? QUICK_ACTION_CHIPS.afterProduct
      : QUICK_ACTION_CHIPS.home

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="flex items-center justify-center gap-1 mt-4 flex-wrap"
    >
      {chipKeys.map((key, i) => (
        <span key={key} className="flex items-center">
          {i > 0 && (
            <span className="text-[var(--color-border)] mx-1.5" aria-hidden="true">
              ·
            </span>
          )}
          <button
            type="button"
            onClick={() => sendMessage(t(key))}
            className="text-[13px] text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition-colors duration-150"
          >
            {t(key)}
          </button>
        </span>
      ))}
    </motion.div>
  )
}
