/**
 * POD validation checklist — 5 items the dispatcher must review.
 * Auto-populated from POD data where possible, dispatcher can override.
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
  { key: 'gpsOk', labelKey: 'pod.checklist.gps', defaultLabel: 'GPS location matches delivery address (within 500m)' },
  { key: 'noDamage', labelKey: 'pod.checklist.noDamage', defaultLabel: 'No damage reported' },
]

export function PODChecklist({ checklist, onChange }: PODChecklistProps) {
  const { t } = useTranslation('dispatch')

  const answeredCount = Object.values(checklist).filter((v) => v === true).length
  const totalCount = CHECKLIST_ITEMS.length

  const handleToggle = (key: keyof PODValidationChecklist, checked: boolean) => {
    onChange({ ...checklist, [key]: checked })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-black/80 dark:text-white/80">
          {t('pod.checklist.title', 'Validation Checklist')}
        </h4>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/50 dark:text-white/50">
          {answeredCount}/{totalCount}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {CHECKLIST_ITEMS.map((item) => {
          const isChecked = checklist[item.key]
          return (
            <Checkbox
              key={item.key}
              isSelected={isChecked}
              onChange={(checked) => handleToggle(item.key, checked)}
              className="group flex items-start gap-3 cursor-pointer"
            >
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-black/20 dark:border-white/20 transition-colors group-data-[selected]:bg-[#2563EB] group-data-[selected]:border-[#2563EB]">
                <svg
                  className="h-3.5 w-3.5 text-white opacity-0 group-data-[selected]:opacity-100 transition-opacity"
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-black/70 dark:text-white/70">
                  {t(item.labelKey, item.defaultLabel)}
                </span>
                {isChecked ? (
                  <svg className="w-4 h-4 text-green-500 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </Checkbox>
          )
        })}
      </div>
    </div>
  )
}

/** Check if all 5 checklist items have been answered (all true) */
export function isChecklistComplete(checklist: PODValidationChecklist): boolean {
  return (
    checklist.photosOk !== undefined &&
    checklist.signatureOk !== undefined &&
    checklist.quantitiesOk !== undefined &&
    checklist.gpsOk !== undefined &&
    checklist.noDamage !== undefined
  )
}
