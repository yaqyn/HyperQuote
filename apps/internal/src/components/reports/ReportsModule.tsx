import { useTranslation } from 'react-i18next'
import { useReportsStore } from '../../stores/reports'
import { ReportsTabStrip } from './ReportsTabStrip'
import { ReportsShortcuts } from './ReportsShortcuts'
import { SalesDashboard } from './dashboards/SalesDashboard'
import { ProcurementDashboard } from './dashboards/ProcurementDashboard'
import { OperationsDashboard } from './dashboards/OperationsDashboard'
import { FinanceDashboard } from './dashboards/FinanceDashboard'
import { WarehouseDashboard } from './dashboards/WarehouseDashboard'
import { DispatchDashboard } from './dashboards/DispatchDashboard'
import { CSDashboard } from './dashboards/CSDashboard'
import { exportReport } from '../../lib/server/reports'
import type { DateRange, ExportFormat } from '../../types/reports'

/**
 * Reports — "The Newspaper"
 * Editorial data journalism. Each department gets a dashboard that tells a story.
 * Phase 1 = pre-built dashboards only. No drag-and-drop Report Builder.
 * 7 role-specific dashboards, period selector pills, text-link export.
 */
export function ReportsModule() {
  const { t } = useTranslation('reports')
  const activeTab = useReportsStore((s) => s.activeTab)
  const dateRange = useReportsStore((s) => s.dateRange)
  const setDateRange = useReportsStore((s) => s.setDateRange)
  const filters = useReportsStore((s) => s.filters)

  const handleExport = async (format: ExportFormat) => {
    const result = await exportReport({
      data: { role: activeTab, format, filters },
    })
    window.open(result.url, '_blank')
  }

  const periods: { key: DateRange; label: string }[] = [
    { key: 'mtd', label: t('filters.mtd', 'Day') },
    { key: 'qtd', label: t('filters.qtd', 'Week') },
    { key: 'ytd', label: t('filters.ytd', 'Month') },
    { key: 'custom', label: t('filters.custom', 'Quarter') },
  ]

  const renderDashboard = () => {
    switch (activeTab) {
      case 'sales': return <SalesDashboard />
      case 'procurement': return <ProcurementDashboard />
      case 'operations': return <OperationsDashboard />
      case 'finance': return <FinanceDashboard />
      case 'warehouse': return <WarehouseDashboard />
      case 'dispatch': return <DispatchDashboard />
      case 'cs': return <CSDashboard />
      default: return null
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ReportsShortcuts />
      <ReportsTabStrip />

      {/* Period selector + export */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-black/[0.04] dark:border-white/[0.04]">
        {/* Period pills */}
        <div className="flex items-center gap-1">
          {periods.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setDateRange(p.key)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                dateRange === p.key
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-black/35 dark:text-white/35 hover:text-black/60 dark:hover:text-white/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Export as text links */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="text-[11px] text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            {t('export.csv', 'Export CSV')}
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="text-[11px] text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            {t('export.pdf', 'Export PDF')}
          </button>
        </div>
      </div>

      {/* Dashboard */}
      <div className="flex-1 overflow-auto">
        {renderDashboard()}
      </div>
    </div>
  )
}
