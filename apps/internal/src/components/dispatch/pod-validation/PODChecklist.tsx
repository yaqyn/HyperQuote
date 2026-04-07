/**
 * Large toggleable rows for POD validation.
 * Each item: description + Pass/Fail toggle.
 * React Aria Checkbox for accessibility.
 */
import { Checkbox } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { PODValidationChecklist } from '../../../types/dispatch'

interface PODChecklistProps {
  checklist: PODValidationChecklist
  onChange: (updated: PODValidationChecklist) => void
}

interface ChecklistItemDef {
  key: keyof PODValidationChecklist
  labelKey: string
  defaultLabel: string
}

const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  { key: 'photosOk', labelKey: 'pod.checklist.photos', defaultLabel: 'Photos clearly show delivered materials' },
  { key: 'signatureOk', labelKey: 'pod.checklist.signature', defaultLabel: 'Signature present and legible' },
  { key: 'quantitiesOk', labelKey: 'pod.checklist.quantities', defaultLabel: 'Quantities match order' },
  { key: 'gpsOk', labelKey: 'pod.checklist.gps', defaultLabel: 'GPS location within 500m of address' },
  { key: 'noDamage', labelKey: 'pod.checklist.noDamage', defaultLabel: 'No damage reported' },
]

export function PODChecklist({ checklist, onChange }: PODChecklistProps) {
  const { t } = useTranslation('dispatch')

  const passedCount = Object.values(checklist).filter((v) => v === true).length
  const totalCount = CHECKLIST_ITEMS.length

  const handleToggle = (key: keyof PODValidationChecklist, checked: boolean) => {
    onChange({ ...checklist, [key]: checked })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
          {t('pod.checklist.title', 'Validation Checklist')}
        </h4>
        <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/40 dark:text-white/40">
          {passedCount}/{totalCount}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {CHECKLIST_ITEMS.map((item) => {
          const isChecked = checklist[item.key]
          return (
            <Checkbox
              key={item.key}
              isSelected={isChecked}
              onChange={(checked) => handleToggle(item.key, checked)}
              className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
            >
              {/* Toggle */}
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-black/20 transition-colors group-data-[selected]:border-[#2563EB] group-data-[selected]:bg-[#2563EB] dark:border-white/20">
                <svg
                  className="h-3 w-3 text-white opacity-0 transition-opacity group-data-[selected]:opacity-100"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M3 7.5L5.5 10L11 4"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Label */}
              <span className="min-w-0 flex-1 text-sm text-black/70 dark:text-white/70">
                {t(item.labelKey, item.defaultLabel)}
              </span>

              {/* Status indicator */}
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                  isChecked ? 'bg-green-500' : 'bg-red-400'
                }`}
              />
            </Checkbox>
          )
        })}
      </div>
    </div>
  )
}

export function isChecklistComplete(checklist: PODValidationChecklist): boolean {
  return (
    checklist.photosOk !== undefined &&
    checklist.signatureOk !== undefined &&
    checklist.quantitiesOk !== undefined &&
    checklist.gpsOk !== undefined &&
    checklist.noDamage !== undefined
  )
}
