import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useChat, stream } from '@tanstack/ai-react'
import type { UIMessage } from '@tanstack/ai-react'
import type { StreamChunk } from '@tanstack/ai'
import { askAI } from '../../../lib/server/ai-assistant'
import { useAIStore } from '../../../stores/ai'
import { AIMessageBubble } from './AIMessageBubble'
import { SuggestedPrompts } from './SuggestedPrompts'

/**
 * Extract text content from a UIMessage.
 */
function extractContent(msg: UIMessage): string {
  if (msg.parts && msg.parts.length > 0) {
    return msg.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; content: string }).content)
      .join('')
  }
  return ''
}

/**
 * Convert array of StreamChunks to AsyncIterable.
 */
async function* arrayToAsyncIterable(
  chunks: StreamChunk[],
): AsyncIterable<StreamChunk> {
  for (const chunk of chunks) {
    yield chunk
  }
}

/**
 * AI Chat Interface — follows portal usePortalChat pattern.
 * Uses @tanstack/ai-react useChat + stream() with askAI server function.
 */
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

        const chunks = await askAI({
          data: { messages: simpleMessages },
        })

        yield* arrayToAsyncIterable(chunks as StreamChunk[])
      } catch (err) {
        console.error('[ai-chat] stream error:', err)
        yield { type: 'RUN_STARTED' as const, timestamp: Date.now(), runId: crypto.randomUUID() }
        yield { type: 'TEXT_MESSAGE_START' as const, timestamp: Date.now(), messageId: crypto.randomUUID(), role: 'assistant' as const }
        yield { type: 'TEXT_MESSAGE_CONTENT' as const, timestamp: Date.now(), messageId: crypto.randomUUID(), delta: 'Something went wrong. Please try again.' }
        yield { type: 'TEXT_MESSAGE_END' as const, timestamp: Date.now(), messageId: crypto.randomUUID() }
        yield { type: 'RUN_FINISHED' as const, timestamp: Date.now(), runId: crypto.randomUUID(), finishReason: 'stop' as const }
      }
    }),
    onError: (err) => {
      console.error('[ai-chat]', err)
      setIsStreaming(false)
    },
  })

  // Sync streaming state
  useEffect(() => {
    setIsStreaming(chat.isLoading)
  }, [chat.isLoading, setIsStreaming])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages])

  const handleSend = useCallback(() => {
    const text = inputValue.trim()
    if (!text || chat.isLoading) return
    chat.sendMessage(text)
    setInputValue('')
  }, [inputValue, chat.isLoading, chat.sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestedPrompt = useCallback((prompt: string) => {
    chat.sendMessage(prompt)
  }, [chat.sendMessage])

  const hasMessages = chat.messages.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* ─── Message Thread ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!hasMessages && (
          <div className="flex items-center justify-center h-full">
            <SuggestedPrompts onSelect={handleSuggestedPrompt} />
          </div>
        )}
        {hasMessages && (
          <div className="max-w-3xl mx-auto space-y-4">
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
            {/* Typing indicator */}
            {chat.isLoading && chat.messages[chat.messages.length - 1]?.role === 'user' && (
              <div className="flex items-center gap-1 ps-1 py-2">
                <span className="w-2 h-2 rounded-full bg-black/30 dark:bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-black/30 dark:bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-black/30 dark:bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ─── Input Bar ──────────────────────────────────── */}
      <div className="border-t border-black/5 dark:border-white/5 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <div className="flex-1 backdrop-blur-sm bg-white/60 dark:bg-black/60 rounded-xl border border-black/10 dark:border-white/10 px-4 py-2.5">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder', 'Ask me anything...')}
              rows={1}
              className="w-full resize-none bg-transparent outline-none text-sm placeholder:text-black/30 dark:placeholder:text-white/30"
              style={{ maxHeight: '120px' }}
            />
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() || chat.isLoading}
            className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-[#2563EB] text-white disabled:opacity-40 transition-opacity"
            aria-label={t('chat.send', 'Send')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
