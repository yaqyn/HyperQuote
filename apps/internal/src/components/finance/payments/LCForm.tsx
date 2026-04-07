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
import { useFinanceStore } from '../../../stores/finance'
import { CurrencyCell } from '../shared/CurrencyCell'

interface LCFormData {
  lcNumber: string
  issuingBank: string
  totalAmount: number
  expiryDate: DateValue | null
  drawdownAmount: number
}

/**
 * Letter of Credit form — clean document-style.
 * LC number + issuing bank + expiry date + amount.
 * Balance summary shown as inline data row, not cards.
 */
export function LCForm() {
  const { t } = useTranslation('finance')
  const setPaymentFlowStep = useFinanceStore((s) => s.setPaymentFlowStep)

  // Mock previously drawn amount (will come from server in production)
  const previouslyDrawn = 500_000

  const [formData, setFormData] = useState<LCFormData>({
    lcNumber: '',
    issuingBank: '',
    totalAmount: 2_000_000,
    expiryDate: null,
    drawdownAmount: 0,
  })

  const remainingLC = useMemo(
    () => formData.totalAmount - previouslyDrawn - formData.drawdownAmount,
    [formData.totalAmount, formData.drawdownAmount],
  )

  const handleSubmit = () => {
    if (formData.lcNumber && formData.drawdownAmount > 0 && formData.expiryDate) {
      setPaymentFlowStep('allocate')
    }
  }

  return (
    <div className="p-6 flex flex-col gap-5">
      <h2 className="text-sm font-semibold text-black dark:text-white">
        {t('payments.lcDetails', 'Letter of Credit')}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          value={formData.lcNumber}
          onChange={(v) => setFormData((prev) => ({ ...prev, lcNumber: v }))}
          isRequired
        >
          <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5 block">
            {t('payments.lcNumber', 'LC Number')}
          </Label>
          <Input className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm font-[family-name:var(--font-geist-mono)] text-black dark:text-white outline-none focus:border-[#2563EB] transition-colors" />
          <FieldError className="text-[10px] text-red-500 mt-1" />
        </TextField>

        <TextField
          value={formData.issuingBank}
          onChange={(v) => setFormData((prev) => ({ ...prev, issuingBank: v }))}
          isRequired
        >
          <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5 block">
            {t('payments.issuingBank', 'Issuing Bank')}
          </Label>
          <Input className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-[#2563EB] transition-colors" />
          <FieldError className="text-[10px] text-red-500 mt-1" />
        </TextField>

        <DatePicker
          value={formData.expiryDate}
          onChange={(v) => setFormData((prev) => ({ ...prev, expiryDate: v }))}
          isRequired
        >
          <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5 block">
            {t('payments.expiryDate', 'Expiry Date')}
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

        <NumberField
          value={formData.drawdownAmount}
          onChange={(v) => setFormData((prev) => ({ ...prev, drawdownAmount: v }))}
          minValue={0}
          formatOptions={{ minimumFractionDigits: 0, maximumFractionDigits: 2 }}
          isRequired
        >
          <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1.5 block">
            {t('payments.drawdownAmount', 'Draw-down Amount')}
          </Label>
          <Group className="flex items-center rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 focus-within:border-[#2563EB] transition-colors">
            <span className="text-[10px] text-black/30 dark:text-white/30 me-2 font-[family-name:var(--font-geist-mono)]">EGP</span>
            <Input className="w-full bg-transparent text-sm font-[family-name:var(--font-geist-mono)] tabular-nums text-black dark:text-white outline-none" />
          </Group>
          <FieldError className="text-[10px] text-red-500 mt-1" />
        </NumberField>
      </div>

      {/* LC Balance — inline data row, not cards */}
      <div className="flex items-center gap-6 py-3 border-t border-b border-black/[0.04] dark:border-white/[0.04]">
        <BalanceItem
          label={t('payments.lcTotal', 'LC Total')}
          amount={formData.totalAmount}
        />
        <span className="text-black/10 dark:text-white/10 text-xs">-</span>
        <BalanceItem
          label={t('payments.previouslyDrawn', 'Drawn')}
          amount={previouslyDrawn}
        />
        <span className="text-black/10 dark:text-white/10 text-xs">-</span>
        <BalanceItem
          label={t('payments.thisDraw', 'This Draw')}
          amount={formData.drawdownAmount}
        />
        <span className="text-black/10 dark:text-white/10 text-xs">=</span>
        <BalanceItem
          label={t('payments.lcRemaining', 'Remaining')}
          amount={Math.max(0, remainingLC)}
          highlight={remainingLC < 0}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end mt-auto pt-4">
        <Button
          onPress={handleSubmit}
          isDisabled={!formData.lcNumber || !formData.drawdownAmount || !formData.expiryDate}
          className="rounded-md bg-black dark:bg-white text-white dark:text-black px-5 py-2 text-xs font-medium hover:opacity-90 pressed:opacity-80 disabled:opacity-20 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-opacity"
        >
          {t('payments.next', 'Next: Allocate')}
        </Button>
      </div>
    </div>
  )
}

function BalanceItem({ label, amount, highlight }: { label: string; amount: number; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 mb-0.5">
        {label}
      </div>
      <CurrencyCell
        amount={amount}
        className={`text-sm font-medium ${highlight ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'}`}
      />
    </div>
  )
}
