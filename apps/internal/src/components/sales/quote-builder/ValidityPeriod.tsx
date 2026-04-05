import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { NumberField, Input, Label, Group, Button as AriaButton } from 'react-aria-components'
import type { QuoteFormValues } from './LineItemsTable'

// ─── Volatile Material Detection ──────────────────────────

const VOLATILE_CATEGORIES = ['steel', 'rebar', 'cement', 'concrete'] as const

function detectVolatileMaterials(
  lineItems: { productName: string }[],
): string[] {
  const found: string[] = []
  for (const item of lineItems) {
    const lower = item.productName.toLowerCase()
    for (const cat of VOLATILE_CATEGORIES) {
      if (lower.includes(cat) && !found.includes(cat)) {
        found.push(cat)
      }
    }
  }
  return found
}

export function ValidityPeriod() {
  const { t, i18n } = useTranslation('internal')
  const { control } = useFormContext<QuoteFormValues>()

  // Watch fields
  const validityDays = useWatch({ control, name: 'validityDays' }) ?? 14
  const lineItems = useWatch({ control, name: 'lineItems' })

  // Volatile material detection from line items
  const volatileMaterials = useMemo(
    () => detectVolatileMaterials(lineItems ?? []),
    [lineItems],
  )
  const hasVolatile = volatileMaterials.length > 0
  const showVolatileWarning = hasVolatile && validityDays > 14

  // Compute expiry date
  const expiryDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + validityDays)
    return d
  }, [validityDays])

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-4">
        {/* Validity Days NumberField */}
        <Controller
          control={control}
          name="validityDays"
          render={({ field }) => (
            <NumberField
              aria-label="Validity period in days"
              value={field.value ?? 14}
              onChange={(val) => field.onChange(val)}
              minValue={5}
              maxValue={30}
              step={1}
              className="flex flex-col gap-1"
            >
              <Label className="text-xs font-medium text-black/50 dark:text-white/50">
                Validity Period (days)
              </Label>
              <Group className="flex items-center rounded-lg border border-black/10 bg-white/60 backdrop-blur-sm dark:border-white/10 dark:bg-black/40">
                <AriaButton
                  slot="decrement"
                  className="px-3 py-2 text-sm text-black/40 outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:text-white/40 dark:data-[hovered]:bg-white/10"
                >
                  -
                </AriaButton>
                <Input className="w-16 border-x border-black/10 bg-transparent px-2 py-2 text-center font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums outline-none dark:border-white/10" />
                <AriaButton
                  slot="increment"
                  className="px-3 py-2 text-sm text-black/40 outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:text-white/40 dark:data-[hovered]:bg-white/10"
                >
                  +
                </AriaButton>
              </Group>
            </NumberField>
          )}
        />

        {/* Expiry Date Display */}
        <div className="pb-0.5">
          <p className="text-xs text-black/40 dark:text-white/40">Expires</p>
          <p className="font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums">
            {dateFmt.format(expiryDate)}
          </p>
        </div>
      </div>

      {/* Volatile Material Warning */}
      {showVolatileWarning && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-800 dark:bg-yellow-950/30">
          <span className="mt-0.5 text-yellow-600 dark:text-yellow-400" aria-hidden="true">
            &#9888;
          </span>
          <div>
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
              Steel and cement prices fluctuate -- consider shorter validity
            </p>
            <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
              This quote contains volatile materials ({volatileMaterials.join(', ')}).
              A validity period of 5-14 days is recommended to reduce price risk.
            </p>
          </div>
        </div>
      )}

      {/* Quick Set Buttons */}
      <div className="flex gap-2">
        {[7, 14, 21, 30].map((days) => (
          <Controller
            key={days}
            control={control}
            name="validityDays"
            render={({ field }) => (
              <button
                type="button"
                onClick={() => field.onChange(days)}
                className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                  field.value === days
                    ? 'border-[#2563EB] bg-[#2563EB]/5 text-[#2563EB]'
                    : 'border-black/10 text-black/50 hover:bg-black/3 dark:border-white/10 dark:text-white/50 dark:hover:bg-white/5'
                }`}
              >
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{days}</span> days
              </button>
            )}
          />
        ))}
      </div>
    </div>
  )
}
