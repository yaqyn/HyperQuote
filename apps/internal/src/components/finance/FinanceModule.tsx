import { useFinanceStore } from '../../stores/finance'
import { FinanceTabStrip } from './FinanceTabStrip'
import { FinanceShortcuts } from './FinanceShortcuts'
import { FinanceHome } from './home/FinanceHome'

/**
 * Root finance module component.
 * Renders shortcuts + tab strip + active tab content.
 * Tab content filled progressively by Plans 02-08.
 */
export function FinanceModule() {
  const activeTab = useFinanceStore((s) => s.activeTab)
  const selectedInvoiceId = useFinanceStore((s) => s.selectedInvoiceId)

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <FinanceHome />
      case 'invoicing':
        return <InvoicingTab />
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
 * Invoicing tab: shows InvoiceDetail when an invoice is selected,
 * InvoiceList otherwise. Lazy-loaded in Plan 02.
 */
function InvoicingTab() {
  const selectedInvoiceId = useFinanceStore((s) => s.selectedInvoiceId)

  // Plan 02 will replace these with real components
  return (
    <div className="p-6 text-center text-[var(--color-text-muted)]">
      Invoicing — coming in Plan 02
    </div>
  )
}
