import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { useFinanceStore } from '../../../stores/finance'
import { CurrencyCell } from '../shared/CurrencyCell'
import type { Invoice } from '../../../types/finance'

// Mock invoices for allocation (will be replaced by server query)
const MOCK_ALLOCATABLE_INVOICES: Invoice[] = [
  {
    id: 'inv-001', number: 'INV-2025-0001', orderId: 'ord-001', customerId: 'cust-001',
    customerName: 'Cairo Construction Co.', status: 'overdue', etaStatus: 'accepted',
    items: [], subtotal: 85_000, vatAmount: 11_900, grandTotal: 85_000,
    dueDate: '2025-04-01', issuedDate: '2025-03-01', currency: 'EGP',
    sellerTRN: '123456789', buyerTRN: '987654321', digitalSignatureId: null,
    pdfUrl: null, creditNoteIds: [],
  },
  {
    id: 'inv-002', number: 'INV-2025-0002', orderId: 'ord-002', customerId: 'cust-001',
    customerName: 'Cairo Construction Co.', status: 'sent', etaStatus: 'accepted',
    items: [], subtotal: 120_000, vatAmount: 16_800, grandTotal: 120_000,
    dueDate: '2025-05-15', issuedDate: '2025-04-15', currency: 'EGP',
    sellerTRN: '123456789', buyerTRN: '987654321', digitalSignatureId: null,
    pdfUrl: null, creditNoteIds: [],
  },
  {
    id: 'inv-003', number: 'INV-2025-0003', orderId: 'ord-003', customerId: 'cust-001',
    customerName: 'Cairo Construction Co.', status: 'sent', etaStatus: 'accepted',
    items: [], subtotal: 75_000, vatAmount: 10_500, grandTotal: 75_000,
    dueDate: '2025-06-01', issuedDate: '2025-05-01', currency: 'EGP',
    sellerTRN: '123456789', buyerTRN: '987654321', digitalSignatureId: null,
    pdfUrl: null, creditNoteIds: [],
  },
]

interface AllocationEntry {
  invoiceId: string
  amount: number
  isPartial: boolean
}

type OverpaymentAction = 'next_invoice' | 'hold_credit' | 'refund'

/**
 * Invoice allocator — checkable list with remaining balance.
 * Auto-allocate button. Running total at bottom (mono, live-updating).
 * Dense, Bloomberg-style allocation grid.
 */
export function InvoiceAllocator() {
  const { t } = useTranslation('finance')
  const setPaymentFlowStep = useFinanceStore((s) => s.setPaymentFlowStep)
  const paymentAmount = useFinanceStore((s) => s.paymentFlow.amount) ?? 0

  const [allocations, setAllocations] = useState<AllocationEntry[]>([])
  const [partialAmounts, setPartialAmounts] = useState<Record<string, number>>({})
  const [overpaymentAction, setOverpaymentAction] = useState<OverpaymentAction | null>(null)

  const appliedAmount = useMemo(
    () => allocations.reduce((sum, a) => sum + a.amount, 0),
    [allocations],
  )

  const remaining = paymentAmount - appliedAmount

  const isAllocated = useCallback(
    (invoiceId: string) => allocations.some((a) => a.invoiceId === invoiceId),
    [allocations],
  )

  const toggleInvoice = (invoice: Invoice) => {
    if (isAllocated(invoice.id)) {
      setAllocations((prev) => prev.filter((a) => a.invoiceId !== invoice.id))
      return
    }

    const currentRemaining = paymentAmount - allocations.reduce((s, a) => s + a.amount, 0)
    if (currentRemaining <= 0) return

    if (invoice.grandTotal <= currentRemaining) {
      setAllocations((prev) => [
        ...prev,
        { invoiceId: invoice.id, amount: invoice.grandTotal, isPartial: false },
      ])
    } else {
      setAllocations((prev) => [
        ...prev,
        { invoiceId: invoice.id, amount: currentRemaining, isPartial: true },
      ])
      setPartialAmounts((prev) => ({ ...prev, [invoice.id]: currentRemaining }))
    }
  }

  const handleAutoAllocateFIFO = () => {
    const sorted = [...MOCK_ALLOCATABLE_INVOICES].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )

    let budget = paymentAmount
    const newAllocations: AllocationEntry[] = []
    const newPartials: Record<string, number> = {}

    for (const inv of sorted) {
      if (budget <= 0) break
      if (inv.grandTotal <= budget) {
        newAllocations.push({ invoiceId: inv.id, amount: inv.grandTotal, isPartial: false })
        budget -= inv.grandTotal
      } else {
        newAllocations.push({ invoiceId: inv.id, amount: budget, isPartial: true })
        newPartials[inv.id] = budget
        budget = 0
      }
    }

    setAllocations(newAllocations)
    setPartialAmounts(newPartials)
  }

  const handleUpdatePartialAmount = (invoiceId: string, newAmount: number) => {
    setPartialAmounts((prev) => ({ ...prev, [invoiceId]: newAmount }))
    setAllocations((prev) =>
      prev.map((a) =>
        a.invoiceId === invoiceId ? { ...a, amount: newAmount } : a,
      ),
    )
  }

  const handleProceed = () => {
    setPaymentFlowStep('confirm')
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-black dark:text-white">
          {t('payments.allocateToInvoices', 'Allocate to Invoices')}
        </h2>
        <Button
          onPress={handleAutoAllocateFIFO}
          className="rounded-md border border-[#2563EB]/20 text-[#2563EB] px-3 py-1.5 text-[10px] font-medium hover:bg-[#2563EB]/5 pressed:bg-[#2563EB]/10 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-colors"
        >
          {t('payments.autoAllocateFIFO', 'Auto-allocate FIFO')}
        </Button>
      </div>

      {/* Running balance — sticky, live-updating mono display */}
      <div className="sticky top-0 z-10 flex items-center justify-between py-3 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80">
        <div className="flex items-center gap-5 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
          <span className="text-black/40 dark:text-white/40">
            {t('payments.paymentAmount', 'Payment')}
          </span>
          <CurrencyCell amount={paymentAmount} className="text-sm text-black dark:text-white" />
          <span className="text-black/15 dark:text-white/15">-</span>
          <span className="text-black/40 dark:text-white/40">
            {t('payments.applied', 'Applied')}
          </span>
          <CurrencyCell amount={appliedAmount} className="text-sm text-black dark:text-white" />
          <span className="text-black/15 dark:text-white/15">=</span>
        </div>
        <CurrencyCell
          amount={Math.abs(remaining)}
          className={`text-lg font-semibold ${
            remaining === 0
              ? 'text-green-600 dark:text-green-400'
              : remaining > 0
                ? 'text-black dark:text-white'
                : 'text-red-600 dark:text-red-400'
          }`}
        />
      </div>

      {/* Invoice list — checkable rows */}
      <div className="flex flex-col">
        {MOCK_ALLOCATABLE_INVOICES.map((inv) => {
          const allocated = isAllocated(inv.id)
          const allocation = allocations.find((a) => a.invoiceId === inv.id)
          const isOverdue = inv.status === 'overdue'

          return (
            <button
              key={inv.id}
              type="button"
              onClick={() => toggleInvoice(inv)}
              className={`flex items-center gap-0 w-full px-0 py-3 border-b border-black/[0.04] dark:border-white/[0.04] text-start transition-colors cursor-pointer ${
                allocated ? 'bg-[#2563EB]/[0.02]' : ''
              } hover:bg-black/[0.02] dark:hover:bg-white/[0.02]`}
            >
              {/* Checkbox */}
              <div className="w-8 flex-shrink-0 flex items-center justify-center">
                <div className={`size-3.5 rounded-sm border transition-colors ${
                  allocated
                    ? 'bg-[#2563EB] border-[#2563EB]'
                    : 'border-black/20 dark:border-white/20'
                }`}>
                  {allocated && (
                    <svg viewBox="0 0 12 12" fill="none" className="size-3.5 text-white">
                      <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Invoice number */}
              <span className="w-36 flex-shrink-0 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black dark:text-white">
                {inv.number}
              </span>

              {/* Due date */}
              <span className="w-24 flex-shrink-0 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
                {inv.dueDate}
              </span>

              {/* Status dot */}
              <div className="w-16 flex-shrink-0">
                {isOverdue && (
                  <span className="text-[10px] text-red-500 font-medium">
                    {t('payments.invoiceStatus.overdue', 'Overdue')}
                  </span>
                )}
              </div>

              {/* Invoice amount */}
              <CurrencyCell
                amount={inv.grandTotal}
                className="flex-1 text-xs text-black/60 dark:text-white/60 justify-end"
              />

              {/* Allocated amount */}
              <div className="w-32 flex-shrink-0 flex justify-end" onClick={(e) => e.stopPropagation()}>
                {allocation ? (
                  allocation.isPartial ? (
                    <input
                      type="number"
                      value={partialAmounts[inv.id] ?? allocation.amount}
                      onChange={(e) =>
                        handleUpdatePartialAmount(inv.id, Number(e.target.value))
                      }
                      className="w-24 rounded-md border border-[#2563EB]/20 bg-transparent px-2 py-1 text-end text-xs font-[family-name:var(--font-geist-mono)] tabular-nums text-[#2563EB] outline-none focus:border-[#2563EB]"
                    />
                  ) : (
                    <CurrencyCell amount={allocation.amount} className="text-xs font-medium text-[#2563EB]" />
                  )
                ) : (
                  <span className="text-black/10 dark:text-white/10 text-xs">--</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Overpayment handling */}
      {remaining < 0 && (
        <div className="flex items-center gap-3 py-3 border-t border-black/[0.04] dark:border-white/[0.04]">
          <span className="text-[10px] text-red-500 font-medium me-2">
            {t('payments.overpayment', 'Overpayment')}
          </span>
          {(
            [
              { key: 'next_invoice' as const, label: t('payments.applyToNext', 'Next Invoice') },
              { key: 'hold_credit' as const, label: t('payments.holdAsCredit', 'Hold Credit') },
              { key: 'refund' as const, label: t('payments.initiateRefund', 'Refund') },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setOverpaymentAction(option.key)}
              className={`rounded-md px-3 py-1 text-[10px] font-medium transition-all ${
                overpaymentAction === option.key
                  ? 'bg-[#2563EB] text-white'
                  : 'border border-black/10 dark:border-white/10 text-black/50 dark:text-white/50 hover:border-[#2563EB]/30'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Proceed */}
      <div className="flex justify-end pt-4">
        <Button
          onPress={handleProceed}
          isDisabled={allocations.length === 0}
          className="rounded-md bg-black dark:bg-white text-white dark:text-black px-5 py-2 text-xs font-medium hover:opacity-90 pressed:opacity-80 disabled:opacity-20 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-opacity"
        >
          {t('payments.nextConfirm', 'Next: Confirm')}
        </Button>
      </div>
    </div>
  )
}
