import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { Button, Checkbox, Select, SelectValue, Popover, ListBox, ListBoxItem, Label } from 'react-aria-components'
import { getBulkReceivingState } from '../../../lib/server/warehouse-receiving'
import { calculateNetWeight } from '../../../lib/warehouse/weight-conversions'
import { useWarehouseStore } from '../../../stores/warehouse'
import { LargeNumberInput } from '../shared/LargeNumberInput'
import { PhotoCapture } from '../shared/PhotoCapture'

interface ActiveReceivingBulkProps {
  deliveryId: string
}

interface BulkFormData {
  grossWeight: number
  tareWeight: number
  contaminationCheck: boolean
  materialTypeVerified: boolean
  dumpLocation: string
  weighTicketPhoto: File | null
}

const YARD_ZONES = [
  { id: 'yard-zone-a', label: 'Yard Zone A' },
  { id: 'yard-zone-b', label: 'Yard Zone B' },
  { id: 'yard-zone-c', label: 'Yard Zone C' },
  { id: 'yard-zone-d', label: 'Yard Zone D' },
]

/**
 * Bulk/weight-based receiving per spec section 4.4.
 * Gross/tare/net weight calculation with running PO totals.
 * All numbers use Geist Mono.
 */
export function ActiveReceivingBulk({ deliveryId }: ActiveReceivingBulkProps) {
  const { t, i18n } = useTranslation('internal')
  const setSelectedReceivingId = useWarehouseStore((s) => s.setSelectedReceivingId)

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
  const numFmt = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const { data: bulkState } = useQuery({
    queryKey: ['warehouse', 'bulk-receiving', deliveryId],
    queryFn: () => getBulkReceivingState({ data: { poId: deliveryId } }),
    staleTime: 30_000,
  })

  const { control, handleSubmit } = useForm<BulkFormData>({
    defaultValues: {
      grossWeight: 0,
      tareWeight: 0,
      contaminationCheck: false,
      materialTypeVerified: false,
      dumpLocation: '',
      weighTicketPhoto: null,
    },
  })

  // Reactive net weight using useWatch
  const grossWeight = useWatch({ control, name: 'grossWeight' }) ?? 0
  const tareWeight = useWatch({ control, name: 'tareWeight' }) ?? 0
  const netWeight = calculateNetWeight(grossWeight, tareWeight)

  // Running totals
  const previouslyReceived = bulkState?.previouslyReceived ?? 0
  const poTotal = bulkState?.poTotal ?? 0
  const remaining = poTotal - previouslyReceived - netWeight
  const unit = bulkState?.unit ?? 'kg'

  const onSubmit = handleSubmit((_data) => {
    // TODO: Submit bulk receiving via server function
    setSelectedReceivingId(null)
  })

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onPress={() => setSelectedReceivingId(null)}
          className="text-sm text-[#2563EB] cursor-pointer hover:underline"
        >
          {t('common.back', 'Back')}
        </Button>
        <h2 className="text-sm font-semibold">
          {t('warehouse.receiving.bulkReceiving', 'Bulk Receiving')}
        </h2>
        <div className="w-16" />
      </div>

      {/* PO quantity */}
      <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.02] p-3">
        <span className="text-xs text-black/50 dark:text-white/50">
          {t('warehouse.receiving.poQuantity', 'PO Quantity')}
        </span>
        <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-semibold">
          {numFmt.format(poTotal)} {unit}
        </div>
      </div>

      {/* Weight inputs */}
      <div className="flex flex-col gap-4">
        <Controller
          name="grossWeight"
          control={control}
          render={({ field }) => (
            <LargeNumberInput
              label={t('warehouse.receiving.grossWeight', 'Gross Weight')}
              value={field.value}
              onChange={field.onChange}
              minValue={0}
              unit={unit}
            />
          )}
        />

        <Controller
          name="tareWeight"
          control={control}
          render={({ field }) => (
            <LargeNumberInput
              label={t('warehouse.receiving.tareWeight', 'Tare Weight')}
              value={field.value}
              onChange={field.onChange}
              minValue={0}
              unit={unit}
            />
          )}
        />

        {/* Auto-calculated net weight */}
        <div className="rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/5 p-4">
          <span className="text-xs text-black/50 dark:text-white/50">
            {t('warehouse.receiving.netWeight', 'Net Weight')}
          </span>
          <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[#2563EB]">
            {numFmt.format(netWeight)} {unit}
          </div>
        </div>
      </div>

      {/* Running PO total */}
      <div className="grid grid-cols-3 gap-3">
        <RunningTotalCard
          label={t('warehouse.receiving.previouslyReceived', 'Previously Received')}
          value={numFmt.format(previouslyReceived)}
          unit={unit}
        />
        <RunningTotalCard
          label={t('warehouse.receiving.thisLoad', 'This Load')}
          value={numFmt.format(netWeight)}
          unit={unit}
          highlight
        />
        <RunningTotalCard
          label={t('warehouse.receiving.remaining', 'Remaining')}
          value={numFmt.format(Math.max(0, remaining))}
          unit={unit}
          warning={remaining < 0}
        />
      </div>

      {/* Quality checks */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-black/80 dark:text-white/80">
          {t('warehouse.receiving.qualityChecks', 'Quality Checks')}
        </h3>

        <Controller
          name="contaminationCheck"
          control={control}
          render={({ field }) => (
            <Checkbox
              isSelected={field.value}
              onChange={field.onChange}
              className="group flex items-center gap-3 cursor-pointer"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-black/20 dark:border-white/20 transition-colors group-data-[selected]:bg-[#2563EB] group-data-[selected]:border-[#2563EB]">
                <svg
                  className="h-3.5 w-3.5 text-white opacity-0 group-data-[selected]:opacity-100 transition-opacity"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm text-black/70 dark:text-white/70">
                {t('warehouse.receiving.contaminationCheck', 'No contamination detected')}
              </span>
            </Checkbox>
          )}
        />

        <Controller
          name="materialTypeVerified"
          control={control}
          render={({ field }) => (
            <Checkbox
              isSelected={field.value}
              onChange={field.onChange}
              className="group flex items-center gap-3 cursor-pointer"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-black/20 dark:border-white/20 transition-colors group-data-[selected]:bg-[#2563EB] group-data-[selected]:border-[#2563EB]">
                <svg
                  className="h-3.5 w-3.5 text-white opacity-0 group-data-[selected]:opacity-100 transition-opacity"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm text-black/70 dark:text-white/70">
                {t('warehouse.receiving.materialVerified', 'Material type matches PO')}
              </span>
            </Checkbox>
          )}
        />
      </div>

      {/* Dump location */}
      <Controller
        name="dumpLocation"
        control={control}
        render={({ field }) => (
          <Select
            selectedKey={field.value || undefined}
            onSelectionChange={(key) => field.onChange(key as string)}
            className="flex flex-col gap-1"
          >
            <Label className="text-sm font-medium text-[var(--color-text-secondary)]">
              {t('warehouse.receiving.dumpLocation', 'Dump Location')}
            </Label>
            <Button className="flex items-center justify-between rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-start cursor-pointer">
              <SelectValue placeholder={t('warehouse.receiving.selectZone', 'Select yard zone...')} />
            </Button>
            <Popover className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
              <ListBox className="p-1 outline-none">
                {YARD_ZONES.map((zone) => (
                  <ListBoxItem
                    key={zone.id}
                    id={zone.id}
                    className="rounded-md px-3 py-2 text-sm cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10 data-[selected]:font-semibold"
                  >
                    {zone.label}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>
        )}
      />

      {/* Weigh ticket photo */}
      <PhotoCapture
        label={t('warehouse.receiving.weighTicket', 'Weigh Ticket Scan/Photo')}
        onCapture={() => {}}
      />

      {/* Confirm button */}
      <Button
        onPress={() => onSubmit()}
        className="w-full rounded-lg bg-[#2563EB] py-3 text-sm font-medium text-white cursor-pointer hover:bg-[#2563EB]/90 transition-colors"
      >
        {t('warehouse.receiving.confirmReceipt', 'Confirm Receipt')}
      </Button>
    </div>
  )
}

function RunningTotalCard({
  label,
  value,
  unit,
  highlight,
  warning,
}: {
  label: string
  value: string
  unit: string
  highlight?: boolean
  warning?: boolean
}) {
  const borderClass = highlight
    ? 'border-[#2563EB]/20'
    : warning
      ? 'border-red-500/20'
      : 'border-black/5 dark:border-white/5'
  const bgClass = highlight
    ? 'bg-[#2563EB]/5'
    : warning
      ? 'bg-red-500/5'
      : 'bg-white/40 dark:bg-black/40'

  return (
    <div className={`flex flex-col gap-1 rounded-lg border ${borderClass} ${bgClass} p-3`}>
      <span className="text-[10px] font-medium text-black/50 dark:text-white/50 truncate">
        {label}
      </span>
      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-semibold">
        {value}
      </span>
      <span className="text-[10px] text-black/40 dark:text-white/40">{unit}</span>
    </div>
  )
}
