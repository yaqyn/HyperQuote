import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Dialog, Modal, ModalOverlay, Heading } from 'react-aria-components'
import { Plus, ArrowLeft, Clock } from 'lucide-react'
import { useSalesStore } from '../../stores/sales'
import { getCustomerList } from '../../lib/server/sales-customers'
import { getRFQQueue, saveRFQForLater, evaluateRFQ } from '../../lib/server/sales-rfq'
import { QuoteBuilderView } from './quote-builder/QuoteBuilderView'
import { NegotiationView } from './negotiation/NegotiationView'
import { SearchMenu } from './quote-builder/SearchMenu'
import { ReportViewerModal } from '../shared/ReportViewer'

const QUOTE_ENTER = { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const }

const SAVE_DURATIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: 'Tomorrow', minutes: 960 },
]

export function SalesModule() {
  const qc = useQueryClient()
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const editingRfqId = useSalesStore((s) => s.editingRfqId)
  const setEditingRfqId = useSalesStore((s) => s.setEditingRfqId)
  const newQuoteCustomer = useSalesStore((s) => s.newQuoteCustomer)
  const setNewQuoteCustomer = useSalesStore((s) => s.setNewQuoteCustomer)
  const setActiveTab = useSalesStore((s) => s.setActiveTab)
  const [negotiatingQuoteId, setNegotiatingQuoteId] = useState<string | null>(null)
  const [customerSelectOpen, setCustomerSelectOpen] = useState(false)

  // Floating windows
  const [openPopover, setOpenPopover] = useState<'submitted' | 'saved' | 'evaluated' | 'rejected' | null>(null)
  const [reportRfqId, setReportRfqId] = useState<string | null>(null)

  // Save timer
  const [saveTimerOpen, setSaveTimerOpen] = useState(false)
  const [savingRfqId, setSavingRfqId] = useState<string | null>(null)

  // Working on a saved order (not from main pipeline)
  const [workingSavedOrder, setWorkingSavedOrder] = useState(false)

  // Fetch pipeline
  const { data: rfqData } = useQuery({
    queryKey: ['sales-rfq-list'],
    queryFn: () => getRFQQueue({ data: {} }),
    staleTime: 10_000,
  })

  const rfqs = rfqData?.rfqs ?? []

  // Pipeline: ONLY submitted, oldest first
  const pipeline = useMemo(() => {
    return rfqs
      .filter((r) => r.status === 'submitted')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [rfqs])

  const saved = useMemo(() => rfqs.filter((r) => r.status === 'saved'), [rfqs])
  const evaluated = useMemo(() => rfqs.filter((r) => r.status === 'quoted'), [rfqs])
  const rejected = useMemo(() => rfqs.filter((r) => r.status === 'declined' || r.status === 'expired'), [rfqs])

  // Auto-load first pipeline item if nothing selected and not working on a saved order
  useEffect(() => {
    if (!editingRfqId && !newQuoteCustomer && !workingSavedOrder && pipeline.length > 0) {
      setEditingRfqId(pipeline[0]!.id)
    }
  }, [pipeline, editingRfqId, newQuoteCustomer, workingSavedOrder, setEditingRfqId])

  // After an action (reject/evaluate), clear editingRfqId.
  // The auto-load effect will pick the next submitted order from the refetched pipeline.
  const handleActionComplete = useCallback(async () => {
    if (workingSavedOrder) {
      setWorkingSavedOrder(false)
    }
    await qc.invalidateQueries({ queryKey: ['sales-rfq-list'] })
    setEditingRfqId(null)
  }, [workingSavedOrder, setEditingRfqId, qc])

  // Save: open timer dialog (does NOT advance — status change removes it from pipeline)
  const handleSaveRequest = useCallback(() => {
    setSavingRfqId(editingRfqId)
    setSaveTimerOpen(true)
  }, [editingRfqId])

  const handleSaveConfirm = useCallback(async (minutes: number) => {
    if (!savingRfqId) return
    // 1. Change status in DB
    await saveRFQForLater({ data: { rfqId: savingRfqId, returnInMinutes: minutes } })
    // 2. Close dialog
    setSaveTimerOpen(false)
    setSavingRfqId(null)
    if (workingSavedOrder) setWorkingSavedOrder(false)
    // 3. Refetch pipeline FIRST — so the saved order is gone from the list
    await qc.invalidateQueries({ queryKey: ['sales-rfq-list'] })
    // 4. THEN clear editing — auto-load will pick from the already-updated pipeline
    setEditingRfqId(null)
  }, [savingRfqId, workingSavedOrder, setEditingRfqId, qc])

  // Open saved order in builder
  const handleOpenSavedOrder = useCallback((rfqId: string) => {
    setOpenPopover(null)
    setWorkingSavedOrder(true)
    setEditingRfqId(rfqId)
  }, [setEditingRfqId])

  // Return to main pipeline from saved order
  const handleReturnToPipeline = useCallback(() => {
    setWorkingSavedOrder(false)
    setEditingRfqId(null)
  }, [setEditingRfqId])

  // Customer list
  const { data: customerData } = useQuery({
    queryKey: ['sales-customer-list'],
    queryFn: () => getCustomerList({ data: { page: 1, limit: 100 } }),
    staleTime: 5 * 60_000,
  })
  const customers = useMemo(
    () => (customerData?.customers ?? []).map((c) => ({ id: c.id, name: c.companyName, tier: c.tier, address: c.address ?? '' })),
    [customerData],
  )

  // Negotiate events
  useEffect(() => {
    const handler = (e: Event) => {
      const quoteId = (e as CustomEvent).detail?.quoteId
      if (quoteId) setNegotiatingQuoteId(quoteId)
    }
    window.addEventListener('sales:negotiate', handler)
    return () => window.removeEventListener('sales:negotiate', handler)
  }, [])

  if (negotiatingQuoteId) {
    return (
      <div className="flex flex-col h-full">
        <NegotiationView
          quoteId={negotiatingQuoteId}
          onBack={() => setNegotiatingQuoteId(null)}
          onReviseQuote={() => { setNegotiatingQuoteId(null); setActiveTab('rfq-inbox') }}
          onMarkAsWon={() => { setNegotiatingQuoteId(null); setActiveTab('rfq-inbox') }}
        />
      </div>
    )
  }

  const isNew = !!(newQuoteCustomer?.id.startsWith('new-'))

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-5 py-2 border-b border-black/[0.04] dark:border-white/[0.04]">
        {/* New */}
        <Button
          onPress={() => setCustomerSelectOpen(true)}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] text-[var(--color-text-muted)] hover:bg-black/[0.07] dark:hover:bg-white/[0.07] transition-colors cursor-pointer shrink-0"
        >
          <Plus size={14} strokeWidth={1.5} />
        </Button>

        {/* Status buttons — hover to reveal floating window */}
        <div className="flex items-center gap-1 shrink-0">
          {([
            { key: 'submitted' as const, label: 'Submitted', count: pipeline.length, items: pipeline, clickable: false },
            { key: 'saved' as const, label: 'Saved', count: saved.length, items: saved, clickable: true },
            { key: 'evaluated' as const, label: 'Evaluated', count: evaluated.length, items: evaluated, clickable: true },
            { key: 'rejected' as const, label: 'Rejected', count: rejected.length, items: rejected, clickable: true },
          ]).map(({ key, label, count, items, clickable }) => (
            <div
              key={key}
              className="relative group/pop"
              onMouseEnter={() => { clearTimeout(leaveTimerRef.current); hoverTimerRef.current = setTimeout(() => setOpenPopover(key), 120) }}
              onMouseLeave={() => { clearTimeout(hoverTimerRef.current); leaveTimerRef.current = setTimeout(() => setOpenPopover((cur) => cur === key ? null : cur), 200) }}
            >
              <span
                className={`
                  font-[var(--font-geist-mono)] text-[9px] uppercase tracking-wider px-2 py-1 rounded-md transition-colors inline-block
                  ${openPopover === key
                    ? 'text-[var(--color-text)]'
                    : count > 0
                      ? 'text-[var(--color-text-muted)]'
                      : 'text-[var(--color-text-subtle)]'
                  }
                `}
              >
                {label}{count > 0 ? ` ${count}` : ''}
              </span>

              {/* Floating window on hover */}
              <AnimatePresence>
                {openPopover === key && items.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full start-0 mt-1 z-50 w-[260px] rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[var(--color-surface)] shadow-xl"
                  >
                    <div className="px-3 py-2 border-b border-black/[0.04] dark:border-white/[0.04]">
                      <span className="font-[var(--font-geist-mono)] text-[9px] text-[var(--color-text-subtle)] uppercase tracking-wider">{label}</span>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto py-1">
                      {items.map((rfq) => {
                        const age = Math.floor((Date.now() - new Date(rfq.createdAt).getTime()) / 3_600_000)
                        const timeLabel = age < 24 ? `${age}h` : `${Math.floor(age / 24)}d`
                        return clickable ? (
                          <button
                            key={rfq.id}
                            type="button"
                            onClick={() => {
                              if (key === 'saved') {
                                handleOpenSavedOrder(rfq.id)
                              } else {
                                setOpenPopover(null)
                                setReportRfqId(rfq.id)
                              }
                            }}
                            className="w-full text-start px-3 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                          >
                            <div className="text-[12px] font-medium text-[var(--color-text)]">{rfq.customerName}</div>
                            <div className="font-[var(--font-geist-mono)] text-[9px] text-[var(--color-text-subtle)] tabular-nums mt-0.5">
                              {rfq.lineItemCount} items · {timeLabel}
                              {key === 'saved' && <span className="ms-1 text-[var(--color-primary)]">resume</span>}
                            </div>
                          </button>
                        ) : (
                          <div
                            key={rfq.id}
                            className="px-3 py-2"
                          >
                            <div className="text-[12px] font-medium text-[var(--color-text)]">{rfq.customerName}</div>
                            <div className="font-[var(--font-geist-mono)] text-[9px] text-[var(--color-text-subtle)] tabular-nums mt-0.5">
                              {rfq.lineItemCount} items · {timeLabel}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        {/* Pipeline or "Return to queue" button */}
        {workingSavedOrder ? (
          <button
            type="button"
            onClick={handleReturnToPipeline}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#1a1a1a] border border-[var(--color-error)]/30 transition-colors hover:border-[var(--color-error)]/60"
          >
            <ArrowLeft size={13} strokeWidth={1.5} className="text-[var(--color-error)]" />
            <span className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-error)] uppercase tracking-wider font-medium">
              Return to queue
            </span>
          </button>
        ) : (
          <div
            className="relative overflow-hidden shrink-0 rounded-xl border border-black/[0.06] dark:border-white/[0.06]"
            style={{ width: '220px' }}
          >
            <div
              className="absolute inset-y-0 end-0 w-20 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, transparent, var(--color-surface) 70%, var(--color-surface))' }}
            />
            <div className="flex items-stretch gap-0">
              {/* Active order pinned first, rest sorted after */}
              {[...pipeline].sort((a, b) => (a.id === editingRfqId ? -1 : b.id === editingRfqId ? 1 : 0)).map((rfq) => {
                const isActive = rfq.id === editingRfqId
                const age = Math.floor((Date.now() - new Date(rfq.createdAt).getTime()) / 3_600_000)
                const timeLabel = age < 1 ? 'now' : age < 24 ? `${age}h` : `${Math.floor(age / 24)}d`
                const priceStatus = rfq.hasOutdatedPrices ? 'Outdated' : 'Updated'
                return (
                  <div
                    key={rfq.id}
                    className={`
                      shrink-0 w-[130px] px-3 py-2.5 text-start transition-all border-e border-black/[0.04] dark:border-white/[0.04] last:border-0
                      ${isActive
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-black/[0.02] dark:bg-white/[0.02] text-[var(--color-text)]'
                      }
                    `}
                  >
                    <div className="text-[11px] font-medium truncate">{rfq.customerName}</div>
                    <div className={`flex items-center gap-1.5 mt-0.5 font-[var(--font-geist-mono)] text-[8px] tabular-nums ${
                      isActive ? 'opacity-50' : 'text-[var(--color-text-subtle)]'
                    }`}>
                      <span>{timeLabel}</span>
                      <span>·</span>
                      <span className={!isActive && rfq.hasOutdatedPrices ? 'text-[var(--color-warning)]' : ''}>
                        {priceStatus}
                      </span>
                    </div>
                  </div>
                )
              })}
              {pipeline.length === 0 && (
                <div className="w-full py-2.5 text-center font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)]">
                  Queue empty
                </div>
              )}
            </div>
          </div>
        )}
      </div>


      {/* ── Quote builder ────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
        <AnimatePresence mode="wait">
          {newQuoteCustomer ? (
            <motion.div
              key={`new-${newQuoteCustomer.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: QUOTE_ENTER }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <QuoteBuilderView
                rfqId={`new-${newQuoteCustomer.id}`}
                isNewCustomer={isNew}
                initialCustomerName={newQuoteCustomer.name}
                onBack={() => setNewQuoteCustomer(null)}
                onSave={handleSaveRequest}
              />
            </motion.div>
          ) : editingRfqId ? (
            <motion.div
              key={editingRfqId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: QUOTE_ENTER }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <QuoteBuilderView
                rfqId={editingRfqId}
                onBack={handleActionComplete}
                onSave={handleSaveRequest}
              />
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-[13px] text-[var(--color-text-muted)]">No pending quotes</p>
                <p className="text-[11px] text-[var(--color-text-subtle)] mt-1">All caught up</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Save timer dialog ────────────────────────────────── */}
      <ModalOverlay
        isOpen={saveTimerOpen}
        onOpenChange={(open) => { if (!open) { setSaveTimerOpen(false); setSavingRfqId(null) } }}
        isDismissable
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      >
        <Modal className="w-full max-w-xs mx-4">
          <Dialog
            isKeyboardDismissDisabled
            className="rounded-xl bg-[var(--color-surface)] border border-black/[0.06] dark:border-white/[0.06] shadow-2xl outline-none p-5"
          >
            {() => (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={14} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
                  <Heading slot="title" className="text-[14px] font-semibold text-[var(--color-text)]">
                    Save for later
                  </Heading>
                </div>
                <p className="text-[12px] text-[var(--color-text-muted)] mb-4">
                  This order will return to the pipeline after the selected time.
                </p>
                <div className="flex flex-col gap-1.5">
                  {SAVE_DURATIONS.map(({ label, minutes }) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => handleSaveConfirm(minutes)}
                      className="w-full text-start px-3 py-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
                    >
                      <span className="font-[var(--font-geist-mono)] text-[12px] font-medium text-[var(--color-text)]">{label}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => { setSaveTimerOpen(false); setSavingRfqId(null) }}
                  className="w-full mt-3 text-center text-[11px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors py-1"
                >
                  Cancel
                </button>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>

      {/* ── Report viewer for evaluated/rejected ─────────────── */}
      <ReportViewerModal rfqId={reportRfqId} onClose={() => setReportRfqId(null)} />

      {/* ── Customer select modal ────────────────────────────── */}
      <SearchMenu
        isOpen={customerSelectOpen}
        onClose={() => setCustomerSelectOpen(false)}
        placeholder="Search customers or enter new..."
        onEnter={(search) => {
          const q = search.toLowerCase().trim()
          if (!q) return
          const match = customers.find((c) => c.name.toLowerCase() === q) ?? customers.find((c) => c.name.toLowerCase().includes(q))
          if (match) {
            setCustomerSelectOpen(false)
            setNewQuoteCustomer(match)
          } else {
            setCustomerSelectOpen(false)
            setNewQuoteCustomer({ id: `new-${Date.now()}`, name: search.trim() })
          }
        }}
      >
        {(search) => {
          const q = search.toLowerCase()
          const filtered = q ? customers.filter((c) => c.name.toLowerCase().includes(q)) : customers
          return (
            <div className="flex flex-col py-1">
              {filtered.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => { setCustomerSelectOpen(false); setNewQuoteCustomer(customer) }}
                  className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors outline-none"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                    <span className="text-[11px] font-semibold text-black/40 dark:text-white/40">{customer.name.charAt(0)}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-[var(--color-text)] truncate">{customer.name}</span>
                    <p className="text-[10px] text-[var(--color-text-subtle)] mt-0.5">{customer.address}</p>
                  </div>
                  <span className="text-[10px] font-medium text-black/30 dark:text-white/30">Tier {customer.tier}</span>
                </button>
              ))}
              {search.trim() && !filtered.some((c) => c.name.toLowerCase() === q) && (
                <>
                  <div className="mx-4 my-1 border-t border-black/[0.04] dark:border-white/[0.04]" />
                  <button
                    type="button"
                    onClick={() => { setCustomerSelectOpen(false); setNewQuoteCustomer({ id: `new-${Date.now()}`, name: search.trim() }) }}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors outline-none"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--color-primary)]/30">
                      <Plus size={12} className="text-[var(--color-primary)]" />
                    </span>
                    <div>
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
