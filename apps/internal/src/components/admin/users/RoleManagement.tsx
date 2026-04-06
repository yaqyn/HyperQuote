import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

/**
 * Role & Permission Management view.
 * Left panel: role list. Right panel: permission checkboxes grouped by entity.
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
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">{t('roles.title', 'Role & Permission Management')}</h2>
      {/* Note about frontend checks */}
      <p className="text-xs text-black/40 dark:text-white/40 italic">
        {t('roles.frontendNote', 'Frontend permission checks are UX only — gateway validates on every API call')}
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Role List */}
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
            <h3 className="text-sm font-semibold">{t('roles.roleList', 'Roles')}</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {ROLES.map((role) => (
              <button
                type="button"
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={`w-full px-4 py-2.5 text-start text-sm flex items-center justify-between transition-colors cursor-pointer ${
                  selectedRoleId === role.id
                    ? 'bg-[#2563EB]/10 text-[#2563EB] font-medium'
                    : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                }`}
              >
                <span>{role.name}</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
                  {role.userCount} {t('roles.userCount', 'users')}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Permissions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
            <h3 className="text-sm font-semibold mb-4">
              {t('roles.permissions', 'Permissions')}: {selectedRole.name}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                <div key={group} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
                    {group}
                  </h4>
                  {perms.map((perm) => (
                    <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasPermission(perm)}
                        readOnly
                        className="rounded border-black/20 text-[#2563EB] focus:ring-[#2563EB]/50"
                      />
                      <span className="text-black/70 dark:text-white/70">
                        {perm.split('.')[1]}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Temporary Delegation */}
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
            <h3 className="text-sm font-semibold mb-3">{t('roles.temporaryDelegation', 'Temporary Delegation')}</h3>
            <p className="text-xs text-black/40 dark:text-white/40 mb-3">
              {t('roles.vacationCoverage', 'Vacation coverage')}: assign role temporarily with expiry date.
            </p>
            <Button
              className="rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-2 text-sm font-medium text-[#2563EB] hover:bg-[#2563EB]/10 cursor-pointer outline-none"
            >
              {t('roles.delegateRole', 'Delegate Role')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
