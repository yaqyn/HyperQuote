import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { CHANNEL_ICONS } from './ChannelIcons'
import type { Conversation } from '../../types/customer-service'

interface ConversationItemProps {
  conversation: Conversation
  isSelected: boolean
  onSelect: () => void
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function ConversationItem({ conversation, isSelected, onSelect }: ConversationItemProps) {
  const { i18n } = useTranslation()
  const ChannelIcon = CHANNEL_ICONS[conversation.channel]
  const hasUnread = conversation.unreadCount > 0
  const isUrgent = conversation.priority === 'urgent' || conversation.slaBreached
  const name = i18n.language === 'ar' ? conversation.customer.nameAr : conversation.customer.name

  return (
    <Button
      onPress={onSelect}
      aria-label={`${name} — ${conversation.subject}`}
      className={`
        w-full text-start px-4 py-3 cursor-pointer transition-colors outline-none
        focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/40 focus-visible:ring-inset
        ${isSelected
          ? 'bg-black/[0.04] dark:bg-white/[0.04]'
          : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Left edge indicator */}
        <div className="flex flex-col items-center gap-1 pt-1.5 shrink-0 w-1">
          {isUrgent && <div className="w-1 h-1 rounded-full bg-[var(--color-error)]" />}
          {hasUnread && !isUrgent && <div className="w-1 h-1 rounded-full bg-[var(--color-primary)]" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + time */}
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[13px] truncate ${
              hasUnread ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text)]'
            }`}>
              {name}
            </span>
            <span className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] tabular-nums shrink-0">
              {formatRelativeTime(conversation.lastMessageAt)}
            </span>
          </div>

          {/* Row 2: preview + channel + count */}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className={`text-[11px] truncate flex-1 ${
              hasUnread ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-subtle)]'
            }`}>
              {conversation.lastMessagePreview}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <ChannelIcon size={10} className="text-[var(--color-text-subtle)]" />
              {hasUnread && (
                <span className="font-[var(--font-geist-mono)] text-[9px] font-semibold text-[var(--color-primary)] tabular-nums">
                  {conversation.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Button>
  )
}
