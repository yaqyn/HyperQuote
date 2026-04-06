import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleButton } from 'react-aria-components'
import { useFinanceStore } from '../../stores/finance'
import { FinanceTabStrip } from './FinanceTabStrip'
import { FinanceShortcuts } from './FinanceShortcuts'
import { CurrencyCell } from './shared/CurrencyCell'
import { PDCContainer } from './pdc/PDCContainer'

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
      case 'payments':
        return <PaymentsTab />
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
 * Payments tab with sub-view toggle for Payments List vs PDC Tracker.
 */
function PaymentsTab() {
  const { t } = useTranslation('finance')
  const [subView, setSubView] = useState<'list' | 'pdc'>('list')

  return (
    <div className="flex flex-col h-full">
      {/* Sub-view toggle */}
      <div className="flex items-center gap-2 px-6 pt-4">
        <ToggleButton
          isSelected={subView === 'list'}
          onChange={() => setSubView('list')}
          className="rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] data-[selected]:bg-[#2563EB] data-[selected]:text-white text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 border border-black/10 dark:border-white/10"
        >
          {t('payments.list', 'Payments')}
        </ToggleButton>
        <ToggleButton
          isSelected={subView === 'pdc'}
          onChange={() => setSubView('pdc')}
          className="rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] data-[selected]:bg-[#2563EB] data-[selected]:text-white text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 border border-black/10 dark:border-white/10"
        >
          {t('payments.pdcTracker', 'PDC Tracker')}
        </ToggleButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {subView === 'pdc' ? (
          <PDCContainer />
        ) : (
          <div className="p-6 text-center text-black/40 dark:text-white/40">
            {t('payments.comingSoon', 'Payment recording coming soon')}
          </div>
        )}
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
