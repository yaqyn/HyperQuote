import { motion, AnimatePresence } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

interface GlassWindowProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

export function GlassWindow({ isOpen, onClose, children, className }: GlassWindowProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-6" onClick={onClose}>
          <motion.div
            key="glass-panel"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'flex flex-col w-full h-full',
              'bg-[var(--color-surface)]',
              'rounded-2xl',
              'shadow-2xl shadow-black/8 dark:shadow-black/25',
              'overflow-hidden',
              className,
            )}
            role="dialog"
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
