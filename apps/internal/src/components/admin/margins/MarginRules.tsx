import { useState, useMemo } from 'react'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMarginRules, updateMarginRules, createMarginRule, deleteMarginRule } from '../../../lib/server/admin'
import { Button } from '../../ui/Button'
import { UnderlineInput } from '../../ui/UnderlineInput'
import type { MarginRule } from '../../../types/admin'

/**
 * MarginRules — "The Engine"
 * Visual margin comparison: horizontal scale per category showing target vs floor vs min.
 * Categories sorted by tightness (smallest spread first).
 * Tier overrides expandable per row (collapsed by default).
 *
 * Color coding: below floor = red, at floor = amber, above target = green.
 * Geist Mono for all percentage and currency values.
 */
export function MarginRules() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [editingCell, setEditingCell] = useState<{ ruleId: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data: rules } = useQuery({
    queryKey: ['admin', 'margins'],
    queryFn: () => getMarginRules(),
    staleTime: 30_000,
  })

  const updateMutation = useMutation({
    mutationFn: (data: { categoryId: string; targetMarginPercent?: number; floorMarginPercent?: number; absoluteMinimum?: number }) =>
      updateMarginRules({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'margins'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => deleteMarginRule({ data: { ruleId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'margins'] })
      setDeleteTarget(null)
    },
  })

  const startEdit = (ruleId: string, field: string, value: number) => {
    setEditingCell({ ruleId, field })
    setEditValue(String(value))
  }

  const finishEdit = (rule: MarginRule) => {
    if (editingCell && editValue) {
      const numVal = Number(editValue)
      if (!Number.isNaN(numVal)) {
        updateMutation.mutate({
          categoryId: rule.categoryId,
          [editingCell.field]: numVal,
        })
      }
    }
    setEditingCell(null)
    setEditValue('')
  }

  // Sort by tightest margins first (smallest spread between target and floor)
  const sortedRules = useMemo(() => {
    return [...(rules ?? [])].sort((a, b) => {
      const spreadA = a.targetMarginPercent - a.floorMarginPercent
      const spreadB = b.targetMarginPercent - b.floorMarginPercent
      return spreadA - spreadB
    })
  }, [rules])

  // Find max target for scale normalization
  const maxTarget = useMemo(() => {
    if (!sortedRules.length) return 30
    return Math.max(...sortedRules.map((r) => r.targetMarginPercent), 30)
  }, [sortedRules])

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
          {t('margins.title', 'Margin Engine')}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-black/20 dark:text-white/20">
            Sorted by tightest margin
          </span>
          <Button variant="outline" className="!text-[#2563EB] !border-[#2563EB]/15 !bg-[#2563EB]/5 data-[hovered]:!bg-[#2563EB]/10">
            {t('margins.applyToAll', 'Apply to All')}
          </Button>
        </div>
      </div>

      {/* Category sections */}
      <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04]">
        {sortedRules.map((rule) => {
          const isExpanded = expandedId === rule.id
          const hasTierOverrides = Object.keys(rule.customerTierOverrides).length > 0
          const spread = rule.targetMarginPercent - rule.floorMarginPercent
          const isTight = spread <= 3

          return (
            <div key={rule.id} className="group/row relative">
              {/* Compact row */}
              <div className="px-4 py-3">
                {/* Top line: category name + editable values + actions */}
                <div className="flex items-center gap-3">
                  {/* Category name + tightness indicator */}
                  <div className="w-40 shrink-0 flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{rule.categoryName}</span>
                    {isTight && (
                      <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full px-1.5 py-0.5 shrink-0">
                        tight
                      </span>
                    )}
                  </div>

                  {/* Editable values row */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Floor */}
                    <EditableMarginValue
                      ruleId={rule.id}
                      field="floorMarginPercent"
                      value={rule.floorMarginPercent}
                      label="floor"
                      color="text-amber-600 dark:text-amber-400"
                      editingCell={editingCell}
                      editValue={editValue}
                      setEditValue={setEditValue}
                      onStart={startEdit}
                      onFinish={() => finishEdit(rule)}
                    />

                    {/* Target */}
                    <EditableMarginValue
                      ruleId={rule.id}
                      field="targetMarginPercent"
                      value={rule.targetMarginPercent}
                      label="target"
                      color="text-green-600 dark:text-green-400"
                      editingCell={editingCell}
                      editValue={editValue}
                      setEditValue={setEditValue}
                      onStart={startEdit}
                      onFinish={() => finishEdit(rule)}
                    />

                    {/* Absolute minimum */}
                    <EditableMarginValue
                      ruleId={rule.id}
                      field="absoluteMinimum"
                      value={rule.absoluteMinimum}
                      label="min EGP"
                      isCurrency
                      editingCell={editingCell}
                      editValue={editValue}
                      setEditValue={setEditValue}
                      onStart={startEdit}
                      onFinish={() => finishEdit(rule)}
                    />

                    {/* Approval below */}
                    <div className="text-center">
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                        {rule.requiresApprovalBelow}%
                      </span>
                      <div className="text-[9px] text-black/25 dark:text-white/25 mt-0.5">approval</div>
                    </div>
                  </div>

                  {/* Expand toggle for tier overrides */}
                  {hasTierOverrides && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                      className="text-[10px] text-[#2563EB]/60 hover:text-[#2563EB] cursor-pointer shrink-0"
                    >
                      {isExpanded ? 'Hide tiers' : `${Object.keys(rule.customerTierOverrides).length} tiers`}
                    </button>
                  )}

                  {/* Delete button — ghost, on hover */}
                  <div
                    className="opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: rule.id, name: rule.categoryName }) }}
                  >
                    <Button variant="ghost" className="!text-red-500/60 data-[hovered]:!text-red-600 !px-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </Button>
                  </div>
                </div>

                {/* Visual margin scale bar */}
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="w-40 shrink-0" />
                  <div className="flex-1 relative h-3">
                    {/* Track */}
                    <div className="absolute inset-y-0 inset-x-0 rounded-full bg-black/[0.04] dark:bg-white/[0.04]" />
                    {/* Floor to Target range (green zone) */}
                    <div
                      className="absolute inset-y-0 rounded-full bg-green-500/15"
                      style={{
                        left: `${(rule.floorMarginPercent / maxTarget) * 100}%`,
                        width: `${((rule.targetMarginPercent - rule.floorMarginPercent) / maxTarget) * 100}%`,
                      }}
                    />
                    {/* Below floor (red zone) */}
                    <div
                      className="absolute inset-y-0 start-0 rounded-s-full bg-red-500/10"
                      style={{ width: `${(rule.floorMarginPercent / maxTarget) * 100}%` }}
                    />
                    {/* Floor marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-500 rounded-full"
                      style={{ left: `${(rule.floorMarginPercent / maxTarget) * 100}%` }}
                    />
                    {/* Target marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-green-500 rounded-full"
                      style={{ left: `${(rule.targetMarginPercent / maxTarget) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded: tier overrides (collapsed by default) */}
              {isExpanded && hasTierOverrides && (
                <div className="px-4 pb-3 pt-0">
                  <div className="ps-4 border-s-2 border-black/6 dark:border-white/6 ms-40">
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

      {/* Add Category button */}
      <button
        type="button"
        onClick={() => setAddDialogOpen(true)}
        className="w-full rounded-lg border border-dashed border-black/10 dark:border-white/10 py-2.5 text-xs text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50 hover:border-black/20 dark:hover:border-white/20 transition-colors cursor-pointer"
      >
        + {t('margins.addCategory', 'Add category')}
      </button>

      {/* Add Category Dialog */}
      <AddMarginRuleDialog isOpen={addDialogOpen} onClose={() => setAddDialogOpen(false)} />

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ModalOverlay
          isOpen
          onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
        >
          <Modal className="w-full max-w-sm rounded-2xl backdrop-blur-2xl bg-white/90 dark:bg-black/90 border border-black/6 dark:border-white/6 p-6 shadow-xl">
            <Dialog className="outline-none">
              {() => (
                <div className="space-y-4">
                  <Heading slot="title" className="text-sm font-semibold">Delete Rule</Heading>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    Remove margin rule for <strong>{deleteTarget.name}</strong>? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onPress={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
                    <Button
                      variant="primary"
                      onPress={() => deleteMutation.mutate(deleteTarget.id)}
                      isDisabled={deleteMutation.isPending}
                      className="flex-1 !bg-red-600 data-[hovered]:!bg-red-700"
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              )}
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </div>
  )
}

// ─── Editable Margin Value ──────────────────────────────

function EditableMarginValue({
  ruleId,
  field,
  value,
  label,
  color,
  isCurrency,
  editingCell,
  editValue,
  setEditValue,
  onStart,
  onFinish,
}: {
  ruleId: string
  field: string
  value: number
  label: string
  color?: string
  isCurrency?: boolean
  editingCell: { ruleId: string; field: string } | null
  editValue: string
  setEditValue: (v: string) => void
  onStart: (ruleId: string, field: string, value: number) => void
  onFinish: () => void
}) {
  const isEditing = editingCell?.ruleId === ruleId && editingCell.field === field

  return (
    <div
      className="cursor-text text-center"
      onClick={(e) => { e.stopPropagation(); onStart(ruleId, field, value) }}
    >
      {isEditing ? (
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={onFinish}
          onKeyDown={(e) => { if (e.key === 'Enter') onFinish() }}
          autoFocus
          className="w-16 rounded border border-[#2563EB] bg-transparent px-1 py-0.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs outline-none text-center"
        />
      ) : (
        <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs ${color ?? ''}`}>
          {isCurrency ? value.toLocaleString() : `${value}%`}
        </span>
      )}
      <div className="text-[9px] text-black/25 dark:text-white/25 mt-0.5">{label}</div>
    </div>
  )
}

// ─── Add Margin Rule Dialog ─────────────────────────────

function AddMarginRuleDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [category, setCategory] = useState('')
  const [target, setTarget] = useState('')
  const [floor, setFloor] = useState('')
  const [absoluteMin, setAbsoluteMin] = useState('')

  const mutation = useMutation({
    mutationFn: () => createMarginRule({ data: {
      productCategory: category,
      target: Number(target),
      floor: Number(floor),
      absoluteMin: Number(absoluteMin),
    }}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'margins'] })
      handleClose()
    },
  })

  const handleClose = () => {
    setCategory('')
    setTarget('')
    setFloor('')
    setAbsoluteMin('')
    onClose()
  }

  const isValid = category && target && floor && absoluteMin &&
    !Number.isNaN(Number(target)) && !Number.isNaN(Number(floor)) && !Number.isNaN(Number(absoluteMin))

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) handleClose() }}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
    >
      <Modal className="w-full max-w-md rounded-2xl backdrop-blur-2xl bg-white/90 dark:bg-black/90 border border-black/6 dark:border-white/6 p-6 shadow-xl">
        <Dialog className="outline-none">
          {() => (
            <div className="space-y-5">
              <Heading slot="title" className="text-sm font-semibold">
                {t('margins.addCategory', 'Add Category')}
              </Heading>
              <div className="space-y-4">
                <UnderlineInput label="Category Name" value={category} onChange={setCategory} placeholder="e.g. Insulation" />
                <UnderlineInput label="Target %" value={target} onChange={setTarget} placeholder="e.g. 20" />
                <UnderlineInput label="Floor %" value={floor} onChange={setFloor} placeholder="e.g. 14" />
                <UnderlineInput label="Minimum EGP" value={absoluteMin} onChange={setAbsoluteMin} placeholder="e.g. 50" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onPress={handleClose} className="flex-1">Cancel</Button>
                <Button
                  variant="primary"
                  onPress={() => mutation.mutate()}
                  isDisabled={!isValid || mutation.isPending}
                  className="flex-1"
                >
                  {mutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
