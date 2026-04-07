import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, TextField, TextArea, Label, Dialog, Modal, ModalOverlay, Heading, Select, SelectValue, ListBox, ListBoxItem, Popover } from 'react-aria-components'
import { motion } from 'motion/react'
import { StatusBadge } from '../shared/StatusBadge'
import { resolveDispute } from '../../../lib/server/finance-disputes'
import type { DisputeStatus, DisputeResolutionType } from '../../../types/finance'

interface DisputeDetailProps {
  disputeId: string
  onBack: () => void
}

const RESOLUTION_TO_PORTAL_STATUS: Record<DisputeResolutionType, string> = {
  credit_note: 'credit_issued',
  price_adjustment: 'adjusted',
  write_off: 'resolved',
  no_action: 'no_change',
}

const RESOLUTION_LABELS: Record<DisputeResolutionType, string> = {
  credit_note: 'Credit Note',
  price_adjustment: 'Price Adjustment',
  write_off: 'Write Off',
  no_action: 'No Action',
}

const PORTAL_STATUS_LABELS: Record<string, string> = {
  under_review: 'Under Review',
  resolved: 'Resolved',
  credit_issued: 'Credit Issued',
  adjusted: 'Adjusted',
  action_required: 'Action Required',
  no_change: 'No Change',
}

interface MockDispute {
  id: string
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  reason: string
  description: string
  status: DisputeStatus
  resolutionType?: DisputeResolutionType
  customerFacingStatus: string
  assignedTo?: string
  createdAt: string
  resolvedAt?: string
  slaDeadline: string
  evidenceUrls: string[]
  activityLog: { timestamp: string; action: string; user: string }[]
}

const MOCK_DISPUTE_MAP: Record<string, MockDispute> = {
  'disp-001': {
    id: 'disp-001',
    invoiceId: 'inv-342',
    invoiceNumber: 'INV-2026-0342',
    customerId: 'cust-001',
    customerName: 'ACME Construction',
    reason: 'Incorrect pricing',
    description: 'Unit price for rebar does not match quoted price. Quote showed EGP 12,500/ton but invoice shows EGP 13,200/ton.',
    status: 'open',
    customerFacingStatus: 'under_review',
    createdAt: '2026-04-04T10:00:00Z',
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    evidenceUrls: [],
    activityLog: [
      { timestamp: '2026-04-04T10:00:00Z', action: 'Dispute created', user: 'System' },
    ],
  },
  'disp-002': {
    id: 'disp-002',
    invoiceId: 'inv-389',
    invoiceNumber: 'INV-2026-0389',
    customerId: 'cust-003',
    customerName: 'Nile Construction Co.',
    reason: 'Damaged goods',
    description: 'Cement bags arrived with water damage, 15 bags unusable out of 200 bags delivered.',
    status: 'investigating',
    customerFacingStatus: 'under_review',
    assignedTo: 'Ahmed Kamal',
    createdAt: '2026-04-03T14:30:00Z',
    slaDeadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    evidenceUrls: ['https://cdn.example.com/evidence/photo1.jpg'],
    activityLog: [
      { timestamp: '2026-04-03T14:30:00Z', action: 'Dispute created', user: 'System' },
      { timestamp: '2026-04-03T15:00:00Z', action: 'Assigned to Ahmed Kamal', user: 'Sara Hassan' },
      { timestamp: '2026-04-03T16:00:00Z', action: 'Status changed to Investigating', user: 'Ahmed Kamal' },
    ],
  },
  'disp-004': {
    id: 'disp-004',
    invoiceId: 'inv-415',
    invoiceNumber: 'INV-2026-0415',
    customerId: 'cust-002',
    customerName: 'Pyramids Development',
    reason: 'Wrong product delivered',
    description: 'Received Grade 40 concrete instead of Grade 50 as specified in the order.',
    status: 'escalated',
    customerFacingStatus: 'under_review',
    assignedTo: 'Mohamed Ali',
    createdAt: '2026-04-02T16:00:00Z',
    slaDeadline: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    evidenceUrls: [],
    activityLog: [
      { timestamp: '2026-04-02T16:00:00Z', action: 'Dispute created', user: 'System' },
      { timestamp: '2026-04-02T17:00:00Z', action: 'Assigned to Mohamed Ali', user: 'Finance Manager' },
      { timestamp: '2026-04-03T08:00:00Z', action: 'Escalated to Finance Director', user: 'Mohamed Ali' },
    ],
  },
}

function getSLAInfo(deadline: string): { text: string; isUrgent: boolean; isOverdue: boolean } {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return { text: 'OVERDUE', isUrgent: true, isOverdue: true }
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return { text: `${hours}h ${minutes}m`, isUrgent: hours < 4, isOverdue: false }
}

/**
 * "The Case File" — Case file layout.
 * Header with dispute info, vertical activity thread on left, details on right.
 * Status progression as horizontal dot chain.
 */
export function DisputeDetail({ disputeId, onBack }: DisputeDetailProps) {
  const { t } = useTranslation('finance')
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolutionType, setResolutionType] = useState<DisputeResolutionType | ''>('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [isResolving, setIsResolving] = useState(false)

  const dispute = MOCK_DISPUTE_MAP[disputeId]
  if (!dispute) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-xs text-black/25 dark:text-white/25 tracking-wider uppercase">
          {t('disputes.notFound', 'Not found')}
        </span>
      </div>
    )
  }

  const sla = getSLAInfo(dispute.slaDeadline)
  const previewPortalStatus = resolutionType ? RESOLUTION_TO_PORTAL_STATUS[resolutionType] : null

  const handleResolve = async () => {
    if (!resolutionType || !resolutionNotes) return
    setIsResolving(true)
    try {
      await resolveDispute({
        data: {
          disputeId: dispute.id,
          resolutionType,
          resolutionNotes,
        },
      })
      setShowResolveModal(false)
    } finally {
      setIsResolving(false)
    }
  }

  const statusSteps = [
    { label: 'Open', active: true },
    { label: 'Investigating', active: dispute.status !== 'open' },
    { label: dispute.status === 'escalated' ? 'Escalated' : 'Resolved', active: dispute.status === 'resolved' || dispute.status === 'escalated' },
  ]

  return (
    <div className="space-y-0">
      {/* ─── Top bar ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <Button
          onPress={onBack}
          className="text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
        >
          {t('disputes.backToList', 'Back')}
        </Button>
        <StatusBadge status={dispute.status} variant="dispute" />
      </div>

      {/* ─── Case header ───────────────────────────────── */}
      <div className="px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg text-[#2563EB] font-medium">
              {dispute.id}
            </span>
            <div className="flex items-center gap-2 mt-1 text-xs text-black/40 dark:text-white/40">
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[#2563EB]/60">
                {dispute.invoiceNumber}
              </span>
              <span className="text-black/15 dark:text-white/15">/</span>
              <span>{dispute.customerName}</span>
            </div>
          </div>
          {/* SLA */}
          <div className="text-end">
            <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-0.5">
              48h SLA
            </div>
            {sla.isOverdue ? (
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs font-medium text-red-600 dark:text-red-400 tracking-wider uppercase">
                Overdue
              </span>
            ) : (
              <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs ${sla.isUrgent ? 'text-red-600 dark:text-red-400 font-medium' : 'text-black/40 dark:text-white/40'}`}>
                {sla.text}
              </span>
            )}
          </div>
        </div>

        {/* Status dot chain */}
        <div className="flex items-center gap-0 mt-4">
          {statusSteps.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${step.active ? 'bg-[#2563EB]' : 'bg-black/10 dark:bg-white/10'}`} />
                <span className={`text-[10px] ${step.active ? 'text-black/60 dark:text-white/60' : 'text-black/20 dark:text-white/20'}`}>
                  {step.label}
                </span>
              </div>
              {i < statusSteps.length - 1 && (
                <div className={`w-6 h-px mx-2 ${step.active ? 'bg-[#2563EB]/30' : 'bg-black/[0.06] dark:bg-white/[0.06]'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── ETA compliance ────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] bg-[#2563EB]/[0.02]">
        <span className="size-1 rounded-full bg-[#2563EB]" />
        <span className="text-[10px] text-[#2563EB]/60">
          {t('disputes.etaNotice', 'E-invoices cannot be deleted. Credit/debit note required for ETA rejections.')}
        </span>
      </div>

      {/* ─── Portal status ─────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
        <span className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20">
          {t('disputes.portalStatus', 'Portal')}
        </span>
        <span className="text-[10px] text-black/50 dark:text-white/50 font-medium">
          {PORTAL_STATUS_LABELS[dispute.customerFacingStatus] ?? dispute.customerFacingStatus}
        </span>
      </div>

      {/* ─── Two-column layout ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">
        {/* Left: details + actions */}
        <div className="border-e border-black/[0.06] dark:border-white/[0.06]">
          {/* Details */}
          <div className="px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.06] space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-0.5">
                  {t('disputes.reason', 'Reason')}
                </div>
                <span className="text-xs text-black/60 dark:text-white/60">{dispute.reason}</span>
              </div>
              <div>
                <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-0.5">
                  {t('disputes.assignedTo', 'Assigned')}
                </div>
                <span className="text-xs text-black/60 dark:text-white/60">{dispute.assignedTo ?? '--'}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-0.5">
                {t('disputes.description', 'Description')}
              </div>
              <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed">{dispute.description}</p>
            </div>
            {dispute.evidenceUrls.length > 0 && (
              <div>
                <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-1">
                  {t('disputes.evidence', 'Evidence')}
                </div>
                <div className="flex gap-2">
                  {dispute.evidenceUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#2563EB] hover:underline font-[family-name:var(--font-geist-mono)]"
                    >
                      {url.split('/').pop()}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              {dispute.status === 'open' && (
                <>
                  <Button className="rounded-md bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 transition-colors">
                    {t('disputes.assign', 'Assign')}
                  </Button>
                  <Button className="rounded-md border border-black/[0.08] dark:border-white/[0.08] px-3 py-1.5 text-xs text-black/50 dark:text-white/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                    {t('disputes.investigate', 'Investigate')}
                  </Button>
                  <Button className="rounded-md border border-red-500/20 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/[0.05] transition-colors">
                    {t('disputes.escalate', 'Escalate')}
                  </Button>
                </>
              )}
              {dispute.status === 'investigating' && (
                <>
                  <Button
                    onPress={() => setShowResolveModal(true)}
                    className="rounded-md bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 transition-colors"
                  >
                    {t('disputes.resolve', 'Resolve')}
                  </Button>
                  <Button className="rounded-md border border-red-500/20 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/[0.05] transition-colors">
                    {t('disputes.escalate', 'Escalate')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: activity thread */}
        <div className="px-5 py-4">
          <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-3">
            {t('disputes.activityLog', 'Activity')}
          </div>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute start-[3px] top-1 bottom-1 w-px bg-black/[0.06] dark:bg-white/[0.06]" />

            <div className="space-y-4">
              {dispute.activityLog.map((entry, i) => (
                <div key={`${entry.timestamp}-${i}`} className="flex items-start gap-3 relative">
                  <div className="size-[7px] rounded-full bg-[#2563EB]/30 mt-1 shrink-0 relative z-10" />
                  <div className="min-w-0">
                    <div className="text-xs text-black/60 dark:text-white/60">{entry.action}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[9px] text-black/20 dark:text-white/20">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </span>
                      <span className="text-[9px] text-black/15 dark:text-white/15">/</span>
                      <span className="text-[9px] text-black/25 dark:text-white/25">{entry.user}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Resolve Modal ─────────────────────────────── */}
      {showResolveModal && (
        <ModalOverlay
          isDismissable
          isOpen
          onOpenChange={(open) => { if (!open) setShowResolveModal(false) }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <Modal className="w-full max-w-md mx-4">
            <Dialog className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-black/95 backdrop-blur-2xl p-0 outline-none">
              {({ close }) => (
                <motion.div
                  initial={{ scale: 0.97, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <div className="px-6 pt-5 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                    <Heading slot="title" className="text-sm font-medium">
                      {t('disputes.resolveDispute', 'Resolve Dispute')}
                    </Heading>
                  </div>

                  <div className="px-6 py-5 space-y-4">
                    {/* Resolution type pills */}
                    <div>
                      <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-2">
                        {t('disputes.resolutionType', 'Resolution')}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.entries(RESOLUTION_LABELS) as [DisputeResolutionType, string][]).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setResolutionType(key)}
                            className={`rounded-full px-3 py-1 text-xs transition-colors ${
                              resolutionType === key
                                ? 'bg-[#2563EB] text-white'
                                : 'bg-black/[0.04] dark:bg-white/[0.04] text-black/40 dark:text-white/40 hover:bg-black/[0.08] dark:hover:bg-white/[0.08]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Portal status preview */}
                    {previewPortalStatus && (
                      <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-[#2563EB]/[0.02] border border-[#2563EB]/10">
                        <span className="size-1 rounded-full bg-[#2563EB]" />
                        <span className="text-[10px] text-[#2563EB]/60">
                          {t('disputes.portalStatusPreview', 'Portal will show')}:{' '}
                          <span className="font-medium text-[#2563EB]/80">
                            {PORTAL_STATUS_LABELS[previewPortalStatus] ?? previewPortalStatus}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    <TextField
                      value={resolutionNotes}
                      onChange={setResolutionNotes}
                      className="flex flex-col gap-1"
                    >
                      <Label className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20">
                        {t('disputes.resolutionNotes', 'Notes')}
                      </Label>
                      <TextArea
                        className="w-full bg-transparent border border-black/[0.06] dark:border-white/[0.06] rounded-lg px-3 py-2 text-xs min-h-[60px] outline-none focus:border-[#2563EB]/30 transition-colors"
                        placeholder={t('disputes.notesPlaceholder', 'Describe the resolution...')}
                      />
                    </TextField>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                      <Button
                        onPress={close}
                        className="rounded-md px-4 py-1.5 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                      >
                        {t('disputes.cancel', 'Cancel')}
                      </Button>
                      <Button
                        onPress={handleResolve}
                        isDisabled={!resolutionType || !resolutionNotes || isResolving}
                        className="rounded-md bg-[#2563EB] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 disabled:opacity-40 transition-colors"
                      >
                        {isResolving ? t('disputes.resolving', 'Resolving...') : t('disputes.confirmResolve', 'Confirm')}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </div>
  )
}
