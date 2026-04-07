import { Button } from 'react-aria-components'
import { ArrowLeft } from 'lucide-react'
import { useHRStore } from '../../stores/hr'
import { HRTabStrip } from './HRTabStrip'
import { HRShortcuts } from './HRShortcuts'
import { EmployeeDirectory } from './employees/EmployeeDirectory'
import { EmployeeProfile } from './employees/EmployeeProfile'
import { LeaveManagement } from './leave/LeaveManagement'
import { AttendanceDashboard } from './attendance/AttendanceDashboard'

/**
 * HR — "The Roster"
 * Sports team management, clean time grids. HR is about people and time.
 * Employees + Compliance merged into "People" tab.
 * EmployeeProfile includes compliance section inline.
 */
export function HRModule() {
  const activeTab = useHRStore((s) => s.activeTab)
  const selectedEmployeeId = useHRStore((s) => s.selectedEmployeeId)
  const setSelectedEmployeeId = useHRStore((s) => s.setSelectedEmployeeId)

  // People tab: employee profile drill-down with back arrow
  if (selectedEmployeeId && activeTab === 'people') {
    return (
      <div className="flex flex-col h-full">
        <HRShortcuts />
        <div className="shrink-0 pt-1 pb-2">
          <HRTabStrip />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
          <div className="px-5 pt-3">
            <Button
              onPress={() => setSelectedEmployeeId(null)}
              className="flex items-center gap-1.5 text-sm text-[var(--color-text-subtle)] cursor-pointer hover:text-[var(--color-text)] transition-colors outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40 rounded-md px-1 py-0.5"
            >
              <ArrowLeft size={16} strokeWidth={1.5} />
              Back to list
            </Button>
          </div>
          <EmployeeProfile />
        </div>
      </div>
    )
  }

  const tabContent: Record<string, React.ReactNode> = {
    people: <EmployeeDirectory />,
    time: (
      <div className="flex flex-col gap-6 p-5">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-subtle)] mb-3">
            Who's Here Today
          </h3>
          <AttendanceDashboard />
        </div>
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-subtle)] mb-3">
            Pending Leave Requests
          </h3>
          <LeaveManagement />
        </div>
      </div>
    ),
    settings: (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-[var(--color-text-subtle)]">Coming soon</p>
      </div>
    ),
  }

  return (
    <div className="flex flex-col h-full">
      <HRShortcuts />

      <div className="shrink-0 pt-1 pb-2">
        <HRTabStrip />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
        {tabContent[activeTab] ?? null}
      </div>
    </div>
  )
}
