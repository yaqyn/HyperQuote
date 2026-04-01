import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Bell } from 'lucide-react'

interface NotificationBellProps {
  hasUnread?: boolean
}

export function NotificationBell({ hasUnread = false }: NotificationBellProps) {
  const { t } = useTranslation('portal')

  return (
    <Link
      to="/notifications"
      aria-label={t('bell.label')}
      className="relative flex items-center justify-center w-11 h-11 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
    >
      <Bell size={20} />
      {hasUnread && (
        <span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-[var(--color-primary)]" />
      )}
    </Link>
  )
}
