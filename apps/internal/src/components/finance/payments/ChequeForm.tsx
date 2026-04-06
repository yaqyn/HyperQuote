import { useState, useMemo } from 'react'
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
import { today, getLocalTimeZone } from '@internationalized/date'
import { useFinanceStore } from '../../../stores/finance'

interface ChequeFormData {
  chequeNumber: string
  bankName: string
  amount: number
  chequeDate: DateValue | null
  payerName: string
}

/**
 * Step 2 for Cheque: captures cheque number, bank name, amount, cheque date, payer name.
 * Shows PDC indicator when cheque date is in the future.
 * Initial status: 'received' per cheque state machine.
 */
export function ChequeForm() {
  const { t } = useTranslation('finance')
  const setPaymentFlowStep = useFinanceStore((s) => s.setPaymentFlowStep)

  const [formData, setFormData] = useState<ChequeFormData>({
    chequeNumber: '',
    bankName: '',
    amount: 0,
    chequeDate: null,
    payerName: '',
  })

  const isFutureDated = useMemo(() => {
    if (!formData.chequeDate) return false
    const todayDate = today(getLocalTimeZone())
    return formData.chequeDate.compare(todayDate) > 0
  }, [formData.chequeDate])

  const handleSubmit = () => {
    if (formData.chequeNumber && formData.amount > 0 && formData.chequeDate && formData.payerName) {
      setPaymentFlowStep('allocate')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">
        {t('payments.chequeDetails', 'Cheque Details')}
      </h2>

      {/* PDC indicator badge */}
      {isFutureDated && formData.chequeDate && (
        <div className="rounded-xl border border-[#2563EB]/20 bg-[#2563EB]/5 p-4 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-[#2563EB]/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth={1.5} className="size-4">
              <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-medium text-[#2563EB]">
              {t('payments.pdcBadge', 'Post-Dated Cheque')}
            </span>
            <span className="text-xs text-black/50 dark:text-white/50 ms-2">
              {t('payments.pdcMatures', 'Matures')} {formData.chequeDate.toString()}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <TextField
          value={formData.chequeNumber}
          onChange={(v) => setFormData((prev) => ({ ...prev, chequeNumber: v }))}
          isRequired
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.chequeNumber', 'Cheque Number')}
          </Label>
          <Input className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:border-[#2563EB]" />
          <FieldError className="text-xs text-red-600 mt-1" />
        </TextField>

        <TextField
          value={formData.bankName}
          onChange={(v) => setFormData((prev) => ({ ...prev, bankName: v }))}
          isRequired
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.bankName', 'Bank Name')}
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
            {t('payments.amount', 'Amount')}
          </Label>
          <Group className="flex items-center rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 focus-within:border-[#2563EB]">
            <span className="text-xs text-black/50 dark:text-white/50 me-2">EGP</span>
            <Input className="w-full bg-transparent text-sm font-[family-name:var(--font-geist-mono)] tabular-nums outline-none" />
          </Group>
          <FieldError className="text-xs text-red-600 mt-1" />
        </NumberField>

        <DatePicker
          value={formData.chequeDate}
          onChange={(v) => setFormData((prev) => ({ ...prev, chequeDate: v }))}
          isRequired
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.chequeDate', 'Cheque Date')}
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
          value={formData.payerName}
          onChange={(v) => setFormData((prev) => ({ ...prev, payerName: v }))}
          isRequired
          className="col-span-2"
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.payerName', 'Payer Name')}
          </Label>
          <Input className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:border-[#2563EB]" />
          <FieldError className="text-xs text-red-600 mt-1" />
        </TextField>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          onPress={handleSubmit}
          isDisabled={!formData.chequeNumber || !formData.amount || !formData.chequeDate || !formData.payerName}
          className="rounded-lg bg-black dark:bg-white text-white dark:text-black px-6 py-2 text-sm font-medium hover:opacity-90 pressed:opacity-80 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
        >
          {t('payments.next', 'Next: Allocate to Invoices')}
        </Button>
      </div>
    </div>
  )
}
