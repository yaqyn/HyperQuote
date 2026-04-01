/**
 * FloatingAIButton -- Mini AI chat panel visible when windows are open.
 *
 * Wired to usePortalChat() for real streaming. Shows messages in compact panel.
 * Ctrl+J toggles, auto-closes when no window open. Context-aware greeting.
 * Keeps spring/tween animations from Phase 7.
 */
import { useCallback, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useLocation, useMatches } from '@tanstack/react-router'
import { Sparkles, X, ArrowUp, Square } from 'lucide-react'
import { Button } from 'react-aria-components'
import { usePortalStore } from '../../stores/portal'
import { usePortalChat } from '../../hooks/usePortalChat'
import { useShortcut } from '../../hooks/useShortcut'
import type { ChatMessage } from '../../lib/chat-types'

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

/** Compact message bubble for mini panel */
function MiniMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
          isUser
            ? 'bg-[var(--color-primary)] text-white rounded-br-sm rtl:rounded-br-xl rtl:rounded-bl-sm'
            : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] rounded-bl-sm rtl:rounded-bl-xl rtl:rounded-br-sm'
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}

export function FloatingAIButton() {
  const { t } = useTranslation('portal')
  const matches = useMatches()
  const location = useLocation()
  const isFloatingAIOpen = usePortalStore((s) => s.isFloatingAIOpen)
  const toggleFloatingAI = usePortalStore((s) => s.toggleFloatingAI)
  const setFloatingAIOpen = usePortalStore((s) => s.setFloatingAIOpen)
  const chat = usePortalChat()

  const [inputValue, setInputValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chat.messages.length])

  // Focus input when panel opens
  useEffect(() => {
    if (isFloatingAIOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isFloatingAIOpen])

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || chat.isLoading) return
    chat.sendMessage(inputValue.trim())
    setInputValue('')
  }, [inputValue, chat])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  if (!isWindowOpen) return null

  const greetingKey = getContextGreeting(location.pathname)
  const hasMessages = chat.messages.length > 0

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
              <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
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
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-2 min-h-[120px] max-h-[calc(60vh-120px)]"
              >
                {!hasMessages ? (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {t(greetingKey)}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {chat.messages.map((msg) => (
                      <MiniMessage key={msg.id} message={msg} />
                    ))}
                    {chat.isLoading &&
                      chat.messages[chat.messages.length - 1]?.role ===
                        'user' && (
                        <div className="flex items-center gap-1.5 ps-1">
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className="w-1 h-1 rounded-full bg-[var(--color-text-muted)] animate-bounce"
                                style={{ animationDelay: `${i * 200}ms` }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Compact chat input */}
              <div className="px-4 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    data-chat-input
                    placeholder={t('chat.placeholder1')}
                    disabled={chat.isLoading}
                    className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors"
                  />
                  {chat.isLoading ? (
                    <button
                      type="button"
                      onClick={() => chat.stop()}
                      className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-colors"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--color-error) 10%, transparent)',
                        border:
                          '1px solid color-mix(in srgb, var(--color-error) 20%, transparent)',
                      }}
                      aria-label={t('a11y.stopGenerating')}
                    >
                      <Square
                        size={14}
                        className="text-[var(--color-error)]"
                      />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!inputValue.trim()}
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-primary)] shrink-0 transition-opacity"
                      style={{
                        opacity: inputValue.trim() ? 1 : 0.3,
                      }}
                      aria-label={t('a11y.sendMessage')}
                    >
                      <ArrowUp size={16} className="text-white" />
                    </button>
                  )}
                </div>
              </div>
            </Dialog>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Need to import Dialog for the JSX above -- using a simple div with role instead
// since the Dialog is already from react-aria in the original. Keep the import structure.
function Dialog({
  children,
  className,
  ...props
}: {
  children: React.ReactNode
  className?: string
  'aria-label'?: string
  isKeyboardDismissDisabled?: boolean
}) {
  return (
    <div role="dialog" aria-label={props['aria-label']} className={className}>
      {children}
    </div>
  )
}
