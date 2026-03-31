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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
          }}
          // Exit uses tween — Motion v12 supports per-value exit transitions
          // AnimatePresence detects exit and uses the exit prop values
          // with a separate tween transition for the exit animation
          className="fixed inset-0 z-40 flex items-center justify-center"
          role="presentation"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/20 dark:bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeIn' }}
            onClick={onClose}
          />
          {/* Glass panel */}
          <motion.div
            className={cn(
              'relative backdrop-blur-xl',
              'bg-[rgba(255,255,255,0.80)] dark:bg-[rgba(0,0,0,0.80)]',
              'shadow-md rounded-xl overflow-auto',
              'w-[90vw] h-[90vh] max-md:w-full max-md:h-full',
              className,
            )}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeIn' }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
