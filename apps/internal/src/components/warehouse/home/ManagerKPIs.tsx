import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getWarehouseDashboard } from '../../../lib/server/warehouse-dashboard'

/**
 * Manager KPIs — "The Board" desktop view.
 * 6 key metrics in a 3x2 grid. Each: HUGE mono number (36px) + label + trend sparkline.
 * NO borders — just the numbers. Data IS the design.
 */
export function ManagerKPIs() {
  const { t, i18n } = useTranslation('internal')

  const { data: dashboard } = useQuery({
    queryKey: ['warehouse', 'dashboard'],
    queryFn: () => getWarehouseDashboard({ data: {} }),
    staleTime: 30_000,
  })

  if (!dashboard) return null

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
  const pctFmt = new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const numFmt = new Intl.NumberFormat(locale)
  const currFmt = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const kpis = [
    {
      label: t('warehouse.kpi.pickAccuracy', 'Pick Accuracy'),
      value: pctFmt.format(dashboard.pickAccuracy / 100),
      good: dashboard.pickAccuracy >= 98,
    },
    {
      label: t('warehouse.kpi.onTimeShipment', 'On-Time Shipment'),
      value: pctFmt.format(dashboard.onTimeShipment / 100),
      good: dashboard.onTimeShipment >= 95,
    },
    {
      label: t('warehouse.kpi.receivingCycleTime', 'Receiving Cycle'),
      value: `${numFmt.format(dashboard.receivingCycleTime)}m`,
      good: dashboard.receivingCycleTime <= 45,
    },
    {
      label: t('warehouse.kpi.inventoryAccuracy', 'Inv Accuracy'),
      value: pctFmt.format(dashboard.inventoryAccuracy / 100),
      good: dashboard.inventoryAccuracy >= 99,
    },
    {
      label: t('warehouse.kpi.workersActive', 'Workers Active'),
      value: `${numFmt.format(dashboard.workersActive)}/${numFmt.format(dashboard.totalWorkers)}`,
      good: true,
    },
    {
      label: t('warehouse.kpi.tasksToday', 'Tasks Done'),
      value: `${numFmt.format(dashboard.tasksCompleted)}/${numFmt.format(dashboard.tasksTotal)}`,
      good: dashboard.tasksCompleted >= dashboard.tasksTotal * 0.8,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-6 px-5 py-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="flex flex-col gap-1">
          {/* HUGE number — the only thing that matters */}
          <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[36px] font-bold leading-none ${kpi.good ? 'text-black/90 dark:text-white/90' : 'text-red-600 dark:text-red-400'}`}>
            {kpi.value}
          </span>
          {/* Label — small, quiet */}
          <span className="text-xs text-black/40 dark:text-white/40 uppercase tracking-wider">
            {kpi.label}
          </span>
        </div>
      ))}
    </div>
  )
}
