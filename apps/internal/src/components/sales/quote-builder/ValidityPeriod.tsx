import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { PillGroup, Pill } from '../../ui'
import type { QuoteFormValues } from './types'

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
    <div className="flex items-center gap-4">
      <Controller
        control={control}
        name="validityDays"
        render={({ field }) => (
          <PillGroup
            aria-label="Validity period"
            value={String(field.value ?? 14)}
            onChange={(val) => field.onChange(Number(val))}
          >
            {[7, 14, 21, 30].map((days) => (
              <Pill key={days} value={String(days)} mono className="px-2.5 py-1">
                {days}d
              </Pill>
            ))}
          </PillGroup>
        )}
      />

      <span className="text-black/40 dark:text-white/40">→</span>

      <span className="font-[family-name:var(--font-geist-mono)] text-[16px] font-medium tabular-nums text-[var(--color-text)]">
        {dateFmt.format(expiryDate)}
      </span>

      {hasVolatile && (
        <>
          <span className="text-black/40 dark:text-white/40">·</span>
          <span className="text-[12px] text-yellow-600 dark:text-yellow-400">
            Shortened — {volatileMaterials.join(', ')}
          </span>
        </>
      )}
    </div>
  )
}
