import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getWarehouseDashboard } from '../../../lib/server/warehouse-dashboard'

/**
 * Manager-only KPI strip below worker tiles.
 * All numbers use Geist Mono (font-mono maps to --font-geist-mono).
 * Currency formatted as EGP with Arabic-Indic numerals when locale is Arabic.
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

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {/* Performance KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          label={t('warehouse.kpi.pickAccuracy', 'Pick Accuracy')}
          value={pctFmt.format(dashboard.pickAccuracy / 100)}
        />
        <KPICard
          label={t('warehouse.kpi.onTimeShipment', 'On-Time Shipment')}
          value={pctFmt.format(dashboard.onTimeShipment / 100)}
        />
        <KPICard
          label={t('warehouse.kpi.receivingCycleTime', 'Receiving Cycle')}
          value={`${numFmt.format(dashboard.receivingCycleTime)} min`}
        />
        <KPICard
          label={t('warehouse.kpi.inventoryAccuracy', 'Inventory Accuracy')}
          value={pctFmt.format(dashboard.inventoryAccuracy / 100)}
        />
      </div>

      {/* Labor + Tasks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          label={t('warehouse.kpi.workersActive', 'Workers Active')}
          value={`${numFmt.format(dashboard.workersActive)} / ${numFmt.format(dashboard.totalWorkers)}`}
        />
        <KPICard
          label={t('warehouse.kpi.forkliftOps', 'Forklift Ops')}
          value={numFmt.format(dashboard.forkliftOpsAvailable)}
        />
        <KPICard
          label={t('warehouse.kpi.tasksToday', 'Tasks Today')}
          value={`${numFmt.format(dashboard.tasksCompleted)} / ${numFmt.format(dashboard.tasksTotal)}`}
        />
        <KPICard
          label={t('warehouse.kpi.pendingApprovals', 'Pending Approvals')}
          value={numFmt.format(dashboard.pendingCounts)}
        />
      </div>

      {/* Inventory Value */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          label={t('warehouse.kpi.onHand', 'On-Hand')}
          value={currFmt.format(dashboard.inventoryValue.onHand)}
        />
        <KPICard
          label={t('warehouse.kpi.reserved', 'Reserved')}
          value={currFmt.format(dashboard.inventoryValue.reserved)}
        />
        <KPICard
          label={t('warehouse.kpi.available', 'Available')}
          value={currFmt.format(dashboard.inventoryValue.available)}
        />
        <KPICard
          label={t('warehouse.kpi.onHold', 'On-Hold')}
          value={currFmt.format(dashboard.inventoryValue.onHold)}
        />
      </div>
    </div>
  )
}

function KPICard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/40 p-3">
      <span className="text-[11px] font-medium text-black/50 dark:text-white/50 truncate">
        {label}
      </span>
      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-semibold text-black/90 dark:text-white/90">
        {value}
      </span>
    </div>
  )
}
