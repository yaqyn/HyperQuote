import { useState, useMemo } from 'react'
import { SearchField, Input, Label } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getEmployeeDirectory } from '../../../lib/server/hr'
import { useHRStore } from '../../../stores/hr'

/**
 * Employee directory — searchable table with name, department, role, status, hire date.
 * Click row to navigate to EmployeeProfile.
 * Status badge: active = green dot, inactive = gray dot.
 */
export function EmployeeDirectory() {
  const { t } = useTranslation('hr')
  const setSelectedEmployeeId = useHRStore((s) => s.setSelectedEmployeeId)
  const [search, setSearch] = useState('')

  const { data: employees } = useQuery({
    queryKey: ['hr', 'employees'],
    queryFn: () => getEmployeeDirectory(),
    staleTime: 30_000,
  })

  const filtered = useMemo(() => {
    if (!employees) return []
    if (!search.trim()) return employees
    const q = search.trim().toLowerCase()
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q),
    )
  }, [employees, search])

  if (!employees) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('employees.title', 'Employee Directory')}</h2>
        <SearchField
          value={search}
          onChange={setSearch}
          className="flex items-center gap-2"
          aria-label={t('employees.search', 'Search employees...')}
        >
          <Label className="sr-only">{t('employees.search', 'Search employees...')}</Label>
          <Input
            placeholder={t('employees.search', 'Search employees...')}
            className="rounded-lg border border-black/20 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#2563EB] w-64"
          />
        </SearchField>
      </div>

      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('employees.name', 'Name')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('employees.department', 'Department')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('employees.role', 'Role')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('employees.status', 'Status')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('employees.hireDate', 'Hire Date')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((employee) => (
              <tr
                key={employee.id}
                onClick={() => setSelectedEmployeeId(employee.id)}
                className="border-b border-black/5 dark:border-white/5 cursor-pointer transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3 font-medium">{employee.name}</td>
                <td className="px-4 py-3 text-black/60 dark:text-white/60">{employee.department}</td>
                <td className="px-4 py-3 text-black/60 dark:text-white/60">{employee.role}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        employee.status === 'active' ? 'bg-green-500' : 'bg-black/20 dark:bg-white/20'
                      }`}
                    />
                    {t(`employees.${employee.status}`, employee.status)}
                  </span>
                </td>
                <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                  {employee.hireDate}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-black/40 dark:text-white/40">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
