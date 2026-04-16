import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSupportStore } from '../../stores/customer-service'
import { getConversations } from '../../lib/server/customer-service'
import { SupportInbox } from './SupportInbox'
import { ConversationView } from './ConversationView'
import { CustomerProfilePanel } from './CustomerProfilePanel'
import { Headset } from 'lucide-react'

export function CustomerServiceModule() {
  const { t } = useTranslation('customer-service')
  const selectedId = useSupportStore((s) => s.selectedConversationId)
  const [profileOpen, setProfileOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['support-inbox'],
    queryFn: () => getConversations({ data: {} }),
    staleTime: 10_000,
  })

  const conversations = data?.conversations ?? []
  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Inbox ────────────────────────────────────────────── */}
      <div className="w-[280px] shrink-0 border-inline-end border-black/[0.06] dark:border-white/[0.06] flex flex-col min-h-0">
        <SupportInbox
          conversations={conversations}
          selectedId={selectedId}
        />
      </div>

      {/* ── Conversation ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {selectedConversation ? (
          <ConversationView
            conversation={selectedConversation}
            onOpenProfile={() => setProfileOpen(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Headset size={40} strokeWidth={1} className="text-[var(--color-text-subtle)]" />
            <div className="text-center">
              <p className="text-[13px] font-medium text-[var(--color-text-muted)]">
                {t('empty.selectConversation')}
              </p>
              <p className="text-[11px] text-[var(--color-text-subtle)] mt-1">
                {t('empty.selectConversationDesc')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Customer profile slide panel ─────────────────────── */}
      <CustomerProfilePanel
        conversation={selectedConversation}
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  )
}
