/**
 * Wizard-style POD checklist.
 * Auto-validated items show as pre-checked with "Auto" badge.
 * Only items that fail auto-validation require manual review.
 */
import { Checkbox } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { PODValidationChecklist } from '../../../types/dispatch'

interface PODChecklistProps {
  checklist: PODValidationChecklist
  onChange: (updated: PODValidationChecklist) => void
  /** Which items passed automatic validation (GPS in range, photos present, etc.) */
  autoChecks?: Partial<PODValidationChecklist>
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

export function PODChecklist({ checklist, onChange, autoChecks }: PODChecklistProps) {
  const { t } = useTranslation('dispatch')

  const passedCount = Object.values(checklist).filter((v) => v === true).length
  const totalCount = CHECKLIST_ITEMS.length
  const allPassed = passedCount === totalCount

  // Split items: auto-passed vs needs-manual-review
  const autoPassedItems = CHECKLIST_ITEMS.filter((item) => autoChecks?.[item.key] === true)
  const manualItems = CHECKLIST_ITEMS.filter((item) => !autoChecks?.[item.key])

  const handleToggle = (key: keyof PODValidationChecklist, checked: boolean) => {
    onChange({ ...checklist, [key]: checked })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
          {t('pod.checklist.title', 'Validation Checklist')}
        </h4>
        <span className={`font-[family-name:var(--font-geist-mono)] text-xs tabular-nums ${
          allPassed ? 'text-green-600 dark:text-green-400' : 'text-black/40 dark:text-white/40'
        }`}>
          {passedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all ${
            allPassed ? 'bg-green-500' : passedCount > 0 ? 'bg-[#2563EB]' : 'bg-transparent'
          }`}
          style={{ width: `${(passedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Auto-passed section */}
      {autoPassedItems.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="px-3 text-[10px] font-medium uppercase tracking-wider text-green-600 dark:text-green-400">
            {t('pod.checklist.autoPassed', 'Auto-verified')}
          </span>
          {autoPassedItems.map((item) => {
            const isChecked = checklist[item.key]
            return (
              <Checkbox
                key={item.key}
                isSelected={isChecked}
                onChange={(checked) => handleToggle(item.key, checked)}
                className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              >
                {/* Toggle */}
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-green-300 bg-green-500 transition-colors group-data-[selected]:border-green-500 group-data-[selected]:bg-green-500 dark:border-green-700">
                  <svg
                    className="h-3 w-3 text-white"
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
                <span className="min-w-0 flex-1 text-sm text-black/50 dark:text-white/50">
                  {t(item.labelKey, item.defaultLabel)}
                </span>

                {/* Auto badge */}
                <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-medium uppercase text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Auto
                </span>
              </Checkbox>
            )
          })}
        </div>
      )}

      {/* Manual review section */}
      {manualItems.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="px-3 text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {t('pod.checklist.manualReview', 'Needs review')}
          </span>
          {manualItems.map((item) => {
            const isChecked = checklist[item.key]
            return (
              <Checkbox
                key={item.key}
                isSelected={isChecked}
                onChange={(checked) => handleToggle(item.key, checked)}
                className="group flex cursor-pointer items-center gap-3 rounded-lg border border-amber-200/60 bg-amber-50/20 px-3 py-2.5 transition-colors hover:bg-amber-50/40 dark:border-amber-800/30 dark:bg-amber-900/5 dark:hover:bg-amber-900/10"
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
                <span className="min-w-0 flex-1 text-sm font-medium text-black/70 dark:text-white/70">
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
      )}

      {/* All items auto-passed and no manual items */}
      {manualItems.length === 0 && autoPassedItems.length > 0 && (
        <p className="px-3 text-xs text-green-600 dark:text-green-400">
          {t('pod.checklist.allAutoPassed', 'All checks passed automatically. Review and confirm below.')}
        </p>
      )}
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
