import { useAdminStore } from '../../stores/admin'
import { AdminTabStrip } from './AdminTabStrip'
import { AdminShortcuts } from './AdminShortcuts'
import { UserList } from './users/UserList'
import { RoleManagement } from './users/RoleManagement'
import { SystemSettings } from './settings/SystemSettings'
import { MarginRules } from './margins/MarginRules'
import { ApprovalThresholds } from './approvals/ApprovalThresholds'
import { HolidayCalendar } from './holidays/HolidayCalendar'
import { AuditLogViewer } from './audit/AuditLogViewer'

/**
 * Root admin module component.
 * 8 tabs: Users, Permissions, Settings, Margins, Approvals, Holidays, Integrations, Audit.
 */
export function AdminModule() {
  const activeTab = useAdminStore((s) => s.activeTab)

  const renderTab = () => {
    switch (activeTab) {
      case 'users':
        return <UserList />
      case 'permissions':
        return <RoleManagement />
      case 'settings':
        return <SystemSettings />
      case 'margins':
        return <MarginRules />
      case 'approvals':
        return <ApprovalThresholds />
      case 'holidays':
        return <HolidayCalendar />
      case 'integrations':
        return (
          <div className="p-6 text-center text-black/40 dark:text-white/40">
            Integrations configuration — coming in Phase 27 (WhatsApp, ETA e-invoicing, payment gateways)
          </div>
        )
      case 'audit':
        return <AuditLogViewer />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full">
      <AdminShortcuts />
      <AdminTabStrip />
      <div className="flex-1 overflow-auto">
        {renderTab()}
      </div>
    </div>
  )
}
