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
} from 'react-aria-components'
import { PillGroup, Pill, UnderlineInput } from '../../ui'
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
    <div className="space-y-4">
      {/* Row 1: Method pills */}
      <Controller
        control={control}
        name="deliveryMethod"
        render={({ field }) => (
          <PillGroup
            aria-label="Delivery method"
            value={field.value || 'jobsite'}
            onChange={(val) => field.onChange(val)}
          >
            <Pill value="jobsite">Jobsite</Pill>
            <Pill value="pickup">Pickup</Pill>
            <Pill value="third_party">3rd Party</Pill>
          </PillGroup>
        )}
      />

      {/* Row 2: Date + Window — prominent, side by side */}
      <div className="flex items-baseline gap-6">
        <Controller
          control={control}
          name="deliveryDate"
          render={({ field }) => (
            <DatePicker
              aria-label="Delivery date"
              minValue={earliestDate}
              value={field.value ? parseDate(field.value) : null}
              onChange={(date) => field.onChange(date?.toString() ?? '')}
              className="relative z-10"
            >
              <Group className="flex items-center gap-1.5">
                <DateInput className="flex items-center">
                  {(segment) => (
                    <DateSegment
                      segment={segment}
                      className="rounded px-0.5 font-[family-name:var(--font-geist-mono)] text-[15px] font-medium tabular-nums outline-none
                        data-[focused]:bg-[var(--color-primary)]/10
                        data-[placeholder]:text-black/15 dark:data-[placeholder]:text-white/15"
                    />
                  )}
                </DateInput>
                <AriaButton className="rounded-md p-1 text-black/40 outline-none transition-colors
                  data-[hovered]:text-black/60 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
                  dark:text-white/40 dark:data-[hovered]:text-white/60">
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

        <span className="text-[12px] text-black/40 dark:text-white/40">{leadTimeDays}d lead</span>

        {truckBanActive ? (
          <span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-medium tabular-nums text-[var(--color-text)]">
            00:00–06:00
          </span>
        ) : (
          <Controller
            control={control}
            name="deliveryWindow"
            render={({ field }) => (
              <select
                value={field.value ?? '08:00-17:00'}
                onChange={(e) => field.onChange(e.target.value)}
                className="appearance-none bg-transparent font-[family-name:var(--font-geist-mono)] text-[15px] font-medium tabular-nums text-[var(--color-text)] outline-none cursor-pointer"
              >
                <option value="08:00-12:00">08:00–12:00</option>
                <option value="12:00-17:00">12:00–17:00</option>
                <option value="08:00-17:00">08:00–17:00</option>
                <option value="00:00-06:00">00:00–06:00</option>
              </select>
            )}
          />
        )}

        {truckBanActive && (
          <span className="text-[12px] text-black/40 dark:text-white/40">Night only — Cairo ban</span>
        )}
      </div>

      {/* Row 3: Metadata — zone, cost, free delivery */}
      <div className="flex items-center gap-2 text-[12px] text-black/40 dark:text-white/40">
        <span>
          Zone {deliveryZone.zone}
          <span className="mx-1">·</span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
            {qualifiesForFreeDelivery ? (
              <span className="text-green-700 dark:text-green-400">Free</span>
            ) : (
              fmt.format(baseCost)
            )}
          </span>
        </span>

        {weightSurcharge > 0 && (
          <span>
            · +{fmt.format(weightSurcharge)}
            <span className="ms-0.5 font-[family-name:var(--font-geist-mono)] tabular-nums">
              ({totalWeightTons.toFixed(1)}t)
            </span>
          </span>
        )}

        {!qualifiesForFreeDelivery && subtotal > FREE_DELIVERY_THRESHOLD * 0.7 && (
          <span>
            ·{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {fmt.format(FREE_DELIVERY_THRESHOLD - subtotal)}
            </span>
            {' '}to free delivery
          </span>
        )}
      </div>

      {/* Row 4: Notes */}
      <Controller
        control={control}
        name="specialInstructions"
        render={({ field }) => (
          <UnderlineInput
            value={field.value ?? ''}
            onChange={(val) => field.onChange(val)}
            placeholder="Delivery notes..."
            label="Special instructions"
          />
        )}
      />
    </div>
  )
}
