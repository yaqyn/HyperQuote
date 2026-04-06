import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReportCard } from './ReportCard'
import { CashFlowForecast } from './CashFlowForecast'

type ReportsView = 'grid' | 'cash-flow'

interface ReportDefinition {
  id: string
  name: string
  description: string
  icon: string
  lastGenerated: string | null
}

const REPORT_DEFINITIONS: ReportDefinition[] = [
  { id: 'daily-cash', name: 'Daily Cash Position', description: 'Current cash balances across all bank accounts', icon: '\u{1F4B0}', lastGenerated: '2026-04-05' },
  { id: 'ar-aging', name: 'AR Aging', description: 'Accounts receivable aging by customer and bucket', icon: '\u{1F4CA}', lastGenerated: '2026-04-04' },
  { id: 'ap-aging', name: 'AP Aging', description: 'Accounts payable aging by supplier', icon: '\u{1F4C9}', lastGenerated: '2026-04-04' },
  { id: 'cash-forecast', name: '13-Week Cash Forecast', description: 'Projected inflows, outflows, and cumulative cash position', icon: '\u{1F4C8}', lastGenerated: '2026-04-03' },
  { id: 'pl-customer', name: 'P&L by Customer', description: 'Profit and loss breakdown per customer account', icon: '\u{1F464}', lastGenerated: null },
  { id: 'pl-product', name: 'P&L by Product', description: 'Profit and loss by product category', icon: '\u{1F4E6}', lastGenerated: null },
  { id: 'pl-project', name: 'P&L by Project', description: 'Profit and loss per construction project', icon: '\u{1F3D7}', lastGenerated: null },
  { id: 'margin', name: 'Margin Analysis', description: 'Gross and net margin trends by category and period', icon: '\u{1F4DD}', lastGenerated: '2026-04-02' },
  { id: 'payment-dist', name: 'Payment Method Distribution', description: 'Wire, cheque, LC, and cash breakdown', icon: '\u{1F4B3}', lastGenerated: '2026-04-05' },
  { id: 'cheque-tracking', name: 'Cheque Tracking', description: 'PDC status overview, maturity calendar, bounce report', icon: '\u{1F4CB}', lastGenerated: '2026-04-05' },
  { id: 'eta-status', name: 'ETA Submission Status', description: 'Egyptian Tax Authority e-invoicing submission log', icon: '\u{1F3E6}', lastGenerated: '2026-04-05' },
  { id: 'credit-util', name: 'Credit Utilization', description: 'Customer credit limit usage and risk exposure', icon: '\u{26A0}', lastGenerated: '2026-04-04' },
]

/**
 * Finance reports hub (Section 5.8).
 * Grid of 12 report cards. Click 13-week forecast to drill into CashFlowForecast.
 */
export function ReportsDashboard() {
  const { t } = useTranslation('finance')
  const [view, setView] = useState<ReportsView>('grid')

  if (view === 'cash-flow') {
    return <CashFlowForecast onBack={() => setView('grid')} />
  }

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-base font-semibold text-black/90 dark:text-white/90">
        {t('reports.title', 'Finance Reports')}
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORT_DEFINITIONS.map((report) => (
          <ReportCard
            key={report.id}
            name={report.name}
            description={report.description}
            icon={report.icon}
            lastGenerated={report.lastGenerated}
            onGenerate={() => {
              // In production: calls server function to generate report
            }}
            onExportCSV={() => {
              // In production: downloads CSV
            }}
            onExportPDF={() => {
              // In production: downloads PDF
            }}
            onEmail={() => {
              // In production: opens email dialog
            }}
            onClick={report.id === 'cash-forecast' ? () => setView('cash-flow') : undefined}
          />
        ))}
      </div>
    </div>
  )
}
