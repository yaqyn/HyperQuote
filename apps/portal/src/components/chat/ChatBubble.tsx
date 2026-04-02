/**
 * ChatBubble — "Data is the design."
 *
 * No colored bubbles. No containers. Just text on the surface.
 * User: right-aligned, medium weight — your words carry visual weight.
 * AI: left-aligned, normal weight — the response flows naturally.
 * Numbers in Geist Mono. Timestamps appear on hover.
 * The conversation rhythm IS the visual design.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import type { ChatMessage } from '../../lib/chat-types'
import { RichMessageList } from './RichMessage'

const WESTERN_TO_ARABIC_INDIC: Record<string, string> = {
  '0': '\u0660', '1': '\u0661', '2': '\u0662', '3': '\u0663', '4': '\u0664',
  '5': '\u0665', '6': '\u0666', '7': '\u0667', '8': '\u0668', '9': '\u0669',
}

function toArabicIndic(str: string): string {
  return str.replace(/[0-9]/g, (d) => WESTERN_TO_ARABIC_INDIC[d] ?? d)
}

function processNumbers(text: string, isArabic: boolean): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  const regex = /\d[\d,.\s]*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const display = isArabic ? toArabicIndic(match[0]) : match[0]
    parts.push(
      <span key={match.index} className="font-mono">{display}</span>,
    )
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 0 ? parts : [text]
}

interface ChatBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
}

export function ChatBubble({ message, isStreaming }: ChatBubbleProps) {
  const { i18n } = useTranslation()
  const isUser = message.role === 'user'
  const isArabic = i18n.language === 'ar'
  const [hovered, setHovered] = useState(false)

  if (!message.content.trim() && !isStreaming) return null

  const formattedTime = useMemo(() => {
    const d = new Date(message.timestamp)
    return d.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [message.timestamp, isArabic])

  const processedContent = useMemo(() => {
    if (isUser) return [message.content]
    return processNumbers(message.content, isArabic)
  }, [message.content, isUser, isArabic])

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 24,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
      style={{ maxWidth: isUser ? '75%' : '80%', alignSelf: isUser ? 'flex-end' : 'flex-start' }}
    >
      {/* The text — no bubble, no container */}
      <p
        className={[
          'text-[14px] leading-[1.65] whitespace-pre-wrap',
          isUser
            ? 'text-[var(--color-text)] font-medium'
            : 'text-[var(--color-text-muted)]',
        ].join(' ')}
      >
        {processedContent}
        {isStreaming && !isUser && (
          <span className="inline-block w-[1.5px] h-[14px] bg-[var(--color-text-muted)] align-middle ms-0.5 animate-pulse" />
        )}
      </p>

      {/* Rich content */}
      {!isUser && message.richContent && message.richContent.length > 0 && (
        <div className="mt-3">
          <RichMessageList items={message.richContent} />
        </div>
      )}

      {/* Timestamp — fades in on hover */}
      <span
        className="font-mono text-[10px] text-[var(--color-text-subtle)] mt-1 transition-opacity duration-200"
        style={{ opacity: hovered ? 0.6 : 0 }}
      >
        {formattedTime}
      </span>
    </motion.div>
  )
}
