import { useState, useCallback, useMemo } from 'react'
import { Button as AriaButton } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { updateRolePermissions } from '../../../lib/server/admin'
import { Button } from '../../ui/Button'

/**
 * RoleManagement — "The Permissions Matrix"
 * Grid: roles across top, permissions down left. Each cell: checkbox.
 * Clean, spreadsheet-like. No heavy borders — thin lines only.
 * Changed (unsaved) permissions highlighted in blue.
 * "Copy permissions from..." dropdown to clone another role's permissions.
 *
 * NOTE: Frontend permission checks are UX only — gateway validates on every API call.
 */

// Predefined roles (25+) matching AppRole enum
const ROLES = [
  { id: 'admin', name: 'Admin', permissions: ['admin.*'], userCount: 2 },
  { id: 'sales_manager', name: 'Sales Manager', permissions: ['sales.*', 'quote.*'], userCount: 2 },
  { id: 'sales_rep', name: 'Sales Rep', permissions: ['sales.read', 'quote.create', 'quote.update'], userCount: 3 },
  { id: 'procurement_manager', name: 'Procurement Manager', permissions: ['procurement.*', 'po.*'], userCount: 1 },
  { id: 'procurement_agent', name: 'Procurement Agent', permissions: ['procurement.read', 'po.create'], userCount: 1 },
  { id: 'warehouse_manager', name: 'Warehouse Manager', permissions: ['warehouse.*', 'inventory.*'], userCount: 1 },
  { id: 'warehouse_staff', name: 'Warehouse Staff', permissions: ['warehouse.read', 'inventory.update'], userCount: 1 },
  { id: 'finance_manager', name: 'Finance Manager', permissions: ['finance.*', 'invoice.*', 'payment.*'], userCount: 0 },
  { id: 'accountant', name: 'Accountant', permissions: ['finance.read', 'invoice.create', 'payment.record'], userCount: 2 },
  { id: 'dispatcher', name: 'Dispatcher', permissions: ['dispatch.*', 'route.*', 'delivery.*'], userCount: 1 },
  { id: 'driver_manager', name: 'Driver Manager', permissions: ['dispatch.read', 'driver.*'], userCount: 1 },
  { id: 'hr_manager', name: 'HR Manager', permissions: ['hr.*', 'user.read'], userCount: 1 },
  { id: 'support_agent', name: 'Support Agent', permissions: ['support.*', 'ticket.*'], userCount: 1 },
  { id: 'support_manager', name: 'Support Manager', permissions: ['support.*', 'ticket.*', 'escalation.*'], userCount: 0 },
  { id: 'it_admin', name: 'IT Admin', permissions: ['admin.settings', 'admin.integrations', 'audit.read'], userCount: 1 },
  { id: 'ceo', name: 'CEO', permissions: ['*'], userCount: 0 },
  { id: 'operations_manager', name: 'Operations Manager', permissions: ['dispatch.*', 'warehouse.*', 'procurement.*'], userCount: 0 },
  { id: 'quality_inspector', name: 'Quality Inspector', permissions: ['warehouse.read', 'quality.*'], userCount: 0 },
  { id: 'credit_analyst', name: 'Credit Analyst', permissions: ['finance.read', 'credit.*'], userCount: 0 },
  { id: 'report_viewer', name: 'Report Viewer', permissions: ['report.read'], userCount: 0 },
  { id: 'supplier_liaison', name: 'Supplier Liaison', permissions: ['procurement.read', 'supplier.*'], userCount: 0 },
  { id: 'pricing_analyst', name: 'Pricing Analyst', permissions: ['sales.read', 'margin.*', 'quote.read'], userCount: 0 },
  { id: 'compliance_officer', name: 'Compliance Officer', permissions: ['audit.read', 'compliance.*'], userCount: 0 },
  { id: 'marketing', name: 'Marketing', permissions: ['content.*', 'analytics.read'], userCount: 0 },
  { id: 'trainee', name: 'Trainee', permissions: ['sales.read', 'procurement.read'], userCount: 0 },
]

// Permission groups by entity
const PERMISSION_GROUPS: Record<string, string[]> = {
  sales: ['sales.read', 'sales.create', 'sales.update', 'sales.delete', 'sales.approve'],
  procurement: ['procurement.read', 'procurement.create', 'procurement.update', 'procurement.delete'],
  warehouse: ['warehouse.read', 'warehouse.create', 'warehouse.update', 'warehouse.transfer'],
  finance: ['finance.read', 'finance.create', 'finance.update', 'finance.approve'],
  dispatch: ['dispatch.read', 'dispatch.create', 'dispatch.update', 'dispatch.assign'],
  support: ['support.read', 'support.create', 'support.update', 'support.escalate'],
  admin: ['admin.read', 'admin.settings', 'admin.users', 'admin.roles', 'admin.integrations'],
  audit: ['audit.read'],
  quote: ['quote.read', 'quote.create', 'quote.update', 'quote.approve', 'quote.send'],
  order: ['order.read', 'order.create', 'order.update', 'order.cancel'],
  invoice: ['invoice.read', 'invoice.create', 'invoice.void'],
  payment: ['payment.read', 'payment.record', 'payment.approve'],
  inventory: ['inventory.read', 'inventory.update', 'inventory.adjust', 'inventory.transfer'],
  hr: ['hr.read', 'hr.create', 'hr.update', 'hr.delete'],
  report: ['report.read', 'report.create', 'report.export'],
}

/** Resolve whether a role's base permissions include a given perm */
function roleHasBasePermission(role: typeof ROLES[number], perm: string): boolean {
  if (role.permissions.includes('*')) return true
  return role.permissions.some((p) => {
    if (p.endsWith('.*')) {
      const prefix = p.replace('.*', '')
      return perm.startsWith(prefix + '.')
    }
    return p === perm
  })
}

export function RoleManagement() {
  const { t } = useTranslation('admin')
  const [selectedRoleId, setSelectedRoleId] = useState<string>('admin')
  const [localOverrides, setLocalOverrides] = useState<Record<string, Record<string, boolean>>>({})
  const [savedIndicator, setSavedIndicator] = useState<string | null>(null)

  const selectedRole = ROLES.find((r) => r.id === selectedRoleId) ?? ROLES[0]!
  const isWildcard = selectedRole.permissions.includes('*')
  const roleOverrides = localOverrides[selectedRoleId] ?? {}

  // Track which permissions have unsaved changes
  const unsavedPerms = useMemo(() => {
    const set = new Set<string>()
    for (const [perm, val] of Object.entries(roleOverrides)) {
      const baseVal = roleHasBasePermission(selectedRole, perm)
      if (val !== baseVal) set.add(perm)
    }
    return set
  }, [selectedRole, roleOverrides])

  const hasUnsavedChanges = unsavedPerms.size > 0

  const hasPermission = useCallback((perm: string) => {
    if (roleOverrides[perm] !== undefined) return roleOverrides[perm]
    if (isWildcard) return true
    return roleHasBasePermission(selectedRole, perm)
  }, [selectedRole, isWildcard, roleOverrides])

  const saveMutation = useMutation({
    mutationFn: (permissions: Record<string, boolean>) =>
      updateRolePermissions({ data: { roleId: selectedRoleId, permissions } }),
    onSuccess: () => {
      // Clear overrides for this role after save
      setLocalOverrides((prev) => {
        const next = { ...prev }
        delete next[selectedRoleId]
        return next
      })
      setSavedIndicator(selectedRoleId)
      setTimeout(() => setSavedIndicator(null), 1500)
    },
  })

  const handleTogglePermission = (perm: string, currentlyChecked: boolean) => {
    if (isWildcard) return

    setLocalOverrides((prev) => ({
      ...prev,
      [selectedRoleId]: {
        ...(prev[selectedRoleId] ?? {}),
        [perm]: !currentlyChecked,
      },
    }))
  }

  const handleSave = () => {
    const allPerms: Record<string, boolean> = {}
    for (const perms of Object.values(PERMISSION_GROUPS)) {
      for (const p of perms) {
        allPerms[p] = roleOverrides[p] !== undefined
          ? roleOverrides[p]!
          : roleHasBasePermission(selectedRole, p)
      }
    }
    saveMutation.mutate(allPerms)
  }

  const handleCopyFrom = (sourceRoleId: string) => {
    const source = ROLES.find((r) => r.id === sourceRoleId)
    if (!source || isWildcard) return

    const newOverrides: Record<string, boolean> = {}
    for (const perms of Object.values(PERMISSION_GROUPS)) {
      for (const p of perms) {
        newOverrides[p] = roleHasBasePermission(source, p)
      }
    }
    setLocalOverrides((prev) => ({
      ...prev,
      [selectedRoleId]: newOverrides,
    }))
  }

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
          {t('roles.title', 'Permissions Matrix')}
        </span>
        <div className="flex items-center gap-3">
          {savedIndicator === selectedRoleId && (
            <span className="text-[11px] text-green-600 dark:text-green-400 font-medium animate-pulse">
              Saved
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-[11px] text-[#2563EB] font-medium">
              {unsavedPerms.size} unsaved {unsavedPerms.size === 1 ? 'change' : 'changes'}
            </span>
          )}
          <span className="text-[11px] text-black/25 dark:text-white/25 italic">
            {t('roles.frontendNote', 'UX only — gateway validates every call')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
        {/* Left: Role List */}
        <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-black/6 dark:border-white/6">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
              {t('roles.roleList', 'Roles')}
            </span>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {ROLES.map((role) => {
              const roleHasChanges = Object.keys(localOverrides[role.id] ?? {}).length > 0
              return (
                <button
                  type="button"
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full px-3 py-2 text-start text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    selectedRoleId === role.id
                      ? 'bg-black/[0.04] dark:bg-white/[0.04] font-medium'
                      : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02] text-black/60 dark:text-white/60'
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    {role.name}
                    {roleHasChanges && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />
                    )}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/25 dark:text-white/25 shrink-0 ms-2">
                    {role.userCount}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Permission Grid */}
        <div className="space-y-4">
          {/* Matrix header with copy + save */}
          <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-black/6 dark:border-white/6 flex items-center justify-between gap-3">
              <span className="text-xs font-medium">{selectedRole.name}</span>
              <div className="flex items-center gap-2">
                {isWildcard && (
                  <span className="text-[10px] text-[#2563EB] font-medium">Full access</span>
                )}
                {/* Copy permissions from another role */}
                {!isWildcard && (
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) handleCopyFrom(e.target.value) }}
                    className="rounded-full border border-black/8 dark:border-white/8 bg-transparent px-2 py-0.5 text-[11px] text-black/40 dark:text-white/40 outline-none cursor-pointer"
                    aria-label="Copy permissions from role"
                  >
                    <option value="">Copy from...</option>
                    {ROLES.filter((r) => r.id !== selectedRoleId).map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                )}
                {/* Save button — only when unsaved changes exist */}
                {hasUnsavedChanges && (
                  <Button
                    variant="primary"
                    className="!text-[11px] !px-3 !py-1"
                    onPress={handleSave}
                    isDisabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                  <div key={group} className="border-b border-black/[0.03] dark:border-white/[0.03] last:border-0">
                    {/* Group header */}
                    <div className="grid items-center gap-0" style={{ gridTemplateColumns: `120px repeat(${perms.length}, 1fr)` }}>
                      <div className="px-3 py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-black/30 dark:text-white/30">
                          {group}
                        </span>
                      </div>
                      {perms.map((perm) => {
                        const action = perm.split('.')[1]!
                        const checked = hasPermission(perm)
                        const isChanged = unsavedPerms.has(perm)
                        return (
                          <div key={perm} className={`flex flex-col items-center gap-0.5 py-2 rounded transition-colors ${isChanged ? 'bg-[#2563EB]/[0.06]' : ''}`}>
                            <span className={`text-[9px] leading-none mb-1 ${isChanged ? 'text-[#2563EB] font-medium' : 'text-black/25 dark:text-white/25'}`}>
                              {action}
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(perm, checked)}
                              disabled={isWildcard}
                              className={`w-3.5 h-3.5 rounded border-black/15 dark:border-white/15 text-[#2563EB] focus:ring-[#2563EB]/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${isChanged ? 'ring-1 ring-[#2563EB]/30' : ''}`}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Temporary Delegation */}
          <div className="border border-black/6 dark:border-white/6 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium">{t('roles.temporaryDelegation', 'Temporary Delegation')}</span>
                <p className="text-[11px] text-black/30 dark:text-white/30 mt-0.5">
                  {t('roles.vacationCoverage', 'Assign role temporarily with expiry date')}
                </p>
              </div>
              <Button variant="outline" className="!text-[#2563EB] !border-[#2563EB]/15 !bg-[#2563EB]/5 data-[hovered]:!bg-[#2563EB]/10">
                {t('roles.delegateRole', 'Delegate')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
