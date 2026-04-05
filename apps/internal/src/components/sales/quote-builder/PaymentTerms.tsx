import { useTranslation } from 'react-i18next'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import {
  Select,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
  Label,
  Button as AriaButton,
  Checkbox,
} from 'react-aria-components'
import { CreditStatusBanner } from '../shared/CreditStatusBanner'
import type { QuoteFormValues } from './LineItemsTable'

// ─── Payment Term Options ─────────────────────────────────

const PAYMENT_TERMS = [
  { id: 'net_30', label: 'Net 30', description: 'Payment due within 30 days' },
  { id: 'net_45', label: 'Net 45', description: 'Payment due within 45 days' },
  { id: 'net_60', label: 'Net 60', description: 'Payment due within 60 days' },
  { id: 'net_90', label: 'Net 90', description: 'Payment due within 90 days' },
  { id: 'progress', label: 'Progress Payments', description: 'Milestone-based payments' },
  { id: 'lc', label: 'Letter of Credit', description: 'Bank-guaranteed payment' },
  { id: 'advance_cod', label: '50% Advance + 50% COD', description: 'New customer default -- certified bank check' },
] as const

interface PaymentTermsProps {
  customerCredit: {
    creditLimit: number
    currentExposure: number
    availableCredit: number
  } | null
  isNewCustomer: boolean
  /** Customer's approved payment term IDs */
  approvedTerms?: string[]
}

export function PaymentTerms({
  customerCredit,
  isNewCustomer,
  approvedTerms,
}: PaymentTermsProps) {
  const { t, i18n } = useTranslation('internal')
  const { control } = useFormContext<QuoteFormValues>()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  })

  // Watch line items for total computation
  const lineItems = useWatch({ control, name: 'lineItems' })
  const subtotal = lineItems?.reduce((sum, item) => sum + (item.lineTotal || 0), 0) ?? 0
  const vatAmount = Math.round(subtotal * 14) / 100
  const total = subtotal + vatAmount

  // Credit check
  const availableCredit = customerCredit?.availableCredit ?? 0
  const creditLimit = customerCredit?.creditLimit ?? 0
  const exceedsCredit = customerCredit !== null && total > availableCredit
  const lowCredit = customerCredit !== null && creditLimit > 0 && availableCredit / creditLimit < 0.3

  // For new customers, default to advance_cod and restrict options
  const availablePaymentTerms = isNewCustomer
    ? PAYMENT_TERMS.filter((term) => term.id === 'advance_cod')
    : approvedTerms
      ? PAYMENT_TERMS.filter((term) => approvedTerms.includes(term.id))
      : PAYMENT_TERMS

  return (
    <div className="space-y-4">
      {/* Credit Status Banner for low credit */}
      {lowCredit && customerCredit && (
        <CreditStatusBanner
          creditLimit={customerCredit.creditLimit}
          currentExposure={customerCredit.currentExposure}
          availableCredit={customerCredit.availableCredit}
        />
      )}

      {/* New Customer Warning */}
      {isNewCustomer && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-800 dark:bg-yellow-950/30">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
            New Customer -- No credit established.
          </p>
          <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
            Default terms: 50% advance + 50% COD by certified bank check. Override requires finance approval.
          </p>
        </div>
      )}

      {/* Credit Exceeds Warning */}
      {exceedsCredit && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
          <div>
            <p className="text-sm font-medium text-red-900 dark:text-red-200">
              Quote total exceeds available credit
            </p>
            <p className="mt-1 text-xs text-red-700 dark:text-red-300">
              Quote:{' '}
              <span className="font-[family-name:var(--font-geist-mono)] font-medium tabular-nums">
                {fmt.format(total)}
              </span>{' '}
              | Available:{' '}
              <span className="font-[family-name:var(--font-geist-mono)] font-medium tabular-nums">
                {fmt.format(availableCredit)}
              </span>
            </p>
          </div>
          <AriaButton
            className="shrink-0 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-900 outline-none transition-colors
              data-[hovered]:bg-red-100 data-[focus-visible]:ring-2 data-[focus-visible]:ring-red-500/50
              dark:border-red-700 dark:text-red-200 dark:data-[hovered]:bg-red-900/40"
            onPress={() => {
              console.log('Request credit limit increase')
            }}
          >
            Request Credit Limit Increase
          </AriaButton>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Payment Terms Select */}
        <Controller
          control={control}
          name="paymentTerms"
          render={({ field }) => (
            <Select
              aria-label="Payment terms"
              selectedKey={field.value || (isNewCustomer ? 'advance_cod' : null)}
              onSelectionChange={(key) => field.onChange(key as string)}
              className="flex flex-col gap-1"
            >
              <Label className="text-xs font-medium text-black/50 dark:text-white/50">
                Payment Terms
              </Label>
              <AriaButton className="flex items-center justify-between rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-start text-sm backdrop-blur-sm outline-none data-[hovered]:bg-black/3 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:border-white/10 dark:bg-black/40 dark:data-[hovered]:bg-white/5">
                <SelectValue className="flex-1" />
                <span className="text-black/30 dark:text-white/30">&#9662;</span>
              </AriaButton>
              <Popover className="rounded-lg border border-black/10 bg-white/95 shadow-lg backdrop-blur-2xl dark:border-white/10 dark:bg-black/95">
                <ListBox className="max-h-60 overflow-y-auto p-1">
                  {availablePaymentTerms.map((term) => (
                    <ListBoxItem
                      key={term.id}
                      id={term.id}
                      textValue={term.label}
                      className="cursor-pointer rounded-md px-3 py-2 text-sm outline-none data-[focused]:bg-black/5 data-[selected]:bg-[#2563EB]/10 data-[selected]:font-medium dark:data-[focused]:bg-white/5 dark:data-[selected]:bg-[#2563EB]/20"
                    >
                      <div>
                        <p className="font-medium">{term.label}</p>
                        <p className="text-xs text-black/40 dark:text-white/40">{term.description}</p>
                      </div>
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Popover>
            </Select>
          )}
        />

        {/* Credit Status Display */}
        {customerCredit && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-black/50 dark:text-white/50">
              Credit Status
            </p>
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">Limit</p>
                <p className="font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums">
                  {fmt.format(customerCredit.creditLimit)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">Outstanding</p>
                <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                  {fmt.format(customerCredit.currentExposure)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">Available</p>
                <p className="font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums">
                  {fmt.format(customerCredit.availableCredit)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Early Payment Discount */}
      <Controller
        control={control}
        name="earlyPaymentDiscount"
        render={({ field }) => (
          <div className="flex items-start gap-3">
            <Checkbox
              isSelected={!!field.value}
              onChange={(checked) => field.onChange(checked ? '2/10' : '')}
              className="group mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border border-black/20 outline-none transition-colors
                data-[selected]:border-[#2563EB] data-[selected]:bg-[#2563EB]
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                dark:border-white/20 dark:data-[selected]:border-[#2563EB]"
            >
              <svg
                viewBox="0 0 14 14"
                className="hidden h-3 w-3 text-white group-data-[selected]:block"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7.5L5.5 10L11 4" />
              </svg>
            </Checkbox>
            <div>
              <p className="text-sm">Offer early payment discount</p>
              <p className="text-xs text-black/40 dark:text-white/40">
                2/10 Net 30 -- 2% discount if paid within 10 days of invoice
              </p>
            </div>
          </div>
        )}
      />
    </div>
  )
}
