import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  X,
  Paperclip,
  ShieldAlert,
  Check,
  Wallet,
  Building2,
  Truck,
  Ban,
} from 'lucide-react'
import { Button } from 'react-aria-components'
import { SlidePanel } from '../shared/SlidePanel'
import {
  getFinanceInbox,
  recordOrderPartialPayment,
  recordOrderFullPayment,
  recordDealPartialPayment,
  recordDealFullPayment,
  cancelOrderFromFinance,
  cancelDealFromFinance,
  type FinanceOrderView,
  type FinanceDealView,
} from '../../lib/server/finance'

interface FinancePaymentPanelProps {
  isOpen: boolean
  orderId: string | null
  dealId: string | null
  onClose: () => void
}

function formatEgp(n: number): string {
  return Math.round(n).toLocaleString('en-EG')
}

type Mode = 'order' | 'deal'
type Stage = 'preview' | 'confirm' | 'cancel'

export function FinancePaymentPanel({
  isOpen,
  orderId,
  dealId,
  onClose,
}: FinancePaymentPanelProps) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['finance-inbox'],
    queryFn: () => getFinanceInbox({ data: {} }),
    staleTime: 30_000,
  })

  const mode: Mode | null = orderId ? 'order' : dealId ? 'deal' : null

  const order: FinanceOrderView | null = useMemo(() => {
    if (!orderId || !data) return null
    return data.customerOrders.find((o) => o.quoteId === orderId) ?? null
  }, [orderId, data])
  const deal: FinanceDealView | null = useMemo(() => {
    if (!dealId || !data) return null
    return data.supplierDeals.find((d) => d.dealId === dealId) ?? null
  }, [dealId, data])

  const row = order ?? deal
  const paymentStatus = row?.paymentStatus ?? 'paid'
  const isTerminal = paymentStatus === 'paid'

  // When the row is unpaid, finance can choose between recording the
  // standard 50% partial or collecting the full 100% in one shot. When
  // already partial, the only forward move is to paid.
  const [payMode, setPayMode] = useState<'partial' | 'full'>('partial')

  const nextTransition: 'partial' | 'paid' | null = isTerminal
    ? null
    : paymentStatus === 'partial'
      ? 'paid'
      : payMode === 'full'
        ? 'paid'
        : 'partial'

  const totalDue = row?.totalDue ?? 0
  const remainingDue = row?.remainingDue ?? 0
  const amountThisStep =
    paymentStatus === 'unpaid' && payMode === 'partial'
      ? Math.round(totalDue * 0.5 * 100) / 100
      : paymentStatus === 'unpaid' && payMode === 'full'
        ? totalDue
        : nextTransition === 'paid'
          ? remainingDue
          : 0

  const [stage, setStage] = useState<Stage>('preview')
  const [proofFilename, setProofFilename] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [cancelNote, setCancelNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset form each time the panel opens on a new row.
  useEffect(() => {
    if (!isOpen) return
    setStage('preview')
    setProofFilename('')
    setCancelReason('')
    setCancelNote('')
    setError(null)
    setPayMode('partial')
  }, [isOpen, orderId, dealId])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!mode || !nextTransition) throw new Error('Nothing to record')
      if (!proofFilename.trim()) throw new Error('Proof of payment required')
      if (mode === 'order' && orderId) {
        const fn =
          nextTransition === 'partial'
            ? recordOrderPartialPayment
            : recordOrderFullPayment
        return fn({ data: { quoteId: orderId, proofUrl: proofFilename.trim() } })
      }
      if (mode === 'deal' && dealId) {
        const fn =
          nextTransition === 'partial'
            ? recordDealPartialPayment
            : recordDealFullPayment
        return fn({ data: { dealId: dealId, proofUrl: proofFilename.trim() } })
      }
      throw new Error('Invalid target')
    },
    onSuccess: (res) => {
      if (!res.success) {
        setError(res.error)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['finance-inbox'] })
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
      queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!mode) throw new Error('Nothing to cancel')
      if (!cancelReason.trim() || cancelReason.trim().length < 3) {
        throw new Error('Reason is required (min 3 characters)')
      }
      if (mode === 'order' && orderId) {
        return cancelOrderFromFinance({
          data: { quoteId: orderId, reason: cancelReason.trim(), note: cancelNote.trim() || undefined },
        })
      }
      if (mode === 'deal' && dealId) {
        return cancelDealFromFinance({
          data: { dealId: dealId, reason: cancelReason.trim(), note: cancelNote.trim() || undefined },
        })
      }
      throw new Error('Invalid target')
    },
    onSuccess: (res) => {
      if (!res.success) {
        setError(res.error)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['finance-inbox'] })
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
      queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  const proofOk = proofFilename.trim().length > 0
  const cancelReasonOk = cancelReason.trim().length >= 3

  const handleAdvance = () => {
    if (stage === 'preview') {
      if (!proofOk) return
      setStage('confirm')
      return
    }
    if (stage === 'confirm') {
      mutation.mutate()
    }
  }

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      scope="finance"
      maxWidth={540}
      panelKey="finance-payment-panel"
      ariaLabel="Finance payment recorder"
    >
      {row ? (
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="flex items-start justify-between gap-4 border-b border-black/[0.06] px-6 py-5 dark:border-white/[0.08]">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {mode === 'order' ? (
                  <Building2
                    size={12}
                    strokeWidth={2}
                    className="text-[var(--color-text-subtle)]"
                  />
                ) : (
                  <Truck
                    size={12}
                    strokeWidth={2}
                    className="text-[var(--color-text-subtle)]"
                  />
                )}
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                  {mode === 'order' ? 'Customer payment · money in' : 'Supplier payment · money out'}
                </span>
              </div>
              <h2 className="mt-1.5 truncate text-[15px] font-semibold text-[var(--color-text)]">
                {mode === 'order'
                  ? (order?.customerName ?? '')
                  : (deal?.supplierName ?? '')}
              </h2>
              <p className="truncate font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
                {mode === 'order'
                  ? `${order?.quoteNumber}${order?.customerPoNumber ? ` · ${order.customerPoNumber}` : ''}`
                  : `${deal?.dealId} · ${deal?.itemCount ?? 0} item${(deal?.itemCount ?? 0) !== 1 ? 's' : ''}`}
              </p>
            </div>
            <Button
              onPress={onClose}
              className="rounded-md p-1 text-[var(--color-text-subtle)] outline-none hover:text-[var(--color-text)] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
            >
              <X size={16} strokeWidth={2} />
            </Button>
          </header>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Totals grid */}
            <div className="grid grid-cols-3 gap-3 border-b border-black/[0.04] pb-5 dark:border-white/[0.04]">
              <Totals label="Total due" value={totalDue} tone="neutral" />
              <Totals label="Paid" value={row.amountPaid} tone="emerald" />
              <Totals label="Remaining" value={remainingDue} tone="amber" />
            </div>

            {/* Deal line items — finance must confirm every product
                before releasing money. Only shown for supplier deals;
                customer orders show their items elsewhere. */}
            {mode === 'deal' && deal && deal.items.length > 0 && (
              <div className="mt-5 border-b border-black/[0.04] pb-5 dark:border-white/[0.04]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
                  Order lines · {deal.itemCount}
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {deal.items.map((it) => (
                    <div
                      key={it.productSlug}
                      className="flex items-center justify-between gap-3 rounded-md border border-black/[0.06] px-3 py-2 dark:border-white/[0.08]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-[var(--color-text)]">
                          {it.productName}
                        </p>
                        <p className="truncate font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
                          {it.sku} · {it.agreedQty} {it.unit} × {formatEgp(it.agreedRawCost)}
                        </p>
                      </div>
                      <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold tabular-nums text-[var(--color-text)]">
                        {formatEgp(it.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status banner */}
            {isTerminal ? (
              <div className="mt-5 rounded-lg bg-emerald-500/[0.08] px-4 py-3 text-[12px] text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/[0.15]">
                <div className="flex items-center gap-2 font-semibold">
                  <Check size={13} strokeWidth={2.5} /> Settled in full
                </div>
                {row.fullPaidAt && (
                  <p className="mt-1 text-[10px] opacity-80">
                    Paid {new Date(row.fullPaidAt).toLocaleString('en-EG')}
                  </p>
                )}
                {row.fullProofUrl && (
                  <p className="mt-1 truncate font-[family-name:var(--font-geist-mono)] text-[10px] opacity-80">
                    Proof: {row.fullProofUrl}
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Partial vs full toggle — only when the row is still
                    unpaid. Once it's partial, the only forward move is
                    collecting the remaining 50%. */}
                {paymentStatus === 'unpaid' && stage === 'preview' && (
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayMode('partial')}
                      className={`rounded-lg px-3 py-3 text-start ring-1 transition-all ${
                        payMode === 'partial'
                          ? 'bg-[var(--color-primary)]/[0.08] ring-[var(--color-primary)]/[0.35]'
                          : 'ring-black/[0.08] hover:bg-black/[0.02] dark:ring-white/[0.08] dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
                        Partial · 50%
                      </div>
                      <div className="mt-1 font-[family-name:var(--font-geist-mono)] text-[14px] font-semibold tabular-nums text-[var(--color-text)]">
                        {formatEgp(Math.round(totalDue * 0.5 * 100) / 100)}
                      </div>
                      <div className="mt-0.5 text-[9px] text-[var(--color-text-subtle)]">
                        Collect now, chase the rest later
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMode('full')}
                      className={`rounded-lg px-3 py-3 text-start ring-1 transition-all ${
                        payMode === 'full'
                          ? 'bg-emerald-500/[0.08] ring-emerald-500/[0.35]'
                          : 'ring-black/[0.08] hover:bg-black/[0.02] dark:ring-white/[0.08] dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
                        Full · 100%
                      </div>
                      <div className="mt-1 font-[family-name:var(--font-geist-mono)] text-[14px] font-semibold tabular-nums text-[var(--color-text)]">
                        {formatEgp(totalDue)}
                      </div>
                      <div className="mt-0.5 text-[9px] text-[var(--color-text-subtle)]">
                        Settle in one shot
                      </div>
                    </button>
                  </div>
                )}

                <div className="mt-5 rounded-lg bg-[var(--color-primary)]/[0.08] px-4 py-4 ring-1 ring-[var(--color-primary)]/[0.15]">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                    <Wallet size={12} strokeWidth={2.5} />
                    {paymentStatus === 'unpaid' && payMode === 'full'
                      ? '100% due now'
                      : nextTransition === 'partial'
                        ? '50% due now'
                        : 'Remaining 50% due now'}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-[family-name:var(--font-geist-mono)] text-[28px] font-semibold tabular-nums text-[var(--color-text)]">
                      {formatEgp(amountThisStep)}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                      EGP
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--color-text-subtle)]">
                    {paymentStatus === 'unpaid' && payMode === 'full'
                      ? 'Full settlement — the order skips the partial stage.'
                      : 'Fixed split — no manual amounts.'}
                  </p>
                </div>
              </>
            )}

            {/* Existing partial record if applicable */}
            {paymentStatus === 'partial' && row.partialProofUrl && (
              <div className="mt-4 rounded-lg border border-black/[0.06] px-3 py-2 dark:border-white/[0.08]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
                  Previous partial
                </p>
                <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text)]">
                  {formatEgp(row.amountPaid)} EGP ·{' '}
                  {row.partialPaidAt
                    ? new Date(row.partialPaidAt).toLocaleDateString('en-EG')
                    : '—'}
                </p>
                <p className="mt-0.5 truncate font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)]">
                  Proof: {row.partialProofUrl}
                </p>
              </div>
            )}

            {/* Proof input — stage 1 */}
            {!isTerminal && stage === 'preview' && (
              <div className="mt-5">
                <label
                  htmlFor="proof-filename"
                  className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]"
                >
                  <Paperclip size={11} strokeWidth={2} />
                  Proof of payment filename
                </label>
                <input
                  id="proof-filename"
                  type="text"
                  value={proofFilename}
                  onChange={(e) => setProofFilename(e.target.value)}
                  placeholder="e.g. nbe-transfer-2026-04-15.pdf"
                  className="mt-2 w-full rounded-md border border-black/[0.08] bg-transparent px-3 py-2 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]/60 dark:border-white/[0.1]"
                />
                <p className="mt-1.5 flex items-start gap-1.5 text-[10px] text-[var(--color-text-subtle)]">
                  <ShieldAlert
                    size={11}
                    strokeWidth={2}
                    className="mt-[1px] shrink-0 text-amber-600 dark:text-amber-400"
                  />
                  Required · cannot commit a payment without a reference file
                  attached.
                </p>
              </div>
            )}

            {/* Cancel stage — reason + optional note */}
            {!isTerminal && stage === 'cancel' && (
              <div className="mt-5 rounded-lg border border-red-500/[0.2] bg-red-500/[0.04] px-4 py-4">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-700 dark:text-red-300">
                  <Ban size={11} strokeWidth={2.5} />
                  Cancel {mode === 'order' ? 'order' : 'deal'}
                </p>
                <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                  This walks the record to <strong>declined</strong>, stamps
                  the report, and releases any reserved stock. Irreversible.
                </p>
                <div className="mt-3">
                  <label
                    htmlFor="cancel-reason"
                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]"
                  >
                    Reason
                  </label>
                  <input
                    id="cancel-reason"
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. customer withdrew, duplicate order"
                    className="mt-1 w-full rounded-md border border-black/[0.08] bg-transparent px-3 py-2 text-[13px] text-[var(--color-text)] outline-none focus:border-red-500/60 dark:border-white/[0.1]"
                  />
                </div>
                <div className="mt-3">
                  <label
                    htmlFor="cancel-note"
                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]"
                  >
                    Note (optional)
                  </label>
                  <input
                    id="cancel-note"
                    type="text"
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                    placeholder="Additional context for the audit trail"
                    className="mt-1 w-full rounded-md border border-black/[0.08] bg-transparent px-3 py-2 text-[13px] text-[var(--color-text)] outline-none focus:border-red-500/60 dark:border-white/[0.1]"
                  />
                </div>
              </div>
            )}

            {/* Stage 2 — review */}
            {!isTerminal && stage === 'confirm' && (
              <div className="mt-5 rounded-lg border border-[var(--color-primary)]/[0.2] bg-[var(--color-primary)]/[0.04] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                  Review & commit
                </p>
                <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-[11px]">
                  <dt className="text-[var(--color-text-subtle)]">Amount</dt>
                  <dd className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
                    {formatEgp(amountThisStep)} EGP
                  </dd>
                  <dt className="text-[var(--color-text-subtle)]">Moves to</dt>
                  <dd className="font-semibold text-[var(--color-text)]">
                    {nextTransition}
                  </dd>
                  <dt className="text-[var(--color-text-subtle)]">Proof</dt>
                  <dd className="truncate font-[family-name:var(--font-geist-mono)] text-[var(--color-text)]">
                    {proofFilename.trim()}
                  </dd>
                </dl>
                <p className="mt-3 text-[10px] text-[var(--color-text-subtle)]">
                  Transitions can't be reversed. Verify the amount and the
                  proof filename before committing.
                </p>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-md bg-red-500/[0.08] px-3 py-2 text-[11px] text-red-700 dark:text-red-300 ring-1 ring-red-500/[0.15]">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          {!isTerminal && (
            <footer className="shrink-0 border-t border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
              {stage === 'cancel' ? (
                <div className="flex items-center gap-2">
                  <Button
                    onPress={() => {
                      setStage('preview')
                      setError(null)
                    }}
                    className="rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] outline-none hover:text-[var(--color-text)] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
                  >
                    Back
                  </Button>
                  <Button
                    onPress={() => cancelMutation.mutate()}
                    isDisabled={!cancelReasonOk || cancelMutation.isPending}
                    className="flex-1 rounded-md bg-red-600 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-white outline-none transition-opacity hover:opacity-90 data-[disabled]:opacity-40 data-[focus-visible]:ring-2 data-[focus-visible]:ring-red-500/40"
                  >
                    {cancelMutation.isPending
                      ? 'Canceling…'
                      : `Confirm cancel`}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {stage === 'preview' && (
                    <Button
                      onPress={() => {
                        setStage('cancel')
                        setError(null)
                      }}
                      className="rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-red-700 outline-none hover:bg-red-500/[0.08] dark:text-red-300 data-[focus-visible]:ring-2 data-[focus-visible]:ring-red-500/40"
                    >
                      Cancel order
                    </Button>
                  )}
                  {stage === 'confirm' && (
                    <Button
                      onPress={() => setStage('preview')}
                      className="rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] outline-none hover:text-[var(--color-text)] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    onPress={handleAdvance}
                    isDisabled={!proofOk || mutation.isPending}
                    className="flex-1 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-white outline-none transition-opacity hover:opacity-90 data-[disabled]:opacity-40 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
                  >
                    {mutation.isPending
                      ? 'Recording…'
                      : stage === 'preview'
                        ? 'Review payment'
                        : `Commit ${formatEgp(amountThisStep)} EGP`}
                  </Button>
                </div>
              )}
            </footer>
          )}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-[12px] text-[var(--color-text-subtle)]">
          Loading…
        </div>
      )}
    </SlidePanel>
  )
}

function Totals({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'neutral' | 'emerald' | 'amber'
}) {
  const color = {
    neutral: 'text-[var(--color-text)]',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-700 dark:text-amber-400',
  }[tone]
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
        {label}
      </span>
      <span
        className={`font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums ${color}`}
      >
        {formatEgp(value)}
        <span className="ms-1 text-[9px] font-normal uppercase tracking-wider text-[var(--color-text-subtle)]">
          EGP
        </span>
      </span>
    </div>
  )
}
