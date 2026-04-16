import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { Reply, Forward, ChevronDown, ChevronUp } from 'lucide-react'
import type { Message } from '../../types/customer-service'

export type EmailAction = 'reply' | 'reply-all' | 'forward'

interface EmailMessageProps {
  message: Message
  isLatest: boolean
  onAction: (action: EmailAction, message: Message) => void
}

function formatEmailDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  if (isToday) return `Today, ${time}`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  }) + `, ${time}`
}

export function EmailMessage({ message, isLatest, onAction }: EmailMessageProps) {
  const { t } = useTranslation('customer-service')
  const [expanded, setExpanded] = useState(isLatest)

  const from = (message.metadata.from as string) ?? message.senderName
  const to = (message.metadata.to as string) ?? ''
  const cc = (message.metadata.cc as string | null) ?? null
  const isInbound = message.direction === 'inbound'

  // Collapsed view for older emails
  if (!expanded) {
    return (
      <Button
        onPress={() => setExpanded(true)}
        aria-label={`${t('email.expand')} — ${message.senderName}`}
        className="w-full text-start flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/40"
      >
        <div className="w-6 h-6 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
          <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
            {message.senderName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={`text-[12px] truncate ${isInbound ? 'font-medium text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
            {message.senderName}
          </span>
          <span className="text-[11px] text-[var(--color-text-subtle)] truncate flex-1">
            {message.content.split('\n')[0]}
          </span>
        </div>
        <span className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] tabular-nums shrink-0">
          {formatEmailDate(message.timestamp)}
        </span>
        <ChevronDown size={12} className="text-[var(--color-text-subtle)] shrink-0" />
      </Button>
    )
  }

  // Expanded view
  return (
    <div className={`rounded-lg border border-black/[0.04] dark:border-white/[0.04] ${isLatest ? '' : 'bg-black/[0.01] dark:bg-white/[0.01]'}`}>
      {/* Email header */}
      <div className="px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.04]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              isInbound
                ? 'bg-black/[0.05] dark:bg-white/[0.08]'
                : 'bg-[var(--color-primary)]/10'
            }`}>
              <span className={`text-[11px] font-semibold ${
                isInbound ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-primary)]'
              }`}>
                {message.senderName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-semibold text-[var(--color-text)]">
                  {message.senderName}
                </span>
                <span className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] tabular-nums">
                  {formatEmailDate(message.timestamp)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <div className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] truncate">
                  {from} → {to}
                </div>
                {cc && (
                  <div className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] truncate">
                    cc: {cc}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collapse button for non-latest */}
          {!isLatest && (
            <Button
              onPress={() => setExpanded(false)}
              aria-label={t('email.collapse')}
              className="flex items-center justify-center w-6 h-6 rounded-md text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer shrink-0"
            >
              <ChevronUp size={13} strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>

      {/* Email body */}
      <div className="px-4 py-3">
        <div className="text-[13px] leading-relaxed text-[var(--color-text)] whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Attachments */}
        {message.attachments.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
            {message.attachments.map((att) => (
              <div
                key={att.id}
                className="inline-flex items-center gap-1.5 rounded-md bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-[var(--color-text-muted)]"
              >
                <span className="font-[var(--font-geist-mono)]">{att.name}</span>
                <span className="text-[var(--color-text-subtle)]">
                  {(att.sizeBytes / 1024).toFixed(0)}KB
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-4 py-2 border-t border-black/[0.04] dark:border-white/[0.04]">
        <Button
          onPress={() => onAction('reply', message)}
          aria-label={t('email.reply')}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <Reply size={12} strokeWidth={1.5} />
          {t('email.reply')}
        </Button>
        {cc && (
          <Button
            onPress={() => onAction('reply-all', message)}
            aria-label={t('email.replyAll')}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <Reply size={12} strokeWidth={1.5} />
            {t('email.replyAll')}
          </Button>
        )}
        <Button
          onPress={() => onAction('forward', message)}
          aria-label={t('email.forward')}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <Forward size={12} strokeWidth={1.5} />
          {t('email.forward')}
        </Button>
      </div>
    </div>
  )
}
