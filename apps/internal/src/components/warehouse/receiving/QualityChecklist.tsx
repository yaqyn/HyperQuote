import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getQualityChecklist } from '../../../lib/warehouse/quality-checklists'
import type { MaterialCategory, QualityChecklistItem } from '../../../types/warehouse'

interface QualityChecklistProps {
  materialCategory: MaterialCategory
  items: QualityChecklistItem[]
  onChange: (items: QualityChecklistItem[]) => void
}

/**
 * Quality checklist — each item is a FULL-WIDTH PRESSABLE ROW.
 * NOT small checkboxes. Large toggle buttons: Pass / Fail.
 * Designed for gloved hands on tablets. Min 56px row height.
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
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">
          {t('warehouse.receiving.qualityChecklist', 'Quality Checklist')}
        </h4>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-semibold text-black/60 dark:text-white/60">
          {requiredChecked}/{requiredCount}
        </span>
      </div>

      {/* Full-width pressable rows */}
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <Button
            key={item.id}
            onPress={() => handleToggle(item.id, !item.checked)}
            className={`
              flex items-center justify-between gap-4 min-h-[56px] px-4 py-3 rounded-lg cursor-pointer transition-colors text-start
              ${item.checked
                ? 'bg-green-500/5 border border-green-500/20'
                : 'bg-transparent border border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
              }
            `}
          >
            {/* Check description */}
            <span className={`text-sm flex-1 ${item.checked ? 'text-black/70 dark:text-white/70' : 'text-black/60 dark:text-white/60'}`}>
              {item.label}
              {item.required && <span className="text-red-500 ms-1">*</span>}
            </span>

            {/* Pass/Fail indicator */}
            <span className={`
              shrink-0 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded
              ${item.checked
                ? 'text-green-700 dark:text-green-400 bg-green-500/10'
                : 'text-black/30 dark:text-white/30'
              }
            `}>
              {item.checked ? 'Pass' : 'Fail'}
            </span>
          </Button>
        ))}
      </div>

      {/* Warning */}
      {!allRequiredDone && (
        <p className="text-xs font-medium text-red-500">
          {t('warehouse.receiving.completeRequired', 'All required items must pass before completion')}
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
