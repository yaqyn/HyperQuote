import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AIMessage } from '../../../types/ai'

interface AIMessageBubbleProps {
  message: AIMessage
  isStreaming?: boolean
}

/**
 * AI message bubble.
 * User messages: right-aligned, blue background.
 * Assistant messages: left-aligned, glass background.
 * Timestamps in Geist Mono. Simple markdown rendering.
 * Draft-review-confirm indicator for mutation suggestions.
 */
export function AIMessageBubble({ message, isStreaming }: AIMessageBubbleProps) {
  const { t } = useTranslation('ai')
  const isUser = message.role === 'user'
  const [draftStatus, setDraftStatus] = useState<'draft' | 'reviewed' | 'confirmed'>('draft')

  const isDraft = !isUser && message.content.includes('[Draft]')

  const formattedTime = useMemo(() => {
    const d = new Date(message.timestamp)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }, [message.timestamp])

  const renderedContent = useMemo(() => {
    return renderSimpleMarkdown(message.content)
  }, [message.content])

  const handleReview = () => setDraftStatus('reviewed')
  const handleConfirm = () => setDraftStatus('confirmed')

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-[#2563EB] text-white'
              : 'backdrop-blur-sm bg-white/60 dark:bg-black/60 border border-black/5 dark:border-white/10'
          }`}
        >
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {renderedContent}
            {isStreaming && !isUser && (
              <span className="inline-block w-[1.5px] h-[14px] bg-current align-middle ms-0.5 animate-pulse" />
            )}
          </div>

          {/* Draft-Review-Confirm for mutation suggestions */}
          {isDraft && (
            <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 flex items-center gap-2">
              <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                {draftStatus === 'draft' ? t('draft.badge', 'Draft') :
                 draftStatus === 'reviewed' ? t('draft.reviewed', 'Reviewed') :
                 t('draft.confirmed', 'Confirmed')}
              </span>
              {draftStatus === 'draft' && (
                <button
                  type="button"
                  onClick={handleReview}
                  className="text-xs font-medium text-[#2563EB] hover:underline"
                >
                  {t('draft.review', 'Review')}
                </button>
              )}
              {draftStatus === 'reviewed' && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="text-xs font-medium text-[#2563EB] hover:underline"
                >
                  {t('draft.confirm', 'Confirm')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`mt-1 text-[10px] font-[family-name:var(--font-geist-mono)] tabular-nums text-black/30 dark:text-white/30 ${isUser ? 'text-end' : 'text-start'}`}>
          {formattedTime}
        </div>
      </div>
    </div>
  )
}

/**
 * Simple regex-based markdown rendering.
 * Handles bold, lists, and inline code. No heavy library.
 */
function renderSimpleMarkdown(text: string): (string | JSX.Element)[] {
  const lines = text.split('\n')
  const elements: (string | JSX.Element)[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (i > 0) elements.push(<br key={`br-${i}`} />)

    // List items
    if (line.startsWith('- ')) {
      elements.push(
        <span key={`li-${i}`} className="flex items-start gap-1.5">
          <span className="text-black/30 dark:text-white/30 mt-0.5">&#8226;</span>
          <span>{renderInline(line.slice(2))}</span>
        </span>,
      )
      continue
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s/)
    if (numMatch) {
      elements.push(
        <span key={`ol-${i}`} className="flex items-start gap-1.5">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-black/40 dark:text-white/40">{numMatch[1]}.</span>
          <span>{renderInline(line.slice(numMatch[0].length))}</span>
        </span>,
      )
      continue
    }

    elements.push(<span key={`line-${i}`}>{renderInline(line)}</span>)
  }

  return elements
}

function renderInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  // Bold **text**
  const regex = /\*\*(.+?)\*\*|`(.+?)`/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    if (match[1]) {
      parts.push(<strong key={match.index}>{match[1]}</strong>)
    } else if (match[2]) {
      parts.push(
        <code key={match.index} className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-[family-name:var(--font-geist-mono)] text-xs">
          {match[2]}
        </code>,
      )
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 0 ? parts : [text]
}
