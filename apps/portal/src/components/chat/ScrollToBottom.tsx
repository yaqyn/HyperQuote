/**
 * ScrollToBottom — minimal downward arrow, no pill, no text.
 */
import { motion, AnimatePresence } from 'motion/react'

interface ScrollToBottomProps {
  show: boolean
  onClick: () => void
}

export function ScrollToBottom({ show, onClick }: ScrollToBottomProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          onClick={onClick}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-base)] border border-[var(--color-border)] shadow-sm cursor-pointer"
          aria-label="Scroll to bottom"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[var(--color-text-muted)]">
            <path d="M6 2V10M6 10L2 6M6 10L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
