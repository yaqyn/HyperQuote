import { useState, useMemo } from 'react'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../ui/Button'
import { Toggle } from '../../ui/Toggle'
import { UnderlineInput } from '../../ui/UnderlineInput'
import { getApprovalThresholds, updateApprovalThresholds, createApprovalThreshold, deleteApprovalThreshold } from '../../../lib/server/admin'
import type { ApprovalType, ApprovalThreshold as ApprovalThresholdType } from '../../../types/admin'

/**
 * ApprovalThresholds — "The Rules"
 * Grouped by type: Financial, Operational, HR.
 * Each rule shows a visual approval chain: Amount > X -> Manager -> CFO -> CEO
 * Escalation time is prominent.
 */

const TYPE_LABELS: Record<ApprovalType, { key: string; fallback: string }> = {
  quote_margin: { key: 'approvals.quoteMargin', fallback: 'Quote Margin' },
  credit_limit: { key: 'approvals.creditLimit', fallback: 'Credit Limit Increase' },
  po_approval: { key: 'approvals.poApproval', fallback: 'PO Approval' },
  return_credit: { key: 'approvals.returnCredit', fallback: 'Return / Credit Note' },
  inventory_adjustment: { key: 'approvals.inventoryAdjustment', fallback: 'Inventory Adjustment' },
}

// Group types by domain
const TYPE_GROUPS: { label: string; types: ApprovalType[] }[] = [
  { label: 'Financial', types: ['quote_margin', 'credit_limit'] },
  { label: 'Operational', types: ['po_approval', 'inventory_adjustment'] },
  { label: 'Returns', types: ['return_credit'] },
]

const APPROVER_OPTIONS = ['sales_manager', 'finance_manager', 'procurement_manager', 'warehouse_manager', 'operations_manager', 'ceo']
const TYPE_OPTIONS: ApprovalType[] = ['quote_margin', 'credit_limit', 'po_approval', 'return_credit', 'inventory_adjustment']

function formatEscalation(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatEscalationLong(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`
}

export function ApprovalThresholds() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; condition: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<{ escalationMinutes: string; escalationTarget: string }>({ escalationMinutes: '', escalationTarget: '' })

  const { data: thresholds } = useQuery({
    queryKey: ['admin', 'approvals'],
    queryFn: () => getApprovalThresholds(),
    staleTime: 30_000,
  })

  const updateMutation = useMutation({
    mutationFn: (data: { thresholdId: string; escalationMinutes?: number; escalationTarget?: string }) =>
      updateApprovalThresholds({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'approvals'] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (thresholdId: string) => deleteApprovalThreshold({ data: { thresholdId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'approvals'] })
      setDeleteTarget(null)
    },
  })

  const startEdit = (threshold: ApprovalThresholdType) => {
    setEditingId(threshold.id)
    setEditFields({
      escalationMinutes: String(threshold.escalationMinutes),
      escalationTarget: threshold.escalationTarget,
    })
  }

  const saveEdit = (thresholdId: string) => {
    const mins = Number(editFields.escalationMinutes)
    if (!Number.isNaN(mins)) {
      updateMutation.mutate({
        thresholdId,
        escalationMinutes: mins,
        escalationTarget: editFields.escalationTarget,
      })
    }
  }

  // Group thresholds by type group
  const groupedThresholds = useMemo(() => {
    const all = thresholds ?? []
    return TYPE_GROUPS.map((group) => ({
      ...group,
      rules: all.filter((t) => group.types.includes(t.type)),
    })).filter((g) => g.rules.length > 0)
  }, [thresholds])

  return (
    <div className="p-5 space-y-5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
        {t('approvals.title', 'Approval Rules')}
      </span>

      {/* Grouped rules */}
      {groupedThresholds.map((group) => (
        <div key={group.label}>
          {/* Group label */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-black/25 dark:text-white/25">
              {group.label}
            </span>
            <div className="flex-1 border-t border-black/[0.04] dark:border-white/[0.04]" />
          </div>

          <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {group.rules.map((threshold) => {
              const typeLabel = TYPE_LABELS[threshold.type]
              const isEditing = editingId === threshold.id

              return (
                <div
                  key={threshold.id}
                  className="group/rule px-4 py-3 space-y-2"
                >
                  {/* Top line: type + condition + toggle + actions */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">
                        {t(typeLabel.key, typeLabel.fallback)}
                      </div>
                      <div className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">
                        {threshold.condition}
                      </div>
                    </div>

                    {/* Escalation time — prominent */}
                    <div className="shrink-0 text-end">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={editFields.escalationMinutes}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFields((f: typeof editFields) => ({ ...f, escalationMinutes: e.target.value }))}
                            className="w-16 rounded border border-[#2563EB] bg-transparent px-1 py-0.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs outline-none"
                            placeholder="mins"
                          />
                          <span className="text-[10px] text-black/25 dark:text-white/25">min</span>
                        </div>
                      ) : (
                        <div className="rounded-full bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1">
                          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] font-medium">
                            Auto-escalates in {formatEscalationLong(threshold.escalationMinutes)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Enabled toggle */}
                    <Toggle defaultSelected />

                    {/* Edit / Save */}
                    {isEditing ? (
                      <Button variant="ghost" className="!text-green-600/70 data-[hovered]:!text-green-600" onPress={() => saveEdit(threshold.id)}>
                        Save
                      </Button>
                    ) : (
                      <Button variant="ghost" className="!text-[#2563EB]/70 data-[hovered]:!text-[#2563EB]" onPress={() => startEdit(threshold)}>
                        {t('approvals.edit', 'Edit')}
                      </Button>
                    )}

                    {/* Delete — ghost, on hover */}
                    <div className="opacity-0 group-hover/rule:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        className="!text-red-500/60 data-[hovered]:!text-red-600 !px-1.5"
                        onPress={() => setDeleteTarget({ id: threshold.id, condition: threshold.condition })}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                      </Button>
                    </div>
                  </div>

                  {/* Visual approval chain */}
                  <div className="flex items-center gap-0 ps-0">
                    {/* Approvers chain */}
                    {threshold.approvers.map((approver, i) => (
                      <div key={approver} className="flex items-center">
                        <span className="rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-black/50 dark:text-white/50">
                          {approver.replace(/_/g, ' ')}
                        </span>
                        {i < threshold.approvers.length - 1 && (
                          <svg className="w-3.5 h-3.5 text-black/15 dark:text-white/15 mx-1 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        )}
                      </div>
                    ))}

                    {/* Escalation arrow + target */}
                    <div className="flex items-center ms-1.5">
                      <div className="border-t border-dashed border-black/10 dark:border-white/10 w-4" />
                      <svg className="w-3 h-3 text-black/20 dark:text-white/20 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                      {isEditing ? (
                        <select
                          value={editFields.escalationTarget}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditFields((f: typeof editFields) => ({ ...f, escalationTarget: e.target.value }))}
                          className="rounded border border-[#2563EB] bg-transparent px-1 py-0.5 text-[11px] outline-none cursor-pointer"
                        >
                          {APPROVER_OPTIONS.map((a) => (
                            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          {threshold.escalationTarget.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Add rule */}
      <button
        type="button"
        onClick={() => setAddDialogOpen(true)}
        className="w-full rounded-lg border border-dashed border-black/10 dark:border-white/10 py-2.5 text-xs text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50 hover:border-black/20 dark:hover:border-white/20 transition-colors cursor-pointer"
      >
        + {t('approvals.addRule', 'Add rule')}
      </button>

      {/* Add Rule Dialog */}
      <AddRuleDialog isOpen={addDialogOpen} onClose={() => setAddDialogOpen(false)} />

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
                    Remove approval rule: <strong>{deleteTarget.condition}</strong>?
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

// ─── Add Rule Dialog ────────────────────────────────────

function AddRuleDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [type, setType] = useState<string>(TYPE_OPTIONS[0]!)
  const [description, setDescription] = useState('')
  const [threshold, setThreshold] = useState('')
  const [approver, setApprover] = useState(APPROVER_OPTIONS[0]!)
  const [escalation, setEscalation] = useState(APPROVER_OPTIONS[0]!)

  const mutation = useMutation({
    mutationFn: () => createApprovalThreshold({ data: {
      type,
      description,
      threshold: Number(threshold),
      approver,
      escalation,
    }}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'approvals'] })
      handleClose()
    },
  })

  const handleClose = () => {
    setType(TYPE_OPTIONS[0]!)
    setDescription('')
    setThreshold('')
    setApprover(APPROVER_OPTIONS[0]!)
    setEscalation(APPROVER_OPTIONS[0]!)
    onClose()
  }

  const isValid = description && threshold && !Number.isNaN(Number(threshold))

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
                {t('approvals.addRule', 'Add Rule')}
              </Heading>
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] text-black/35 dark:text-white/35">Type</span>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full border-b border-black/[0.04] bg-transparent py-1.5 text-[13px] outline-none dark:border-white/[0.04] cursor-pointer"
                  >
                    {TYPE_OPTIONS.map((to) => {
                      const label = TYPE_LABELS[to]
                      return <option key={to} value={to}>{label.fallback}</option>
                    })}
                  </select>
                </div>
                <UnderlineInput label="Condition" value={description} onChange={setDescription} placeholder="e.g. Margin below 10%" />
                <UnderlineInput label="Threshold Value" value={threshold} onChange={setThreshold} placeholder="e.g. 50000" />
                <div className="space-y-1">
                  <span className="text-[11px] text-black/35 dark:text-white/35">Approver</span>
                  <select
                    value={approver}
                    onChange={(e) => setApprover(e.target.value)}
                    className="w-full border-b border-black/[0.04] bg-transparent py-1.5 text-[13px] outline-none dark:border-white/[0.04] cursor-pointer"
                  >
                    {APPROVER_OPTIONS.map((a) => (
                      <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-black/35 dark:text-white/35">Escalation Target</span>
                  <select
                    value={escalation}
                    onChange={(e) => setEscalation(e.target.value)}
                    className="w-full border-b border-black/[0.04] bg-transparent py-1.5 text-[13px] outline-none dark:border-white/[0.04] cursor-pointer"
                  >
                    {APPROVER_OPTIONS.map((a) => (
                      <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
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
