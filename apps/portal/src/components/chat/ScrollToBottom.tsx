/**
 * ScrollToBottom -- pill that appears when user scrolls up > 200px.
 * Tween entrance: opacity + y, 200ms. Uses motion/react.
 */
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown } from 'lucide-react'

interface ScrollToBottomProps {
  show: boolean
  onClick: () => void
}

export function ScrollToBottom({ show, onClick }: ScrollToBottomProps) {
  const { t } = useTranslation('portal')

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={onClick}
          className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm cursor-pointer"
        >
          <ChevronDown size={16} className="text-[var(--color-text)]" />
          <span className="text-xs font-normal text-[var(--color-text)]">
            {t('chat.scrollBottom')}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
