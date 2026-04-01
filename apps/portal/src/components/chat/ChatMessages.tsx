/**
 * ChatMessages -- scrollable message list with auto-scroll, scroll-to-bottom pill,
 * typing indicator, empty state, and aria-live region.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '../../lib/chat-types'
import { ChatBubble } from './ChatBubble'
import { TypingIndicator } from './TypingIndicator'
import { ScrollToBottom } from './ScrollToBottom'

interface ChatMessagesProps {
  messages: ChatMessage[]
  isLoading: boolean
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const { t } = useTranslation('portal')
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const userScrolledRef = useRef(false)

  // Show typing when loading and last message is from user (waiting for AI)
  const showTyping =
    isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user'

  // Detect streaming: loading + last message is assistant = actively streaming
  const isStreaming =
    isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant'

  // Track scroll position for scroll-to-bottom pill
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const scrolledUp = distanceFromBottom > 200
    setShowScrollBtn(scrolledUp)
    userScrolledRef.current = scrolledUp
  }, [])

  // Auto-scroll to bottom on new messages (unless user scrolled up)
  useEffect(() => {
    if (!userScrolledRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, isLoading])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    userScrolledRef.current = false
    setShowScrollBtn(false)
  }, [])

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-6">
        <div className="max-w-[640px] w-full text-center">
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-2">
            {t('chat.emptyHeading')}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t('chat.emptyBody')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 sm:px-4"
      >
        <div className="max-w-[640px] mx-auto flex flex-col gap-4 py-4">
          {messages.map((msg, idx) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && idx === messages.length - 1}
            />
          ))}

          {showTyping && <TypingIndicator />}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll-to-bottom pill */}
      <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <ScrollToBottom show={showScrollBtn} onClick={scrollToBottom} />
        </div>
      </div>

      {/* Screen reader live region for new AI messages */}
      <div aria-live="polite" className="sr-only">
        {messages.length > 0 && messages[messages.length - 1]?.role === 'assistant'
          ? messages[messages.length - 1]?.content
          : null}
      </div>
    </div>
  )
}
