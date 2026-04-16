import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, TooltipTrigger, Tooltip } from 'react-aria-components'
import {
  Send,
  Paperclip,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Bold,
  Italic,
  Link,
  List,
} from 'lucide-react'
import type { Conversation, Message } from '../../types/customer-service'
import type { EmailAction } from './EmailMessage'

type ComposerMode = 'reply' | 'reply-all' | 'forward' | 'new'

interface EmailComposerProps {
  conversation: Conversation
  replyTo: Message | null
  action: EmailAction | null
  onDiscard: () => void
}

function deriveFields(
  conversation: Conversation,
  replyTo: Message | null,
  action: EmailAction | null,
): { to: string; cc: string; subject: string } {
  const customerEmail = conversation.customer.email ?? ''
  const supportEmail = 'support@hyperquote.io'

  if (!replyTo || !action) {
    return { to: customerEmail, cc: '', subject: `Re: ${conversation.subject}` }
  }

  const originalFrom = (replyTo.metadata.from as string) ?? ''
  const originalCc = (replyTo.metadata.cc as string) ?? ''
  const originalSubject = (replyTo.metadata.subject as string) ?? conversation.subject

  switch (action) {
    case 'reply': {
      const replyTo_ = replyTo.direction === 'inbound' ? originalFrom : customerEmail
      return { to: replyTo_, cc: '', subject: originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}` }
    }
    case 'reply-all': {
      const replyTo_ = replyTo.direction === 'inbound' ? originalFrom : customerEmail
      const ccList = [originalCc, replyTo.direction === 'inbound' ? '' : originalFrom]
        .filter(Boolean)
        .filter((addr) => addr !== replyTo_ && addr !== supportEmail)
        .join(', ')
      return { to: replyTo_, cc: ccList, subject: originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}` }
    }
    case 'forward':
      return { to: '', cc: '', subject: originalSubject.startsWith('Fwd:') ? originalSubject : `Fwd: ${originalSubject}` }
    default:
      return { to: customerEmail, cc: '', subject: `Re: ${conversation.subject}` }
  }
}

export function EmailComposer({ conversation, replyTo, action, onDiscard }: EmailComposerProps) {
  const { t } = useTranslation('customer-service')
  const defaults = deriveFields(conversation, replyTo, action)

  const [to, setTo] = useState(defaults.to)
  const [cc, setCc] = useState(defaults.cc)
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState(defaults.subject)
  const [body, setBody] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(!!defaults.cc)
  const [isDraft, setIsDraft] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSend()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [body, to],
  )

  function handleSend() {
    if (!body.trim() || !to.trim()) return
    setBody('')
    setTo('')
    setCc('')
    setBcc('')
    onDiscard()
  }

  function handleSaveDraft() {
    setIsDraft(true)
    // Draft save would go to server here
    setTimeout(() => setIsDraft(false), 1500)
  }

  function handleBodyInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setBody(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }

  const canSend = body.trim() && to.trim()

  return (
    <div className="shrink-0 border-t border-black/[0.06] dark:border-white/[0.06]">
      {/* Header row: mode label + discard */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-black/[0.03] dark:border-white/[0.03]">
        <span className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider">
          {action === 'forward' ? t('email.forward') : action === 'reply-all' ? t('email.replyAll') : t('email.reply')}
        </span>
        <Button
          onPress={onDiscard}
          aria-label={t('email.discard')}
          className="flex items-center justify-center w-6 h-6 rounded-md text-[var(--color-text-subtle)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors cursor-pointer"
        >
          <X size={13} strokeWidth={1.5} />
        </Button>
      </div>

      {/* Address fields */}
      <div className="px-4 py-2 flex flex-col gap-1.5">
        {/* To */}
        <div className="flex items-center gap-2">
          <label className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider w-8 shrink-0">
            {t('email.to')}
          </label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 text-[12px] text-[var(--color-text)] bg-transparent outline-none font-[var(--font-geist-mono)] placeholder:text-[var(--color-text-subtle)]"
            placeholder="email@example.com"
          />
          {!showCcBcc && (
            <Button
              onPress={() => setShowCcBcc(true)}
              aria-label={t('email.showCcBcc')}
              className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition-colors cursor-pointer"
            >
              CC/BCC
            </Button>
          )}
        </div>

        {/* CC */}
        {showCcBcc && (
          <>
            <div className="flex items-center gap-2">
              <label className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider w-8 shrink-0">
                {t('email.cc')}
              </label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="flex-1 text-[12px] text-[var(--color-text)] bg-transparent outline-none font-[var(--font-geist-mono)] placeholder:text-[var(--color-text-subtle)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider w-8 shrink-0">
                {t('email.bcc')}
              </label>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                className="flex-1 text-[12px] text-[var(--color-text)] bg-transparent outline-none font-[var(--font-geist-mono)] placeholder:text-[var(--color-text-subtle)]"
              />
            </div>
          </>
        )}

        {/* Subject */}
        <div className="flex items-center gap-2 border-t border-black/[0.03] dark:border-white/[0.03] pt-1.5">
          <label className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider w-8 shrink-0">
            {t('email.subject')}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 text-[12px] text-[var(--color-text)] bg-transparent outline-none font-medium placeholder:text-[var(--color-text-subtle)]"
          />
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center gap-0.5 px-4 py-1 border-t border-black/[0.03] dark:border-white/[0.03]">
        {[
          { icon: Bold, label: 'Bold' },
          { icon: Italic, label: 'Italic' },
          { icon: Link, label: 'Link' },
          { icon: List, label: 'List' },
        ].map(({ icon: Icon, label }) => (
          <Button
            key={label}
            aria-label={label}
            className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <Icon size={13} strokeWidth={1.5} />
          </Button>
        ))}
      </div>

      {/* Body */}
      <div className="px-4 py-2">
        <textarea
          ref={bodyRef}
          value={body}
          onChange={handleBodyInput}
          onKeyDown={handleKeyDown}
          placeholder={t('email.bodyPlaceholder')}
          rows={4}
          className="w-full resize-none text-[13px] text-[var(--color-text)] bg-transparent placeholder:text-[var(--color-text-subtle)] outline-none leading-relaxed"
        />
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-black/[0.04] dark:border-white/[0.04]">
        <div className="flex items-center gap-1">
          {/* Attach */}
          <TooltipTrigger delay={3000}>
            <Button
              aria-label={t('composer.attach')}
              className="flex items-center justify-center w-8 h-8 rounded-md text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <Paperclip size={14} strokeWidth={1.5} />
            </Button>
            <Tooltip
              offset={6}
              className="rounded-md bg-black/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg dark:bg-white/90 dark:text-black"
            >
              {t('composer.attach')}
            </Tooltip>
          </TooltipTrigger>
        </div>

        <div className="flex items-center gap-2">
          {/* Save draft */}
          <Button
            onPress={handleSaveDraft}
            aria-label={t('email.saveDraft')}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <Save size={12} strokeWidth={1.5} />
            {isDraft ? t('email.draftSaved') : t('email.saveDraft')}
          </Button>

          {/* Send */}
          <Button
            onPress={handleSend}
            isDisabled={!canSend}
            aria-label={t('composer.send')}
            className={`
              inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all cursor-pointer
              ${canSend
                ? 'text-[var(--color-primary)] hover:bg-[var(--color-primary)]/8'
                : 'text-[var(--color-text-subtle)]'
              }
            `}
          >
            <Send size={12} strokeWidth={1.5} />
            {t('email.send')}
          </Button>
        </div>
      </div>
    </div>
  )
}
