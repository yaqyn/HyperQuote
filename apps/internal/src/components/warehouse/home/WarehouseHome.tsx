import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { WorkerTileGrid } from './WorkerTileGrid'
import { ManagerKPIs } from './ManagerKPIs'
import { getWarehouseDashboard } from '../../../lib/server/warehouse-dashboard'

interface WarehouseHomeProps {
  /** Whether the current user has manager-level access */
  isManager?: boolean
}

/**
 * Warehouse home view.
 * Always shows 3x3 worker tile grid.
 * Manager role additionally sees KPI strip below tiles.
 * Bottom section shows top 3 critical alerts.
 */
export function WarehouseHome({ isManager = true }: WarehouseHomeProps) {
  const { t } = useTranslation('internal')

  const { data: dashboard } = useQuery({
    queryKey: ['warehouse', 'dashboard'],
    queryFn: () => getWarehouseDashboard({ data: {} }),
    staleTime: 30_000,
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Worker Tile Grid — always visible */}
      <WorkerTileGrid />

      {/* Manager KPIs — conditional on role */}
      {isManager && <ManagerKPIs />}

      {/* Critical Alerts */}
      {dashboard && dashboard.criticalAlerts > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500" />
            <h3 className="text-sm font-semibold text-black/80 dark:text-white/80">
              {t('warehouse.alerts.title', 'Critical Alerts')}
            </h3>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-red-500 font-medium">
              {dashboard.criticalAlerts}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {/* Mock alert cards — will be populated by server data */}
            <AlertCard
              title={t('warehouse.alerts.lowStock', 'Low Stock Alert')}
              description={t('warehouse.alerts.lowStockDesc', 'Steel Rebar 16mm below reorder point')}
              severity="critical"
            />
            {dashboard.criticalAlerts > 1 && (
              <AlertCard
                title={t('warehouse.alerts.expiring', 'Expiring Material')}
                description={t('warehouse.alerts.expiringDesc', 'Cement batch LOT-2026-CM-015 expires in 3 days')}
                severity="warning"
              />
            )}
            {dashboard.criticalAlerts > 2 && (
              <AlertCard
                title={t('warehouse.alerts.variance', 'Count Variance')}
                description={t('warehouse.alerts.varianceDesc', 'Location WH-B/ROW-4 variance exceeds 5% threshold')}
                severity="warning"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AlertCard({
  title,
  description,
  severity,
}: {
  title: string
  description: string
  severity: 'critical' | 'warning'
}) {
  const borderClass = severity === 'critical' ? 'border-red-500/30' : 'border-yellow-500/30'
  const bgClass = severity === 'critical' ? 'bg-red-500/5' : 'bg-yellow-500/5'

  return (
    <div className={`rounded-lg border ${borderClass} ${bgClass} p-3`}>
      <p className="text-sm font-medium text-black/80 dark:text-white/80">{title}</p>
      <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">{description}</p>
    </div>
  )
}
