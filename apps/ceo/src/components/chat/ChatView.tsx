import { useEffect, useRef, useState } from 'react'
import { TextField, Input, Button } from 'react-aria-components'
import type { ChatMessage } from '../../types/chat'
import { askCEOAI } from '../../lib/server/chat'
import { ChatBubble } from './ChatBubble'

interface ChatViewProps {
  initialQuery?: string
}

export function ChatView({ initialQuery }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const initialSent = useRef(false)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Auto-send initial query from search transition
  useEffect(() => {
    if (initialQuery && !initialSent.current) {
      initialSent.current = true
      sendMessage(initialQuery)
    }
  }, [initialQuery])

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await askCEOAI({ data: { question: text.trim() } })
      setMessages((prev) => [...prev, response])
    } catch {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I was unable to process your request. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          {messages.length === 0 && !isLoading && (
            <p className="py-20 text-center text-sm text-[var(--color-text-muted)]">
              Ask me anything about the business.
            </p>
          )}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 px-1 py-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-text-muted)]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-text-muted)] [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-text-muted)] [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <TextField
            className="flex-1"
            aria-label="Ask a question"
            value={input}
            onChange={setInput}
          >
            <Input
              className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-text)]"
              placeholder="Ask about revenue, orders, customers..."
              onKeyDown={handleKeyDown}
            />
          </TextField>
          <Button
            onPress={() => sendMessage(input)}
            isDisabled={!input.trim() || isLoading}
            className="h-12 shrink-0 px-5 text-sm font-medium text-[var(--color-text)] transition-opacity disabled:opacity-30"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
