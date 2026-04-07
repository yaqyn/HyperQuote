import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import {
  DatePicker,
  DateInput,
  DateSegment,
  Calendar,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarCell,
  Heading,
  Button as AriaButton,
  Popover,
  Dialog,
  Group,
  Label,
  RadioGroup,
  Radio,
  Input,
  TextField,
} from 'react-aria-components'
import { today, getLocalTimeZone, parseDate } from '@internationalized/date'
import type { QuoteFormValues } from './LineItemsTable'

// ─── Cairo Truck Ban Logic ────────────────────────────────

const CAIRO_PATTERNS = [
  'cairo', 'القاهرة', 'giza', 'الجيزة', 'helwan', 'حلوان',
  '6th of october', '٦ أكتوبر', 'new cairo', 'القاهرة الجديدة',
  'nasr city', 'مدينة نصر', 'maadi', 'المعادي',
  'heliopolis', 'مصر الجديدة', '6th october', '6 october',
]

const HEAVY_WEIGHT_TONS = 5
const HEAVY_CATEGORIES = ['cement', 'steel', 'rebar', 'concrete'] as const

function isGreaterCairoAddress(address: string): boolean {
  const lower = address.toLowerCase()
  return CAIRO_PATTERNS.some((p) => lower.includes(p))
}

function hasHeavyMaterials(lineItems: { productName: string }[]): boolean {
  return lineItems.some((item) => {
    const lower = item.productName.toLowerCase()
    return HEAVY_CATEGORIES.some((cat) => lower.includes(cat))
  })
}

interface DeliveryTermsProps {
  deliveryAddress: string
  totalWeightTons: number
  leadTimeDays?: number
}

const DELIVERY_ZONES = [
  { zone: 1, label: '0-25 km', baseCost: 500 },
  { zone: 2, label: '25-50 km', baseCost: 1200 },
  { zone: 3, label: '50-100 km', baseCost: 2500 },
] as const

const FREE_DELIVERY_THRESHOLD = 100_000

export function DeliveryTerms({
  deliveryAddress,
  totalWeightTons,
  leadTimeDays = 3,
}: DeliveryTermsProps) {
  const { i18n } = useTranslation('internal')
  const { control, setValue: setFormValue } = useFormContext<QuoteFormValues>()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  })

  const lineItems = useWatch({ control, name: 'lineItems' })
  const subtotal = lineItems?.reduce((sum, item) => sum + (item.lineTotal || 0), 0) ?? 0

  const isCairoDelivery = isGreaterCairoAddress(deliveryAddress)
  const isHeavyByWeight = totalWeightTons > HEAVY_WEIGHT_TONS
  const isHeavyByCategory = hasHeavyMaterials(lineItems ?? [])
  const isHeavyOrder = isHeavyByWeight || isHeavyByCategory
  const truckBanActive = isCairoDelivery && isHeavyOrder

  // Enforce night delivery window when truck ban is active
  useEffect(() => {
    if (truckBanActive) {
      setFormValue('deliveryWindow', '00:00-06:00')
    }
  }, [truckBanActive, setFormValue])

  const earliestDate = useMemo(() => {
    const d = today(getLocalTimeZone())
    return d.add({ days: leadTimeDays })
  }, [leadTimeDays])

  const deliveryZone = DELIVERY_ZONES[0]
  const weightSurcharge = totalWeightTons > 10 ? Math.round((totalWeightTons - 10) * 150) : 0
  const baseCost = deliveryZone.baseCost + weightSurcharge
  const qualifiesForFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD

  return (
    <div className="space-y-3">
      {/* Truck ban -- single compact line */}
      {truckBanActive && (
        <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
          Night delivery only (Cairo truck ban)
        </p>
      )}

      {/* Date + Window + Method -- one horizontal row */}
      <div className="flex items-end gap-3">
        {/* Date */}
        <Controller
          control={control}
          name="deliveryDate"
          render={({ field }) => (
            <DatePicker
              aria-label="Delivery date"
              minValue={earliestDate}
              value={field.value ? parseDate(field.value) : null}
              onChange={(date) => field.onChange(date?.toString() ?? '')}
              className="group flex min-w-0 flex-col gap-0.5"
            >
              <Label className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-text-subtle)]">
                Date
              </Label>
              <Group className="flex rounded-md border border-black/[0.08] transition-colors focus-within:border-[var(--color-primary)] dark:border-white/[0.08]">
                <DateInput className="flex flex-1 items-center px-2 py-1.5">
                  {(segment) => (
                    <DateSegment
                      segment={segment}
                      className="rounded px-0.5 font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums outline-none data-[focused]:bg-[var(--color-primary)]/10 data-[placeholder]:text-black/25 dark:data-[placeholder]:text-white/25"
                    />
                  )}
                </DateInput>
                <AriaButton className="px-2 text-[var(--color-text-subtle)] outline-none data-[hovered]:bg-black/[0.03] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50 dark:data-[hovered]:bg-white/[0.06]">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
                    <path d="M1.5 5.5h11M4.5 1v2.5M9.5 1v2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                  </svg>
                </AriaButton>
              </Group>
              <Popover>
                <Dialog className="rounded-xl border border-black/[0.06] bg-white/95 p-4 shadow-xl backdrop-blur-2xl dark:border-white/[0.06] dark:bg-black/95">
                  <Calendar>
                    <header className="mb-2 flex items-center justify-between">
                      <AriaButton slot="previous" className="rounded p-1 text-[13px] outline-none data-[hovered]:bg-black/[0.03] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50 dark:data-[hovered]:bg-white/[0.06]">
                        &lt;
                      </AriaButton>
                      <Heading className="text-[13px] font-semibold" />
                      <AriaButton slot="next" className="rounded p-1 text-[13px] outline-none data-[hovered]:bg-black/[0.03] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50 dark:data-[hovered]:bg-white/[0.06]">
                        &gt;
                      </AriaButton>
                    </header>
                    <CalendarGrid>
                      <CalendarGridHeader>
                        {(day) => (
                          <CalendarHeaderCell className="pb-2 text-[11px] font-medium text-[var(--color-text-subtle)]">
                            {day}
                          </CalendarHeaderCell>
                        )}
                      </CalendarGridHeader>
                      <CalendarGridBody>
                        {(date) => (
                          <CalendarCell
                            date={date}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] outline-none data-[hovered]:bg-black/[0.03] data-[selected]:bg-[var(--color-primary)] data-[selected]:text-white data-[unavailable]:text-black/15 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50 dark:data-[hovered]:bg-white/[0.06] dark:data-[unavailable]:text-white/15"
                          />
                        )}
                      </CalendarGridBody>
                    </CalendarGrid>
                  </Calendar>
                </Dialog>
              </Popover>
            </DatePicker>
          )}
        />

        {/* Window */}
        <div className="flex min-w-0 flex-col gap-0.5">
          <Label className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-text-subtle)]">
            Window
          </Label>
          {truckBanActive ? (
            <div className="flex items-center rounded-md border border-red-200 bg-red-50/50 px-2 py-1.5 dark:border-red-800 dark:bg-red-950/20">
              <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-red-700 dark:text-red-300">
                00:00–06:00
              </span>
            </div>
          ) : (
            <Controller
              control={control}
              name="deliveryWindow"
              render={({ field }) => (
                <select
                  value={field.value ?? '08:00-17:00'}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="rounded-md border border-black/[0.08] px-2 py-1.5 font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums outline-none transition-colors focus:border-[var(--color-primary)] dark:border-white/[0.08]"
                >
                  <option value="08:00-12:00">08:00–12:00</option>
                  <option value="12:00-17:00">12:00–17:00</option>
                  <option value="08:00-17:00">08:00–17:00</option>
                  <option value="00:00-06:00">00:00–06:00</option>
                </select>
              )}
            />
          )}
        </div>

        {/* Method pills */}
        <Controller
          control={control}
          name="deliveryMethod"
          render={({ field }) => (
            <RadioGroup
              aria-label="Delivery method"
              value={field.value || 'jobsite'}
              onChange={(val) => field.onChange(val)}
              className="flex min-w-0 flex-col gap-0.5"
            >
              <Label className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-text-subtle)]">
                Method
              </Label>
              <div className="flex gap-1">
                {[
                  { value: 'jobsite', label: 'Jobsite' },
                  { value: 'pickup', label: 'Pickup' },
                  { value: 'third_party', label: '3rd Party' },
                ].map((opt) => (
                  <Radio
                    key={opt.value}
                    value={opt.value}
                    className="cursor-pointer rounded-full border border-black/[0.08] px-3 py-1 text-[11px] font-medium outline-none transition-all
                      data-[selected]:border-[var(--color-primary)] data-[selected]:bg-[var(--color-primary)] data-[selected]:text-white
                      data-[hovered]:bg-black/[0.02] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
                      dark:border-white/[0.08] dark:data-[selected]:border-[var(--color-primary)]
                      dark:data-[hovered]:bg-white/[0.03]"
                  >
                    {opt.label}
                  </Radio>
                ))}
              </div>
            </RadioGroup>
          )}
        />

        {/* Zone cost inline */}
        <div className="flex flex-col gap-0.5 pb-1">
          <span className="text-[10px] text-[var(--color-text-subtle)]">
            Zone {deliveryZone.zone}
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[12px] font-medium tabular-nums">
            {qualifiesForFreeDelivery ? (
              <span className="text-green-700 dark:text-green-400">Free</span>
            ) : (
              fmt.format(baseCost)
            )}
          </span>
        </div>
      </div>

      {/* Special instructions -- single line, expands on focus */}
      <Controller
        control={control}
        name="specialInstructions"
        render={({ field }) => (
          <TextField
            aria-label="Special instructions"
            className="flex items-center gap-2"
          >
            <Label className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-[var(--color-text-subtle)]">
              Notes
            </Label>
            <Input
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              placeholder="Crane offload, restricted hours, multiple drops..."
              className="w-full rounded-md border border-black/[0.08] px-2 py-1.5 text-[12px] outline-none transition-colors placeholder:text-black/20 focus:border-[var(--color-primary)] dark:border-white/[0.08] dark:placeholder:text-white/20"
            />
          </TextField>
        )}
      />

      {/* Weight surcharge if applicable */}
      {weightSurcharge > 0 && (
        <p className="text-[11px] text-[var(--color-text-muted)]">
          +{fmt.format(weightSurcharge)} weight surcharge ({totalWeightTons.toFixed(1)}t)
        </p>
      )}
      {!qualifiesForFreeDelivery && (
        <p className="text-[11px] text-[var(--color-text-subtle)]">
          {fmt.format(FREE_DELIVERY_THRESHOLD - subtotal)} more for free delivery
        </p>
      )}
    </div>
  )
}
