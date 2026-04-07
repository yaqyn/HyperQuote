import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { WorkerTileGrid } from './WorkerTileGrid'
import { ManagerKPIs } from './ManagerKPIs'
import { getWarehouseDashboard } from '../../../lib/server/warehouse-dashboard'

interface WarehouseHomeProps {
  isManager?: boolean
}

/**
 * "The Board" — Warehouse home.
 * Manager view (desktop): 3x2 KPI grid with huge numbers, then worker tiles below.
 * Worker view (tablet/mobile): Large touch tiles only.
 * Critical alerts at bottom if any.
 */
export function WarehouseHome({ isManager = true }: WarehouseHomeProps) {
  const { t } = useTranslation('internal')

  const { data: dashboard } = useQuery({
    queryKey: ['warehouse', 'dashboard'],
    queryFn: () => getWarehouseDashboard({ data: {} }),
    staleTime: 30_000,
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Manager KPIs — huge numbers, no borders */}
      {isManager && <ManagerKPIs />}

      {/* Worker tile grid — always visible */}
      <WorkerTileGrid />

      {/* Critical alerts — minimal, high contrast */}
      {dashboard && dashboard.criticalAlerts > 0 && (
        <div className="px-5 pb-5">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-xs font-medium text-red-500 uppercase tracking-wider">
              {t('warehouse.alerts.title', 'Alerts')}
            </span>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-bold text-red-500">
              {dashboard.criticalAlerts}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <AlertRow
              text={t('warehouse.alerts.lowStockDesc', 'Steel Rebar 16mm below reorder point')}
              severity="critical"
            />
            {dashboard.criticalAlerts > 1 && (
              <AlertRow
                text={t('warehouse.alerts.expiringDesc', 'Cement batch LOT-2026-CM-015 expires in 3 days')}
                severity="warning"
              />
            )}
            {dashboard.criticalAlerts > 2 && (
              <AlertRow
                text={t('warehouse.alerts.varianceDesc', 'Location WH-B/ROW-4 variance exceeds 5%')}
                severity="warning"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AlertRow({
  text,
  severity,
}: {
  text: string
  severity: 'critical' | 'warning'
}) {
  const dotColor = severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'

  return (
    <div className="flex items-center gap-3 min-h-[48px] px-4 py-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
      <span className="text-sm text-black/70 dark:text-white/70">{text}</span>
    </div>
  )
}
