import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

/**
 * RoleManagement — "The Permissions Matrix"
 * Grid: roles across top, permissions down left. Each cell: checkbox.
 * Clean, spreadsheet-like. No heavy borders — thin lines only.
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

// Flatten all permissions for the matrix columns
const ALL_PERMISSIONS = Object.entries(PERMISSION_GROUPS).flatMap(([, perms]) => perms)

export function RoleManagement() {
  const { t } = useTranslation('admin')
  const [selectedRoleId, setSelectedRoleId] = useState<string>('admin')

  const selectedRole = ROLES.find((r) => r.id === selectedRoleId) ?? ROLES[0]!
  const isWildcard = selectedRole.permissions.includes('*')

  const hasPermission = (perm: string) => {
    if (isWildcard) return true
    return selectedRole.permissions.some((p) => {
      if (p.endsWith('.*')) {
        const prefix = p.replace('.*', '')
        return perm.startsWith(prefix + '.')
      }
      return p === perm
    })
  }

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
          {t('roles.title', 'Permissions Matrix')}
        </span>
        <span className="text-[11px] text-black/25 dark:text-white/25 italic">
          {t('roles.frontendNote', 'UX only — gateway validates every call')}
        </span>
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
            {ROLES.map((role) => (
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
                <span className="truncate">{role.name}</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/25 dark:text-white/25 shrink-0 ms-2">
                  {role.userCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Permission Grid */}
        <div className="space-y-4">
          {/* Matrix */}
          <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-black/6 dark:border-white/6 flex items-center justify-between">
              <span className="text-xs font-medium">{selectedRole.name}</span>
              {isWildcard && (
                <span className="text-[10px] text-[#2563EB] font-medium">Full access</span>
              )}
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
                        return (
                          <div key={perm} className="flex flex-col items-center gap-0.5 py-2">
                            <span className="text-[9px] text-black/25 dark:text-white/25 leading-none mb-1">
                              {action}
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              readOnly
                              className="w-3.5 h-3.5 rounded border-black/15 dark:border-white/15 text-[#2563EB] focus:ring-[#2563EB]/30 cursor-pointer"
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
              <Button className="rounded-lg border border-[#2563EB]/15 bg-[#2563EB]/5 px-3 py-1.5 text-xs font-medium text-[#2563EB] hover:bg-[#2563EB]/10 cursor-pointer outline-none">
                {t('roles.delegateRole', 'Delegate')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
