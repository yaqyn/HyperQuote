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
import { CurrencyCell } from '../shared/CurrencyCell'
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
 * Wire Transfer form — clean inline layout.
 * Bank details auto-populated from vendor. Reference number prominent.
 * Auto-suggests matching invoices via autoMatchPayment.
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
    <div className="p-6 flex flex-col gap-5">
      <h2 className="text-sm font-semibold text-black dark:text-white">
        {t('payments.wireTransfer', 'Wire Transfer')}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          value={formData.bankReference}
          onChange={(v) => setFormData((prev) => ({ ...prev, bankReference: v }))}
          isRequired
        >
          <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5 block">
            {t('payments.bankReference', 'Bank Reference')}
          </Label>
          <Input className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm font-[family-name:var(--font-geist-mono)] text-black dark:text-white outline-none focus:border-[#2563EB] transition-colors" />
          <FieldError className="text-[10px] text-red-500 mt-1" />
        </TextField>

        <NumberField
          value={formData.amount}
          onChange={(v) => setFormData((prev) => ({ ...prev, amount: v }))}
          minValue={0}
          formatOptions={{ minimumFractionDigits: 0, maximumFractionDigits: 2 }}
          isRequired
        >
          <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5 block">
            {t('payments.amountReceived', 'Amount')}
          </Label>
          <Group className="flex items-center rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 focus-within:border-[#2563EB] transition-colors">
            <span className="text-[10px] text-black/30 dark:text-white/30 me-2 font-[family-name:var(--font-geist-mono)]">EGP</span>
            <Input className="w-full bg-transparent text-sm font-[family-name:var(--font-geist-mono)] tabular-nums text-black dark:text-white outline-none" />
          </Group>
          <FieldError className="text-[10px] text-red-500 mt-1" />
        </NumberField>

        <DatePicker
          value={formData.date}
          onChange={(v) => setFormData((prev) => ({ ...prev, date: v }))}
        >
          <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5 block">
            {t('payments.dateReceived', 'Date')}
          </Label>
          <Group className="flex items-center rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 focus-within:border-[#2563EB] transition-colors">
            <DateInput className="flex gap-0.5 text-sm font-[family-name:var(--font-geist-mono)] text-black dark:text-white">
              {(segment) => (
                <DateSegment
                  segment={segment}
                  className="rounded px-0.5 focus:bg-[#2563EB]/10 focus:outline-none tabular-nums"
                />
              )}
            </DateInput>
          </Group>
          <FieldError className="text-[10px] text-red-500 mt-1" />
        </DatePicker>

        <TextField
          value={formData.receivingBank}
          onChange={(v) => setFormData((prev) => ({ ...prev, receivingBank: v }))}
        >
          <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5 block">
            {t('payments.receivingBank', 'Receiving Bank')}
          </Label>
          <Input className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-[#2563EB] transition-colors" />
          <FieldError className="text-[10px] text-red-500 mt-1" />
        </TextField>
      </div>

      {/* Match to Invoice */}
      <div className="flex items-center gap-3">
        <Button
          onPress={handleMatch}
          className="rounded-md border border-[#2563EB]/20 text-[#2563EB] px-3 py-1.5 text-xs font-medium hover:bg-[#2563EB]/5 pressed:bg-[#2563EB]/10 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-colors"
        >
          {t('payments.matchToInvoice', 'Match to Invoice')}
        </Button>
      </div>

      {/* Match Results */}
      {matchResult && (
        <div className={`rounded-md border px-4 py-3 ${
          matchResult.confidence >= 80
            ? 'border-green-500/20 bg-green-500/[0.03]'
            : matchResult.confidence > 0
              ? 'border-black/5 dark:border-white/5'
              : 'border-black/5 dark:border-white/5'
        }`}>
          {matchResult.matched.length > 0 ? (
            <>
              <div className="text-[10px] text-black/40 dark:text-white/40 mb-2 font-[family-name:var(--font-geist-mono)]">
                {t('payments.matchFound', 'Match')} ({matchResult.confidence}%)
              </div>
              {matchResult.matched.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-1">
                  <span className="text-xs font-[family-name:var(--font-geist-mono)] tabular-nums text-black dark:text-white">
                    {inv.number}
                  </span>
                  <CurrencyCell amount={inv.grandTotal} className="text-xs" />
                </div>
              ))}
            </>
          ) : (
            <div className="text-xs text-black/30 dark:text-white/30">
              {t('payments.noMatch', 'No match found. Proceed to manual allocation.')}
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end mt-auto pt-4">
        <Button
          onPress={handleSubmit}
          isDisabled={!formData.amount || !formData.bankReference}
          className="rounded-md bg-black dark:bg-white text-white dark:text-black px-5 py-2 text-xs font-medium hover:opacity-90 pressed:opacity-80 disabled:opacity-20 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-opacity"
        >
          {t('payments.next', 'Next: Allocate')}
        </Button>
      </div>
    </div>
  )
}
