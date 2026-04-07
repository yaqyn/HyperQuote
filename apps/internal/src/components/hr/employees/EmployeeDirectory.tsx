import { useState, useMemo } from 'react'
import { SearchField, Input, Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { getEmployeeDirectory } from '../../../lib/server/hr'
import { useHRStore } from '../../../stores/hr'

/**
 * Employee Directory — "The Roster"
 * Card grid (3 columns): initials circle + name + role + department + status dot.
 * Search at top, filter by department as pills.
 */
export function EmployeeDirectory() {
  const { t } = useTranslation('hr')
  const setSelectedEmployeeId = useHRStore((s) => s.setSelectedEmployeeId)
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState<string | null>(null)

  const { data: employees } = useQuery({
    queryKey: ['hr', 'employees'],
    queryFn: () => getEmployeeDirectory(),
    staleTime: 30_000,
  })

  const departments = useMemo(() => {
    if (!employees) return []
    return [...new Set(employees.map((e) => e.department))]
  }, [employees])

  const filtered = useMemo(() => {
    if (!employees) return []
    let result = employees
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
  }, [employees, search, selectedDept])

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

      {/* Department pills */}
      <div className="flex items-center gap-1 flex-wrap">
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
          </Button>
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((employee: (typeof filtered)[number]) => (
          <motion.button
            key={employee.id}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            onClick={() => setSelectedEmployeeId(employee.id)}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-border)]/50 px-4 py-3 text-start cursor-pointer transition-all
              hover:border-[var(--color-border)] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
          >
            {/* Initials circle */}
            <div className="w-10 h-10 rounded-full bg-black/[0.05] dark:bg-white/[0.05] flex items-center justify-center text-sm font-semibold text-[var(--color-text-muted)] shrink-0">
              {employee.name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text)] truncate">{employee.name}</span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  employee.status === 'active' ? 'bg-green-500' : 'bg-black/15 dark:bg-white/15'
                }`} />
              </div>
              <div className="text-xs text-[var(--color-text-muted)] truncate">{employee.role}</div>
              <div className="text-[11px] text-[var(--color-text-subtle)]">{employee.department}</div>
            </div>
          </motion.button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-[var(--color-text-subtle)]">
          No employees found
        </div>
      )}
    </div>
  )
}
