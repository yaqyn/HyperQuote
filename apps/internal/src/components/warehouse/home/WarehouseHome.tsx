import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { WorkerTileGrid } from './WorkerTileGrid'
import { ManagerKPIs } from './ManagerKPIs'
import { getWarehouseDashboard } from '../../../lib/server/warehouse-dashboard'
import { getExpectedDeliveries } from '../../../lib/server/warehouse-receiving'

interface WarehouseHomeProps {
  isManager?: boolean
}

/**
 * "The Board" — Warehouse home.
 * Manager view (desktop): 3x2 KPI grid with huge numbers, then worker tiles below.
 * Worker view (tablet/mobile): Large touch tiles only.
 * Urgent delivery banner at top. Critical alerts at bottom if any.
 */
export function WarehouseHome({ isManager = true }: WarehouseHomeProps) {
  const { t } = useTranslation('internal')

  const { data: dashboard } = useQuery({
    queryKey: ['warehouse', 'dashboard'],
    queryFn: () => getWarehouseDashboard({ data: {} }),
    staleTime: 30_000,
  })

  // Check for urgent deliveries (arriving < 30 min)
  const { data: deliveriesData } = useQuery({
    queryKey: ['warehouse', 'expected-deliveries', undefined],
    queryFn: () => getExpectedDeliveries({ data: {} }),
    staleTime: 15_000,
  })

  const urgentDeliveries = useMemo(() => {
    const deliveries = deliveriesData?.deliveries ?? []
    const now = Date.now()
    const thirtyMin = 30 * 60 * 1000
    return deliveries.filter((d) => {
      const eta = new Date(d.eta).getTime()
      return eta > now && eta - now < thirtyMin && d.status !== 'complete' && d.status !== 'receiving'
    })
  }, [deliveriesData])

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      {/* Urgent delivery banner — above everything */}
      {urgentDeliveries.length > 0 && (
        <div
          className="rounded-2xl px-6 py-5 flex items-center gap-4"
          style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
        >
          <span className="shrink-0 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-red-700 dark:text-red-400">
              {urgentDeliveries.length === 1
                ? t('warehouse.home.urgentDelivery', '{{supplier}} arriving in < 30 min', {
                    supplier: urgentDeliveries[0].supplierName,
                  })
                : t('warehouse.home.urgentDeliveries', '{{count}} deliveries arriving in < 30 min', {
                    count: urgentDeliveries.length,
                  })}
            </p>
            {urgentDeliveries.length === 1 && (
              <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] text-red-600/70 dark:text-red-400/70 mt-0.5">
                {urgentDeliveries[0].assignedDock} &middot; {urgentDeliveries[0].lineItemCount} {t('warehouse.home.items', 'items')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Manager KPIs — huge numbers, no borders */}
      {isManager && <ManagerKPIs />}

      {/* Worker tile grid — always visible */}
      <WorkerTileGrid />

      {/* Critical alerts — minimal, high contrast */}
      {dashboard && dashboard.criticalAlerts > 0 && (
        <div className="pb-2">
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
    <div className="flex items-center gap-3 min-h-[56px] px-6 py-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
      <span className="text-[14px] text-black/70 dark:text-white/70">{text}</span>
    </div>
  )
}
