import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { StatusBadge } from '../shared/StatusBadge'
import type { InvoiceDispute, DisputeStatus } from '../../../types/finance'

interface DisputeListProps {
  onSelectDispute: (id: string) => void
  onCreateDispute: () => void
}

function getSLARemaining(deadline: string): { text: string; isUrgent: boolean; isOverdue: boolean } {
  const now = Date.now()
  const deadlineMs = new Date(deadline).getTime()
  const diff = deadlineMs - now

  if (diff <= 0) {
    return { text: 'OVERDUE', isUrgent: true, isOverdue: true }
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours < 4) {
    return { text: `${hours}h ${minutes}m`, isUrgent: true, isOverdue: false }
  }

  return { text: `${hours}h ${minutes}m`, isUrgent: false, isOverdue: false }
}

function getAge(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  return `${days}d`
}

const MOCK_DISPUTES: InvoiceDispute[] = [
  {
    id: 'disp-001',
    invoiceId: 'inv-342',
    invoiceNumber: 'INV-2026-0342',
    customerId: 'cust-001',
    customerName: 'ACME Construction',
    reason: 'Incorrect pricing',
    description: 'Unit price for rebar does not match quoted price',
    status: 'open',
    customerFacingStatus: 'under_review',
    assignedTo: undefined,
    createdAt: '2026-04-04T10:00:00Z',
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    evidenceUrls: [],
  },
  {
    id: 'disp-002',
    invoiceId: 'inv-389',
    invoiceNumber: 'INV-2026-0389',
    customerId: 'cust-003',
    customerName: 'Nile Construction Co.',
    reason: 'Damaged goods',
    description: 'Cement bags arrived with water damage, 15 bags unusable',
    status: 'investigating',
    customerFacingStatus: 'under_review',
    assignedTo: 'Ahmed Kamal',
    createdAt: '2026-04-03T14:30:00Z',
    slaDeadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    evidenceUrls: ['https://cdn.example.com/evidence/photo1.jpg'],
  },
  {
    id: 'disp-003',
    invoiceId: 'inv-401',
    invoiceNumber: 'INV-2026-0401',
    customerId: 'cust-005',
    customerName: 'Cairo Builders Ltd.',
    reason: 'Short delivery',
    description: 'Received 80 tons instead of 100 tons ordered',
    status: 'resolved',
    resolutionType: 'credit_note',
    customerFacingStatus: 'credit_issued',
    assignedTo: 'Sara Hassan',
    createdAt: '2026-04-01T09:00:00Z',
    resolvedAt: '2026-04-02T11:00:00Z',
    slaDeadline: '2026-04-03T09:00:00Z',
    evidenceUrls: [],
  },
  {
    id: 'disp-004',
    invoiceId: 'inv-415',
    invoiceNumber: 'INV-2026-0415',
    customerId: 'cust-002',
    customerName: 'Pyramids Development',
    reason: 'Wrong product delivered',
    description: 'Received Grade 40 concrete instead of Grade 50',
    status: 'escalated',
    customerFacingStatus: 'under_review',
    assignedTo: 'Mohamed Ali',
    createdAt: '2026-04-02T16:00:00Z',
    slaDeadline: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    evidenceUrls: [],
  },
]

const STATUS_OPTIONS = ['all', 'open', 'investigating', 'resolved', 'escalated'] as const

/**
 * "The Case File" — Dispute list as compact case cards, NOT a table.
 * Each dispute: case # (mono) + customer + type tag + age + status.
 */
export function DisputeList({ onSelectDispute, onCreateDispute }: DisputeListProps) {
  const { t } = useTranslation('finance')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return MOCK_DISPUTES
    return MOCK_DISPUTES.filter((d) => d.status === statusFilter)
  }, [statusFilter])

  return (
    <div className="space-y-0">
      {/* ─── Header ────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        {/* Filter pills */}
        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                statusFilter === s
                  ? 'bg-black/[0.06] dark:bg-white/[0.06] text-black/70 dark:text-white/70 font-medium'
                  : 'text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60'
              }`}
            >
              {s === 'all' ? t('disputes.all', 'All') : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <Button
          onPress={onCreateDispute}
          className="rounded-md bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 transition-colors"
        >
          {t('disputes.createDispute', 'New Dispute')}
        </Button>
      </div>

      {/* ─── Case cards ────────────────────────────────── */}
      <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
        {filtered.map((dispute) => {
          const sla = getSLARemaining(dispute.slaDeadline)

          return (
            <div
              key={dispute.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDispute(dispute.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSelectDispute(dispute.id) }}
              className={`px-5 py-3 cursor-pointer transition-colors ${
                sla.isOverdue
                  ? 'bg-red-500/[0.02] hover:bg-red-500/[0.05]'
                  : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Left: case info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {/* Case # — mono blue */}
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[#2563EB] font-medium">
                      {dispute.id}
                    </span>
                    {/* Type tag */}
                    <span className="rounded-full bg-black/[0.04] dark:bg-white/[0.04] px-2 py-0.5 text-[10px] text-black/40 dark:text-white/40">
                      {dispute.reason}
                    </span>
                  </div>

                  <div className="text-xs text-black/60 dark:text-white/60">
                    {dispute.customerName}
                  </div>
                  <div className="text-[11px] text-black/25 dark:text-white/25 mt-0.5 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {dispute.invoiceNumber}
                  </div>
                </div>

                {/* Right: metadata */}
                <div className="flex items-center gap-4 shrink-0">
                  {/* Assigned */}
                  {dispute.assignedTo && (
                    <span className="text-[10px] text-black/25 dark:text-white/25">
                      {dispute.assignedTo}
                    </span>
                  )}

                  {/* SLA */}
                  {sla.isOverdue ? (
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] font-medium text-red-600 dark:text-red-400 tracking-wider uppercase">
                      Overdue
                    </span>
                  ) : (
                    <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] ${
                      sla.isUrgent ? 'text-red-600 dark:text-red-400 font-medium' : 'text-black/25 dark:text-white/25'
                    }`}>
                      {sla.text}
                    </span>
                  )}

                  {/* Age */}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/20 dark:text-white/20 min-w-[28px] text-end">
                    {getAge(dispute.createdAt)}
                  </span>

                  {/* Status */}
                  <StatusBadge status={dispute.status} variant="dispute" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <span className="text-xs text-black/25 dark:text-white/25 tracking-wider uppercase">
            {t('disputes.noDisputes', 'No disputes')}
          </span>
        </div>
      )}
    </div>
  )
}
