import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../hooks/useAIChat'
import { TypingIndicator } from './TypingIndicator'

interface ChatMessagesProps {
  messages: ChatMessage[]
  isLoading: boolean
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isLoading])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={
              msg.role === 'user'
                ? 'max-w-[80%] rounded-xl rounded-tr-sm rtl:rounded-tr-xl rtl:rounded-tl-sm bg-[#2563EB] px-4 py-3 text-white'
                : 'max-w-[80%] rounded-xl rounded-tl-sm rtl:rounded-tl-xl rtl:rounded-tr-sm bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)]'
            }
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {msg.content}
            </p>
          </div>
        </div>
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
