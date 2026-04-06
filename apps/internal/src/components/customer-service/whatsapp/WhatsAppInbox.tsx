import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Tab, TabList, Tabs, Button, TextField, Input } from 'react-aria-components'
import { getWhatsAppInbox } from '../../../lib/server/customer-service'
import type { WhatsAppConversation, AITriageTier } from '../../../types/customer-service'

type FilterTab = 'all' | 'unread' | 'ai-resolved' | 'needs-human'

const TIER_CONFIG: Record<AITriageTier, { label: string; color: string }> = {
  0: { label: 'Tier 0 — Auto-resolved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  1: { label: 'Tier 1 — AI Suggested', color: 'bg-[#2563EB]/10 text-[#2563EB]' },
  2: { label: 'Tier 2 — Human Required', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
}

/**
 * WhatsApp Inbox — two-panel layout.
 * Left: conversation list with filter tabs.
 * Right: message thread with AI triage + customer context + quick actions.
 * No WhatsApp SDK imports — all mock data.
 */
export function WhatsAppInbox() {
  const { t } = useTranslation('customer-service')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [replyText, setReplyText] = useState('')

  const { data: conversations } = useQuery({
    queryKey: ['cs', 'whatsapp'],
    queryFn: () => getWhatsAppInbox(),
    staleTime: 15_000,
  })

  if (!conversations) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  // Apply filter
  const filtered = conversations.filter((c) => {
    switch (filter) {
      case 'unread': return c.unread
      case 'ai-resolved': return !c.unresolved && c.aiTier === 0
      case 'needs-human': return c.aiTier === 2
      default: return true
    }
  })

  const selected = selectedId
    ? conversations.find((c) => c.id === selectedId) ?? null
    : null

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Left panel: conversation list */}
      <div className={`w-full md:w-1/3 border-e border-black/10 dark:border-white/10 flex flex-col ${selected ? 'hidden md:flex' : 'flex'}`}>
        {/* Filter tabs */}
        <Tabs
          selectedKey={filter}
          onSelectionChange={(key) => setFilter(key as FilterTab)}
        >
          <TabList
            aria-label={t('whatsapp.conversations', 'Conversations')}
            className="flex overflow-x-auto border-b border-black/10 dark:border-white/10 px-3 gap-1"
          >
            {([
              { id: 'all', label: t('whatsapp.all', 'All') },
              { id: 'unread', label: t('whatsapp.unread', 'Unread') },
              { id: 'ai-resolved', label: t('whatsapp.aiResolved', 'AI Resolved') },
              { id: 'needs-human', label: t('whatsapp.needsHuman', 'Needs Human') },
            ] as const).map((tab) => (
              <Tab
                key={tab.id}
                id={tab.id}
                className="shrink-0 cursor-pointer whitespace-nowrap px-2.5 py-2 text-xs font-medium text-black/60 dark:text-white/60 outline-none transition-colors
                  data-[selected]:text-[#2563EB] data-[selected]:border-b-2 data-[selected]:border-[#2563EB]
                  data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 rounded-t"
              >
                {tab.label}
              </Tab>
            ))}
          </TabList>
        </Tabs>

        {/* Conversation list */}
        <div className="flex-1 overflow-auto">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => setSelectedId(conv.id)}
              className={`w-full text-start px-4 py-3 border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                selectedId === conv.id ? 'bg-[#2563EB]/5' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">{conv.customerName}</span>
                <span className="text-xs text-black/40 dark:text-white/40 font-[family-name:var(--font-geist-mono)] tabular-nums shrink-0 ms-2">
                  {formatTime(conv.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {conv.unread && (
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
                )}
                <span className="text-xs text-black/50 dark:text-white/50 truncate">
                  {conv.lastMessage.length > 60
                    ? `${conv.lastMessage.slice(0, 60)}...`
                    : conv.lastMessage}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel: message thread */}
      <div className={`flex-1 flex flex-col ${!selected ? 'hidden md:flex' : 'flex'}`}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-black/30 dark:text-white/30 text-sm">
            {t('whatsapp.selectConversation', 'Select a conversation')}
          </div>
        ) : (
          <>
            {/* Mobile back button */}
            <div className="md:hidden border-b border-black/10 dark:border-white/10 px-4 py-2">
              <Button
                onPress={() => setSelectedId(null)}
                className="text-sm text-[#2563EB] cursor-pointer"
              >
                &larr; {t('whatsapp.conversations', 'Conversations')}
              </Button>
            </div>

            {/* AI Triage badge */}
            <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${TIER_CONFIG[selected.aiTier].color}`}>
                  {TIER_CONFIG[selected.aiTier].label}
                </span>
                <span className="text-sm font-medium">{selected.customerName}</span>
                <span className="text-xs text-black/40 dark:text-white/40 font-[family-name:var(--font-geist-mono)]">
                  {selected.customerPhone}
                </span>
              </div>
            </div>

            {/* Content area: messages + sidebar */}
            <div className="flex-1 flex overflow-hidden">
              {/* Messages */}
              <div className="flex-1 flex flex-col overflow-auto">
                <div className="flex-1 p-4 space-y-3 overflow-auto">
                  {selected.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                        msg.sender === 'customer'
                          ? 'bg-black/5 dark:bg-white/5 self-start'
                          : msg.sender === 'ai'
                            ? 'bg-[#2563EB]/10 self-end ms-auto'
                            : 'bg-[#2563EB]/20 self-end ms-auto'
                      }`}
                    >
                      <div className="text-xs text-black/40 dark:text-white/40 mb-1">
                        {msg.sender === 'customer' ? selected.customerName : msg.sender === 'ai' ? 'AI' : 'Agent'}
                        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums ms-2">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <div className="text-sm">{msg.content}</div>
                    </div>
                  ))}
                </div>

                {/* Reply input */}
                <div className="border-t border-black/10 dark:border-white/10 p-4 flex gap-2">
                  <TextField
                    aria-label={t('whatsapp.typeMessage', 'Type a message...')}
                    value={replyText}
                    onChange={setReplyText}
                    className="flex-1"
                  >
                    <Input
                      placeholder={t('whatsapp.typeMessage', 'Type a message...')}
                      className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/50"
                    />
                  </TextField>
                  <Button
                    onPress={() => {
                      console.log('[CS] Send WhatsApp reply:', replyText)
                      setReplyText('')
                    }}
                    className="shrink-0 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 cursor-pointer"
                  >
                    {t('whatsapp.send', 'Send')}
                  </Button>
                </div>
              </div>

              {/* Customer context sidebar (hidden on mobile) */}
              <div className="hidden lg:flex flex-col w-64 border-s border-black/10 dark:border-white/10 p-4 overflow-auto">
                <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase mb-3">
                  {t('whatsapp.customerContext', 'Customer Context')}
                </h4>
                <div className="space-y-3">
                  <ContextRow label={t('whatsapp.orders', 'Orders')} value={selected.orderCount} />
                  <ContextRow label={t('whatsapp.openQuotes', 'Open Quotes')} value={selected.openQuotes} />
                  <ContextRow label={t('whatsapp.outstandingInvoices', 'Outstanding Invoices')} value={selected.outstandingInvoices} />
                </div>

                <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase mt-6 mb-3">
                  {t('whatsapp.quickActions', 'Quick Actions')}
                </h4>
                <div className="flex flex-col gap-2">
                  {[
                    { key: 'checkOrderStatus', label: t('whatsapp.checkOrderStatus', 'Check Order Status') },
                    { key: 'lookUpInvoice', label: t('whatsapp.lookUpInvoice', 'Look Up Invoice') },
                    { key: 'createTicket', label: t('whatsapp.createTicket', 'Create Ticket') },
                    { key: 'escalateAction', label: t('whatsapp.escalateAction', 'Escalate') },
                  ].map((action) => (
                    <Button
                      key={action.key}
                      onPress={() => console.log(`[CS] Quick action: ${action.key}`)}
                      className="text-start rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────

function ContextRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-black/60 dark:text-white/60">{label}</span>
      <span className="text-sm font-[family-name:var(--font-geist-mono)] tabular-nums">
        {value}
      </span>
    </div>
  )
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
