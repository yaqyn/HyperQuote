import { RoleToggle } from './RoleToggle'
import { NotificationBell } from './NotificationBell'
import { ProfileMenu } from './ProfileMenu'

interface PortalHeaderProps {
  userName?: string
  companyName?: string
  hasSupplierRole?: boolean
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (
    (parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')
  ).toUpperCase()
}

export function PortalHeader({
  userName = '',
  companyName,
  hasSupplierRole = false,
}: PortalHeaderProps) {
  return (
    <header className="absolute top-0 inset-x-0 z-10 flex items-center justify-end gap-3 pe-4 pt-3">
      <RoleToggle hasSupplierRole={hasSupplierRole} />
      <NotificationBell hasUnread={false} />
      <ProfileMenu
        userName={userName}
        companyName={companyName}
        initials={getInitials(userName)}
        hasSupplierRole={hasSupplierRole}
      />
    </header>
  )
}
