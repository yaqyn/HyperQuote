import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useLocation, useMatches } from '@tanstack/react-router'
import { Sparkles, X } from 'lucide-react'
import { Button, Dialog, DialogTrigger } from 'react-aria-components'
import { useEffect } from 'react'
import { usePortalStore } from '../../stores/portal'
import { useShortcut } from '../../hooks/useShortcut'

const WINDOW_ROUTES = [
  '/orders',
  '/market',
  '/notifications',
  '/documents',
  '/support',
  '/settings',
  '/supplier/stock',
  '/supplier/orders',
]

/** Context-aware greeting key based on current route */
function getContextGreeting(pathname: string): string {
  if (pathname.startsWith('/orders')) return 'floatingAI.orders'
  if (pathname.startsWith('/market')) return 'floatingAI.market'
  return 'floatingAI.orders'
}

export function FloatingAIButton() {
  const { t } = useTranslation('portal')
  const matches = useMatches()
  const location = useLocation()
  const isFloatingAIOpen = usePortalStore((s) => s.isFloatingAIOpen)
  const toggleFloatingAI = usePortalStore((s) => s.toggleFloatingAI)
  const setFloatingAIOpen = usePortalStore((s) => s.setFloatingAIOpen)

  const isWindowOpen = matches.some((m) =>
    WINDOW_ROUTES.some((p) => m.pathname.startsWith(p)),
  )

  // Ctrl+J toggles floating AI panel globally
  useShortcut('Mod+j', toggleFloatingAI)

  // Auto-close when window closes (route changes to /)
  useEffect(() => {
    if (!isWindowOpen) {
      setFloatingAIOpen(false)
    }
  }, [isWindowOpen, setFloatingAIOpen])

  if (!isWindowOpen) return null

  const greetingKey = getContextGreeting(location.pathname)

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isFloatingAIOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
              delay: 0.2,
            }}
            className="fixed bottom-4 end-4 z-50"
          >
            <Button
              onPress={toggleFloatingAI}
              aria-label={t('floatingAI.orders')}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-[var(--color-primary)] shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
            >
              <Sparkles size={20} className="text-white" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini AI chat panel */}
      <AnimatePresence>
        {isFloatingAIOpen && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed bottom-4 end-4 z-50 w-[380px] max-h-[60vh] flex flex-col backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[rgba(0,0,0,0.90)] rounded-2xl shadow-2xl border border-[var(--color-border)]/50"
          >
            <Dialog
              aria-label="AI Assistant"
              isKeyboardDismissDisabled
              className="outline-none flex flex-col h-full"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={16}
                    className="text-[var(--color-primary)]"
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">
                    AI
                  </span>
                </div>
                <Button
                  onPress={() => setFloatingAIOpen(false)}
                  aria-label={t('window.close')}
                  className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </Button>
              </div>

              {/* Message area */}
              <div className="flex-1 overflow-auto px-4 py-2 min-h-[120px]">
                <p className="text-sm text-[var(--color-text-muted)]">
                  {t(greetingKey)}
                </p>
              </div>

              {/* Compact chat input */}
              <div className="px-4 pb-3">
                <input
                  type="text"
                  data-chat-input
                  placeholder={t('chat.placeholder1')}
                  className="w-full h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors"
                />
              </div>
            </Dialog>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
