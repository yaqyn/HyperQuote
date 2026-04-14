/**
 * Individual notification row for the notifications list.
 * React Aria ListBoxItem with icon, title, body, relative timestamp.
 */
import { ListBoxItem } from 'react-aria-components'
import {
  FileCheck,
  Truck,
  MapPin,
  CreditCard,
  MessageCircle,
  Bell,
} from 'lucide-react'
import type { Notification, NotificationType } from '../../types/notification'

// ============================================================================
// Icon mapping by notification type
// ============================================================================

const NOTIFICATION_ICONS: Record<
  NotificationType,
  typeof FileCheck
> = {
  quote_ready: FileCheck,
  order_update: Truck,
  delivery: MapPin,
  payment: CreditCard,
  support: MessageCircle,
}

const NOTIFICATION_ICON_COLORS: Record<NotificationType, string> = {
  quote_ready: 'text-[var(--color-primary)]',
  order_update: 'text-[var(--color-primary)]',
  delivery: 'text-[var(--color-success)]',
  payment: 'text-[var(--color-primary)]',
  support: 'text-[var(--color-primary)]',
}

// ============================================================================
// Relative time formatting
// ============================================================================

function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  // After 7 days, show absolute date
  if (days >= 7) {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(isoString))
  }

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (minutes < 1) return rtf.format(-seconds, 'second')
  if (hours < 1) return rtf.format(-minutes, 'minute')
  if (days < 1) return rtf.format(-hours, 'hour')
  return rtf.format(-days, 'day')
}

// ============================================================================
// Component
// ============================================================================

interface NotificationItemProps {
  notification: Notification
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const Icon = NOTIFICATION_ICONS[notification.type] ?? Bell
  const iconColor =
    NOTIFICATION_ICON_COLORS[notification.type] ??
    'text-[var(--color-primary)]'

  return (
    <ListBoxItem
      id={notification.id}
      textValue={notification.title}
      className={[
        'flex items-start gap-3 px-4 py-3 min-h-16 border-b border-[var(--color-border)]',
        'cursor-pointer hover:bg-[var(--color-surface)] transition-colors',
        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset',
        !notification.read ? 'bg-[var(--color-surface)]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Unread dot */}
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] mt-2 shrink-0" />
      )}
      {/* Read spacer to keep alignment */}
      {notification.read && <div className="w-2 shrink-0" />}

      {/* Icon */}
      <Icon size={20} className={`${iconColor} shrink-0 mt-0.5`} />

      {/* Content */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-[var(--color-text)] truncate">
          {notification.title}
        </span>
        <span className="text-[13px] text-[var(--color-text-muted)] line-clamp-2">
          {notification.body}
        </span>
        <span className="text-[13px] font-mono text-[var(--color-text-subtle)]">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </div>
    </ListBoxItem>
  )
}
