/**
 * ScrollToBottom — Subtle floating button.
 */
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown } from 'lucide-react'

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
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--p-card)] border border-[var(--p-border)] shadow-lg shadow-black/30 cursor-pointer hover:bg-[var(--p-elevated)] transition-colors"
          aria-label="Scroll to bottom"
        >
          <ChevronDown size={14} className="text-[var(--p-text-secondary)]" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
