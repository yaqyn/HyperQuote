import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useSalesStore } from '../../stores/sales'
import { getCustomerList } from '../../lib/server/sales-customers'
import { SalesTabStrip } from './SalesTabStrip'
import { RFQInboxTable } from './rfq/RFQInboxTable'
import { QuoteBuilderView } from './quote-builder/QuoteBuilderView'
import { NegotiationView } from './negotiation/NegotiationView'
import { SalesShortcuts } from './SalesShortcuts'
import { SearchMenu } from './quote-builder/SearchMenu'

const QUOTE_ENTER = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }
const QUOTE_EXIT = { duration: 0.16, ease: [0.4, 0, 1, 1] as const }

export function SalesModule() {
  const activeTab = useSalesStore((s) => s.activeTab)
  const editingRfqId = useSalesStore((s) => s.editingRfqId)
  const setEditingRfqId = useSalesStore((s) => s.setEditingRfqId)
  const newQuoteCustomer = useSalesStore((s) => s.newQuoteCustomer)
  const setNewQuoteCustomer = useSalesStore((s) => s.setNewQuoteCustomer)
  const setActiveTab = useSalesStore((s) => s.setActiveTab)
  const [negotiatingQuoteId, setNegotiatingQuoteId] = useState<string | null>(null)

  const creatingQuote = !!newQuoteCustomer

  // New quote creation flow
  const [customerSelectOpen, setCustomerSelectOpen] = useState(false)

  // Customer list from db — loaded once, cached aggressively since the
  // customer set doesn't change between RFQ creations.
  const { data: customerData } = useQuery({
    queryKey: ['sales-customer-list'],
    queryFn: () => getCustomerList({ data: { page: 1, limit: 100 } }),
    staleTime: 5 * 60_000,
  })
  const customers = useMemo(
    () =>
      (customerData?.customers ?? []).map((c) => ({
        id: c.id,
        name: c.companyName,
        tier: c.tier,
        address: c.address ?? '',
      })),
    [customerData],
  )

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
  }

  const handleBackFromNewQuote = () => {
    setNewQuoteCustomer(null)
  }

  // Negotiation overlay (no animation — separate flow)
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

  const quoteBuilderVisible = (creatingQuote && newQuoteCustomer) || !!editingRfqId
  // Only ids prefixed `new-` are brand-new customers — existing customers
  // come in with `cust-*` ids from the db.
  const isNew = !!(creatingQuote && newQuoteCustomer?.id.startsWith('new-'))

  return (
    <div className="relative flex flex-col h-full">
      {/* Inbox (always mounted underneath) */}
      <div
        className={`flex flex-col h-full transition-opacity duration-200 ${quoteBuilderVisible ? 'opacity-0' : 'opacity-100'}`}
        style={{ pointerEvents: quoteBuilderVisible ? 'none' : 'auto' }}
      >
        <SalesShortcuts />
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
          <RFQInboxTable onCreateQuote={handleCreateQuote} />
        </div>
      </div>

      {/* Quote builder overlay */}
      <AnimatePresence>
        {quoteBuilderVisible && (
          <motion.div
            key="quote-builder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: QUOTE_ENTER }}
            exit={{ opacity: 0, transition: QUOTE_EXIT }}
            className="absolute inset-0 bg-[var(--color-bg)] z-10 flex flex-col"
          >
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
              {creatingQuote && newQuoteCustomer ? (
                <QuoteBuilderView
                  rfqId={`new-${newQuoteCustomer.id}`}
                  isNewCustomer={isNew}
                  initialCustomerName={newQuoteCustomer.name}
                  onBack={handleBackFromNewQuote}
                />
              ) : editingRfqId ? (
                <QuoteBuilderView rfqId={editingRfqId} onBack={() => setEditingRfqId(null)} />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer select modal */}
      <SearchMenu
        isOpen={customerSelectOpen}
        onClose={() => setCustomerSelectOpen(false)}
        placeholder="Search customers or enter new..."
        onEnter={(search) => {
          const q = search.toLowerCase().trim()
          if (!q) return
          const match =
            customers.find((c) => c.name.toLowerCase() === q) ??
            customers.find((c) => c.name.toLowerCase().includes(q))
          if (match) {
            handleSelectCustomer(match)
          } else {
            handleSelectCustomer({ id: `new-${Date.now()}`, name: search.trim() })
          }
        }}
      >
        {(search) => {
          const q = search.toLowerCase()
          const filtered = q
            ? customers.filter((c) => c.name.toLowerCase().includes(q))
            : customers

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
