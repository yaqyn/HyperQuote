import { useTranslation } from 'react-i18next'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import {
  RadioGroup,
  Radio,
  Label,
  Checkbox,
  Button as AriaButton,
} from 'react-aria-components'
import { CreditStatusBanner } from '../shared/CreditStatusBanner'
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
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  })
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
  const lowCredit = customerCredit !== null && creditLimit > 0 && availableCredit / creditLimit < 0.3

  const availablePaymentTerms = isNewCustomer
    ? PAYMENT_TERMS.filter((term) => term.id === 'advance_cod')
    : approvedTerms
      ? PAYMENT_TERMS.filter((term) => approvedTerms.includes(term.id))
      : PAYMENT_TERMS

  return (
    <div className="space-y-3">
      {/* Credit warnings -- compact */}
      {lowCredit && customerCredit && (
        <CreditStatusBanner
          creditLimit={customerCredit.creditLimit}
          currentExposure={customerCredit.currentExposure}
          availableCredit={customerCredit.availableCredit}
        />
      )}

      {isNewCustomer && (
        <p className="text-[11px] font-medium text-yellow-700 dark:text-yellow-300">
          New customer — 50% advance + 50% COD only
        </p>
      )}

      {exceedsCredit && (
        <div className="flex items-center gap-3 text-[11px]">
          <span className="font-medium text-red-600 dark:text-red-400">
            Exceeds credit:
            <span className="ms-1 font-[family-name:var(--font-geist-mono)] tabular-nums">{fmt.format(total)}</span>
            {' / '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{fmt.format(availableCredit)}</span>
          </span>
          <AriaButton
            className="rounded-md border border-red-300 px-2 py-0.5 text-[10px] font-medium text-red-700 outline-none
              data-[hovered]:bg-red-50 data-[focus-visible]:ring-2 data-[focus-visible]:ring-red-500/50
              dark:border-red-700 dark:text-red-300 dark:data-[hovered]:bg-red-900/40"
            onPress={() => {
              console.log('Request credit limit increase')
            }}
          >
            Request Increase
          </AriaButton>
        </div>
      )}

      {/* Payment terms -- single row of pills */}
      <Controller
        control={control}
        name="paymentTerms"
        render={({ field }) => (
          <RadioGroup
            aria-label="Payment terms"
            value={field.value || (isNewCustomer ? 'advance_cod' : '')}
            onChange={(val) => field.onChange(val)}
            className="flex flex-wrap gap-1.5"
          >
            {availablePaymentTerms.map((term) => (
              <Radio
                key={term.id}
                value={term.id}
                className="cursor-pointer rounded-full border border-black/[0.08] px-3 py-1 text-[11px] font-medium outline-none transition-all
                  data-[selected]:border-[var(--color-primary)] data-[selected]:bg-[var(--color-primary)] data-[selected]:text-white
                  data-[hovered]:bg-black/[0.02] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
                  dark:border-white/[0.08] dark:data-[selected]:border-[var(--color-primary)]
                  dark:data-[hovered]:bg-white/[0.03]"
              >
                {term.label}
              </Radio>
            ))}
          </RadioGroup>
        )}
      />

      {/* Credit status -- compact inline strip */}
      {customerCredit && (
        <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)]">
          Limit {fmtCompact.format(customerCredit.creditLimit)}
          <span className="mx-1.5 text-black/15 dark:text-white/15">·</span>
          Used {fmtCompact.format(customerCredit.currentExposure)}
          <span className="mx-1.5 text-black/15 dark:text-white/15">·</span>
          <span className="font-medium text-[var(--color-text)]">
            Available {fmtCompact.format(customerCredit.availableCredit)}
          </span>
        </p>
      )}

      {/* Early payment discount -- small toggle + inline */}
      <Controller
        control={control}
        name="earlyPaymentDiscount"
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              isSelected={!!field.value}
              onChange={(checked) => field.onChange(checked ? '2/10' : '')}
              className="group flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded border border-black/[0.15] outline-none transition-colors
                data-[selected]:border-[var(--color-primary)] data-[selected]:bg-[var(--color-primary)]
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
                dark:border-white/[0.15] dark:data-[selected]:border-[var(--color-primary)]"
            >
              <svg
                viewBox="0 0 14 14"
                className="hidden h-2.5 w-2.5 text-white group-data-[selected]:block"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7.5L5.5 10L11 4" />
              </svg>
            </Checkbox>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              2% discount if paid within 10 days
            </span>
          </div>
        )}
      />
    </div>
  )
}
