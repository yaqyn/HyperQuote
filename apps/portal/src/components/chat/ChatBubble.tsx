/**
 * ChatBubble — RTL-aware message bubble for user and AI messages.
 *
 * User: blue bg, white text, rounded-br-md (rounded-bl-md in RTL).
 * AI: card bg, border, rounded-bl-md (rounded-br-md in RTL).
 * Numbers in AI text wrapped in Geist Mono spans.
 * Spring entrance animation per UI-SPEC.
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import type { ChatMessage } from '../../lib/chat-types'
import { RichMessageList } from './RichMessage'

// ============================================================================
// Helpers
// ============================================================================

/** Convert Western digits to Arabic-Indic (Eastern Arabic) */
const WESTERN_TO_ARABIC_INDIC: Record<string, string> = {
  '0': '\u0660',
  '1': '\u0661',
  '2': '\u0662',
  '3': '\u0663',
  '4': '\u0664',
  '5': '\u0665',
  '6': '\u0666',
  '7': '\u0667',
  '8': '\u0668',
  '9': '\u0669',
}

function toArabicIndic(str: string): string {
  return str.replace(/[0-9]/g, (d) => WESTERN_TO_ARABIC_INDIC[d] ?? d)
}

/**
 * Post-process AI text: wrap digit sequences in Geist Mono spans.
 * When locale is AR, convert to Arabic-Indic numerals.
 */
function processNumbers(text: string, isArabic: boolean): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  const regex = /\d[\d,.\s]*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const numStr = match[0]
    const display = isArabic ? toArabicIndic(numStr) : numStr
    parts.push(
      <span
        key={match.index}
        className="font-[family-name:var(--font-geist-mono)]"
      >
        {display}
      </span>,
    )
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

// ============================================================================
// Component
// ============================================================================

interface ChatBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
}

export function ChatBubble({ message, isStreaming }: ChatBubbleProps) {
  const { i18n } = useTranslation()
  const isUser = message.role === 'user'
  const isArabic = i18n.language === 'ar'

  const formattedTime = useMemo(() => {
    const d = new Date(message.timestamp)
    const formatted = d.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return formatted
  }, [message.timestamp, isArabic])

  const processedContent = useMemo(() => {
    if (isUser) return [message.content]
    return processNumbers(message.content, isArabic)
  }, [message.content, isUser, isArabic])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`flex flex-col ${isUser ? 'items-end ms-auto' : 'items-start me-auto'}`}
      style={{ maxWidth: isUser ? '80%' : '85%' }}
    >
      <div
        className={
          isUser
            ? 'bg-[var(--color-primary)] text-white rounded-2xl rounded-br-md rtl:rounded-br-2xl rtl:rounded-bl-md px-4 py-3'
            : 'bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl rounded-bl-md rtl:rounded-bl-2xl rtl:rounded-br-md p-4'
        }
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {processedContent}
          {isStreaming && !isUser && (
            <span className="inline-block w-0.5 h-4 bg-current align-middle ms-0.5 animate-pulse" />
          )}
        </p>
      </div>
      {/* Rich content cards (product cards, status cards, action buttons) */}
      {!isUser && message.richContent && message.richContent.length > 0 && (
        <RichMessageList items={message.richContent} />
      )}

      <span className="text-xs text-[var(--color-text-muted)] opacity-60 mt-1 font-[family-name:var(--font-geist-mono)]">
        {formattedTime}
      </span>
    </motion.div>
  )
}
