import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useChat, stream } from '@tanstack/ai-react'
import type { UIMessage } from '@tanstack/ai-react'
import type { StreamChunk } from '@tanstack/ai'
import { ArrowUp } from 'lucide-react'
import { Button } from 'react-aria-components'
import { askAI } from '../../../lib/server/ai-assistant'
import { useAIStore } from '../../../stores/ai'
import { AIMessageBubble } from './AIMessageBubble'

function extractContent(msg: UIMessage): string {
  if (msg.parts && msg.parts.length > 0) {
    return msg.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; content: string }).content)
      .join('')
  }
  return ''
}

async function* arrayToAsyncIterable(chunks: StreamChunk[]): AsyncIterable<StreamChunk> {
  for (const chunk of chunks) {
    yield chunk
  }
}

const SUGGESTIONS = [
  'Show open quotes for customer X',
  'Best rebar pricing this month?',
  'Orders at risk of missing delivery?',
  'AR aging over 90 days?',
]

export function AIChatInterface() {
  const { t } = useTranslation('ai')
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const setIsStreaming = useAIStore((s) => s.setIsStreaming)

  const chat = useChat({
    connection: stream(async function* (messages) {
      try {
        const simpleMessages = (messages as UIMessage[]).map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: extractContent(m),
          timestamp: new Date().toISOString(),
        }))
        const chunks = await askAI({ data: { messages: simpleMessages } })
        yield* arrayToAsyncIterable(chunks as StreamChunk[])
      } catch {
        yield { type: 'RUN_STARTED' as const, timestamp: Date.now(), runId: crypto.randomUUID() }
        yield { type: 'TEXT_MESSAGE_START' as const, timestamp: Date.now(), messageId: crypto.randomUUID(), role: 'assistant' as const }
        yield { type: 'TEXT_MESSAGE_CONTENT' as const, timestamp: Date.now(), messageId: crypto.randomUUID(), delta: 'Something went wrong. Please try again.' }
        yield { type: 'TEXT_MESSAGE_END' as const, timestamp: Date.now(), messageId: crypto.randomUUID() }
        yield { type: 'RUN_FINISHED' as const, timestamp: Date.now(), runId: crypto.randomUUID(), finishReason: 'stop' as const }
      }
    }),
    onError: () => setIsStreaming(false),
  })

  useEffect(() => {
    setIsStreaming(chat.isLoading)
  }, [chat.isLoading, setIsStreaming])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages])

  const handleSend = useCallback(() => {
    const text = inputValue.trim()
    if (!text || chat.isLoading) return
    chat.sendMessage(text)
    setInputValue('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }, [inputValue, chat.isLoading, chat.sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const hasMessages = chat.messages.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Messages or empty state */}
      <div className="flex-1 overflow-y-auto" data-module-content>
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full px-5">
            {/* Logo */}
            <img
              src="/brand/logos/LyonBlack.svg"
              alt="Lyon"
              className="h-32 mb-4 dark:hidden opacity-80"
            />
            <img
              src="/brand/logos/LyonWhite.svg"
              alt="Lyon"
              className="h-32 mb-4 hidden dark:block opacity-80"
            />
            <p className="text-lg font-semibold text-[var(--color-text)] mb-0.5">
              Lyon AI
            </p>
            <p className="text-[12px] text-[var(--color-text-subtle)] mb-8">
              Ask, Lyon.
            </p>

            {/* Suggestions as pills */}
            <div className="flex flex-col gap-2 w-full max-w-[300px]">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => chat.sendMessage(s)}
                  className="text-left px-4 py-2.5 rounded-xl text-[13px] text-[var(--color-text-muted)] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-[var(--color-text)] transition-all cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {chat.messages.map((msg: UIMessage, idx: number) => (
              <AIMessageBubble
                key={msg.id}
                message={{
                  id: msg.id,
                  role: msg.role as 'user' | 'assistant',
                  content: extractContent(msg),
                  timestamp: new Date().toISOString(),
                }}
                isStreaming={chat.isLoading && idx === chat.messages.length - 1 && msg.role === 'assistant'}
              />
            ))}
            {chat.isLoading && chat.messages[chat.messages.length - 1]?.role === 'user' && (
              <div className="flex items-center gap-1.5 py-2 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input — Claude.ai style: rounded container with send button */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className="flex items-end gap-2 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.02] px-4 py-3 focus-within:border-[var(--color-primary)]/30 transition-colors">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message Lyon..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/40 leading-relaxed appearance-none overflow-hidden"
            style={{ maxHeight: '100px' }}
          />
          <Button
            onPress={handleSend}
            isDisabled={!inputValue.trim() || chat.isLoading}
            className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full cursor-pointer outline-none transition-all ${
              inputValue.trim()
                ? 'bg-[var(--color-text)] text-[var(--color-surface)]'
                : 'bg-black/[0.06] dark:bg-white/[0.06] text-[var(--color-text-subtle)]'
            }`}
          >
            <ArrowUp size={14} strokeWidth={2} />
          </Button>
        </div>
      </div>
    </div>
  )
}
