import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { RadioGroup, Radio } from 'react-aria-components'
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
  const { i18n } = useTranslation('internal')
  const { control, setValue } = useFormContext<QuoteFormValues>()

  const validityDays = useWatch({ control, name: 'validityDays' }) ?? 14
  const lineItems = useWatch({ control, name: 'lineItems' })

  const volatileMaterials = useMemo(
    () => detectVolatileMaterials(lineItems ?? []),
    [lineItems],
  )
  const hasVolatile = volatileMaterials.length > 0
  const defaultDays = hasVolatile ? 7 : 14

  // Auto-set validity when volatile detection changes
  const prevHasVolatileRef = useRef(hasVolatile)
  useEffect(() => {
    if (prevHasVolatileRef.current !== hasVolatile) {
      prevHasVolatileRef.current = hasVolatile
      setValue('validityDays', defaultDays)
    }
  }, [hasVolatile, defaultDays, setValue])

  const expiryDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + validityDays)
    return d
  }, [validityDays])

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const dateFmt = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="flex items-center gap-3">
      {/* 4 pills in one row */}
      <Controller
        control={control}
        name="validityDays"
        render={({ field }) => (
          <RadioGroup
            aria-label="Validity period"
            value={String(field.value ?? 14)}
            onChange={(val) => field.onChange(Number(val))}
            className="flex gap-1"
          >
            {[7, 14, 21, 30].map((days) => (
              <Radio
                key={days}
                value={String(days)}
                className="cursor-pointer rounded-full border border-black/[0.08] px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[11px] font-medium tabular-nums outline-none transition-all
                  data-[selected]:border-[var(--color-primary)] data-[selected]:bg-[var(--color-primary)] data-[selected]:text-white
                  data-[hovered]:bg-black/[0.02] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
                  dark:border-white/[0.08] dark:data-[selected]:border-[var(--color-primary)]
                  dark:data-[hovered]:bg-white/[0.03]"
              >
                {days}d
              </Radio>
            ))}
          </RadioGroup>
        )}
      />

      {/* Expiry inline */}
      <span className="text-[11px] text-[var(--color-text-muted)]">
        Expires{' '}
        <span className="font-[family-name:var(--font-geist-mono)] font-medium tabular-nums text-[var(--color-text)]">
          {dateFmt.format(expiryDate)}
        </span>
      </span>

      {/* Volatile note -- tiny inline */}
      {hasVolatile && (
        <span className="text-[10px] text-yellow-600 dark:text-yellow-400">
          Shortened — {volatileMaterials.join(', ')}
        </span>
      )}
    </div>
  )
}
