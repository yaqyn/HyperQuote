import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Select, SelectValue, ListBox, ListBoxItem, Popover, Label, TextField, TextArea } from 'react-aria-components'
import { StatusBadge } from '../shared/StatusBadge'
import { resolveDispute } from '../../../lib/server/finance-disputes'
import type { DisputeStatus, DisputeResolutionType } from '../../../types/finance'

interface DisputeDetailProps {
  disputeId: string
  onBack: () => void
}

// Resolution type -> customerFacingStatus mapping (mirrors server function)
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
  return { text: `${hours}h ${minutes}m remaining`, isUrgent: hours < 4, isOverdue: false }
}

/**
 * Single dispute detail view.
 * Status timeline, SLA countdown, resolve modal with 4 resolution types,
 * customer-facing portal status (FIN-09), ETA compliance notice.
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
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        {t('disputes.notFound', 'Dispute not found')}
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

  const statusTimeline: { status: string; timestamp: string | null; active: boolean }[] = [
    { status: 'Open', timestamp: dispute.createdAt, active: true },
    { status: 'Investigating', timestamp: dispute.status !== 'open' ? dispute.activityLog.find((l) => l.action.includes('Investigating'))?.timestamp ?? null : null, active: dispute.status !== 'open' },
    { status: dispute.status === 'escalated' ? 'Escalated' : 'Resolved', timestamp: dispute.resolvedAt ?? dispute.activityLog[dispute.activityLog.length - 1]?.timestamp ?? null, active: dispute.status === 'resolved' || dispute.status === 'escalated' },
  ]

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        onPress={onBack}
        className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        {t('disputes.backToList', 'Back to Disputes')}
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-black/90 dark:text-white/90">
            {t('disputes.disputeLabel', 'Dispute')} <span className="font-[family-name:var(--font-geist-mono)]">{dispute.id}</span>
          </h3>
          <p className="text-sm text-black/60 dark:text-white/60 mt-1">
            {t('disputes.linkedInvoice', 'Invoice')}: <span className="text-[#2563EB] font-[family-name:var(--font-geist-mono)] cursor-pointer">{dispute.invoiceNumber}</span>
            {' \u2014 '}{dispute.customerName}
          </p>
        </div>
        <StatusBadge status={dispute.status} variant="dispute" />
      </div>

      {/* ETA compliance notice */}
      <div className="rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/5 p-3">
        <p className="text-xs text-[#2563EB]">
          {t('disputes.etaNotice', 'E-invoices cannot be deleted. If customer rejected on ETA portal, a credit/debit note must be issued.')}
        </p>
      </div>

      {/* Customer-facing portal status (FIN-09) */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
            {t('disputes.portalStatus', 'Portal Status')}
          </span>
          <span className="inline-flex items-center rounded-full bg-[#2563EB]/10 text-[#2563EB] px-3 py-1 text-xs font-medium">
            {PORTAL_STATUS_LABELS[dispute.customerFacingStatus] ?? dispute.customerFacingStatus}
          </span>
          <span className="text-xs text-black/40 dark:text-white/40">
            ({t('disputes.portalStatusHint', 'This is what the customer sees in their portal')})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Dispute info */}
        <div className="space-y-4">
          {/* Status timeline */}
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
            <h4 className="text-sm font-medium mb-3 text-black/70 dark:text-white/70">{t('disputes.timeline', 'Timeline')}</h4>
            <div className="flex items-center gap-2">
              {statusTimeline.map((step, i) => (
                <div key={step.status} className="flex items-center gap-2">
                  <div className={`flex flex-col items-center ${step.active ? '' : 'opacity-30'}`}>
                    <div className={`w-3 h-3 rounded-full ${step.active ? 'bg-[#2563EB]' : 'bg-black/20 dark:bg-white/20'}`} />
                    <span className="text-[10px] mt-1 text-black/60 dark:text-white/60">{step.status}</span>
                    {step.timestamp && (
                      <span className="text-[9px] font-[family-name:var(--font-geist-mono)] tabular-nums text-black/40 dark:text-white/40">
                        {new Date(step.timestamp).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {i < statusTimeline.length - 1 && (
                    <div className={`w-12 h-0.5 ${step.active ? 'bg-[#2563EB]' : 'bg-black/10 dark:bg-white/10'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dispute details */}
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4 space-y-3">
            <h4 className="text-sm font-medium text-black/70 dark:text-white/70">{t('disputes.details', 'Details')}</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-black/50 dark:text-white/50">{t('disputes.reason', 'Reason')}</span>
                <p className="mt-0.5">{dispute.reason}</p>
              </div>
              <div>
                <span className="text-xs text-black/50 dark:text-white/50">{t('disputes.assignedTo', 'Assigned To')}</span>
                <p className="mt-0.5">{dispute.assignedTo ?? '--'}</p>
              </div>
            </div>
            <div>
              <span className="text-xs text-black/50 dark:text-white/50">{t('disputes.description', 'Description')}</span>
              <p className="mt-0.5 text-sm">{dispute.description}</p>
            </div>
            {dispute.evidenceUrls.length > 0 && (
              <div>
                <span className="text-xs text-black/50 dark:text-white/50">{t('disputes.evidence', 'Evidence')}</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {dispute.evidenceUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2563EB] underline">
                      {url.split('/').pop()}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* SLA countdown */}
            <div className="flex items-center gap-2 pt-2 border-t border-black/5 dark:border-white/5">
              <span className="text-xs text-black/50 dark:text-white/50">{t('disputes.sla48h', '48h SLA')}:</span>
              {sla.isOverdue ? (
                <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">
                  OVERDUE
                </span>
              ) : (
                <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-sm ${sla.isUrgent ? 'text-red-600 dark:text-red-400 font-bold' : ''}`}>
                  {sla.text}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
            <h4 className="text-sm font-medium mb-3 text-black/70 dark:text-white/70">{t('disputes.actions', 'Actions')}</h4>
            <div className="flex flex-wrap gap-2">
              {dispute.status === 'open' && (
                <>
                  <Button className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 transition-colors">
                    {t('disputes.assign', 'Assign')}
                  </Button>
                  <Button className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    {t('disputes.investigate', 'Investigate')}
                  </Button>
                  <Button className="rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    {t('disputes.escalate', 'Escalate')}
                  </Button>
                </>
              )}
              {dispute.status === 'investigating' && (
                <>
                  <Button
                    onPress={() => setShowResolveModal(true)}
                    className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 transition-colors"
                  >
                    {t('disputes.resolve', 'Resolve')}
                  </Button>
                  <Button className="rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    {t('disputes.escalate', 'Escalate')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Activity log */}
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <h4 className="text-sm font-medium mb-3 text-black/70 dark:text-white/70">{t('disputes.activityLog', 'Activity Log')}</h4>
          <div className="space-y-3">
            {dispute.activityLog.map((entry, i) => (
              <div key={`${entry.timestamp}-${i}`} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-[#2563EB]/40 mt-1.5 shrink-0" />
                <div>
                  <p>{entry.action}</p>
                  <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{new Date(entry.timestamp).toLocaleString()}</span>
                    {' \u2014 '}{entry.user}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-2xl p-6 shadow-2xl">
            <h3 className="text-base font-semibold mb-4">{t('disputes.resolveDispute', 'Resolve Dispute')}</h3>

            {/* Resolution type */}
            <div className="mb-4">
              <Select
                selectedKey={resolutionType}
                onSelectionChange={(key) => setResolutionType(key as DisputeResolutionType)}
                className="flex flex-col gap-1"
              >
                <Label className="text-sm text-black/60 dark:text-white/60">
                  {t('disputes.resolutionType', 'Resolution Type')}
                </Label>
                <Button className="flex items-center justify-between rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-2 text-sm text-start">
                  <SelectValue placeholder={t('disputes.selectResolution', 'Select resolution...')} />
                  <span className="ms-2 text-black/40 dark:text-white/40">&#9662;</span>
                </Button>
                <Popover className="w-[--trigger-width] rounded-lg border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-xl shadow-lg">
                  <ListBox className="p-1 outline-none">
                    {(Object.entries(RESOLUTION_LABELS) as [DisputeResolutionType, string][]).map(([key, label]) => (
                      <ListBoxItem
                        key={key}
                        id={key}
                        className="rounded px-3 py-2 text-sm cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10"
                      >
                        {label}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Popover>
              </Select>
            </div>

            {/* Portal status preview */}
            {previewPortalStatus && (
              <div className="mb-4 rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/5 p-3">
                <span className="text-xs text-[#2563EB]">
                  {t('disputes.portalStatusPreview', 'Portal will show')}: <span className="font-medium">{PORTAL_STATUS_LABELS[previewPortalStatus] ?? previewPortalStatus}</span>
                </span>
              </div>
            )}

            {/* Resolution notes */}
            <div className="mb-4">
              <TextField
                value={resolutionNotes}
                onChange={setResolutionNotes}
                className="flex flex-col gap-1"
              >
                <Label className="text-sm text-black/60 dark:text-white/60">
                  {t('disputes.resolutionNotes', 'Resolution Notes')}
                </Label>
                <TextArea
                  className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-2 text-sm min-h-[80px] outline-none focus:border-[#2563EB]"
                  placeholder={t('disputes.notesPlaceholder', 'Describe the resolution...')}
                />
              </TextField>
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-2">
              <Button
                onPress={() => setShowResolveModal(false)}
                className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {t('disputes.cancel', 'Cancel')}
              </Button>
              <Button
                onPress={handleResolve}
                isDisabled={!resolutionType || !resolutionNotes || isResolving}
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 disabled:opacity-40 transition-colors"
              >
                {isResolving ? t('disputes.resolving', 'Resolving...') : t('disputes.confirmResolve', 'Confirm Resolution')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
