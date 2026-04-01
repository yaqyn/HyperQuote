/**
 * QuickActionChips -- contextual action chips below chat input.
 * Horizontal scrollable row, tween entrance with stagger.
 * Active set determined by quickActionContext from Zustand.
 */
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
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
    <div className="flex gap-2 overflow-x-auto mt-2 pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {chipKeys.map((key, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: i * 0.05 }}
        >
          <Button
            onPress={() => sendMessage(t(key))}
            className="shrink-0 h-8 px-3 rounded-full border border-[var(--color-border)] text-xs font-normal text-[var(--color-text)] cursor-pointer transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] pressed:opacity-80"
          >
            {t(key)}
          </Button>
        </motion.div>
      ))}
    </div>
  )
}
