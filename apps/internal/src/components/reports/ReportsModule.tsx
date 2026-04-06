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
 * Root reports module component.
 * Phase 1 = pre-built dashboards only. No drag-and-drop Report Builder. That's Phase 2.
 * 7 role-specific dashboards, date range filter, CSV/PDF export.
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
    // In production, this would trigger a download
    window.open(result.url, '_blank')
  }

  const dateRangeOptions: { key: DateRange; label: string }[] = [
    { key: 'mtd', label: t('filters.mtd', 'MTD') },
    { key: 'qtd', label: t('filters.qtd', 'QTD') },
    { key: 'ytd', label: t('filters.ytd', 'YTD') },
    { key: 'custom', label: t('filters.custom', 'Custom') },
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

      {/* ─── Filter Bar ───────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-black/5 dark:border-white/5">
        {/* Date Range Buttons */}
        <div className="flex items-center gap-1 rounded-lg border border-black/10 dark:border-white/10 p-0.5">
          {dateRangeOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setDateRange(opt.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                dateRange === opt.key
                  ? 'bg-[#2563EB] text-white'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Export Buttons */}
        <button
          type="button"
          onClick={() => handleExport('csv')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {t('export.csv', 'CSV')}
        </button>
        <button
          type="button"
          onClick={() => handleExport('pdf')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {t('export.pdf', 'PDF')}
        </button>
      </div>

      {/* ─── Dashboard Content ────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {renderDashboard()}
      </div>
    </div>
  )
}
