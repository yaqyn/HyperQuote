/**
 * TicketThread — conversation as text, not bubbles.
 * Same "data is the design" as the AI chat:
 * Customer: right-aligned, medium weight.
 * Support: left-aligned, muted.
 * Timestamps on hover.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import type { Ticket, TicketReply } from '../../types/support'

interface TicketThreadProps {
  ticket: Ticket
  replies: TicketReply[]
  onReply: (message: string) => void
  onBack: () => void
  isReplying?: boolean
}

export function TicketThread({ ticket, replies, onReply, onBack, isReplying }: TicketThreadProps) {
  const { t, i18n } = useTranslation('portal')
  const [replyText, setReplyText] = useState('')
  const isArabic = i18n.language === 'ar'

  function handleSubmitReply() {
    if (!replyText.trim()) return
    onReply(replyText.trim())
    setReplyText('')
  }

  const isClosedOrResolved = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <div className="flex flex-col">
      {/* Back + subject */}
      <div className="flex items-baseline gap-4 mb-10">
        <button
          type="button"
          onClick={onBack}
          className="text-[11px] text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition-colors shrink-0"
          aria-label={t('support.backToTickets')}
        >
          &larr;
        </button>
        <div>
          <h2 className="text-sm font-normal text-[var(--color-text)]">
            {ticket.subject}
          </h2>
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
            {ticket.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Messages — same style as AI chat */}
      <div className="flex flex-col gap-6 mb-10">
        {replies.map((reply) => {
          const isCustomer = reply.sender === 'customer'
          const time = new Date(reply.createdAt).toLocaleTimeString(
            isArabic ? 'ar-EG' : 'en-US',
            { hour: '2-digit', minute: '2-digit' },
          )

          return (
            <motion.div
              key={reply.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className={`group flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
              style={{ maxWidth: isCustomer ? '75%' : '80%', alignSelf: isCustomer ? 'flex-end' : 'flex-start' }}
            >
              <p
                className={[
                  'text-[14px] leading-[1.65] whitespace-pre-wrap',
                  isCustomer
                    ? 'text-[var(--color-text)] font-medium'
                    : 'text-[var(--color-text-muted)]',
                ].join(' ')}
              >
                {reply.message}
              </p>

              {/* Attachments */}
              {reply.attachments && reply.attachments.length > 0 && (
                <div className="flex gap-2 mt-1">
                  {reply.attachments.map((url, i) => (
                    <a
                      key={`${reply.id}-${i}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[var(--color-text-subtle)] underline underline-offset-2 hover:text-[var(--color-text-muted)]"
                    >
                      {t('support.attachment')} {i + 1}
                    </a>
                  ))}
                </div>
              )}

              {/* Time — hover reveal */}
              <span className="font-mono text-[10px] text-[var(--color-text-subtle)] mt-1 opacity-0 group-hover:opacity-60 transition-opacity duration-200">
                {time}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Reply input — underline style */}
      {!isClosedOrResolved && (
        <div className="flex items-end gap-3 border-t border-[var(--color-border)] pt-6">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t('support.replyPlaceholder')}
            rows={2}
            aria-label={t('support.replyLabel')}
            spellCheck={false}
            className="flex-1 bg-transparent border-0 border-b border-[var(--color-border)] pb-2 text-sm text-[var(--color-text)] outline-none resize-none focus:border-[#2563EB] transition-colors placeholder:text-[var(--color-border)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmitReply()
              }
            }}
          />
          {replyText.trim() && (
            <button
              type="button"
              onClick={handleSubmitReply}
              disabled={isReplying}
              className="shrink-0 mb-0.5 disabled:opacity-30"
              aria-label={t('support.sendReply')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--color-text)]">
                <path d="M7 12V2M7 2L3 6M7 2L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
