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
}

/**
 * Cash form — minimal. Amount + receipt number + date.
 * Per FIN-03: all 4 payment instruments must be present.
 * Three fields only. Clean document-style.
 */
export function CashForm() {
  const { t } = useTranslation('finance')
  const setPaymentFlowStep = useFinanceStore((s) => s.setPaymentFlowStep)

  const [formData, setFormData] = useState<CashFormData>({
    amount: 0,
    date: null,
    referenceNumber: '',
  })

  const handleSubmit = () => {
    if (formData.amount > 0 && formData.date) {
      setPaymentFlowStep('allocate')
    }
  }

  return (
    <div className="p-6 flex flex-col gap-5">
      <h2 className="text-sm font-semibold text-black dark:text-white">
        {t('payments.cashPayment', 'Cash')}
      </h2>

      {/* Audit notice — single line, understated */}
      <div className="text-[10px] text-black/30 dark:text-white/30 font-[family-name:var(--font-geist-mono)]">
        {t('payments.cashAuditNotice', 'Physical receipt required for audit trail.')}
      </div>

      <div className="grid grid-cols-3 gap-4">
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

        <TextField
          value={formData.referenceNumber}
          onChange={(v) => setFormData((prev) => ({ ...prev, referenceNumber: v }))}
        >
          <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5 block">
            {t('payments.receiptNumber', 'Receipt #')}
          </Label>
          <Input className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm font-[family-name:var(--font-geist-mono)] text-black dark:text-white outline-none focus:border-[#2563EB] transition-colors" />
          <FieldError className="text-[10px] text-red-500 mt-1" />
        </TextField>

        <DatePicker
          value={formData.date}
          onChange={(v) => setFormData((prev) => ({ ...prev, date: v }))}
          isRequired
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
      </div>

      {/* Submit */}
      <div className="flex justify-end mt-auto pt-4">
        <Button
          onPress={handleSubmit}
          isDisabled={!formData.amount || !formData.date}
          className="rounded-md bg-black dark:bg-white text-white dark:text-black px-5 py-2 text-xs font-medium hover:opacity-90 pressed:opacity-80 disabled:opacity-20 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-opacity"
        >
          {t('payments.next', 'Next: Allocate')}
        </Button>
      </div>
    </div>
  )
}
