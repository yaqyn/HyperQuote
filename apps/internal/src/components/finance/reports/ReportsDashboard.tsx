import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReportCard } from './ReportCard'
import { CashFlowForecast } from './CashFlowForecast'

type ReportsView = 'grid' | 'cash-flow'

interface ReportDefinition {
  id: string
  name: string
  description: string
  keyMetric?: string
  lastGenerated: string | null
}

const REPORT_DEFINITIONS: ReportDefinition[] = [
  { id: 'daily-cash', name: 'Daily Cash Position', description: 'Current cash balances across all bank accounts', keyMetric: 'EGP 15.4M', lastGenerated: '2026-04-05' },
  { id: 'ar-aging', name: 'AR Aging', description: 'Accounts receivable aging by customer and bucket', keyMetric: '42 days avg', lastGenerated: '2026-04-04' },
  { id: 'ap-aging', name: 'AP Aging', description: 'Accounts payable aging by supplier', keyMetric: '28 days avg', lastGenerated: '2026-04-04' },
  { id: 'cash-forecast', name: '13-Week Cash Forecast', description: 'Projected inflows, outflows, and cumulative cash position', keyMetric: '+EGP 2.1M', lastGenerated: '2026-04-03' },
  { id: 'pl-customer', name: 'P&L by Customer', description: 'Profit and loss breakdown per customer account', lastGenerated: null },
  { id: 'pl-product', name: 'P&L by Product', description: 'Profit and loss by product category', lastGenerated: null },
  { id: 'pl-project', name: 'P&L by Project', description: 'Profit and loss per construction project', lastGenerated: null },
  { id: 'margin', name: 'Margin Analysis', description: 'Gross and net margin trends by category and period', keyMetric: '18.4%', lastGenerated: '2026-04-02' },
  { id: 'payment-dist', name: 'Payment Distribution', description: 'Wire, cheque, LC, and cash breakdown', keyMetric: '62% wire', lastGenerated: '2026-04-05' },
  { id: 'cheque-tracking', name: 'Cheque Tracking', description: 'PDC status overview, maturity calendar, bounce report', keyMetric: '3 pending', lastGenerated: '2026-04-05' },
  { id: 'eta-status', name: 'ETA Submission', description: 'Egyptian Tax Authority e-invoicing submission log', keyMetric: '98% accepted', lastGenerated: '2026-04-05' },
  { id: 'credit-util', name: 'Credit Utilization', description: 'Customer credit limit usage and risk exposure', keyMetric: '67% avg', lastGenerated: '2026-04-04' },
]

/**
 * "The Brief" — Financial statements as clean document previews.
 * Each report is a card: title + period + key metric + generate action.
 * Click 13-week forecast drills into CashFlowForecast.
 */
export function ReportsDashboard() {
  const { t } = useTranslation('finance')
  const [view, setView] = useState<ReportsView>('grid')

  if (view === 'cash-flow') {
    return <CashFlowForecast onBack={() => setView('grid')} />
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <span className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25">
          {t('reports.title', 'Finance Reports')}
        </span>
      </div>

      {/* Report grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
        {REPORT_DEFINITIONS.map((report) => (
          <ReportCard
            key={report.id}
            name={report.name}
            description={report.description}
            keyMetric={report.keyMetric}
            lastGenerated={report.lastGenerated}
            onGenerate={() => {}}
            onExportCSV={() => {}}
            onExportPDF={() => {}}
            onEmail={() => {}}
            onClick={report.id === 'cash-forecast' ? () => setView('cash-flow') : undefined}
          />
        ))}
      </div>
    </div>
  )
}
