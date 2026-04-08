import { useState, useEffect } from 'react'
import { Button } from 'react-aria-components'
import { ArrowLeft } from 'lucide-react'
import { useSalesStore } from '../../stores/sales'
import { SalesTabStrip } from './SalesTabStrip'
import { RFQInboxTable } from './rfq/RFQInboxTable'
import { QuoteBuilderView } from './quote-builder/QuoteBuilderView'
import { NegotiationView } from './negotiation/NegotiationView'
import { Customer360View } from './customer360/Customer360View'
import { AddCustomerDialog } from './AddCustomerDialog'
import { SalesContacts } from './contacts/SalesContacts'
import { SalesShortcuts } from './SalesShortcuts'

export function SalesModule() {
  const activeTab = useSalesStore((s) => s.activeTab)
  const selectedCustomerId = useSalesStore((s) => s.selectedCustomerId)
  const setSelectedCustomerId = useSalesStore((s) => s.setSelectedCustomerId)
  const editingRfqId = useSalesStore((s) => s.editingRfqId)
  const setEditingRfqId = useSalesStore((s) => s.setEditingRfqId)
  const setActiveTab = useSalesStore((s) => s.setActiveTab)
  const [negotiatingQuoteId, setNegotiatingQuoteId] = useState<string | null>(null)

  // Listen for negotiate events from RFQ inbox
  useEffect(() => {
    const handler = (e: Event) => {
      const quoteId = (e as CustomEvent).detail?.quoteId
      if (quoteId) setNegotiatingQuoteId(quoteId)
    }
    window.addEventListener('sales:negotiate', handler)
    return () => window.removeEventListener('sales:negotiate', handler)
  }, [])

  // Negotiation overlay
  if (negotiatingQuoteId) {
    return (
      <div className="flex flex-col h-full">
        <div className="shrink-0 pt-1 pb-2">
          <SalesTabStrip />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <NegotiationView
            quoteId={negotiatingQuoteId}
            onBack={() => setNegotiatingQuoteId(null)}
            onReviseQuote={() => {
              setNegotiatingQuoteId(null)
              setActiveTab('rfq-inbox')
            }}
            onMarkAsWon={() => {
              setNegotiatingQuoteId(null)
              setActiveTab('rfq-inbox')
            }}
          />
        </div>
      </div>
    )
  }

  // RFQ tab: inbox list → click → quote builder inline
  const rfqContent = editingRfqId ? (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
        <QuoteBuilderView rfqId={editingRfqId} onBack={() => setEditingRfqId(null)} />
      </div>
    </div>
  ) : (
    <RFQInboxTable />
  )

  // Customers tab: contacts list → click → customer 360 inline
  const customersContent = selectedCustomerId ? (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center justify-between px-5 py-2 border-b border-black/[0.04] dark:border-white/[0.04]">
        <Button
          onPress={() => setSelectedCustomerId(null)}
          aria-label="Back to customers"
          className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer outline-none transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          Back to Customers
        </Button>
        <AddCustomerDialog />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
        <Customer360View customerId={selectedCustomerId} />
      </div>
    </div>
  ) : (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center justify-between px-5 py-2">
        <div />
        <AddCustomerDialog />
      </div>
      <div className="flex-1 min-h-0">
        <SalesContacts />
      </div>
    </div>
  )

  const tabContent: Record<string, React.ReactNode> = {
    'rfq-inbox': rfqContent,
    customers: customersContent,
  }

  return (
    <div className="flex flex-col h-full">
      <SalesShortcuts />

      {/* Tab bar */}
      <div className="shrink-0 pt-1 pb-2">
        <SalesTabStrip />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
        {tabContent[activeTab] ?? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[var(--color-text-subtle)]">Coming soon</p>
          </div>
        )}
      </div>
    </div>
  )
}
