import { useMemo } from 'react'
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
  TextArea,
  TextField,
} from 'react-aria-components'
import { today, getLocalTimeZone, parseDate } from '@internationalized/date'
import type { QuoteFormValues } from './LineItemsTable'

// ─── Cairo Truck Ban Logic ────────────────────────────────

const CAIRO_PATTERNS = [
  'cairo',
  'القاهرة',
  'giza',
  'الجيزة',
  'helwan',
  'حلوان',
  '6th of october',
  '٦ أكتوبر',
  'new cairo',
  'القاهرة الجديدة',
  'nasr city',
  'مدينة نصر',
  'maadi',
  'المعادي',
]

const HEAVY_WEIGHT_TONS = 5

function isGreaterCairoAddress(address: string): boolean {
  const lower = address.toLowerCase()
  return CAIRO_PATTERNS.some((p) => lower.includes(p))
}

interface DeliveryTermsProps {
  deliveryAddress: string
  /** Total order weight in tons */
  totalWeightTons: number
  /** Minimum lead time in business days */
  leadTimeDays?: number
}

// Delivery zones
const DELIVERY_ZONES = [
  { zone: 1, label: '0-25 km', baseCost: 500 },
  { zone: 2, label: '25-50 km', baseCost: 1200 },
  { zone: 3, label: '50-100 km', baseCost: 2500 },
] as const

const FREE_DELIVERY_THRESHOLD = 100_000 // EGP

export function DeliveryTerms({
  deliveryAddress,
  totalWeightTons,
  leadTimeDays = 3,
}: DeliveryTermsProps) {
  const { t, i18n } = useTranslation('internal')
  const { control, setValue } = useFormContext<QuoteFormValues>()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  })

  // Watch line items for subtotal computation
  const lineItems = useWatch({ control, name: 'lineItems' })
  const subtotal = lineItems?.reduce((sum, item) => sum + (item.lineTotal || 0), 0) ?? 0

  // Cairo truck ban enforcement
  const isCairoDelivery = isGreaterCairoAddress(deliveryAddress)
  const isHeavyOrder = totalWeightTons > HEAVY_WEIGHT_TONS
  const truckBanActive = isCairoDelivery && isHeavyOrder

  // Earliest feasible date
  const earliestDate = useMemo(() => {
    const d = today(getLocalTimeZone())
    return d.add({ days: leadTimeDays })
  }, [leadTimeDays])

  // Delivery cost based on zone (mock zone 1 for now -- actual zone from geocoding)
  const deliveryZone = DELIVERY_ZONES[0]
  const weightSurcharge = totalWeightTons > 10 ? Math.round((totalWeightTons - 10) * 150) : 0
  const baseCost = deliveryZone.baseCost + weightSurcharge
  const qualifiesForFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD

  return (
    <div className="space-y-4">
      {/* Cairo Truck Ban Alert */}
      {truckBanActive && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-800 dark:bg-yellow-950/30">
          <span className="mt-0.5 text-yellow-600 dark:text-yellow-400" aria-hidden="true">
            &#9888;
          </span>
          <div>
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
              Heavy materials in Cairo require night delivery (12AM-6AM) per truck ban regulations.
            </p>
            <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
              Orders exceeding {HEAVY_WEIGHT_TONS} tons in Greater Cairo are restricted to 12AM-6AM delivery windows.
              This cannot be overridden.
            </p>
          </div>
        </div>
      )}

      {/* Delivery Date */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="deliveryDate"
          render={({ field }) => (
            <DatePicker
              aria-label="Delivery date"
              minValue={earliestDate}
              value={field.value ? parseDate(field.value) : null}
              onChange={(date) => {
                field.onChange(date?.toString() ?? '')
              }}
              className="flex flex-col gap-1"
            >
              <Label className="text-xs font-medium text-black/50 dark:text-white/50">
                Delivery Date
              </Label>
              <Group className="flex rounded-lg border border-black/10 bg-white/60 backdrop-blur-sm dark:border-white/10 dark:bg-black/40">
                <DateInput className="flex flex-1 items-center px-3 py-2">
                  {(segment) => (
                    <DateSegment
                      segment={segment}
                      className="rounded px-0.5 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums outline-none data-[focused]:bg-[#2563EB]/10 data-[placeholder]:text-black/30 dark:data-[placeholder]:text-white/30"
                    />
                  )}
                </DateInput>
                <AriaButton className="rounded-e-lg px-3 text-black/40 outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:text-white/40 dark:data-[hovered]:bg-white/10">
                  &#128197;
                </AriaButton>
              </Group>
              <Popover>
                <Dialog className="rounded-xl border border-black/10 bg-white/95 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/95">
                  <Calendar>
                    <header className="mb-2 flex items-center justify-between">
                      <AriaButton slot="previous" className="rounded p-1 text-sm outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:data-[hovered]:bg-white/10">
                        &lt;
                      </AriaButton>
                      <Heading className="text-sm font-semibold" />
                      <AriaButton slot="next" className="rounded p-1 text-sm outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:data-[hovered]:bg-white/10">
                        &gt;
                      </AriaButton>
                    </header>
                    <CalendarGrid>
                      <CalendarGridHeader>
                        {(day) => (
                          <CalendarHeaderCell className="pb-2 text-xs font-medium text-black/40 dark:text-white/40">
                            {day}
                          </CalendarHeaderCell>
                        )}
                      </CalendarGridHeader>
                      <CalendarGridBody>
                        {(date) => (
                          <CalendarCell
                            date={date}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-sm outline-none data-[hovered]:bg-black/5 data-[selected]:bg-[#2563EB] data-[selected]:text-white data-[unavailable]:text-black/20 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:data-[hovered]:bg-white/10 dark:data-[unavailable]:text-white/20"
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

        {/* Delivery Window (disabled when truck ban active) */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs font-medium text-black/50 dark:text-white/50">
            Delivery Window
          </Label>
          {truckBanActive ? (
            <div className="flex items-center rounded-lg border border-yellow-200 bg-yellow-50/50 px-3 py-2 dark:border-yellow-800 dark:bg-yellow-950/20">
              <span className="font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums text-yellow-800 dark:text-yellow-200">
                12:00 AM - 06:00 AM
              </span>
              <span className="ms-2 text-xs text-yellow-600 dark:text-yellow-400">(Night delivery only)</span>
            </div>
          ) : (
            <Controller
              control={control}
              name="deliveryWindow"
              render={({ field }) => (
                <select
                  value={field.value ?? '08:00-17:00'}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums backdrop-blur-sm outline-none focus:ring-2 focus:ring-[#2563EB]/50 dark:border-white/10 dark:bg-black/40"
                >
                  <option value="08:00-12:00">08:00 AM - 12:00 PM</option>
                  <option value="12:00-17:00">12:00 PM - 05:00 PM</option>
                  <option value="08:00-17:00">08:00 AM - 05:00 PM (Full day)</option>
                  <option value="00:00-06:00">12:00 AM - 06:00 AM (Night)</option>
                </select>
              )}
            />
          )}
        </div>
      </div>

      {/* Delivery Method */}
      <Controller
        control={control}
        name="deliveryMethod"
        render={({ field }) => (
          <RadioGroup
            aria-label="Delivery method"
            value={field.value || 'jobsite'}
            onChange={(val) => field.onChange(val)}
            className="flex flex-col gap-1"
          >
            <Label className="text-xs font-medium text-black/50 dark:text-white/50">
              Delivery Method
            </Label>
            <div className="flex gap-3">
              {[
                { value: 'jobsite', label: 'Jobsite Delivery' },
                { value: 'pickup', label: 'Customer Pickup' },
                { value: 'third_party', label: 'Third-Party Carrier' },
              ].map((opt) => (
                <Radio
                  key={opt.value}
                  value={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none transition-colors
                    data-[selected]:border-[#2563EB] data-[selected]:bg-[#2563EB]/5
                    data-[hovered]:bg-black/3 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                    dark:border-white/10 dark:data-[selected]:border-[#2563EB] dark:data-[selected]:bg-[#2563EB]/10
                    dark:data-[hovered]:bg-white/5"
                >
                  {opt.label}
                </Radio>
              ))}
            </div>
          </RadioGroup>
        )}
      />

      {/* Special Instructions */}
      <Controller
        control={control}
        name="specialInstructions"
        render={({ field }) => (
          <TextField
            aria-label="Special instructions"
            className="flex flex-col gap-1"
          >
            <Label className="text-xs font-medium text-black/50 dark:text-white/50">
              Special Instructions
            </Label>
            <TextArea
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              placeholder="Crane offload, restricted hours, multiple drops..."
              rows={3}
              className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm backdrop-blur-sm outline-none placeholder:text-black/30 focus:ring-2 focus:ring-[#2563EB]/50 dark:border-white/10 dark:bg-black/40 dark:placeholder:text-white/30"
            />
          </TextField>
        )}
      />

      {/* Delivery Cost Summary */}
      <div className="rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]">
        <p className="text-xs font-medium text-black/50 dark:text-white/50">Delivery Cost</p>
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-black/60 dark:text-white/60">
              Zone {deliveryZone.zone} ({deliveryZone.label})
            </span>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {fmt.format(deliveryZone.baseCost)}
            </span>
          </div>
          {weightSurcharge > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-black/60 dark:text-white/60">
                Weight surcharge ({totalWeightTons.toFixed(1)}t)
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                {fmt.format(weightSurcharge)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-black/10 pt-1 text-sm font-medium dark:border-white/10">
            <span>
              {qualifiesForFreeDelivery ? (
                <span className="text-green-700 dark:text-green-400">
                  Order qualifies for free delivery
                </span>
              ) : (
                'Delivery total'
              )}
            </span>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {qualifiesForFreeDelivery ? fmt.format(0) : fmt.format(baseCost)}
            </span>
          </div>
          {!qualifiesForFreeDelivery && (
            <p className="text-xs text-black/40 dark:text-white/40">
              Add {fmt.format(FREE_DELIVERY_THRESHOLD - subtotal)} more for free delivery
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
