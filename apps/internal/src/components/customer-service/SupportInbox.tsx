import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, SearchField, Input } from 'react-aria-components'
import { Search, X } from 'lucide-react'
import { useSupportStore } from '../../stores/customer-service'
import { ConversationItem } from './ConversationItem'
import { CHANNEL_ICONS } from './ChannelIcons'
import type { Conversation, ChannelType } from '../../types/customer-service'

const CHANNELS: Array<ChannelType | 'all'> = ['all', 'email', 'whatsapp', 'chat']

const CHANNEL_LABELS: Record<string, string> = {
  all: 'All',
  email: 'Mail',
  whatsapp: 'WA',
  chat: 'Chat',
}

interface SupportInboxProps {
  conversations: Conversation[]
  selectedId: string | null
}

export function SupportInbox({ conversations, selectedId }: SupportInboxProps) {
  const { t } = useTranslation('customer-service')
  const channelFilter = useSupportStore((s) => s.channelFilter)
  const statusFilter = useSupportStore((s) => s.statusFilter)
  const searchQuery = useSupportStore((s) => s.searchQuery)
  const setChannelFilter = useSupportStore((s) => s.setChannelFilter)
  const setSearchQuery = useSupportStore((s) => s.setSearchQuery)
  const setSelectedConversation = useSupportStore((s) => s.setSelectedConversation)
  const [searchOpen, setSearchOpen] = useState(false)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: conversations.length }
    for (const conv of conversations) {
      c[conv.channel] = (c[conv.channel] ?? 0) + 1
    }
    return c
  }, [conversations])

  const filtered = useMemo(() => {
    let result = conversations
    if (channelFilter !== 'all') {
      result = result.filter((c) => c.channel === channelFilter)
    }
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.customer.name.toLowerCase().includes(q) ||
          c.customer.nameAr.includes(q) ||
          c.subject.toLowerCase().includes(q) ||
          c.lastMessagePreview.toLowerCase().includes(q),
      )
    }
    return result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
  }, [conversations, channelFilter, statusFilter, searchQuery])

  return (
    <>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        {/* Top row: count + search toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-[var(--font-geist-mono)] text-[20px] font-semibold text-[var(--color-text)] tabular-nums leading-none">
              {filtered.length}
            </span>
            <span className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider">
              {channelFilter === 'all' ? t('inbox.conversations') : CHANNEL_LABELS[channelFilter]}
            </span>
          </div>
          <Button
            onPress={() => {
              setSearchOpen((o) => !o)
              if (searchOpen) setSearchQuery('')
            }}
            aria-label={t('inbox.search')}
            className={`
              flex items-center justify-center w-7 h-7 rounded-md cursor-pointer transition-colors outline-none
              ${searchOpen
                ? 'text-[var(--color-text)] bg-black/[0.04] dark:bg-white/[0.04]'
                : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)]'
              }
            `}
          >
            {searchOpen ? <X size={13} strokeWidth={1.5} /> : <Search size={13} strokeWidth={1.5} />}
          </Button>
        </div>

        {/* Channel pills */}
        <div className="flex items-center gap-1">
          {CHANNELS.map((key) => {
            const isActive = channelFilter === key
            const Icon = key !== 'all' ? CHANNEL_ICONS[key] : null
            const count = counts[key] ?? 0
            return (
              <Button
                key={key}
                onPress={() => setChannelFilter(key)}
                aria-label={t(`channels.${key}`)}
                className={`
                  inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 cursor-pointer transition-all outline-none
                  ${isActive
                    ? 'bg-[var(--color-text)] text-[var(--color-surface)]'
                    : 'bg-black/[0.04] dark:bg-white/[0.04] text-[var(--color-text-muted)] hover:bg-black/[0.06] dark:hover:bg-white/[0.06]'
                  }
                `}
              >
                {Icon && <Icon size={10} className={isActive ? 'text-[var(--color-surface)]' : ''} />}
                <span className="font-[var(--font-geist-mono)] text-[10px] font-medium tabular-nums">
                  {key === 'all' ? `${t('channels.all')} ${count}` : count}
                </span>
              </Button>
            )
          })}
        </div>

        {/* Search — revealed */}
        {searchOpen && (
          <div className="mt-2.5">
            <SearchField
              aria-label={t('inbox.search')}
              value={searchQuery}
              onChange={setSearchQuery}
              autoFocus
              className="relative"
            >
              <Search
                size={12}
                className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] pointer-events-none"
              />
              <Input
                placeholder={t('inbox.searchPlaceholder')}
                className="w-full rounded-lg bg-black/[0.03] dark:bg-white/[0.04] text-[12px] py-1.5 ps-7 pe-3 text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none"
              />
            </SearchField>
          </div>
        )}
      </div>

      <div className="border-b border-black/[0.04] dark:border-white/[0.04]" />

      {/* ── Conversation list ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[12px] text-[var(--color-text-subtle)]">
            {t('inbox.noResults')}
          </div>
        ) : (
          filtered.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={conversation.id === selectedId}
              onSelect={() => setSelectedConversation(conversation.id)}
            />
          ))
        )}
      </div>
    </>
  )
}
