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
  Checkbox,
} from 'react-aria-components'
import { useFinanceStore } from '../../../stores/finance'
import { CurrencyCell } from '../shared/CurrencyCell'

const LC_REQUIRED_DOCUMENTS = [
  'Commercial Invoice',
  'Packing List',
  'Certificate of Origin',
  'Inspection Certificate',
  'Bill of Lading',
  'Insurance Certificate',
]

interface LCFormData {
  lcNumber: string
  issuingBank: string
  totalAmount: number
  expiryDate: DateValue | null
  drawdownAmount: number
  checkedDocuments: Set<string>
}

/**
 * Step 2 for Letter of Credit: captures LC number, issuing bank, amount, expiry,
 * draw-down amount, and document compliance checklist.
 * Shows remaining LC balance in Geist Mono.
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
    checkedDocuments: new Set<string>(),
  })

  const remainingLC = useMemo(
    () => formData.totalAmount - previouslyDrawn - formData.drawdownAmount,
    [formData.totalAmount, formData.drawdownAmount],
  )

  const toggleDocument = (doc: string) => {
    setFormData((prev) => {
      const next = new Set(prev.checkedDocuments)
      if (next.has(doc)) {
        next.delete(doc)
      } else {
        next.add(doc)
      }
      return { ...prev, checkedDocuments: next }
    })
  }

  const handleSubmit = () => {
    if (formData.lcNumber && formData.drawdownAmount > 0 && formData.expiryDate) {
      setPaymentFlowStep('allocate')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">
        {t('payments.lcDetails', 'Letter of Credit Details')}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          value={formData.lcNumber}
          onChange={(v) => setFormData((prev) => ({ ...prev, lcNumber: v }))}
          isRequired
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.lcNumber', 'LC Number')}
          </Label>
          <Input className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:border-[#2563EB]" />
          <FieldError className="text-xs text-red-600 mt-1" />
        </TextField>

        <TextField
          value={formData.issuingBank}
          onChange={(v) => setFormData((prev) => ({ ...prev, issuingBank: v }))}
          isRequired
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.issuingBank', 'Issuing Bank')}
          </Label>
          <Input className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:border-[#2563EB]" />
          <FieldError className="text-xs text-red-600 mt-1" />
        </TextField>

        <NumberField
          value={formData.totalAmount}
          onChange={(v) => setFormData((prev) => ({ ...prev, totalAmount: v }))}
          minValue={0}
          formatOptions={{ minimumFractionDigits: 0, maximumFractionDigits: 2 }}
          isRequired
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.lcTotalAmount', 'Total LC Amount')}
          </Label>
          <Group className="flex items-center rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 focus-within:border-[#2563EB]">
            <span className="text-xs text-black/50 dark:text-white/50 me-2">EGP</span>
            <Input className="w-full bg-transparent text-sm font-[family-name:var(--font-geist-mono)] tabular-nums outline-none" />
          </Group>
          <FieldError className="text-xs text-red-600 mt-1" />
        </NumberField>

        <DatePicker
          value={formData.expiryDate}
          onChange={(v) => setFormData((prev) => ({ ...prev, expiryDate: v }))}
          isRequired
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.expiryDate', 'Expiry Date')}
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

        <NumberField
          value={formData.drawdownAmount}
          onChange={(v) => setFormData((prev) => ({ ...prev, drawdownAmount: v }))}
          minValue={0}
          formatOptions={{ minimumFractionDigits: 0, maximumFractionDigits: 2 }}
          isRequired
          className="col-span-2"
        >
          <Label className="text-xs text-black/50 dark:text-white/50 mb-1 block">
            {t('payments.drawdownAmount', 'Draw-down Amount (This Payment)')}
          </Label>
          <Group className="flex items-center rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-2 focus-within:border-[#2563EB]">
            <span className="text-xs text-black/50 dark:text-white/50 me-2">EGP</span>
            <Input className="w-full bg-transparent text-sm font-[family-name:var(--font-geist-mono)] tabular-nums outline-none" />
          </Group>
          <FieldError className="text-xs text-red-600 mt-1" />
        </NumberField>
      </div>

      {/* LC Balance summary */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t('payments.lcTotal', 'LC Total')}
            </div>
            <CurrencyCell amount={formData.totalAmount} className="font-medium" />
          </div>
          <div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t('payments.previouslyDrawn', 'Previously Drawn')}
            </div>
            <CurrencyCell amount={previouslyDrawn} className="font-medium" />
          </div>
          <div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t('payments.thisDraw', 'This Draw')}
            </div>
            <CurrencyCell amount={formData.drawdownAmount} className="font-medium" />
          </div>
          <div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t('payments.lcRemaining', 'Remaining')}
            </div>
            <CurrencyCell
              amount={Math.max(0, remainingLC)}
              className={`font-semibold ${remainingLC < 0 ? 'text-red-600' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Document compliance checklist */}
      <div>
        <h3 className="text-sm font-medium mb-3">
          {t('payments.documentChecklist', 'Document Compliance Checklist')}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {LC_REQUIRED_DOCUMENTS.map((doc) => (
            <Checkbox
              key={doc}
              isSelected={formData.checkedDocuments.has(doc)}
              onChange={() => toggleDocument(doc)}
              className="flex items-center gap-2 rounded-lg border border-black/5 dark:border-white/5 p-3 text-sm cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] group"
            >
              <div className="flex size-4 items-center justify-center rounded border border-black/20 dark:border-white/20 group-data-[selected]:bg-[#2563EB] group-data-[selected]:border-[#2563EB] transition-colors">
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  className="size-3 text-white opacity-0 group-data-[selected]:opacity-100"
                >
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>{doc}</span>
            </Checkbox>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          onPress={handleSubmit}
          isDisabled={!formData.lcNumber || !formData.drawdownAmount || !formData.expiryDate}
          className="rounded-lg bg-black dark:bg-white text-white dark:text-black px-6 py-2 text-sm font-medium hover:opacity-90 pressed:opacity-80 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
        >
          {t('payments.next', 'Next: Allocate to Invoices')}
        </Button>
      </div>
    </div>
  )
}
