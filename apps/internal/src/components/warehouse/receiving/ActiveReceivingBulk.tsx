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
 * Bulk/weight-based receiving — same multi-line layout but scan-to-fill.
 * Gross/tare/net weight with huge mono numbers.
 * Running PO totals. Large font table.
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

  const grossWeight = useWatch({ control, name: 'grossWeight' }) ?? 0
  const tareWeight = useWatch({ control, name: 'tareWeight' }) ?? 0
  const netWeight = calculateNetWeight(grossWeight, tareWeight)

  const previouslyReceived = bulkState?.previouslyReceived ?? 0
  const poTotal = bulkState?.poTotal ?? 0
  const remaining = poTotal - previouslyReceived - netWeight
  const unit = bulkState?.unit ?? 'kg'

  const onSubmit = handleSubmit((_data) => {
    // TODO: Submit bulk receiving via server function
    setSelectedReceivingId(null)
  })

  return (
    <div className="flex flex-col gap-6 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onPress={() => setSelectedReceivingId(null)}
          className="text-sm font-medium text-[#2563EB] cursor-pointer"
        >
          {t('common.back', 'Back')}
        </Button>
        <h2 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">
          {t('warehouse.receiving.bulkReceiving', 'Bulk Receiving')}
        </h2>
        <div className="w-16" />
      </div>

      {/* PO total — big number */}
      <div className="flex items-baseline gap-3">
        <span className="text-xs text-black/40 dark:text-white/40 uppercase tracking-wider">PO Total</span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-black/90 dark:text-white/90">
          {numFmt.format(poTotal)}
        </span>
        <span className="text-sm text-black/30 dark:text-white/30">{unit}</span>
      </div>

      {/* Weight inputs */}
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

      {/* Net weight — HERO number */}
      <div className="flex flex-col items-center gap-1 py-4">
        <span className="text-xs text-black/40 dark:text-white/40 uppercase tracking-wider">
          {t('warehouse.receiving.netWeight', 'Net Weight')}
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[40px] font-bold text-[#2563EB] leading-none">
          {numFmt.format(netWeight)}
        </span>
        <span className="text-sm text-black/30 dark:text-white/30">{unit}</span>
      </div>

      {/* Running totals — 3 columns, no borders, just numbers */}
      <div className="grid grid-cols-3 gap-4">
        <RunningTotal
          label={t('warehouse.receiving.previouslyReceived', 'Previously')}
          value={numFmt.format(previouslyReceived)}
          unit={unit}
        />
        <RunningTotal
          label={t('warehouse.receiving.thisLoad', 'This Load')}
          value={numFmt.format(netWeight)}
          unit={unit}
          highlight
        />
        <RunningTotal
          label={t('warehouse.receiving.remaining', 'Remaining')}
          value={numFmt.format(Math.max(0, remaining))}
          unit={unit}
          warning={remaining < 0}
        />
      </div>

      {/* Quality checks — full-width pressable rows */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider mb-2">
          {t('warehouse.receiving.qualityChecks', 'Quality Checks')}
        </span>

        <Controller
          name="contaminationCheck"
          control={control}
          render={({ field }) => (
            <Checkbox
              isSelected={field.value}
              onChange={field.onChange}
              className="group flex items-center gap-4 min-h-[56px] px-4 rounded-lg border border-black/5 dark:border-white/5 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors data-[selected]:bg-green-500/5 data-[selected]:border-green-500/20"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-black/15 dark:border-white/15 transition-colors group-data-[selected]:bg-[#2563EB] group-data-[selected]:border-[#2563EB]">
                <svg
                  className="h-4 w-4 text-white opacity-0 group-data-[selected]:opacity-100 transition-opacity"
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
              className="group flex items-center gap-4 min-h-[56px] px-4 rounded-lg border border-black/5 dark:border-white/5 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors data-[selected]:bg-green-500/5 data-[selected]:border-green-500/20"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-black/15 dark:border-white/15 transition-colors group-data-[selected]:bg-[#2563EB] group-data-[selected]:border-[#2563EB]">
                <svg
                  className="h-4 w-4 text-white opacity-0 group-data-[selected]:opacity-100 transition-opacity"
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
            <Label className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
              {t('warehouse.receiving.dumpLocation', 'Dump Location')}
            </Label>
            <Button className="flex h-14 items-center justify-between rounded-lg border border-black/10 dark:border-white/10 px-4 text-sm text-start cursor-pointer">
              <SelectValue placeholder={t('warehouse.receiving.selectZone', 'Select yard zone...')} />
            </Button>
            <Popover className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
              <ListBox className="p-1 outline-none">
                {YARD_ZONES.map((zone) => (
                  <ListBoxItem
                    key={zone.id}
                    id={zone.id}
                    className="flex h-12 cursor-pointer items-center rounded-md px-4 text-sm outline-none data-[focused]:bg-black/5 dark:data-[focused]:bg-white/5 data-[selected]:font-semibold"
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
        label={t('warehouse.receiving.weighTicket', 'Weigh Ticket')}
        onCapture={() => {}}
      />

      {/* Confirm */}
      <Button
        onPress={() => onSubmit()}
        className="flex h-16 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-semibold text-white cursor-pointer transition-colors"
      >
        {t('warehouse.receiving.confirmReceipt', 'Confirm Receipt')}
      </Button>
    </div>
  )
}

function RunningTotal({
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
  const valueColor = warning
    ? 'text-red-600 dark:text-red-400'
    : highlight
      ? 'text-[#2563EB]'
      : 'text-black/80 dark:text-white/80'

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-black/40 dark:text-white/40 uppercase tracking-wider truncate">
        {label}
      </span>
      <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-bold ${valueColor}`}>
        {value}
      </span>
      <span className="text-[10px] text-black/25 dark:text-white/25">{unit}</span>
    </div>
  )
}
