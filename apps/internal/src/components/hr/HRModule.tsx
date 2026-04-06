import { useHRStore } from '../../stores/hr'
import { HRTabStrip } from './HRTabStrip'
import { HRShortcuts } from './HRShortcuts'
import { HRHome } from './home/HRHome'
import { EmployeeDirectory } from './employees/EmployeeDirectory'
import { EmployeeProfile } from './employees/EmployeeProfile'
import { DriverCompliance } from './compliance/DriverCompliance'
import { LeaveManagement } from './leave/LeaveManagement'
import { AttendanceDashboard } from './attendance/AttendanceDashboard'

/**
 * Root HR module component.
 * 7 tabs: Home, Employees, Driver Compliance, Leave, Attendance, Documents, Settings.
 * Employee tab shows directory or profile based on selection.
 */
export function HRModule() {
  const activeTab = useHRStore((s) => s.activeTab)
  const selectedEmployeeId = useHRStore((s) => s.selectedEmployeeId)

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <HRHome />
      case 'employees':
        return selectedEmployeeId ? <EmployeeProfile /> : <EmployeeDirectory />
      case 'compliance':
        return <DriverCompliance />
      case 'leave':
        return <LeaveManagement />
      case 'attendance':
        return <AttendanceDashboard />
      case 'documents':
        return (
          <div className="p-6 text-center text-black/40 dark:text-white/40">
            Documents module coming soon
          </div>
        )
      case 'settings':
        return (
          <div className="p-6 text-center text-black/40 dark:text-white/40">
            Settings module coming soon
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full">
      <HRShortcuts />
      <HRTabStrip />
      <div className="flex-1 overflow-auto">
        {renderTab()}
      </div>
    </div>
  )
}
