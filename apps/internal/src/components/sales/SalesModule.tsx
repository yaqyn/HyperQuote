import { useState, useEffect } from 'react'
import { useSalesStore } from '../../stores/sales'
import { SalesTabStrip } from './SalesTabStrip'
import { RFQInboxTable } from './rfq/RFQInboxTable'
import { QuoteBuilderView } from './quote-builder/QuoteBuilderView'
import { NegotiationView } from './negotiation/NegotiationView'
import { SalesShortcuts } from './SalesShortcuts'
import { SearchMenu } from './quote-builder/SearchMenu'

// Mock customer list — in production this comes from the server
const MOCK_CUSTOMERS = [
  { id: 'cust-001', name: 'Al-Nour Construction', tier: 'A', address: '15 شارع الجزيرة، المعادي، القاهرة' },
  { id: 'cust-002', name: 'Heliopolis Contractors', tier: 'B', address: '22 شارع الأهرام، الجيزة' },
  { id: 'cust-003', name: 'Pyramid Builders', tier: 'A', address: '8 شارع التحرير، الدقي' },
  { id: 'cust-004', name: 'Suez Industrial Group', tier: 'B', address: 'المنطقة الصناعية، السويس' },
  { id: 'cust-005', name: 'Alexandria Building Materials', tier: 'C', address: '45 طريق الحرية، الإسكندرية' },
  { id: 'cust-006', name: 'Maadi Engineering', tier: 'A', address: '3 شارع 9، المعادي الجديدة' },
  { id: 'cust-007', name: 'New Valley Development', tier: 'C', address: 'الوادي الجديد، الداخلة' },
  { id: 'cust-008', name: 'Delta Construction Co.', tier: 'B', address: '17 شارع الجمهورية، المنصورة' },
]

export function SalesModule() {
  const activeTab = useSalesStore((s) => s.activeTab)
  const editingRfqId = useSalesStore((s) => s.editingRfqId)
  const setEditingRfqId = useSalesStore((s) => s.setEditingRfqId)
  const setActiveTab = useSalesStore((s) => s.setActiveTab)
  const [negotiatingQuoteId, setNegotiatingQuoteId] = useState<string | null>(null)

  // New quote creation flow
  const [creatingQuote, setCreatingQuote] = useState(false)
  const [customerSelectOpen, setCustomerSelectOpen] = useState(false)
  const [newQuoteCustomer, setNewQuoteCustomer] = useState<{ id: string; name: string } | null>(null)

  // Listen for negotiate events from RFQ inbox
  useEffect(() => {
    const handler = (e: Event) => {
      const quoteId = (e as CustomEvent).detail?.quoteId
      if (quoteId) setNegotiatingQuoteId(quoteId)
    }
    window.addEventListener('sales:negotiate', handler)
    return () => window.removeEventListener('sales:negotiate', handler)
  }, [])

  const handleCreateQuote = () => {
    setCustomerSelectOpen(true)
  }

  const handleSelectCustomer = (customer: { id: string; name: string }) => {
    setCustomerSelectOpen(false)
    setNewQuoteCustomer(customer)
    setCreatingQuote(true)
  }

  const handleBackFromNewQuote = () => {
    setCreatingQuote(false)
    setNewQuoteCustomer(null)
  }

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

  // New quote flow — customer form is now Step 1 inside QuoteBuilderView
  if (creatingQuote && newQuoteCustomer) {
    const isNew = newQuoteCustomer.id.startsWith('new-') || newQuoteCustomer.id.startsWith('cust-')
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
          <QuoteBuilderView
            rfqId={`new-${newQuoteCustomer.id}`}
            isNewCustomer={isNew}
            initialCustomerName={newQuoteCustomer.name}
            onBack={handleBackFromNewQuote}
          />
        </div>
      </div>
    )
  }

  // RFQ quote builder (from Start Quote on an RFQ row)
  if (editingRfqId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
          <QuoteBuilderView rfqId={editingRfqId} onBack={() => setEditingRfqId(null)} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <SalesShortcuts />

      {/* Content — no tab bar, single view */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
        <RFQInboxTable onCreateQuote={handleCreateQuote} />
      </div>

      {/* Customer select modal */}
      <SearchMenu
        isOpen={customerSelectOpen}
        onClose={() => setCustomerSelectOpen(false)}
        placeholder="Search customers or enter new..."
      >
        {(search) => {
          const q = search.toLowerCase()
          const filtered = q
            ? MOCK_CUSTOMERS.filter((c) => c.name.toLowerCase().includes(q))
            : MOCK_CUSTOMERS

          return (
            <div className="flex flex-col py-1">
              {filtered.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full text-left flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors outline-none"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                    <span className="text-[11px] font-semibold text-black/40 dark:text-white/40">
                      {customer.name.charAt(0)}
                    </span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-[var(--color-text)] truncate">{customer.name}</span>
                    <p className="text-[10px] text-[var(--color-text-subtle)] mt-0.5">{customer.address}</p>
                  </div>
                  <span className="text-[10px] font-medium text-black/30 dark:text-white/30">Tier {customer.tier}</span>
                </button>
              ))}

              {/* New customer option */}
              {search.trim() && !filtered.some((c) => c.name.toLowerCase() === q) && (
                <>
                  <div className="mx-4 my-1 border-t border-black/[0.04] dark:border-white/[0.04]" />
                  <button
                    type="button"
                    onClick={() => handleSelectCustomer({ id: `new-${Date.now()}`, name: search.trim() })}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors outline-none"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--color-primary)]/30">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium text-[var(--color-primary)]">New customer: {search.trim()}</span>
                      <p className="text-[10px] text-[var(--color-text-subtle)] mt-0.5">Create and start quoting</p>
                    </div>
                  </button>
                </>
              )}

              {filtered.length === 0 && !search.trim() && (
                <div className="flex items-center justify-center py-12">
                  <p className="text-[13px] text-[var(--color-text-subtle)]">No customers</p>
                </div>
              )}
            </div>
          )
        }}
      </SearchMenu>
    </div>
  )
}
