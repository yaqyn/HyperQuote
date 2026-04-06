import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFinanceStore } from '../../stores/finance'
import { FinanceTabStrip } from './FinanceTabStrip'
import { FinanceShortcuts } from './FinanceShortcuts'
import { CurrencyCell } from './shared/CurrencyCell'
import { BankReconDashboard } from './recon/BankReconDashboard'
import { ReportsDashboard } from './reports/ReportsDashboard'
import { DisputeWorkflow } from './disputes/DisputeWorkflow'

/**
 * Root finance module component.
 * Renders shortcuts + tab strip + active tab content.
 * Tab content is placeholder divs for now (Plans 02-08 fill them).
 * Only 'home' tab renders basic key metrics from mock data.
 */
export function FinanceModule() {
  const activeTab = useFinanceStore((s) => s.activeTab)

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <FinanceHome />
      case 'recon':
        return <BankReconDashboard />
      case 'reports':
        return <ReportsDashboard />
      case 'invoicing':
        return <InvoicingWithDisputes />
      default:
        return (
          <div className="p-6 text-center text-[var(--color-text-muted)]">
            Coming soon
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-full">
      <FinanceShortcuts />
      <FinanceTabStrip />
      <div className="flex-1 overflow-auto">
        {renderTab()}
      </div>
    </div>
  )
}

/**
 * Invoicing tab with dispute workflow access.
 * Shows dispute count badge and allows opening DisputeWorkflow as sub-view.
 */
function InvoicingWithDisputes() {
  const { t } = useTranslation('finance')
  const [showDisputes, setShowDisputes] = useState(false)

  if (showDisputes) {
    return (
      <div>
        <div className="px-6 pt-4">
          <button
            type="button"
            onClick={() => setShowDisputes(false)}
            className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            {t('invoicing.backToInvoices', 'Back to Invoices')}
          </button>
        </div>
        <DisputeWorkflow />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-black/90 dark:text-white/90">
          {t('invoicing.title', 'Invoicing')}
        </h3>
        <button
          type="button"
          onClick={() => setShowDisputes(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {t('invoicing.disputes', 'Disputes')}
          <span className="inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold min-w-[20px] h-5 px-1.5 font-[family-name:var(--font-geist-mono)]">
            2
          </span>
        </button>
      </div>
      <div className="text-center py-12 text-sm text-black/40 dark:text-white/40">
        {t('invoicing.placeholder', 'Invoice list (implemented in Plan 02)')}
      </div>
    </div>
  )
}

/**
 * Finance home tab with 4 key metric cards.
 * Uses mock dashboard data inline for now.
 */
function FinanceHome() {
  const { t } = useTranslation('finance')

  // Mock dashboard metrics (will be replaced by server function query in Plan 02)
  const metrics = [
    { label: t('dashboard.revenueMTD', 'Revenue MTD'), amount: 12_450_000 },
    { label: t('dashboard.outstandingAR', 'Outstanding AR'), amount: 8_750_000 },
    { label: t('dashboard.overdueAR', 'Overdue AR'), amount: 2_340_000 },
    { label: t('dashboard.cashPosition', 'Cash Position'), amount: 15_680_000 },
  ]

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4"
          >
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {metric.label}
            </div>
            <div className="text-lg">
              <CurrencyCell amount={metric.amount} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
