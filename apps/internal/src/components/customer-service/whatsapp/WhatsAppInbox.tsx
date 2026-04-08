import { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button, TextField, Input } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { getWhatsAppInbox } from '../../../lib/server/customer-service'
import type { AITriageTier } from '../../../types/customer-service'

const QUICK_REPLIES = [
  { key: 'greeting', label: 'Greeting', text: 'Hello! Thank you for reaching out to HyperQuote. How can I help you today?' },
  { key: 'orderStatus', label: 'Order Status', text: 'Let me check the status of your order. Could you please share your order number?' },
  { key: 'quoteReady', label: 'Quote Ready', text: 'Your quote is ready! Please check your email for the full details. Would you like to proceed with the order?' },
  { key: 'deliveryUpdate', label: 'Delivery ETA', text: 'Your delivery is scheduled for tomorrow. Our driver will contact you 30 minutes before arrival.' },
  { key: 'escalate', label: 'Escalating', text: 'I understand your concern. Let me escalate this to our specialist team. They will reach out to you within 2 hours.' },
]

/**
 * WhatsApp Inbox — "The Chat"
 * Two-panel: conversation list on left, active chat on right.
 * Messages: customer on left, agent on right (chat style, latest at bottom).
 * Quick reply templates for common responses.
 */
export function WhatsAppInbox() {
  const { t } = useTranslation('customer-service')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: conversations } = useQuery({
    queryKey: ['cs', 'whatsapp'],
    queryFn: () => getWhatsAppInbox(),
    staleTime: 15_000,
  })

  // Sort: unread first, then by most recent
  const sortedConversations = useMemo(() => {
    if (!conversations) return []
    return [...conversations].sort((a, b) => {
      if (a.unread !== b.unread) return a.unread ? -1 : 1
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  }, [conversations])

  const selected = selectedId
    ? conversations?.find((c) => c.id === selectedId) ?? null
    : null

  // Scroll to bottom when messages change or conversation selected
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selected?.messages?.length, selectedId])

  if (!conversations) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left panel: conversation list */}
      <div className={`w-full md:w-80 lg:w-96 border-e border-[var(--color-border)] flex flex-col shrink-0 ${selected ? 'hidden md:flex' : 'flex'}`}>
        {/* Header with unread count */}
        <div className="shrink-0 px-4 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[var(--color-text)]">
              {t('whatsapp.title', 'WhatsApp')}
            </span>
            {conversations.filter((c) => c.unread).length > 0 && (
              <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[11px] font-semibold font-[family-name:var(--font-geist-mono)] tabular-nums text-white">
                {conversations.filter((c) => c.unread).length}
              </span>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {sortedConversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => setSelectedId(conv.id)}
              className={`w-full text-start px-4 py-3 border-b border-[var(--color-border)]/50 cursor-pointer transition-colors
                hover:bg-black/[0.03] dark:hover:bg-white/[0.03]
                ${selectedId === conv.id ? 'bg-black/[0.04] dark:bg-white/[0.04]' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Initials */}
                <div className="w-9 h-9 rounded-full bg-black/[0.05] dark:bg-white/[0.05] flex items-center justify-center text-sm font-semibold text-[var(--color-text-muted)] shrink-0">
                  {conv.customerName.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-sm truncate ${conv.unread ? 'font-semibold text-[var(--color-text)]' : 'font-medium text-[var(--color-text)]'}`}>
                      {conv.customerName}
                    </span>
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-text-subtle)] shrink-0">
                      {formatTime(conv.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-subtle)] truncate flex-1">
                      {conv.lastMessage.length > 50 ? `${conv.lastMessage.slice(0, 50)}...` : conv.lastMessage}
                    </span>
                    {conv.unread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] shrink-0 ring-2 ring-white dark:ring-black" />
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel: message thread */}
      <div className={`flex-1 flex flex-col min-w-0 ${!selected ? 'hidden md:flex' : 'flex'}`}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-[var(--color-text-subtle)] text-sm">
            {t('whatsapp.selectConversation', 'Select a conversation')}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
              {/* Mobile back */}
              <Button
                onPress={() => setSelectedId(null)}
                className="md:hidden text-[var(--color-primary)] text-sm cursor-pointer outline-none"
              >
                &larr;
              </Button>

              <div className="w-8 h-8 rounded-full bg-black/[0.05] dark:bg-white/[0.05] flex items-center justify-center text-sm font-semibold text-[var(--color-text-muted)]">
                {selected.customerName.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--color-text)] truncate">{selected.customerName}</div>
                <div className="text-xs text-[var(--color-text-subtle)] font-[family-name:var(--font-geist-mono)]">
                  {selected.customerPhone}
                </div>
              </div>

              {/* AI triage indicator */}
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${tierStyle(selected.aiTier)}`}>
                {tierLabel(selected.aiTier)}
              </span>
            </div>

            {/* Messages — chronological order, latest at bottom */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {selected.messages.map((msg) => {
                const isCustomer = msg.sender === 'customer'

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                      isCustomer
                        ? 'bg-black/[0.04] dark:bg-white/[0.04]'
                        : msg.sender === 'ai'
                          ? 'bg-[var(--color-primary)]/8'
                          : 'bg-[var(--color-primary)]/12'
                    }`}>
                      <p className="text-sm text-[var(--color-text)] leading-relaxed">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className="text-[10px] text-[var(--color-text-subtle)]">
                          {isCustomer ? '' : msg.sender === 'ai' ? 'AI' : 'Agent'}
                        </span>
                        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-[var(--color-text-subtle)]">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick reply templates (collapsible) */}
            <AnimatePresence>
              {showQuickReplies && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="shrink-0 border-t border-[var(--color-border)]/50 overflow-hidden"
                >
                  <div className="px-4 py-2 flex flex-wrap gap-1.5">
                    {QUICK_REPLIES.map((qr) => (
                      <Button
                        key={qr.key}
                        onPress={() => {
                          setReplyText(qr.text)
                          setShowQuickReplies(false)
                        }}
                        className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)] cursor-pointer
                          hover:bg-black/[0.03] dark:hover:bg-white/[0.03] hover:text-[var(--color-text)] transition-colors outline-none"
                      >
                        {qr.label}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reply input */}
            <div className="shrink-0 border-t border-[var(--color-border)] px-4 py-3 flex gap-2 items-center">
              <Button
                onPress={() => setShowQuickReplies(!showQuickReplies)}
                className={`shrink-0 rounded-lg px-2 py-2 text-[11px] font-medium cursor-pointer outline-none transition-colors ${
                  showQuickReplies
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                }`}
                aria-label={t('whatsapp.quickReplies', 'Quick Replies')}
              >
                QR
              </Button>
              <TextField
                aria-label={t('whatsapp.typeMessage', 'Type a message...')}
                value={replyText}
                onChange={setReplyText}
                className="flex-1"
              >
                <Input
                  placeholder={t('whatsapp.typeMessage', 'Type a message...')}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none
                    focus:ring-1 focus:ring-[var(--color-primary)]/40"
                />
              </TextField>
              <Button
                onPress={() => {
                  console.log('[CS] Send WhatsApp reply:', replyText)
                  setReplyText('')
                }}
                isDisabled={!replyText.trim()}
                className="shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity outline-none disabled:opacity-40 disabled:cursor-default"
              >
                {t('whatsapp.send', 'Send')}
              </Button>
            </div>

            {/* Quick actions bar (desktop) */}
            <div className="hidden lg:flex shrink-0 border-t border-[var(--color-border)]/50 px-4 py-2 gap-2">
              {[
                { key: 'checkOrderStatus', label: t('whatsapp.checkOrderStatus', 'Check Order') },
                { key: 'lookUpInvoice', label: t('whatsapp.lookUpInvoice', 'Look Up Invoice') },
                { key: 'createTicket', label: t('whatsapp.createTicket', 'Create Ticket') },
                { key: 'escalateAction', label: t('whatsapp.escalateAction', 'Escalate') },
              ].map((action) => (
                <Button
                  key={action.key}
                  onPress={() => console.log(`[CS] Quick action: ${action.key}`)}
                  className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)] cursor-pointer
                    hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors outline-none"
                >
                  {action.label}
                </Button>
              ))}

              <span className="flex-1" />

              {/* Context stats */}
              <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-subtle)]">
                <span>Orders: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">{selected.orderCount}</span></span>
                <span>Quotes: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">{selected.openQuotes}</span></span>
                <span>Invoices: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">{selected.outstandingInvoices}</span></span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────

function tierLabel(tier: AITriageTier): string {
  const map: Record<AITriageTier, string> = {
    0: 'Auto',
    1: 'AI Suggest',
    2: 'Human',
  }
  return map[tier]
}

function tierStyle(tier: AITriageTier): string {
  const map: Record<AITriageTier, string> = {
    0: 'bg-green-500/10 text-green-700 dark:text-green-400',
    1: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    2: 'bg-red-500/10 text-red-700 dark:text-red-400',
  }
  return map[tier]
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))

  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h`
  return date.toLocaleDateString()
}
