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
      return { ...base, reference: 'RCP-2025-0042', label: 'Receipt Number' }
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
 * Payment confirmation — summary with all details.
 * Big "Confirm" button, cancel as text link.
 * On success: receipt link + done.
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
      <div className="p-6 flex flex-col items-center gap-5 py-16">
        <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5 text-green-600">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="text-center">
          <h2 className="text-sm font-semibold text-black dark:text-white mb-1">
            {t('payments.paymentRecorded', 'Payment Recorded')}
          </h2>
          {paymentId && (
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/30 dark:text-white/30">
              {paymentId}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {/* PDF view deferred */}}
            className="text-xs text-[#2563EB] hover:underline underline-offset-2"
          >
            {t('payments.viewReceiptPDF', 'View Receipt')}
          </button>
          <Button
            onPress={handleDone}
            className="rounded-md bg-black dark:bg-white text-white dark:text-black px-5 py-2 text-xs font-medium hover:opacity-90 pressed:opacity-80 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-opacity"
          >
            {t('payments.done', 'Done')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-5">
      <h2 className="text-sm font-semibold text-black dark:text-white">
        {t('payments.confirmPayment', 'Confirm Payment')}
      </h2>

      {/* Summary — document-style key-value pairs */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 py-4 border-t border-b border-black/[0.04] dark:border-white/[0.04]">
        <SummaryRow
          label={t('payments.method', 'Method')}
          value={paymentFlow.method ? METHOD_LABELS[paymentFlow.method] : '-'}
        />
        <SummaryRow
          label={data.label}
          value={data.reference}
          mono
        />
        <SummaryRow
          label={t('payments.date', 'Date')}
          value={data.date}
          mono
        />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 mb-0.5">
            {t('payments.amount', 'Amount')}
          </div>
          <CurrencyCell amount={data.amount} className="text-lg font-semibold text-black dark:text-white" />
        </div>
      </div>

      {/* Allocated invoices — minimal list */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-3">
          {t('payments.allocatedInvoices', 'Allocations')}
        </div>
        {data.allocations.map((alloc) => (
          <div key={alloc.invoiceNumber} className="flex items-center justify-between py-2 border-b border-black/[0.03] dark:border-white/[0.03]">
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black dark:text-white">
              {alloc.invoiceNumber}
            </span>
            <CurrencyCell amount={alloc.amount} className="text-xs" />
          </div>
        ))}
        <div className="flex items-center justify-between py-2">
          <span className="text-xs font-medium text-black dark:text-white">
            {t('payments.totalApplied', 'Total')}
          </span>
          <CurrencyCell amount={data.totalApplied} className="text-xs font-semibold text-black dark:text-white" />
        </div>
        {data.remaining > 0 && (
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-yellow-600">
              {t('payments.remaining', 'Remaining')}
            </span>
            <CurrencyCell amount={data.remaining} className="text-xs text-yellow-600" />
          </div>
        )}
      </div>

      {/* Confirm — big button + cancel as text */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={resetPaymentFlow}
          className="text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors"
        >
          {t('common.cancel', 'Cancel')}
        </button>
        <Button
          onPress={handleConfirm}
          isDisabled={isSubmitting}
          className="rounded-md bg-[#2563EB] text-white px-8 py-2.5 text-sm font-medium hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-colors"
        >
          {isSubmitting
            ? t('payments.processing', 'Processing...')
            : t('payments.confirmPaymentBtn', 'Confirm')}
        </Button>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 mb-0.5">
        {label}
      </div>
      <div className={`text-sm text-black dark:text-white ${mono ? 'font-[family-name:var(--font-geist-mono)] tabular-nums' : 'font-medium'}`}>
        {value}
      </div>
    </div>
  )
}
