import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Select, SelectValue, Button, Popover, ListBox, ListBoxItem, Label, TextArea, TextField } from 'react-aria-components'
import { AlertTriangle } from 'lucide-react'
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
 * Discrepancy section — auto-populates when received != expected.
 * Shows variance quantity, reason code select, photo requirement, and notes.
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
    <div className="flex flex-col gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-red-500" />
        <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">
          {t('warehouse.receiving.discrepancy', 'Discrepancy Detected')}
        </h4>
      </div>

      {/* Variance quantity */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-black/60 dark:text-white/60">
          {t('warehouse.receiving.variance', 'Variance')}:
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-semibold text-red-600">
          {varianceQty > 0 ? '+' : ''}{numFmt.format(varianceQty)}
        </span>
      </div>

      {/* Reason code */}
      <Select
        selectedKey={reason}
        onSelectionChange={handleReasonChange}
        className="flex flex-col gap-1"
      >
        <Label className="text-sm font-medium text-black/60 dark:text-white/60">
          {t('warehouse.receiving.reasonCode', 'Reason Code')} <span className="text-red-500">*</span>
        </Label>
        <Button className="flex items-center justify-between rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-start cursor-pointer">
          <SelectValue placeholder={t('warehouse.receiving.selectReason', 'Select reason...')} />
        </Button>
        <Popover className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
          <ListBox className="p-1 outline-none">
            {REASON_OPTIONS.map((opt) => (
              <ListBoxItem
                key={opt.id}
                id={opt.id}
                className="rounded-md px-3 py-2 text-sm cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10 data-[selected]:font-semibold"
              >
                {t(`warehouse.receiving.reason.${opt.id}`, opt.label)}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>

      {/* Photo requirement */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-red-600">
          {t('warehouse.receiving.photoRequired', 'Photo required for discrepancies')}
        </p>
        <PhotoCapture
          label={t('warehouse.receiving.discrepancyPhoto', 'Discrepancy Photo')}
          required
          onCapture={handlePhoto}
        />
      </div>

      {/* Note */}
      <TextField
        value={note}
        onChange={handleNoteChange}
        className="flex flex-col gap-1"
      >
        <Label className="text-sm font-medium text-black/60 dark:text-white/60">
          {t('warehouse.receiving.additionalNotes', 'Additional Notes')}
        </Label>
        <TextArea
          className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm min-h-[80px] resize-y"
          placeholder={t('warehouse.receiving.notePlaceholder', 'Describe the discrepancy...')}
        />
      </TextField>
    </div>
  )
}
