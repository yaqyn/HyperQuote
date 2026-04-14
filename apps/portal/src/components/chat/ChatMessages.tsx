/**
 * ChatMessages — Scrollable conversation area.
 * Dark theme, clean spacing, auto-scroll.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../../lib/chat-types'
import { ChatBubble } from './ChatBubble'
import { TypingIndicator } from './TypingIndicator'
import { ScrollToBottom } from './ScrollToBottom'

interface ChatMessagesProps {
  messages: ChatMessage[]
  isLoading: boolean
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const userScrolledRef = useRef(false)

  const showTyping =
    isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user'

  const isStreaming =
    isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant'

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const scrolledUp = distanceFromBottom > 200
    setShowScrollBtn(scrolledUp)
    userScrolledRef.current = scrolledUp
  }, [])

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

  if (messages.length === 0 && !isLoading) return null

  return (
    <div className="relative flex-1 flex flex-col min-h-0 w-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-[720px] mx-auto flex flex-col gap-1 px-6 py-6 sm:px-4">
          {messages.map((msg, idx) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && idx === messages.length - 1}
            />
          ))}

          {showTyping && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll pill */}
      <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <ScrollToBottom show={showScrollBtn} onClick={scrollToBottom} />
        </div>
      </div>

      {/* Screen reader */}
      <div aria-live="polite" className="sr-only">
        {messages.length > 0 && messages[messages.length - 1]?.role === 'assistant'
          ? messages[messages.length - 1]?.content
          : null}
      </div>
    </div>
  )
}
