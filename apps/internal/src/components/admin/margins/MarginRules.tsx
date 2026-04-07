import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getMarginRules } from '../../../lib/server/admin'
import type { MarginRule } from '../../../types/admin'

/**
 * MarginRules — "The Engine"
 * Product category rules as expandable sections.
 * Each: category + target % (mono) + floor % (mono) + absolute min (mono).
 * Edit inline, no modal.
 *
 * Color coding: below floor = red, at floor = amber, above target = green.
 * Geist Mono for all percentage and currency values.
 */
export function MarginRules() {
  const { t } = useTranslation('admin')
  const [editingCell, setEditingCell] = useState<{ ruleId: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
    if (value < rule.floorMarginPercent) return 'text-red-600 dark:text-red-400'
    if (value === rule.floorMarginPercent) return 'text-amber-600 dark:text-amber-400'
    if (value >= rule.targetMarginPercent) return 'text-green-600 dark:text-green-400'
    return ''
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
          {t('margins.title', 'Margin Engine')}
        </span>
        <Button className="rounded-lg border border-[#2563EB]/15 bg-[#2563EB]/5 px-3 py-1.5 text-xs font-medium text-[#2563EB] hover:bg-[#2563EB]/10 cursor-pointer outline-none">
          {t('margins.applyToAll', 'Apply to All')}
        </Button>
      </div>

      {/* Category sections */}
      <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04]">
        {(rules ?? []).map((rule) => {
          const isExpanded = expandedId === rule.id

          return (
            <div key={rule.id}>
              {/* Compact row */}
              <div
                className="grid grid-cols-[1fr_80px_80px_100px_80px] gap-3 items-center px-4 py-3 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : rule.id)}
              >
                {/* Category name */}
                <span className="text-sm font-medium">{rule.categoryName}</span>

                {/* Target % */}
                <div
                  className="cursor-text"
                  onClick={(e) => { e.stopPropagation(); startEdit(rule.id, 'targetMarginPercent', rule.targetMarginPercent) }}
                >
                  {editingCell?.ruleId === rule.id && editingCell.field === 'targetMarginPercent' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={finishEdit}
                      autoFocus
                      className="w-14 rounded border border-[#2563EB] bg-transparent px-1 py-0.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs outline-none"
                    />
                  ) : (
                    <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs ${getMarginColor(rule.targetMarginPercent, rule)}`}>
                      {rule.targetMarginPercent}%
                    </span>
                  )}
                  <div className="text-[9px] text-black/25 dark:text-white/25 mt-0.5">target</div>
                </div>

                {/* Floor % */}
                <div
                  className="cursor-text"
                  onClick={(e) => { e.stopPropagation(); startEdit(rule.id, 'floorMarginPercent', rule.floorMarginPercent) }}
                >
                  {editingCell?.ruleId === rule.id && editingCell.field === 'floorMarginPercent' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={finishEdit}
                      autoFocus
                      className="w-14 rounded border border-[#2563EB] bg-transparent px-1 py-0.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs outline-none"
                    />
                  ) : (
                    <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs ${getMarginColor(rule.floorMarginPercent, rule)}`}>
                      {rule.floorMarginPercent}%
                    </span>
                  )}
                  <div className="text-[9px] text-black/25 dark:text-white/25 mt-0.5">floor</div>
                </div>

                {/* Absolute min */}
                <div
                  className="cursor-text"
                  onClick={(e) => { e.stopPropagation(); startEdit(rule.id, 'absoluteMinimum', rule.absoluteMinimum) }}
                >
                  {editingCell?.ruleId === rule.id && editingCell.field === 'absoluteMinimum' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={finishEdit}
                      autoFocus
                      className="w-20 rounded border border-[#2563EB] bg-transparent px-1 py-0.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs outline-none"
                    />
                  ) : (
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                      {rule.absoluteMinimum.toLocaleString()}
                    </span>
                  )}
                  <div className="text-[9px] text-black/25 dark:text-white/25 mt-0.5">min EGP</div>
                </div>

                {/* Approval below */}
                <div>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                    {rule.requiresApprovalBelow}%
                  </span>
                  <div className="text-[9px] text-black/25 dark:text-white/25 mt-0.5">approval</div>
                </div>
              </div>

              {/* Expanded: tier overrides */}
              {isExpanded && Object.keys(rule.customerTierOverrides).length > 0 && (
                <div className="px-4 pb-3 pt-0">
                  <div className="ps-4 border-s-2 border-black/6 dark:border-white/6">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-black/25 dark:text-white/25">
                      Tier Overrides
                    </span>
                    <div className="flex gap-3 mt-1.5">
                      {Object.entries(rule.customerTierOverrides).map(([tier, val]) => (
                        <div key={tier} className="text-center">
                          <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">{val}%</div>
                          <div className="text-[9px] text-black/30 dark:text-white/30 capitalize mt-0.5">
                            {t(`margins.${tier}`, tier)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
