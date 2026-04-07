import { Button } from 'react-aria-components'
import { ArrowLeft } from 'lucide-react'
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
 * Admin — "The Console"
 * Developer tools aesthetic. Configuration-dense, clean forms, no fluff.
 * 6 tabs: Users (merged permissions), Settings, Rules (merged margins+approvals), Holidays, Integrations, Audit.
 */
export function AdminModule() {
  const activeTab = useAdminStore((s) => s.activeTab)
  const editingRoleId = useAdminStore((s) => s.editingRoleId)
  const setEditingRoleId = useAdminStore((s) => s.setEditingRoleId)

  const renderTab = () => {
    switch (activeTab) {
      case 'users':
        // Master-detail: user list → role management inline
        if (editingRoleId) {
          return (
            <div className="flex flex-col">
              <div className="p-5">
                <Button
                  onPress={() => setEditingRoleId(null)}
                  className="flex items-center gap-1.5 text-sm font-medium text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 cursor-pointer outline-none"
                >
                  <ArrowLeft size={16} strokeWidth={1.5} /> Back to users
                </Button>
              </div>
              <RoleManagement />
            </div>
          )
        }
        return <UserList />
      case 'settings':
        return (
          <div className="flex flex-col">
            <SystemSettings />
            <div className="px-5 py-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-black/30 dark:text-white/30 mb-4">
                Holiday Calendar
              </h3>
            </div>
            <HolidayCalendar />
            <div className="px-5 py-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-black/30 dark:text-white/30 mb-4">
                Integrations
              </h3>
            </div>
            <div className="px-5 pb-6">
              <span className="text-sm text-black/30 dark:text-white/30">
                Integrations configuration — coming in Phase 27
              </span>
            </div>
          </div>
        )
      case 'rules':
        // Stacked: MarginRules + ApprovalThresholds
        return (
          <div className="flex flex-col">
            <MarginRules />
            <div className="px-5 py-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-black/30 dark:text-white/30 mb-4">
                Approval Thresholds
              </h3>
            </div>
            <ApprovalThresholds />
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
      <div className="flex-1 overflow-auto">{renderTab()}</div>
    </div>
  )
}
