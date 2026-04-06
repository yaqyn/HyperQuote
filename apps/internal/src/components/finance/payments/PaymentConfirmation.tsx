import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { useFinanceStore } from '../../../stores/finance'
import { CurrencyCell } from '../shared/CurrencyCell'
import { recordPayment } from '../../../lib/server/finance-payments'
import type { PaymentMethod } from '../../../types/finance'

interface AllocationSummary {
  invoiceNumber: string
  amount: number
}

// Mock data for confirmation display (in production, passed from previous steps via store/context)
function getMockConfirmationData(method: PaymentMethod | undefined) {
  const base = {
    amount: 247_500,
    date: '2025-06-10',
    allocations: [
      { invoiceNumber: 'INV-2025-0001', amount: 85_000 },
      { invoiceNumber: 'INV-2025-0002', amount: 120_000 },
      { invoiceNumber: 'INV-2025-0003', amount: 42_500 },
    ] as AllocationSummary[],
    totalApplied: 247_500,
    remaining: 0,
  }

  switch (method) {
    case 'wire':
      return { ...base, reference: 'TRF-2025-78456', label: 'Bank Reference' }
    case 'cheque':
      return { ...base, reference: 'CHQ-456789', label: 'Cheque Number' }
    case 'lc':
      return { ...base, reference: 'LC-2025-001', label: 'LC Number' }
    case 'cash':
      return { ...base, reference: 'RCP-2025-0042', label: 'Receipt Number', receivedBy: 'Ahmed Hassan' }
    default:
      return { ...base, reference: '-', label: 'Reference' }
  }
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  wire: 'Wire Transfer',
  cheque: 'Cheque',
  lc: 'Letter of Credit',
  cash: 'Cash',
}

/**
 * Step 4: Payment confirmation.
 * Shows summary card with method, amount, reference, allocated invoices.
 * Confirm calls recordPayment server function. On success: shows receipt link, resets flow.
 */
export function PaymentConfirmation() {
  const { t } = useTranslation('finance')
  const paymentFlow = useFinanceStore((s) => s.paymentFlow)
  const resetPaymentFlow = useFinanceStore((s) => s.resetPaymentFlow)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)

  const data = getMockConfirmationData(paymentFlow.method)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      const result = await recordPayment({
        data: {
          invoiceId: 'inv-001',
          amount: data.amount,
          method: paymentFlow.method ?? 'wire',
          reference: data.reference,
          date: data.date,
          bankAccount: 'main-account',
        },
      })
      setPaymentId(result.paymentId)
      setIsSuccess(true)
    } catch {
      // Error handling deferred to production integration
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDone = () => {
    resetPaymentFlow()
  }

  if (isSuccess) {
    return (
      <div className="p-6 flex flex-col items-center gap-6">
        {/* Success state */}
        <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-8 text-green-600">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-semibold mb-1">
            {t('payments.paymentRecorded', 'Payment Recorded Successfully')}
          </h2>
          <p className="text-sm text-black/50 dark:text-white/50">
            {t('payments.receiptGenerated', 'Payment receipt generated')}
          </p>
          {paymentId && (
            <p className="text-xs font-[family-name:var(--font-geist-mono)] tabular-nums text-black/40 dark:text-white/40 mt-1">
              ID: {paymentId}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onPress={() => {/* PDF view deferred */}}
            className="rounded-lg border border-[#2563EB]/30 text-[#2563EB] px-4 py-2 text-sm font-medium hover:bg-[#2563EB]/5 pressed:bg-[#2563EB]/10 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            {t('payments.viewReceiptPDF', 'View Receipt PDF')}
          </Button>
          <Button
            onPress={handleDone}
            className="rounded-lg bg-black dark:bg-white text-white dark:text-black px-6 py-2 text-sm font-medium hover:opacity-90 pressed:opacity-80 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            {t('payments.done', 'Done')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">
        {t('payments.confirmPayment', 'Confirm Payment')}
      </h2>

      {/* Summary card */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t('payments.method', 'Payment Method')}
            </div>
            <div className="font-medium">
              {paymentFlow.method ? METHOD_LABELS[paymentFlow.method] : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t('payments.amount', 'Amount')}
            </div>
            <CurrencyCell amount={data.amount} className="text-lg font-semibold" />
          </div>
          <div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {data.label}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {data.reference}
            </div>
          </div>
          <div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t('payments.date', 'Date')}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {data.date}
            </div>
          </div>
          {/* Cash-specific: Received by */}
          {paymentFlow.method === 'cash' && 'receivedBy' in data && (
            <div className="col-span-2">
              <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                {t('payments.receivedBy', 'Received By')}
              </div>
              <div className="font-medium">{data.receivedBy}</div>
            </div>
          )}
        </div>
      </div>

      {/* Allocated invoices */}
      <div>
        <h3 className="text-sm font-medium mb-3">
          {t('payments.allocatedInvoices', 'Allocated Invoices')}
        </h3>
        <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <th className="p-3 text-start font-medium text-black/50 dark:text-white/50">
                  {t('payments.invoiceNumber', 'Invoice #')}
                </th>
                <th className="p-3 text-end font-medium text-black/50 dark:text-white/50">
                  {t('payments.amount', 'Amount')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.allocations.map((alloc) => (
                <tr key={alloc.invoiceNumber} className="border-b border-black/5 dark:border-white/5">
                  <td className="p-3 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {alloc.invoiceNumber}
                  </td>
                  <td className="p-3 text-end">
                    <CurrencyCell amount={alloc.amount} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <td className="p-3 font-medium">
                  {t('payments.totalApplied', 'Total Applied')}
                </td>
                <td className="p-3 text-end">
                  <CurrencyCell amount={data.totalApplied} className="font-semibold" />
                </td>
              </tr>
              {data.remaining > 0 && (
                <tr>
                  <td className="p-3 text-yellow-600 font-medium">
                    {t('payments.remaining', 'Remaining')}
                  </td>
                  <td className="p-3 text-end">
                    <CurrencyCell amount={data.remaining} className="font-semibold text-yellow-600" />
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* Confirm button */}
      <div className="flex justify-end">
        <Button
          onPress={handleConfirm}
          isDisabled={isSubmitting}
          className="rounded-lg bg-[#2563EB] text-white px-6 py-2.5 text-sm font-medium hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
        >
          {isSubmitting
            ? t('payments.processing', 'Processing...')
            : t('payments.confirmPaymentBtn', 'Confirm Payment')}
        </Button>
      </div>
    </div>
  )
}
