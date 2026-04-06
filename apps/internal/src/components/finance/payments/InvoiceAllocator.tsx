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
 * Step 3: Invoice allocation with running balance.
 * Shared across all 4 payment methods.
 * Supports auto-allocate FIFO, manual allocation, partial allocation, overpayment handling.
 */
export function InvoiceAllocator() {
  const { t } = useTranslation('finance')
  const setPaymentFlowStep = useFinanceStore((s) => s.setPaymentFlowStep)

  // Mock payment amount (in real app, comes from previous step's form data via store or context)
  const paymentAmount = 247_500

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
      // Partial allocation
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

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      sent: t('payments.invoiceStatus.sent', 'Sent'),
      overdue: t('payments.invoiceStatus.overdue', 'Overdue'),
      viewed: t('payments.invoiceStatus.viewed', 'Viewed'),
      partially_paid: t('payments.invoiceStatus.partiallyPaid', 'Partially Paid'),
    }
    return map[status] ?? status
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">
        {t('payments.allocateToInvoices', 'Allocate to Invoices')}
      </h2>

      {/* Running balance bar (sticky) */}
      <div
        className={`sticky top-0 z-10 rounded-xl border p-4 backdrop-blur-sm ${
          remaining === 0
            ? 'border-green-500/30 bg-green-500/10'
            : remaining > 0
              ? 'border-yellow-500/30 bg-yellow-500/10'
              : 'border-red-500/30 bg-red-500/10'
        }`}
      >
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-black/50 dark:text-white/50">
              {t('payments.paymentAmount', 'Payment Amount')}:
            </span>
            <CurrencyCell amount={paymentAmount} className="font-medium" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-black/50 dark:text-white/50">&mdash;</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-black/50 dark:text-white/50">
              {t('payments.applied', 'Applied')}:
            </span>
            <CurrencyCell amount={appliedAmount} className="font-medium" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-black/50 dark:text-white/50">=</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-black/50 dark:text-white/50">
              {t('payments.remaining', 'Remaining')}:
            </span>
            <CurrencyCell
              amount={Math.abs(remaining)}
              className={`font-semibold ${remaining === 0 ? 'text-green-600' : remaining > 0 ? 'text-yellow-600' : 'text-red-600'}`}
            />
          </div>
        </div>
      </div>

      {/* Auto-allocate button */}
      <div>
        <Button
          onPress={handleAutoAllocateFIFO}
          className="rounded-lg border border-[#2563EB]/30 text-[#2563EB] px-4 py-2 text-sm font-medium hover:bg-[#2563EB]/5 pressed:bg-[#2563EB]/10 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
        >
          {t('payments.autoAllocateFIFO', 'Auto-allocate FIFO')}
        </Button>
      </div>

      {/* Invoice list */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              <th className="p-3 text-start w-10" />
              <th className="p-3 text-start font-medium text-black/50 dark:text-white/50">
                {t('payments.invoiceNumber', 'Invoice #')}
              </th>
              <th className="p-3 text-end font-medium text-black/50 dark:text-white/50">
                {t('payments.amount', 'Amount')}
              </th>
              <th className="p-3 text-start font-medium text-black/50 dark:text-white/50">
                {t('payments.dueDate', 'Due Date')}
              </th>
              <th className="p-3 text-start font-medium text-black/50 dark:text-white/50">
                {t('payments.status', 'Status')}
              </th>
              <th className="p-3 text-end font-medium text-black/50 dark:text-white/50">
                {t('payments.allocated', 'Allocated')}
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ALLOCATABLE_INVOICES.map((inv) => {
              const allocated = isAllocated(inv.id)
              const allocation = allocations.find((a) => a.invoiceId === inv.id)
              return (
                <tr
                  key={inv.id}
                  className={`border-b border-black/5 dark:border-white/5 transition-colors cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ${
                    allocated ? 'bg-[#2563EB]/5' : ''
                  }`}
                  onClick={() => toggleInvoice(inv)}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={allocated}
                      onChange={() => toggleInvoice(inv)}
                      className="size-4 rounded border-black/20 dark:border-white/20 accent-[#2563EB]"
                    />
                  </td>
                  <td className="p-3 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {inv.number}
                  </td>
                  <td className="p-3 text-end">
                    <CurrencyCell amount={inv.grandTotal} />
                  </td>
                  <td className="p-3 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {inv.dueDate}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      inv.status === 'overdue'
                        ? 'bg-red-500/10 text-red-600'
                        : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60'
                    }`}>
                      {statusLabel(inv.status)}
                    </span>
                  </td>
                  <td className="p-3 text-end">
                    {allocation ? (
                      allocation.isPartial ? (
                        <input
                          type="number"
                          value={partialAmounts[inv.id] ?? allocation.amount}
                          onChange={(e) =>
                            handleUpdatePartialAmount(inv.id, Number(e.target.value))
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="w-28 rounded border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-end text-sm font-[family-name:var(--font-geist-mono)] tabular-nums outline-none focus:border-[#2563EB]"
                        />
                      ) : (
                        <CurrencyCell amount={allocation.amount} />
                      )
                    ) : (
                      <span className="text-black/20 dark:text-white/20">&mdash;</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Overpayment handling */}
      {remaining < 0 && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
          <div className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
            {t('payments.overpayment', 'Overpayment Detected')}
          </div>
          <div className="flex gap-3">
            {(
              [
                { key: 'next_invoice' as const, label: t('payments.applyToNext', 'Apply to Next Invoice') },
                { key: 'hold_credit' as const, label: t('payments.holdAsCredit', 'Hold as Credit') },
                { key: 'refund' as const, label: t('payments.initiateRefund', 'Initiate Refund') },
              ] as const
            ).map((option) => (
              <Button
                key={option.key}
                onPress={() => setOverpaymentAction(option.key)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${
                  overpaymentAction === option.key
                    ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]'
                    : 'border-black/10 dark:border-white/10 hover:border-[#2563EB]/30'
                }`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Proceed */}
      <div className="flex justify-end">
        <Button
          onPress={handleProceed}
          isDisabled={allocations.length === 0}
          className="rounded-lg bg-black dark:bg-white text-white dark:text-black px-6 py-2 text-sm font-medium hover:opacity-90 pressed:opacity-80 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
        >
          {t('payments.nextConfirm', 'Next: Confirm Payment')}
        </Button>
      </div>
    </div>
  )
}
