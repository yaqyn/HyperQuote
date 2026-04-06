import { Checkbox } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getQualityChecklist } from '../../../lib/warehouse/quality-checklists'
import type { MaterialCategory, QualityChecklistItem } from '../../../types/warehouse'

interface QualityChecklistProps {
  materialCategory: MaterialCategory
  items: QualityChecklistItem[]
  onChange: (items: QualityChecklistItem[]) => void
}

/**
 * Material-specific quality checklist component.
 * Renders checklist items from getQualityChecklist() for the given material category.
 * Required items marked with asterisk and must be checked before completion.
 */
export function QualityChecklist({
  materialCategory,
  items,
  onChange,
}: QualityChecklistProps) {
  const { t } = useTranslation('internal')

  const handleToggle = (itemId: string, checked: boolean) => {
    const updated = items.map((item) =>
      item.id === itemId ? { ...item, checked } : item,
    )
    onChange(updated)
  }

  const requiredCount = items.filter((i) => i.required).length
  const requiredChecked = items.filter((i) => i.required && i.checked).length
  const allRequiredDone = requiredChecked === requiredCount

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-black/80 dark:text-white/80">
          {t('warehouse.receiving.qualityChecklist', 'Quality Checklist')}
        </h4>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/50 dark:text-white/50">
          {requiredChecked}/{requiredCount} {t('warehouse.receiving.required', 'required')}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Checkbox
            key={item.id}
            isSelected={item.checked}
            onChange={(checked) => handleToggle(item.id, checked)}
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
            <span className="text-sm text-black/70 dark:text-white/70">
              {item.label}
              {item.required && <span className="text-red-500 ms-1">*</span>}
            </span>
          </Checkbox>
        ))}
      </div>

      {!allRequiredDone && (
        <p className="text-xs text-red-500">
          {t('warehouse.receiving.completeRequired', 'All required items must be checked before completion')}
        </p>
      )}
    </div>
  )
}

/**
 * Hook to initialize quality checklist items for a material category.
 */
export function useInitialChecklist(category: MaterialCategory): QualityChecklistItem[] {
  return getQualityChecklist(category)
}
