import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { Button, Select, SelectValue, Popover, ListBox, ListBoxItem, Label, TextArea, TextField } from 'react-aria-components'
import { getReceivingDetail } from '../../../lib/server/warehouse-receiving'
import { useWarehouseStore } from '../../../stores/warehouse'
import { StepIndicator } from '../shared/StepIndicator'
import { LargeNumberInput } from '../shared/LargeNumberInput'
import { ScanInput } from '../shared/ScanInput'
import { PhotoCapture } from '../shared/PhotoCapture'
import { SignaturePad } from '../shared/SignaturePad'
import { VarianceBadge } from '../shared/VarianceBadge'
import { QualityChecklist, useInitialChecklist } from './QualityChecklist'
import { DiscrepancySection } from './DiscrepancySection'
import type { ItemCondition, QualityChecklistItem, ReceivingLine } from '../../../types/warehouse'

interface ActiveReceivingStandardProps {
  deliveryId: string
}

const CONDITION_OPTIONS: Array<{ id: ItemCondition; label: string }> = [
  { id: 'good', label: 'Good' },
  { id: 'minor_damage', label: 'Minor Damage' },
  { id: 'major_damage', label: 'Major Damage' },
  { id: 'rejected', label: 'Rejected' },
]

interface ReceivingFormData {
  truckType: string
  licensePlate: string
  bolNumber: string
  driverName: string
  lines: Array<{
    lineId: string
    receivedQty: number
    condition: ItemCondition
    lotNumber: string
    heatNumber: string
    note: string
    photoFiles: File[]
  }>
  signature: string
}

const STEPS = ['Truck Info', 'Line Items', 'Discrepancies', 'Quality Check', 'Completion'] as const

/**
 * Standard receiving step-by-step flow.
 * Current step highlighted. Large product name, large quantity input.
 * Quality checklist inline with full-width Pass/Fail toggles.
 */
export function ActiveReceivingStandard({ deliveryId }: ActiveReceivingStandardProps) {
  const { t } = useTranslation('internal')
  const setSelectedReceivingId = useWarehouseStore((s) => s.setSelectedReceivingId)
  const [currentStep, setCurrentStep] = useState(0)
  const [expandedLine, setExpandedLine] = useState<number | null>(0)
  const [qualityItems, setQualityItems] = useState<QualityChecklistItem[]>(() =>
    useInitialChecklist('steel_rebar'),
  )

  const { data } = useQuery({
    queryKey: ['warehouse', 'receiving-detail', deliveryId],
    queryFn: () => getReceivingDetail({ data: { poId: deliveryId } }),
    staleTime: 30_000,
  })

  const receivingLines = data?.lines ?? []

  const { control, handleSubmit, setValue } = useForm<ReceivingFormData>({
    defaultValues: {
      truckType: 'flatbed',
      licensePlate: '',
      bolNumber: '',
      driverName: '',
      lines: [],
      signature: '',
    },
  })

  useMemo(() => {
    if (receivingLines.length > 0) {
      const lineDefaults = receivingLines.map((line) => ({
        lineId: line.id,
        receivedQty: 0,
        condition: 'good' as ItemCondition,
        lotNumber: line.lotNumber,
        heatNumber: line.heatNumber,
        note: '',
        photoFiles: [],
      }))
      setValue('lines', lineDefaults)
    }
  }, [receivingLines, setValue])

  const handleBack = () => {
    if (currentStep === 0) {
      setSelectedReceivingId(null)
    } else {
      setCurrentStep((s) => s - 1)
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    }
  }

  const onSubmit = handleSubmit((_formData) => {
    // TODO: Call receiveGoods server function
    setSelectedReceivingId(null)
  })

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onPress={handleBack}
          className="text-sm font-medium text-[#2563EB] cursor-pointer"
        >
          {currentStep === 0
            ? t('common.back', 'Back')
            : t('common.previous', 'Previous')}
        </Button>
        <h2 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">
          {t('warehouse.receiving.standardReceiving', 'Receiving')}
        </h2>
        <div className="w-16" />
      </div>

      {/* Step indicator — dots connected by line */}
      <StepIndicator current={currentStep + 1} total={STEPS.length} label="step" />

      {/* Step content */}
      {currentStep === 0 && (
        <TruckInfoStep control={control} />
      )}

      {currentStep === 1 && (
        <LineItemsStep
          control={control}
          receivingLines={receivingLines}
          expandedLine={expandedLine}
          setExpandedLine={setExpandedLine}
        />
      )}

      {currentStep === 2 && (
        <DiscrepancyStep control={control} receivingLines={receivingLines} />
      )}

      {currentStep === 3 && (
        <QualityStep
          items={qualityItems}
          onChange={setQualityItems}
        />
      )}

      {currentStep === 4 && (
        <CompletionStep control={control} onSubmit={onSubmit} />
      )}

      {/* Next button */}
      {currentStep < STEPS.length - 1 && (
        <Button
          onPress={handleNext}
          className="flex h-14 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-semibold text-white cursor-pointer transition-colors"
        >
          {t('common.next', 'Next')}
        </Button>
      )}
    </div>
  )
}

// ─── Step 1: Truck Info ─────────────────────────────────

function TruckInfoStep({ control }: { control: any }) {
  const { t } = useTranslation('internal')

  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">
        {t('warehouse.receiving.truckInfo', 'Truck Information')}
      </h3>

      <Controller
        name="truckType"
        control={control}
        render={({ field }) => (
          <Select
            selectedKey={field.value}
            onSelectionChange={(key) => field.onChange(key as string)}
            className="flex flex-col gap-1"
          >
            <Label className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
              {t('warehouse.receiving.truckType', 'Truck Type')}
            </Label>
            <Button className="flex h-14 items-center justify-between rounded-lg border border-black/10 dark:border-white/10 px-4 text-sm text-start cursor-pointer">
              <SelectValue />
            </Button>
            <Popover className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
              <ListBox className="p-1 outline-none">
                {['flatbed', 'enclosed', 'dump', 'pneumatic'].map((type) => (
                  <ListBoxItem
                    key={type}
                    id={type}
                    className="flex h-12 cursor-pointer items-center rounded-md px-4 text-sm capitalize outline-none data-[focused]:bg-black/5 dark:data-[focused]:bg-white/5 data-[selected]:font-semibold"
                  >
                    {type}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>
        )}
      />

      <Controller
        name="licensePlate"
        control={control}
        render={({ field }) => (
          <ScanInput
            label={t('warehouse.receiving.licensePlate', 'License Plate')}
            onScan={(value) => field.onChange(value)}
          />
        )}
      />

      <Controller
        name="bolNumber"
        control={control}
        render={({ field }) => (
          <ScanInput
            label={t('warehouse.receiving.bolNumber', 'BOL Number')}
            onScan={(value) => field.onChange(value)}
          />
        )}
      />

      <Controller
        name="driverName"
        control={control}
        render={({ field }) => (
          <TextField
            value={field.value}
            onChange={field.onChange}
            className="flex flex-col gap-1"
          >
            <Label className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
              {t('warehouse.receiving.driverName', 'Driver Name')}
            </Label>
            <input
              className="h-14 rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-4 text-sm outline-none focus:border-[#2563EB] transition-colors"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
            />
          </TextField>
        )}
      />
    </div>
  )
}

// ─── Step 2: Line Items ─────────────────────────────────

function LineItemsStep({
  control,
  receivingLines,
  expandedLine,
  setExpandedLine,
}: {
  control: any
  receivingLines: ReceivingLine[]
  expandedLine: number | null
  setExpandedLine: (idx: number | null) => void
}) {
  const { t } = useTranslation('internal')

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">
        {t('warehouse.receiving.lineItems', 'Line Items')}
      </h3>

      {receivingLines.map((line, idx) => (
        <LineItemCard
          key={line.id}
          control={control}
          line={line}
          index={idx}
          isExpanded={expandedLine === idx}
          onToggle={() => setExpandedLine(expandedLine === idx ? null : idx)}
        />
      ))}
    </div>
  )
}

function LineItemCard({
  control,
  line,
  index,
  isExpanded,
  onToggle,
}: {
  control: any
  line: ReceivingLine
  index: number
  isExpanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation('internal')

  const receivedQty = useWatch({ control, name: `lines.${index}.receivedQty` }) ?? 0
  const variancePercent = line.expectedQty > 0
    ? (receivedQty - line.expectedQty) / line.expectedQty
    : 0

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
      {/* Collapsed header — large touch target */}
      <Button
        onPress={onToggle}
        className="flex w-full items-center justify-between min-h-[64px] p-4 text-start cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-base font-medium text-black/90 dark:text-white/90 truncate">
            {line.materialName}
          </span>
          <span className="text-xs text-black/40 dark:text-white/40">
            {line.specification}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-bold text-black/80 dark:text-white/80">
            {receivedQty}
            <span className="text-black/30 dark:text-white/30">/{line.expectedQty}</span>
          </span>
          {receivedQty > 0 && <VarianceBadge value={variancePercent} />}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </Button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="flex flex-col gap-5 border-t border-black/5 dark:border-white/5 p-5">
          {/* Expected (read-only) */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-black/40 dark:text-white/40 uppercase tracking-wider">
              {t('warehouse.receiving.expected', 'Expected')}
            </span>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xl font-bold text-black/70 dark:text-white/70">
              {line.expectedQty}
            </span>
          </div>

          {/* Received quantity — LARGE input */}
          <Controller
            name={`lines.${index}.receivedQty`}
            control={control}
            render={({ field }) => (
              <LargeNumberInput
                label={t('warehouse.receiving.received', 'Received')}
                value={field.value}
                onChange={field.onChange}
                minValue={0}
              />
            )}
          />

          {/* Condition */}
          <Controller
            name={`lines.${index}.condition`}
            control={control}
            render={({ field }) => (
              <Select
                selectedKey={field.value}
                onSelectionChange={(key) => field.onChange(key as ItemCondition)}
                className="flex flex-col gap-1"
              >
                <Label className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
                  {t('warehouse.receiving.condition', 'Condition')}
                </Label>
                <Button className="flex h-14 items-center justify-between rounded-lg border border-black/10 dark:border-white/10 px-4 text-sm text-start cursor-pointer">
                  <SelectValue />
                </Button>
                <Popover className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
                  <ListBox className="p-1 outline-none">
                    {CONDITION_OPTIONS.map((opt) => (
                      <ListBoxItem
                        key={opt.id}
                        id={opt.id}
                        className="flex h-12 cursor-pointer items-center rounded-md px-4 text-sm outline-none data-[focused]:bg-black/5 dark:data-[focused]:bg-white/5 data-[selected]:font-semibold"
                      >
                        {t(`warehouse.receiving.condition.${opt.id}`, opt.label)}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Popover>
              </Select>
            )}
          />

          {/* Lot/Heat scan */}
          <Controller
            name={`lines.${index}.lotNumber`}
            control={control}
            render={({ field }) => (
              <ScanInput
                label={t('warehouse.receiving.lotNumber', 'Lot / Heat Number')}
                onScan={(value) => field.onChange(value)}
              />
            )}
          />

          {/* Suggested putaway */}
          <div className="flex items-center justify-between rounded-lg bg-black/[0.02] dark:bg-white/[0.02] p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-black/40 dark:text-white/40 uppercase tracking-wider">
                {t('warehouse.receiving.suggestedLocation', 'Location')}
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-base font-semibold text-[#2563EB]">
                {line.suggestedLocation}
              </span>
            </div>
            <Button className="text-xs font-medium text-[#2563EB] cursor-pointer">
              {t('warehouse.receiving.override', 'Override')}
            </Button>
          </div>

          {/* Photo */}
          <PhotoCapture
            label={t('warehouse.receiving.photo', 'Photo')}
            onCapture={() => {}}
          />

          {/* Note */}
          <Controller
            name={`lines.${index}.note`}
            control={control}
            render={({ field }) => (
              <TextField
                value={field.value}
                onChange={field.onChange}
                className="flex flex-col gap-1"
              >
                <Label className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
                  {t('warehouse.receiving.note', 'Note')}
                </Label>
                <TextArea
                  className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 text-sm min-h-[60px] resize-y outline-none focus:border-[#2563EB]"
                  placeholder={t('warehouse.receiving.notePlaceholder', 'Add notes...')}
                />
              </TextField>
            )}
          />
        </div>
      )}
    </div>
  )
}

// ─── Step 3: Discrepancies ──────────────────────────────

function DiscrepancyStep({
  control,
  receivingLines,
}: {
  control: any
  receivingLines: ReceivingLine[]
}) {
  const { t } = useTranslation('internal')
  const watchedLines = useWatch({ control, name: 'lines' }) ?? []

  const discrepancies = receivingLines
    .map((line, idx) => {
      const received = watchedLines[idx]?.receivedQty ?? 0
      const variance = received - line.expectedQty
      return { line, variance, index: idx }
    })
    .filter((d) => d.variance !== 0 && d.line.expectedQty > 0)

  if (discrepancies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-3xl text-green-500">&#10003;</span>
        <p className="text-sm text-black/40 dark:text-white/40">
          {t('warehouse.receiving.noDiscrepancies', 'All quantities match')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">
          {t('warehouse.receiving.discrepancies', 'Discrepancies')}
        </h3>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-bold text-red-500">
          {discrepancies.length}
        </span>
      </div>
      {discrepancies.map((d) => (
        <div key={d.line.id} className="flex flex-col gap-2">
          <span className="text-sm font-medium text-black/70 dark:text-white/70">
            {d.line.materialName}
          </span>
          <DiscrepancySection
            varianceQty={d.variance}
            onChange={() => {}}
          />
        </div>
      ))}
    </div>
  )
}

// ─── Step 4: Quality ────────────────────────────────────

function QualityStep({
  items,
  onChange,
}: {
  items: QualityChecklistItem[]
  onChange: (items: QualityChecklistItem[]) => void
}) {
  return (
    <QualityChecklist
      materialCategory="steel_rebar"
      items={items}
      onChange={onChange}
    />
  )
}

// ─── Step 5: Completion ─────────────────────────────────

function CompletionStep({
  control,
  onSubmit,
}: {
  control: any
  onSubmit: () => void
}) {
  const { t } = useTranslation('internal')

  return (
    <div className="flex flex-col gap-6">
      <Controller
        name="signature"
        control={control}
        render={({ field }) => (
          <SignaturePad
            label={t('warehouse.receiving.signature', 'Digital Signature')}
            onSign={(dataUrl) => field.onChange(dataUrl)}
          />
        )}
      />

      <div className="flex gap-3">
        <Button
          onPress={onSubmit}
          className="flex h-16 flex-1 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-semibold text-white cursor-pointer transition-colors"
        >
          {t('warehouse.receiving.completeReceiving', 'Complete Receiving')}
        </Button>
        <Button
          className="flex h-16 items-center justify-center rounded-lg border-2 border-red-500/30 px-6 text-sm font-semibold text-red-600 dark:text-red-400 cursor-pointer transition-colors"
        >
          {t('warehouse.receiving.rejectDelivery', 'Reject')}
        </Button>
      </div>
    </div>
  )
}
