import { useRef, useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, TooltipTrigger, Tooltip } from 'react-aria-components'
import { UserCircle2 } from 'lucide-react'
import { MessageItem } from './MessageItem'
import { ResponseComposer } from './ResponseComposer'
import { EmailMessage } from './EmailMessage'
import { EmailComposer } from './EmailComposer'
import type { Conversation, Message } from '../../types/customer-service'
import type { EmailAction } from './EmailMessage'

interface ConversationViewProps {
  conversation: Conversation
  onOpenProfile: () => void
}

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function ConversationView({ conversation, onOpenProfile }: ConversationViewProps) {
  const { t, i18n } = useTranslation('customer-service')
  const threadRef = useRef<HTMLDivElement>(null)

  // Email composer state
  const [emailReplyTo, setEmailReplyTo] = useState<Message | null>(null)
  const [emailAction, setEmailAction] = useState<EmailAction | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)

  const isEmail = conversation.channel === 'email'
  const isActive = conversation.status !== 'closed' && conversation.status !== 'resolved'

  // Reset composer when conversation changes
  useEffect(() => {
    setComposerOpen(false)
    setEmailReplyTo(null)
    setEmailAction(null)
  }, [conversation.id])

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [conversation.id, conversation.messages.length])

  const handleEmailAction = useCallback((action: EmailAction, message: Message) => {
    setEmailReplyTo(message)
    setEmailAction(action)
    setComposerOpen(true)
  }, [])

  const handleDiscardEmail = useCallback(() => {
    setComposerOpen(false)
    setEmailReplyTo(null)
    setEmailAction(null)
  }, [])

  // For email: if no composer is open and conversation is active, default to reply on latest
  const handleOpenReply = useCallback(() => {
    const latest = conversation.messages[conversation.messages.length - 1]
    if (latest) {
      handleEmailAction('reply', latest)
    }
  }, [conversation.messages, handleEmailAction])

  const customerName = i18n.language === 'ar' ? conversation.customer.nameAr : conversation.customer.name
  const companyName = i18n.language === 'ar' ? conversation.customer.companyAr : conversation.customer.company

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="shrink-0 px-5 py-3 border-b border-black/[0.04] dark:border-white/[0.04]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[14px] font-semibold text-[var(--color-text)] truncate">
                {customerName}
              </span>
              {companyName && (
                <span className="text-[12px] text-[var(--color-text-subtle)] truncate hidden sm:inline">
                  {companyName}
                </span>
              )}
            </div>
            <p className="text-[12px] text-[var(--color-text-muted)] leading-snug line-clamp-1">
              {conversation.subject}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 font-[var(--font-geist-mono)] text-[10px] tabular-nums">
              <span className={`uppercase tracking-wider font-semibold ${
                conversation.slaBreached
                  ? 'text-[var(--color-error)]'
                  : conversation.priority === 'urgent'
                    ? 'text-[var(--color-error)]'
                    : 'text-[var(--color-text-muted)]'
              }`}>
                {conversation.slaBreached
                  ? t('header.slaBreached')
                  : t(`status.${conversation.status}`)
                }
              </span>
              <span className="text-[var(--color-text-subtle)]">·</span>
              <span className="text-[var(--color-text-subtle)]">
                {formatAge(conversation.createdAt)}
              </span>
            </div>

            <TooltipTrigger delay={3000}>
              <Button
                onPress={onOpenProfile}
                aria-label={t('profile.title')}
                className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <UserCircle2 size={15} strokeWidth={1.5} />
              </Button>
              <Tooltip
                offset={6}
                className="rounded-md bg-black/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg dark:bg-white/90 dark:text-black"
              >
                {t('profile.title')}
              </Tooltip>
            </TooltipTrigger>
          </div>
        </div>
      </div>

      {/* ── Thread ───────────────────────────────────────────── */}
      <div ref={threadRef} className="flex-1 overflow-y-auto min-h-0 px-5 py-4">
        <div className="max-w-[680px] mx-auto flex flex-col gap-3">
          {isEmail ? (
            // Email thread: each message is a collapsible email card
            conversation.messages.map((message, i) => (
              <EmailMessage
                key={message.id}
                message={message}
                isLatest={i === conversation.messages.length - 1}
                onAction={handleEmailAction}
              />
            ))
          ) : (
            // Chat thread: document-style messages
            conversation.messages.map((message, i) => (
              <MessageItem
                key={message.id}
                message={message}
                conversationChannel={conversation.channel}
                isFirstInGroup={
                  i === 0 ||
                  conversation.messages[i - 1]!.senderName !== message.senderName ||
                  conversation.messages[i - 1]!.channel !== message.channel
                }
              />
            ))
          )}
        </div>
      </div>

      {/* ── Composer ─────────────────────────────────────────── */}
      {isActive && (
        isEmail ? (
          composerOpen ? (
            <EmailComposer
              conversation={conversation}
              replyTo={emailReplyTo}
              action={emailAction}
              onDiscard={handleDiscardEmail}
            />
          ) : (
            // Minimal "Reply" prompt for email when composer is closed
            <div className="shrink-0 border-t border-black/[0.06] dark:border-white/[0.06] px-5 py-3">
              <Button
                onPress={handleOpenReply}
                aria-label={t('email.reply')}
                className="w-full rounded-lg bg-black/[0.03] dark:bg-white/[0.04] text-[13px] text-[var(--color-text-subtle)] py-2.5 px-3 text-start hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/30"
              >
                {t('email.clickToReply')}
              </Button>
            </div>
          )
        ) : (
          <ResponseComposer conversation={conversation} />
        )
      )}
    </div>
  )
}
