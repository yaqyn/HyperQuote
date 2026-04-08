import { useState, useMemo } from 'react'
import { SearchField, Input, Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { getEmployeeDirectory, getLeaveRequests } from '../../../lib/server/hr'
import { useHRStore } from '../../../stores/hr'
import { Toggle } from '../../ui'

/**
 * Employee Directory — "The Roster"
 * Default: department-grouped view. Each department is a section with employee cards.
 * Search filters across all departments. Toggle to flat grid.
 */
export function EmployeeDirectory() {
  const { t } = useTranslation('hr')
  const setSelectedEmployeeId = useHRStore((s) => s.setSelectedEmployeeId)
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const { data: employees } = useQuery({
    queryKey: ['hr', 'employees'],
    queryFn: () => getEmployeeDirectory(),
    staleTime: 30_000,
  })

  const { data: leaveRequests } = useQuery({
    queryKey: ['hr', 'leave'],
    queryFn: () => getLeaveRequests(),
    staleTime: 30_000,
  })

  const departments = useMemo(() => {
    if (!employees) return []
    return [...new Set(employees.map((e) => e.department))]
  }, [employees])

  const filtered = useMemo(() => {
    if (!employees) return []
    let result = employees
    if (!showInactive) {
      result = result.filter((e) => e.status !== 'inactive')
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q),
      )
    }
    if (selectedDept) {
      result = result.filter((e) => e.department === selectedDept)
    }
    return result
  }, [employees, search, selectedDept, showInactive])

  // Group by department
  const grouped = useMemo(() => {
    const groups = new Map<string, typeof filtered>()
    for (const emp of filtered) {
      const existing = groups.get(emp.department)
      if (existing) {
        existing.push(emp)
      } else {
        groups.set(emp.department, [emp])
      }
    }
    return groups
  }, [filtered])

  // Pending leave badge counts per employee
  const pendingByEmployee = useMemo(() => {
    if (!leaveRequests) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const req of leaveRequests) {
      if (req.status === 'pending') {
        map.set(req.employeeId, (map.get(req.employeeId) ?? 0) + 1)
      }
    }
    return map
  }, [leaveRequests])

  // Current status per employee (on leave / active)
  const currentStatus = useMemo(() => {
    if (!leaveRequests) return new Map<string, 'leave' | 'active'>()
    const map = new Map<string, 'leave' | 'active'>()
    const today = new Date().toISOString().split('T')[0]!
    for (const req of leaveRequests) {
      if (req.status === 'approved' && req.startDate <= today && req.endDate >= today) {
        map.set(req.employeeId, 'leave')
      }
    }
    return map
  }, [leaveRequests])

  if (!employees) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  return (
    <div className="p-5 space-y-5">
      {/* Search */}
      <SearchField
        value={search}
        onChange={setSearch}
        aria-label={t('employees.search', 'Search employees...')}
        className="w-full max-w-md"
      >
        <Input
          placeholder={t('employees.search', 'Search employees...')}
          className="w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none
            focus:ring-1 focus:ring-[var(--color-primary)]/40"
        />
      </SearchField>

      {/* Department pills + inactive toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <Toggle
          label={t('employees.showInactive', 'Show inactive')}
          isSelected={showInactive}
          onChange={setShowInactive}
        />
        <span className="w-px h-4 bg-[var(--color-border)]" />
        <Button
          onPress={() => setSelectedDept(null)}
          className={`rounded-lg px-3 py-1.5 text-[13px] font-medium cursor-pointer transition-all duration-150 outline-none
            ${!selectedDept
              ? 'text-[var(--color-text)] bg-black/[0.06] dark:bg-white/[0.06]'
              : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
            }`}
        >
          All
        </Button>
        {departments.map((dept: string) => (
          <Button
            key={dept}
            onPress={() => setSelectedDept(selectedDept === dept ? null : dept)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium cursor-pointer transition-all duration-150 outline-none
              ${selectedDept === dept
                ? 'text-[var(--color-text)] bg-black/[0.06] dark:bg-white/[0.06]'
                : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
              }`}
          >
            {dept}
            <span className="ms-1 font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-text-subtle)]">
              {employees.filter((e) => e.department === dept && (showInactive || e.status !== 'inactive')).length}
            </span>
          </Button>
        ))}
      </div>

      {/* Department-grouped view */}
      {[...grouped.entries()].map(([dept, members]) => (
        <div key={dept}>
          <div className="flex items-center gap-2 mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
              {dept}
            </div>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-text-subtle)]">
              {members.length}
            </span>
            <div className="flex-1 h-px bg-[var(--color-border)]/50" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((employee) => {
              const pendingCount = pendingByEmployee.get(employee.id) ?? 0
              const onLeave = currentStatus.get(employee.id) === 'leave'

              return (
                <motion.button
                  key={employee.id}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  onClick={() => setSelectedEmployeeId(employee.id)}
                  className={`flex items-center gap-3 rounded-xl border border-[var(--color-border)]/50 px-4 py-3 text-start cursor-pointer transition-all
                    hover:border-[var(--color-border)] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ${employee.status === 'inactive' ? 'opacity-50' : ''}`}
                >
                  {/* Initials circle */}
                  <div className="w-10 h-10 rounded-full bg-black/[0.05] dark:bg-white/[0.05] flex items-center justify-center text-sm font-semibold text-[var(--color-text-muted)] shrink-0 relative">
                    {employee.name.charAt(0)}
                    {/* Pending work badge */}
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-[9px] font-bold text-white">
                        {pendingCount}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-text)] truncate">{employee.name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        onLeave ? 'bg-[var(--color-primary)]'
                          : employee.status === 'active' ? 'bg-green-500'
                            : 'bg-black/15 dark:bg-white/15'
                      }`} />
                      {onLeave && (
                        <span className="text-[10px] text-[var(--color-primary)] font-medium">On leave</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] truncate">{employee.role}</div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-[var(--color-text-subtle)]">
          No employees found
        </div>
      )}
    </div>
  )
}
