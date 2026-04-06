import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getMarginRules } from '../../../lib/server/admin'
import type { MarginRule } from '../../../types/admin'

/**
 * Margin rules table per material category.
 * Inline edit: click cell to edit, blur to save.
 * Color coding: below floor = red, at floor = yellow, above target = green.
 * Geist Mono for all percentage and currency values.
 */
export function MarginRules() {
  const { t } = useTranslation('admin')
  const [editingCell, setEditingCell] = useState<{ ruleId: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data: rules } = useQuery({
    queryKey: ['admin', 'margins'],
    queryFn: () => getMarginRules(),
    staleTime: 30_000,
  })

  const startEdit = (ruleId: string, field: string, value: number) => {
    setEditingCell({ ruleId, field })
    setEditValue(String(value))
  }

  const finishEdit = () => {
    // In production, would call updateMarginRules
    setEditingCell(null)
    setEditValue('')
  }

  const getMarginColor = (value: number, rule: MarginRule) => {
    if (value < rule.floorMarginPercent) return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
    if (value === rule.floorMarginPercent) return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
    if (value >= rule.targetMarginPercent) return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
    return ''
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('margins.title', 'Margin Rules')}</h2>
        <Button
          className="rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-2 text-sm font-medium text-[#2563EB] hover:bg-[#2563EB]/10 cursor-pointer outline-none"
        >
          {t('margins.applyToAll', 'Apply to All')}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10">
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('margins.category', 'Category')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('margins.target', 'Target %')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('margins.floor', 'Floor %')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('margins.minimum', 'Min (EGP)')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('margins.approvalBelow', 'Approval Below %')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('margins.tierOverrides', 'Tier Overrides')}</th>
            </tr>
          </thead>
          <tbody>
            {(rules ?? []).map((rule) => (
              <tr key={rule.id} className="border-b border-black/5 dark:border-white/5">
                <td className="px-4 py-3 font-medium">{rule.categoryName}</td>
                <td
                  className={`px-4 py-3 cursor-pointer ${getMarginColor(rule.targetMarginPercent, rule)}`}
                  onClick={() => startEdit(rule.id, 'targetMarginPercent', rule.targetMarginPercent)}
                >
                  {editingCell?.ruleId === rule.id && editingCell.field === 'targetMarginPercent' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={finishEdit}
                      autoFocus
                      className="w-16 rounded border border-[#2563EB] bg-transparent px-1 py-0.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-sm outline-none"
                    />
                  ) : (
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{rule.targetMarginPercent}%</span>
                  )}
                </td>
                <td
                  className={`px-4 py-3 cursor-pointer ${getMarginColor(rule.floorMarginPercent, rule)}`}
                  onClick={() => startEdit(rule.id, 'floorMarginPercent', rule.floorMarginPercent)}
                >
                  {editingCell?.ruleId === rule.id && editingCell.field === 'floorMarginPercent' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={finishEdit}
                      autoFocus
                      className="w-16 rounded border border-[#2563EB] bg-transparent px-1 py-0.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-sm outline-none"
                    />
                  ) : (
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{rule.floorMarginPercent}%</span>
                  )}
                </td>
                <td
                  className="px-4 py-3 cursor-pointer"
                  onClick={() => startEdit(rule.id, 'absoluteMinimum', rule.absoluteMinimum)}
                >
                  {editingCell?.ruleId === rule.id && editingCell.field === 'absoluteMinimum' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={finishEdit}
                      autoFocus
                      className="w-20 rounded border border-[#2563EB] bg-transparent px-1 py-0.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-sm outline-none"
                    />
                  ) : (
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{rule.absoluteMinimum.toLocaleString()}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{rule.requiresApprovalBelow}%</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {Object.entries(rule.customerTierOverrides).map(([tier, val]) => (
                      <span
                        key={tier}
                        className="rounded-full bg-black/5 dark:bg-white/5 px-2 py-0.5 text-xs"
                      >
                        <span className="text-black/50 dark:text-white/50 capitalize">{t(`margins.${tier}`, tier)}</span>{' '}
                        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{val}%</span>
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
