/**
 * TicketThread: Conversation thread view for a support ticket.
 * Messages alternate left (support) / right (customer).
 * Reply input at bottom.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, TextArea } from 'react-aria-components'
import { ArrowLeft, Send } from 'lucide-react'
import type { Ticket, TicketReply, TicketStatus } from '../../types/support'

interface TicketThreadProps {
  ticket: Ticket
  replies: TicketReply[]
  onReply: (message: string) => void
  onBack: () => void
  isReplying?: boolean
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-[var(--color-info)]/10 text-[var(--color-info)]',
  pending: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
  in_progress: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
  resolved: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  closed: 'bg-[var(--color-text-muted)]/10 text-[var(--color-text-muted)]',
}

export function TicketThread({
  ticket,
  replies,
  onReply,
  onBack,
  isReplying,
}: TicketThreadProps) {
  const { t, i18n } = useTranslation('portal')
  const [replyText, setReplyText] = useState('')
  const isArabic = i18n.language === 'ar'
  const timeFormatter = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  function handleSubmitReply() {
    if (!replyText.trim()) return
    onReply(replyText.trim())
    setReplyText('')
  }

  const isClosedOrResolved =
    ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--color-border)]">
        <Button
          onPress={onBack}
          aria-label={t('support.backToTickets')}
          className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors cursor-pointer outline-none"
        >
          <ArrowLeft size={18} className="text-[var(--color-text)] rtl:rotate-180" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)] truncate">
            {ticket.subject}
          </p>
          <span
            className={`inline-block rounded-sm px-1.5 py-0.5 text-xs mt-1 ${STATUS_STYLES[ticket.status]}`}
          >
            {t(`support.status.${ticket.status}`)}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3">
        {replies.map((reply) => {
          const isCustomer = reply.sender === 'customer'
          return (
            <div
              key={reply.id}
              className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  isCustomer
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text)]'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                {reply.attachments && reply.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {reply.attachments.map((url, i) => (
                      <a
                        key={`${reply.id}-attachment-${i}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs underline ${isCustomer ? 'text-white/80' : 'text-[var(--color-primary)]'}`}
                      >
                        {t('support.attachment')} {i + 1}
                      </a>
                    ))}
                  </div>
                )}
                <p
                  className={`font-mono text-[11px] mt-1 ${
                    isCustomer
                      ? 'text-white/60'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {timeFormatter.format(new Date(reply.createdAt))}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reply input */}
      {!isClosedOrResolved && (
        <div className="pt-3 border-t border-[var(--color-border)]">
          <div className="flex gap-2">
            <TextArea
              value={replyText}
              onChange={(e) => setReplyText(typeof e === 'string' ? e : (e as unknown as React.ChangeEvent<HTMLTextAreaElement>).target.value)}
              placeholder={t('support.replyPlaceholder')}
              rows={2}
              aria-label={t('support.replyLabel')}
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-none"
            />
            <Button
              onPress={handleSubmitReply}
              isDisabled={isReplying || !replyText.trim()}
              aria-label={t('support.sendReply')}
              className="self-end rounded-lg bg-[var(--color-primary)] p-2.5 text-white outline-none hover:opacity-90 focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-opacity"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
