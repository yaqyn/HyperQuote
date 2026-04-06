import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  DatePicker,
  DateValue,
  FieldError,
  Input,
  Label,
  NumberField,
  TextField,
  Group,
  DateInput,
  DateSegment,
} from 'react-aria-components'
import { useFinanceStore } from '../../../stores/finance'
import { autoMatchPayment } from '../../../lib/finance/matching'
import type { Invoice } from '../../../types/finance'

// Mock invoices for auto-matching (will be replaced by server query)
const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv-001', number: 'INV-2025-0001', orderId: 'ord-001', customerId: 'cust-001',
    customerName: 'Cairo Construction Co.', status: 'sent', etaStatus: 'accepted',
    items: [], subtotal: 247_500, vatAmount: 34_650, grandTotal: 247_500,
    dueDate: '2025-06-15', issuedDate: '2025-05-15', currency: 'EGP',
    sellerTRN: '123456789', buyerTRN: '987654321', digitalSignatureId: null,
    pdfUrl: null, creditNoteIds: [],
  },
  {
    id: 'inv-002', number: 'INV-2025-0002', orderId: 'ord-002', customerId: 'cust-001',
    customerName: 'Cairo Construction Co.', status: 'overdue', etaStatus: 'accepted',
    items: [], subtotal: 150_000, vatAmount: 21_000, grandTotal: 150_000,
    dueDate: '2025-05-01', issuedDate: '2025-04-01', currency: 'EGP',
    sellerTRN: '123456789', buyerTRN: '987654321', digitalSignatureId: null,
    pdfUrl: null, creditNoteIds: [],
  },
]

interface WireTransferData {
  bankReference: string
  amount: number
  date: DateValue | null
  receivingBank: string
}

/**
 * Step 2 for Wire Transfer: captures bank reference, amount, date, receiving bank.
 * Auto-suggests matching invoices via autoMatchPayment from matching.ts.
 */
export function WireTransferForm() {
  const { t } = useTranslation('finance')
  const setPaymentFlowStep = useFinanceStore((s) => s.setPaymentFlowStep)

  const [formData, setFormData] = useState<WireTransferData>({
    bankReference: '',
    amount: 0,
    date: null,
    receivingBank: '',
  })
  const [matchResult, setMatchResult] = useState<{
    matched: Invoice[]
    confidence: number
  } | null>(null)

  const handleMatch = () => {
    const result = autoMatchPayment(formData.amount, formData.bankReference, MOCK_INVOICES)
    setMatchResult(result)
  }

  const handleSubmit = () => {
    if (formData.amount > 0 && formData.bankReference) {
      setPaymentFlowStep('allocate')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">
        {t('payments.wireTransfer', 'Wire Transfer Details')}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          value={formData.bankReference}
          onChange={(v) => setFormData((prev) => ({ ...prev, bankReference: v }))}
          isRequired
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.bankReference', 'Bank Reference Number')}
          </Label>
          <Input className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:border-[#2563EB]" />
          <FieldError className="text-xs text-red-600 mt-1" />
        </TextField>

        <NumberField
          value={formData.amount}
          onChange={(v) => setFormData((prev) => ({ ...prev, amount: v }))}
          minValue={0}
          formatOptions={{ minimumFractionDigits: 0, maximumFractionDigits: 2 }}
          isRequired
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.amountReceived', 'Amount Received')}
          </Label>
          <Group className="flex items-center rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 focus-within:border-[#2563EB]">
            <span className="text-xs text-black/50 dark:text-white/50 me-2">EGP</span>
            <Input className="w-full bg-transparent text-sm font-[family-name:var(--font-geist-mono)] tabular-nums outline-none" />
          </Group>
          <FieldError className="text-xs text-red-600 mt-1" />
        </NumberField>

        <DatePicker
          value={formData.date}
          onChange={(v) => setFormData((prev) => ({ ...prev, date: v }))}
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.dateReceived', 'Date Received')}
          </Label>
          <Group className="flex items-center rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 focus-within:border-[#2563EB]">
            <DateInput className="flex gap-0.5 text-sm font-[family-name:var(--font-geist-mono)]">
              {(segment) => (
                <DateSegment
                  segment={segment}
                  className="rounded px-0.5 focus:bg-[#2563EB]/10 focus:outline-none"
                />
              )}
            </DateInput>
          </Group>
          <FieldError className="text-xs text-red-600 mt-1" />
        </DatePicker>

        <TextField
          value={formData.receivingBank}
          onChange={(v) => setFormData((prev) => ({ ...prev, receivingBank: v }))}
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.receivingBank', 'Receiving Bank Account')}
          </Label>
          <Input className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:border-[#2563EB]" />
          <FieldError className="text-xs text-red-600 mt-1" />
        </TextField>
      </div>

      {/* Match to Invoice */}
      <div className="flex items-center gap-3">
        <Button
          onPress={handleMatch}
          className="rounded-lg bg-[#2563EB] text-white px-4 py-2 text-sm font-medium hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
        >
          {t('payments.matchToInvoice', 'Match to Invoice')}
        </Button>
      </div>

      {/* Match Results */}
      {matchResult && (
        <div className={`rounded-xl border p-4 ${matchResult.confidence >= 80 ? 'border-green-500/30 bg-green-500/5' : matchResult.confidence > 0 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-black/10 dark:border-white/10'}`}>
          {matchResult.matched.length > 0 ? (
            <>
              <div className="text-xs text-black/50 dark:text-white/50 mb-2">
                {t('payments.matchFound', 'Match found')} ({matchResult.confidence}% {t('payments.confidence', 'confidence')})
              </div>
              {matchResult.matched.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">{inv.number}</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
                    EGP {new Intl.NumberFormat('en-EG').format(inv.grandTotal)}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <div className="text-sm text-black/50 dark:text-white/50">
              {t('payments.noMatch', 'No exact match found. Proceed to manual allocation.')}
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          onPress={handleSubmit}
          isDisabled={!formData.amount || !formData.bankReference}
          className="rounded-lg bg-black dark:bg-white text-white dark:text-black px-6 py-2 text-sm font-medium hover:opacity-90 pressed:opacity-80 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
        >
          {t('payments.next', 'Next: Allocate to Invoices')}
        </Button>
      </div>
    </div>
  )
}
