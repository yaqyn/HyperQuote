import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Select, SelectValue, Button, Popover, ListBox, ListBoxItem, Label, TextArea, TextField } from 'react-aria-components'
import { PhotoCapture } from '../shared/PhotoCapture'
import type { DiscrepancyReason } from '../../../types/warehouse'

interface DiscrepancyData {
  varianceQty: number
  reason: DiscrepancyReason | null
  note: string
  photos: File[]
}

interface DiscrepancySectionProps {
  /** Positive = over, negative = under */
  varianceQty: number
  onChange: (data: DiscrepancyData) => void
}

const REASON_OPTIONS: Array<{ id: DiscrepancyReason; label: string }> = [
  { id: 'supplier_short', label: 'Supplier Short' },
  { id: 'damaged_in_transit', label: 'Damaged in Transit' },
  { id: 'wrong_product', label: 'Wrong Product' },
  { id: 'wrong_specification', label: 'Wrong Specification' },
  { id: 'overshipment', label: 'Overshipment' },
]

/**
 * RED accent panel when quantities don't match.
 * Expected vs Received side by side in large mono.
 * Variance highlighted. Photo required.
 */
export function DiscrepancySection({
  varianceQty,
  onChange,
}: DiscrepancySectionProps) {
  const { t, i18n } = useTranslation('internal')
  const [reason, setReason] = useState<DiscrepancyReason | null>(null)
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<File[]>([])

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
  const numFmt = new Intl.NumberFormat(locale)

  const handleReasonChange = (key: string | number) => {
    const r = key as DiscrepancyReason
    setReason(r)
    onChange({ varianceQty, reason: r, note, photos })
  }

  const handleNoteChange = (value: string) => {
    setNote(value)
    onChange({ varianceQty, reason, note: value, photos })
  }

  const handlePhoto = (file: File) => {
    const updated = [...photos, file]
    setPhotos(updated)
    onChange({ varianceQty, reason, note, photos: updated })
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border-2 border-red-500/30 bg-red-500/[0.03] p-5">
      {/* Header with huge variance number */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
          {t('warehouse.receiving.discrepancy', 'Discrepancy')}
        </span>
        <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold ${varianceQty > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {varianceQty > 0 ? '+' : ''}{numFmt.format(varianceQty)}
        </span>
      </div>

      {/* Reason code */}
      <Select
        selectedKey={reason}
        onSelectionChange={handleReasonChange}
        className="flex flex-col gap-1"
      >
        <Label className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
          {t('warehouse.receiving.reasonCode', 'Reason Code')} <span className="text-red-500">*</span>
        </Label>
        <Button className="flex h-14 items-center justify-between rounded-lg border border-black/10 dark:border-white/10 px-4 text-sm text-start cursor-pointer">
          <SelectValue placeholder={t('warehouse.receiving.selectReason', 'Select reason...')} />
        </Button>
        <Popover className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
          <ListBox className="p-1 outline-none">
            {REASON_OPTIONS.map((opt) => (
              <ListBoxItem
                key={opt.id}
                id={opt.id}
                className="flex h-12 cursor-pointer items-center rounded-md px-4 text-sm outline-none data-[focused]:bg-black/5 dark:data-[focused]:bg-white/5"
              >
                {t(`warehouse.receiving.reason.${opt.id}`, opt.label)}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>

      {/* Photo — required */}
      <PhotoCapture
        label={t('warehouse.receiving.discrepancyPhoto', 'Photo Evidence')}
        required
        onCapture={handlePhoto}
      />

      {/* Note */}
      <TextField
        value={note}
        onChange={handleNoteChange}
        className="flex flex-col gap-1"
      >
        <Label className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
          {t('warehouse.receiving.additionalNotes', 'Notes')}
        </Label>
        <TextArea
          className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 text-sm min-h-[80px] resize-y outline-none focus:border-[#2563EB]"
          placeholder={t('warehouse.receiving.notePlaceholder', 'Describe the discrepancy...')}
        />
      </TextField>
    </div>
  )
}
