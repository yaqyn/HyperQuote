import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { MessageSquare, X, ChevronUp } from 'lucide-react'
import { useChatWidget } from '../../hooks/useChatWidget'

export function ChatFAB() {
  const { t } = useTranslation('website')
  const { toggle, isOpen } = useChatWidget()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 400)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed bottom-4 end-4 z-40 flex flex-col items-center gap-2">
      {/* Back to top */}
      <AnimatePresence>
        {scrolled && !isOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label={t('a11y.backToTop')}
            className="flex h-8 w-8 cursor-pointer items-center justify-center text-[var(--color-text)] opacity-25 transition-opacity hover:opacity-50"
          >
            <ChevronUp size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat toggle — only visible after scroll */}
      <AnimatePresence>
        {(scrolled || isOpen) && (
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.8, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={toggle}
        aria-label={t('chat.fabLabel')}
        className="flex p-3.5 cursor-pointer items-center justify-center rounded-full bg-[var(--color-base)]/40 backdrop-blur-2xl text-[var(--color-text)]/60 transition-colors duration-150 hover:bg-[var(--color-base)]/50 hover:text-[var(--color-text)]/80"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="x"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.12 }}
              className="flex items-center justify-center"
            >
              <X size={20} />
            </motion.span>
          ) : (
            <motion.span
              key="msg"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: 0.12 }}
              className="flex items-center justify-center"
            >
              <MessageSquare size={20} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
