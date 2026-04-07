import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AIMessage } from '../../../types/ai'

interface AIMessageBubbleProps {
  message: AIMessage
  isStreaming?: boolean
}

/**
 * AIMessageBubble — "The Message"
 * User messages: right-aligned, subtle bg tint.
 * AI responses: left-aligned, no background, just text. Code blocks in Geist Mono with subtle bg.
 * Timestamp as tiny mono text below each message.
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
      <div className={`max-w-[85%] ${isUser ? 'order-1' : ''}`}>
        {/* Message content */}
        <div
          className={`text-sm leading-relaxed ${
            isUser
              ? 'rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] px-4 py-2.5'
              : ''
          }`}
        >
          <div className="whitespace-pre-wrap">
            {renderedContent}
            {isStreaming && !isUser && (
              <span className="inline-block w-px h-[14px] bg-current align-middle ms-0.5 animate-pulse" />
            )}
          </div>

          {/* Draft-Review-Confirm */}
          {isDraft && (
            <div className={`mt-2.5 pt-2.5 flex items-center gap-2 ${
              isUser ? '' : 'border-t border-black/[0.06] dark:border-white/[0.06]'
            }`}>
              <span className={`text-[10px] font-medium font-[family-name:var(--font-geist-mono)] ${
                draftStatus === 'confirmed' ? 'text-green-600 dark:text-green-400' :
                draftStatus === 'reviewed' ? 'text-[#2563EB]' :
                'text-amber-600 dark:text-amber-400'
              }`}>
                {draftStatus === 'draft' ? t('draft.badge', 'DRAFT') :
                 draftStatus === 'reviewed' ? t('draft.reviewed', 'REVIEWED') :
                 t('draft.confirmed', 'CONFIRMED')}
              </span>
              {draftStatus === 'draft' && (
                <button
                  type="button"
                  onClick={handleReview}
                  className="text-[11px] text-[#2563EB]/70 hover:text-[#2563EB] cursor-pointer"
                >
                  {t('draft.review', 'Review')}
                </button>
              )}
              {draftStatus === 'reviewed' && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="text-[11px] text-[#2563EB]/70 hover:text-[#2563EB] cursor-pointer"
                >
                  {t('draft.confirm', 'Confirm')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Timestamp — tiny mono */}
        <div className={`mt-1 font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/15 dark:text-white/15 ${isUser ? 'text-end' : 'text-start'}`}>
          {formattedTime}
        </div>
      </div>
    </div>
  )
}

// ─── Markdown ────────────────────────────────────────────

function renderSimpleMarkdown(text: string): (string | JSX.Element)[] {
  const lines = text.split('\n')
  const elements: (string | JSX.Element)[] = []
  let inCodeBlock = false
  let codeLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // Code block fences
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="my-2 rounded bg-black/[0.03] dark:bg-white/[0.04] p-3 text-[12px] font-[family-name:var(--font-geist-mono)] overflow-x-auto leading-relaxed text-black/60 dark:text-white/60">
            {codeLines.join('\n')}
          </pre>,
        )
        codeLines = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    if (i > 0) elements.push(<br key={`br-${i}`} />)

    // List items
    if (line.startsWith('- ')) {
      elements.push(
        <span key={`li-${i}`} className="flex items-start gap-1.5">
          <span className="text-black/20 dark:text-white/20 mt-0.5 shrink-0">-</span>
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
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-black/25 dark:text-white/25 shrink-0">{numMatch[1]}.</span>
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
        <code key={match.index} className="px-1 py-px rounded bg-black/[0.04] dark:bg-white/[0.06] font-[family-name:var(--font-geist-mono)] text-[12px]">
          {match[2]}
        </code>,
      )
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 0 ? parts : [text]
}
