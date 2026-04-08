import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { Button, Select, SelectValue, Popover, ListBox, ListBoxItem, Label, TextArea, TextField } from 'react-aria-components'
import { getReceivingDetail, receiveGoods } from '../../../lib/server/warehouse-receiving'
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
  const queryClient = useQueryClient()
  const setSelectedReceivingId = useWarehouseStore((s) => s.setSelectedReceivingId)
  const setInboundView = useWarehouseStore((s) => s.setInboundView)
  const [currentStep, setCurrentStep] = useState(0)
  const [expandedLine, setExpandedLine] = useState<number | null>(0)
  const [qualityItems, setQualityItems] = useState<QualityChecklistItem[]>(() =>
    useInitialChecklist('steel_rebar'),
  )
  const [submitSuccess, setSubmitSuccess] = useState<{ grnId: string; putawayCount: number } | null>(null)

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

  const receiveMutation = useMutation({
    mutationFn: (formData: ReceivingFormData) =>
      receiveGoods({
        data: {
          poId: deliveryId,
          lines: formData.lines.map((l) => ({
            lineId: l.lineId,
            receivedQty: l.receivedQty,
            rejectedQty: 0,
            condition: l.condition,
            lotNumber: l.lotNumber,
            note: l.note,
          })),
          photos: [],
          signature: formData.signature,
        },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse'] })
      setSubmitSuccess({ grnId: result.grnId, putawayCount: result.putawayTasksCreated })
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

  const onSubmit = handleSubmit((formData) => {
    receiveMutation.mutate(formData)
  })

  // ─── Success State ─────────────────────────────────────
  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-6 py-24">
        <div className="flex h-24 w-24 items-center justify-center rounded-full" style={{ background: 'rgba(22, 163, 74, 0.08)' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M14 24L22 32L34 16" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-xl font-bold text-black/90 dark:text-white/90">
          {t('warehouse.receiving.receivingComplete', 'Receiving Complete')}
        </p>
        <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-semibold text-[#2563EB]">
          {submitSuccess.grnId}
        </p>
        <p className="text-sm text-black/40 dark:text-white/40">
          {submitSuccess.putawayCount} {t('warehouse.receiving.putawayTasksCreated', 'putaway tasks created')}
        </p>
        <div className="flex flex-col gap-3 mt-4 w-full max-w-md">
          <Button
            onPress={() => {
              setInboundView('putaway')
              setSelectedReceivingId(null)
            }}
            className="flex h-14 w-full items-center justify-center rounded-xl bg-[#2563EB] px-8 text-[15px] font-bold text-white cursor-pointer transition-colors"
          >
            {t('warehouse.receiving.goToPutaway', 'Go to Putaway')}
          </Button>
          <Button
            onPress={() => setSelectedReceivingId(null)}
            className="flex h-14 w-full items-center justify-center rounded-xl border border-black/10 dark:border-white/10 px-8 text-[15px] font-semibold text-black/70 dark:text-white/70 cursor-pointer transition-colors"
          >
            {t('common.done', 'Done')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onPress={handleBack}
          className="min-h-[48px] px-4 py-3 rounded-xl text-[15px] font-semibold text-[#2563EB] cursor-pointer hover:bg-[#2563EB]/5"
        >
          {currentStep === 0
            ? t('common.back', 'Back')
            : t('common.previous', 'Previous')}
        </Button>
        <h2 className="text-[14px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
          {t('warehouse.receiving.standardReceiving', 'Receiving')}
        </h2>
        <div className="w-16" />
      </div>

      {/* Step indicator — dots connected by line + clear "Step X of Y: Name" */}
      <StepIndicator
        current={currentStep + 1}
        total={STEPS.length}
        label="step"
        stepName={t(`warehouse.receiving.step.${currentStep}`, STEPS[currentStep])}
      />
      <p className="text-[17px] font-bold text-black/80 dark:text-white/80 text-center -mt-2">
        {t('warehouse.receiving.stepProgress', 'Step {{current}} of {{total}}: {{name}}', {
          current: currentStep + 1,
          total: STEPS.length,
          name: t(`warehouse.receiving.step.${currentStep}`, STEPS[currentStep]),
        })}
      </p>

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
        <CompletionStep control={control} receivingLines={receivingLines} onSubmit={onSubmit} isPending={receiveMutation.isPending} error={receiveMutation.isError} />
      )}

      {/* Next button — tablet: large touch target in thumb zone */}
      {currentStep < STEPS.length - 1 && (
        <Button
          onPress={handleNext}
          className="flex h-16 w-full items-center justify-center rounded-xl bg-[#2563EB] text-[17px] font-bold text-white cursor-pointer transition-colors active:scale-[0.98]"
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
      <h3 className="text-[14px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
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
              className="h-14 rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-5 text-[15px] outline-none focus:border-[#2563EB] transition-colors"
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
    <div className="flex flex-col gap-4">
      <h3 className="text-[14px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
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
    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
      {/* Collapsed header — large touch target */}
      <Button
        onPress={onToggle}
        className="flex w-full items-center justify-between min-h-[80px] px-6 py-5 text-start cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="text-[16px] font-semibold text-black/90 dark:text-white/90 truncate">
            {line.materialName}
          </span>
          <span className="text-[13px] text-black/40 dark:text-white/40">
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
        <div className="flex flex-col gap-5 border-t border-black/5 dark:border-white/5 px-6 py-5">
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
          <div className="flex items-center justify-between rounded-xl bg-black/[0.02] dark:bg-white/[0.02] px-6 py-4">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-black/40 dark:text-white/40 uppercase tracking-wider">
                {t('warehouse.receiving.suggestedLocation', 'Location')}
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[18px] font-bold text-[#2563EB]">
                {line.suggestedLocation}
              </span>
            </div>
            <Button className="min-h-[44px] px-4 py-2 rounded-lg text-[14px] font-semibold text-[#2563EB] cursor-pointer hover:bg-[#2563EB]/5">
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
                  className="rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-5 py-4 text-[14px] min-h-[80px] resize-y outline-none focus:border-[#2563EB]"
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
  receivingLines,
  onSubmit,
  isPending,
  error,
}: {
  control: any
  receivingLines: ReceivingLine[]
  onSubmit: () => void
  isPending: boolean
  error: boolean
}) {
  const { t } = useTranslation('internal')
  const watchedLines = useWatch({ control, name: 'lines' }) ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Summary of what was received — worker confirms before signing */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 px-6 py-5">
        <h3 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider mb-4">
          {t('warehouse.receiving.summary', 'Receiving Summary')}
        </h3>
        <div className="flex flex-col gap-3">
          {receivingLines.map((line, idx) => {
            const received = watchedLines[idx]?.receivedQty ?? 0
            const match = received === line.expectedQty
            return (
              <div key={line.id} className="flex items-center justify-between min-h-[44px]">
                <span className="text-[14px] text-black/70 dark:text-white/70 truncate flex-1 min-w-0 pe-4">
                  {line.materialName}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[16px] font-bold ${match ? 'text-black/80 dark:text-white/80' : 'text-red-600 dark:text-red-400'}`}>
                    {received}
                    <span className="text-black/30 dark:text-white/30">/{line.expectedQty}</span>
                  </span>
                  <span className="text-[14px]">
                    {match ? '\u2713' : '\u26A0'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

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

      <div className="flex flex-col gap-3">
        <Button
          onPress={onSubmit}
          isDisabled={isPending}
          className="flex h-[72px] w-full items-center justify-center rounded-2xl bg-[#2563EB] text-[18px] font-bold text-white cursor-pointer transition-all active:scale-[0.98] data-[disabled]:opacity-50"
        >
          {isPending
            ? t('common.submitting', 'Submitting...')
            : t('warehouse.receiving.completeReceiving', 'Complete Receiving')}
        </Button>
        <Button
          isDisabled={isPending}
          className="flex h-16 w-full items-center justify-center rounded-xl border-2 border-red-500/30 px-6 text-[16px] font-bold text-red-600 dark:text-red-400 cursor-pointer transition-colors data-[disabled]:opacity-50"
        >
          {t('warehouse.receiving.rejectDelivery', 'Reject')}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center font-medium">
          {t('warehouse.receiving.submitError', 'Failed to submit. Please try again.')}
        </p>
      )}
    </div>
  )
}
