import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import {
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
  DialogTrigger,
  Select,
  SelectValue,
  ListBox,
  ListBoxItem,
} from 'react-aria-components'
import { PillGroup, Pill, UnderlineInput } from '../../ui'
import { today, getLocalTimeZone, parseDate } from '@internationalized/date'
import type { QuoteFormValues } from './types'

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

  const latestDate = useMemo(() => today(getLocalTimeZone()).add({ months: 1 }), [])

  const deliveryZone = DELIVERY_ZONES[0]
  const weightSurcharge = totalWeightTons > 10 ? Math.round((totalWeightTons - 10) * 150) : 0
  const baseCost = deliveryZone.baseCost + weightSurcharge
  const qualifiesForFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD

  return (
    <div className="space-y-4">
      {/* Date + Window */}
      <div className="flex items-baseline gap-6">
        <Controller
          control={control}
          name="deliveryDate"
          render={({ field }) => {
            const parsed = field.value ? parseDate(field.value) : null
            const formatted = parsed
              ? parsed.toDate(getLocalTimeZone()).toLocaleDateString(locale, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : null
            return (
              <DialogTrigger>
                <AriaButton
                  aria-label="Delivery date"
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 outline-none transition-colors
                    data-[hovered]:bg-black/[0.04] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
                    dark:data-[hovered]:bg-white/[0.06]"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-black/40 dark:text-white/40">
                    <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
                    <path d="M1.5 5.5h11M4.5 1v2.5M9.5 1v2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                  </svg>
                  {formatted ? (
                    <span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-medium tabular-nums text-[var(--color-text)]">
                      {formatted}
                    </span>
                  ) : (
                    <span className="text-[13px] italic text-black/40 dark:text-white/40">Pick a date</span>
                  )}
                </AriaButton>
                <Popover placement="bottom start">
                  <Dialog aria-label="Delivery date picker" className="cursor-default select-none rounded-xl border border-black/[0.06] bg-white p-4 shadow-xl outline-none dark:border-white/[0.06] dark:bg-black">
                    {({ close }) => (
                      <Calendar
                        aria-label="Delivery date"
                        minValue={earliestDate}
                        maxValue={latestDate}
                        value={parsed}
                        onChange={(date) => {
                          field.onChange(date?.toString() ?? '')
                          close()
                        }}
                      >
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
                                className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] outline-none data-[hovered]:bg-black/[0.03] data-[selected]:bg-[var(--color-primary)] data-[selected]:text-white data-[unavailable]:text-black/15 data-[outside-month]:invisible data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50 dark:data-[hovered]:bg-white/[0.06] dark:data-[unavailable]:text-white/15"
                              />
                            )}
                          </CalendarGridBody>
                        </CalendarGrid>
                      </Calendar>
                    )}
                  </Dialog>
                </Popover>
              </DialogTrigger>
            )
          }}
        />

        <span className="text-[12px] text-black/40 dark:text-white/40">{leadTimeDays}d lead</span>

        <Controller
          control={control}
          name="deliveryWindow"
          render={({ field }) => {
            const windows = [
              { id: '08:00-13:00', label: 'Morning', range: '08:00–13:00' },
              { id: '13:00-17:00', label: 'Midday', range: '13:00–17:00' },
              { id: '17:00-20:00', label: 'Evening', range: '17:00–20:00' },
            ]
            const value = field.value ?? '08:00-13:00'
            const current = windows.find((w) => w.id === value) ?? windows[0]
            return (
              <Select
                selectedKey={value}
                onSelectionChange={(key) => field.onChange(String(key))}
                aria-label="Delivery window"
              >
                <AriaButton className="group inline-flex items-baseline gap-2 outline-none cursor-pointer">
                  <SelectValue>
                    {() => (
                      <span className="inline-flex items-baseline gap-2">
                        <span className="text-[14px] font-medium text-[var(--color-text)]">{current.label}</span>
                        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/30 dark:text-white/30">{current.range}</span>
                      </span>
                    )}
                  </SelectValue>
                  <svg width="8" height="8" viewBox="0 0 14 14" fill="none" className="text-black/25 dark:text-white/25 transition-transform group-data-[open]:rotate-180">
                    <path d="M3.5 5l3.5 3.5L10.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </AriaButton>
                <Popover>
                  <Dialog aria-label="Delivery location" className="outline-none">
                    <ListBox
                      items={windows}
                      className="min-w-[200px] rounded-lg border border-black/[0.06] bg-white p-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] outline-none dark:border-white/[0.08] dark:bg-[#0f0f0f]"
                    >
                      {(item) => (
                        <ListBoxItem
                          id={item.id}
                          textValue={`${item.label} ${item.range}`}
                          className="flex cursor-pointer items-baseline justify-between gap-4 rounded-md px-3 py-2 outline-none transition-colors hover:bg-black/[0.03] selected:bg-black/[0.04] dark:hover:bg-white/[0.03] dark:selected:bg-white/[0.05]"
                        >
                          <span className="text-[13px] font-medium text-[var(--color-text)]">{item.label}</span>
                          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/35 dark:text-white/35">{item.range}</span>
                        </ListBoxItem>
                      )}
                    </ListBox>
                  </Dialog>
                </Popover>
              </Select>
            )
          }}
        />

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
