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

interface CashFormData {
  amount: number
  date: DateValue | null
  referenceNumber: string
  receivedBy: string
}

/**
 * Step 2 for Cash: captures amount, date, reference/receipt number, received by.
 * Per FIN-03: all 4 payment instruments must be present (wire, cheque, LC, cash).
 */
export function CashForm() {
  const { t } = useTranslation('finance')
  const setPaymentFlowStep = useFinanceStore((s) => s.setPaymentFlowStep)

  const [formData, setFormData] = useState<CashFormData>({
    amount: 0,
    date: null,
    referenceNumber: '',
    receivedBy: '',
  })

  const handleSubmit = () => {
    if (formData.amount > 0 && formData.date) {
      setPaymentFlowStep('allocate')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">
        {t('payments.cashPayment', 'Cash Payment Details')}
      </h2>

      {/* Info banner */}
      <div className="rounded-xl border border-[#2563EB]/20 bg-[#2563EB]/5 p-4">
        <p className="text-xs text-black/70 dark:text-white/70">
          {t(
            'payments.cashAuditNotice',
            'Cash payments require physical receipt. Ensure receipt number is recorded for audit trail.',
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
          isRequired
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
          value={formData.referenceNumber}
          onChange={(v) => setFormData((prev) => ({ ...prev, referenceNumber: v }))}
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.receiptNumber', 'Reference / Receipt Number')}
          </Label>
          <Input className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:border-[#2563EB]" />
          <FieldError className="text-xs text-red-600 mt-1" />
        </TextField>

        <TextField
          value={formData.receivedBy}
          onChange={(v) => setFormData((prev) => ({ ...prev, receivedBy: v }))}
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.receivedBy', 'Received By')}
          </Label>
          <Input className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:border-[#2563EB]" />
          <FieldError className="text-xs text-red-600 mt-1" />
        </TextField>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          onPress={handleSubmit}
          isDisabled={!formData.amount || !formData.date}
          className="rounded-lg bg-black dark:bg-white text-white dark:text-black px-6 py-2 text-sm font-medium hover:opacity-90 pressed:opacity-80 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
        >
          {t('payments.next', 'Next: Allocate to Invoices')}
        </Button>
      </div>
    </div>
  )
}
