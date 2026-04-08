import { useTranslation } from 'react-i18next'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { Checkbox } from 'react-aria-components'
import { PillGroup, Pill, Button } from '../../ui'
import type { QuoteFormValues } from './LineItemsTable'

// ─── Payment Term Options ─────────────────────────────────

const PAYMENT_TERMS = [
  { id: 'net_30', label: 'Net 30' },
  { id: 'net_45', label: 'Net 45' },
  { id: 'net_60', label: 'Net 60' },
  { id: 'net_90', label: 'Net 90' },
  { id: 'progress', label: 'Progress' },
  { id: 'lc', label: 'L/C' },
  { id: 'advance_cod', label: 'COD' },
] as const

interface PaymentTermsProps {
  customerCredit: {
    creditLimit: number
    currentExposure: number
    availableCredit: number
  } | null
  isNewCustomer: boolean
  approvedTerms?: string[]
}

export function PaymentTerms({
  customerCredit,
  isNewCustomer,
  approvedTerms,
}: PaymentTermsProps) {
  const { i18n } = useTranslation('internal')
  const { control } = useFormContext<QuoteFormValues>()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const fmtCompact = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    notation: 'compact',
    maximumFractionDigits: 1,
  })

  const lineItems = useWatch({ control, name: 'lineItems' })
  const subtotal = lineItems?.reduce((sum, item) => sum + (item.lineTotal || 0), 0) ?? 0
  const vatAmount = Math.round(subtotal * 14) / 100
  const total = subtotal + vatAmount

  const availableCredit = customerCredit?.availableCredit ?? 0
  const creditLimit = customerCredit?.creditLimit ?? 0
  const exceedsCredit = customerCredit !== null && total > availableCredit

  const availablePaymentTerms = isNewCustomer
    ? PAYMENT_TERMS.filter((term) => term.id === 'advance_cod')
    : approvedTerms
      ? PAYMENT_TERMS.filter((term) => approvedTerms.includes(term.id))
      : PAYMENT_TERMS

  const usedRatio = creditLimit > 0 ? Math.min(1, (creditLimit - availableCredit) / creditLimit) : 0

  return (
    <div className="space-y-5">
      {/* Terms pills + early discount */}
      <div className="flex flex-wrap items-center gap-2">
        <Controller
          control={control}
          name="paymentTerms"
          render={({ field }) => (
            <PillGroup
              aria-label="Payment terms"
              value={field.value || (isNewCustomer ? 'advance_cod' : '')}
              onChange={(val) => field.onChange(val)}
            >
              {availablePaymentTerms.map((term) => (
                <Pill key={term.id} value={term.id}>
                  {term.label}
                </Pill>
              ))}
            </PillGroup>
          )}
        />

        <Controller
          control={control}
          name="earlyPaymentDiscount"
          render={({ field }) => (
            <Checkbox
              isSelected={!!field.value}
              onChange={(checked) => field.onChange(checked ? '2/10' : '')}
              className="group flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium outline-none transition-all
                data-[selected]:bg-[var(--color-primary)]/5
                data-[hovered]:bg-black/[0.02] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
                dark:data-[selected]:bg-[var(--color-primary)]/10
                dark:data-[hovered]:bg-white/[0.03]"
            >
              <span className="text-black/40 group-data-[selected]:text-[var(--color-primary)] dark:text-white/40">
                2/10 early discount
              </span>
            </Checkbox>
          )}
        />

        {isNewCustomer && (
          <>
            <div className="h-4 w-px bg-black/[0.06] dark:bg-white/[0.06]" />
            <span className="text-[12px] text-[var(--color-text-muted)]">
              New customer — COD only
            </span>
          </>
        )}
      </div>

      {/* Credit — pure typography */}
      {customerCredit && (
        <div className="flex items-baseline gap-3">
          <span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-medium tabular-nums text-[var(--color-text)]">
            {fmtCompact.format(customerCredit.availableCredit)}
          </span>
          <span className="text-[12px] text-black/40 dark:text-white/40">
            of {fmtCompact.format(customerCredit.creditLimit)}
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/40 dark:text-white/40">
            {Math.round(usedRatio * 100)}% used
          </span>

          {exceedsCredit && (
            <>
              <span className="text-[12px] text-black/40 dark:text-white/40">
                Exceeds by{' '}
                <span className="font-[family-name:var(--font-geist-mono)] font-medium tabular-nums text-[var(--color-text)]">
                  {fmtCompact.format(total - availableCredit)}
                </span>
              </span>
              <Button
                variant="ghost"
                onPress={() => {
                  console.log('Request credit limit increase')
                }}
              >
                Request Increase
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
