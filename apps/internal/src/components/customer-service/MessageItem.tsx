import { CHANNEL_ICONS } from './ChannelIcons'
import type { Message, ChannelType } from '../../types/customer-service'

interface MessageItemProps {
  message: Message
  conversationChannel: ChannelType
  isFirstInGroup: boolean
}

function formatTimestamp(iso: string): string {
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

  if (isToday) return time

  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${day}, ${time}`
}

export function MessageItem({ message, conversationChannel, isFirstInGroup }: MessageItemProps) {
  const isInbound = message.direction === 'inbound'
  const channelDiffers = message.channel !== conversationChannel
  const ChannelIcon = CHANNEL_ICONS[message.channel]

  return (
    <div className={!isFirstInGroup ? 'mt-[-8px]' : ''}>
      {/* Attribution: name + time. Channel icon only when it differs. */}
      {isFirstInGroup && (
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`text-[13px] font-medium ${
              isInbound ? 'text-[var(--color-text)]' : 'text-[var(--color-primary)]'
            }`}
          >
            {message.senderName}
          </span>
          {channelDiffers && (
            <ChannelIcon size={10} className="text-[var(--color-text-subtle)]" />
          )}
          <span className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] tabular-nums ms-auto">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
      )}

      {/* Content — document style */}
      <div
        className={`
          text-[13px] leading-relaxed whitespace-pre-wrap
          ${isInbound
            ? 'text-[var(--color-text)] border-s-2 border-s-black/[0.08] dark:border-s-white/[0.08] ps-3'
            : 'text-[var(--color-text-muted)] ps-3'
          }
        `}
      >
        {message.content}
      </div>

      {/* Attachments */}
      {message.attachments.length > 0 && (
        <div className="flex items-center gap-2 mt-2 ps-3">
          {message.attachments.map((att) => (
            <div
              key={att.id}
              className="inline-flex items-center gap-1.5 rounded-md bg-black/[0.03] dark:bg-white/[0.04] px-2 py-1 text-[11px] text-[var(--color-text-muted)]"
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
  )
}
