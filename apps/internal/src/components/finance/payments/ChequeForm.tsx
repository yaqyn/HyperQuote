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

/** Egyptian bank pills for quick selection */
const BANKS = ['CIB', 'NBE', 'QNB', 'Banque Misr', 'HSBC', 'Alex Bank']

/**
 * Cheque form — PDC-aware.
 * Date picker with visual calendar, amount in words auto-generated,
 * bank selector as pills. Shows PDC indicator when date is future.
 */
export function ChequeForm() {
  const { t, i18n } = useTranslation('finance')
  const isArabic = i18n.language === 'ar'
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
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-black dark:text-white">
          {t('payments.chequeDetails', 'Cheque')}
        </h2>

        {/* PDC indicator — subtle, inline */}
        {isFutureDated && formData.chequeDate && (
          <div className="flex items-center gap-2 rounded-md bg-[#2563EB]/5 border border-[#2563EB]/10 px-3 py-1.5">
            <div className="size-1.5 rounded-full bg-[#2563EB]" />
            <span className="text-[10px] font-medium text-[#2563EB]">
              {t('payments.pdcBadge', 'PDC')}
            </span>
            <span className="text-[10px] font-[family-name:var(--font-geist-mono)] tabular-nums text-[#2563EB]/60">
              {formData.chequeDate.toString()}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          value={formData.chequeNumber}
          onChange={(v) => setFormData((prev) => ({ ...prev, chequeNumber: v }))}
          isRequired
        >
          <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5 block">
            {t('payments.chequeNumber', 'Cheque Number')}
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
            {t('payments.amount', 'Amount')}
          </Label>
          <Group className="flex items-center rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 focus-within:border-[#2563EB] transition-colors">
            <span className="text-[10px] text-black/30 dark:text-white/30 me-2 font-[family-name:var(--font-geist-mono)]">EGP</span>
            <Input className="w-full bg-transparent text-sm font-[family-name:var(--font-geist-mono)] tabular-nums text-black dark:text-white outline-none" />
          </Group>
          <FieldError className="text-[10px] text-red-500 mt-1" />
        </NumberField>

        <DatePicker
          value={formData.chequeDate}
          onChange={(v) => setFormData((prev) => ({ ...prev, chequeDate: v }))}
          isRequired
        >
          <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5 block">
            {t('payments.chequeDate', 'Cheque Date')}
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
          value={formData.payerName}
          onChange={(v) => setFormData((prev) => ({ ...prev, payerName: v }))}
          isRequired
        >
          <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5 block">
            {t('payments.payerName', 'Payer Name')}
          </Label>
          <Input className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-[#2563EB] transition-colors" />
          <FieldError className="text-[10px] text-red-500 mt-1" />
        </TextField>
      </div>

      {/* Bank selector — pills */}
      <div>
        <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-2 block">
          {t('payments.bankName', 'Bank')}
        </Label>
        <div className="flex flex-wrap gap-2">
          {BANKS.map((bank) => (
            <button
              key={bank}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, bankName: bank }))}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                formData.bankName === bank
                  ? 'bg-[#2563EB] text-white'
                  : 'border border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:border-[#2563EB]/30 hover:text-[#2563EB]'
              }`}
            >
              {bank}
            </button>
          ))}
        </div>
      </div>

      {/* Amount in words — auto-generated, read-only */}
      {formData.amount > 0 && (
        <div className="text-[10px] text-black/30 dark:text-white/30 italic font-[family-name:var(--font-geist-mono)]">
          {new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG', {
            style: 'currency',
            currency: 'EGP',
            currencyDisplay: 'name',
          }).format(formData.amount)}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end mt-auto pt-4">
        <Button
          onPress={handleSubmit}
          isDisabled={!formData.chequeNumber || !formData.amount || !formData.chequeDate || !formData.payerName}
          className="rounded-md bg-black dark:bg-white text-white dark:text-black px-5 py-2 text-xs font-medium hover:opacity-90 pressed:opacity-80 disabled:opacity-20 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-opacity"
        >
          {t('payments.next', 'Next: Allocate')}
        </Button>
      </div>
    </div>
  )
}
