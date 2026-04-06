import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Select, SelectValue, ListBox, ListBoxItem, Popover, Label } from 'react-aria-components'
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

/**
 * Invoice dispute list (Section 5.9 equivalent).
 * Table with dispute details, SLA countdown, status filtering.
 */
export function DisputeList({ onSelectDispute, onCreateDispute }: DisputeListProps) {
  const { t } = useTranslation('finance')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return MOCK_DISPUTES
    return MOCK_DISPUTES.filter((d) => d.status === statusFilter)
  }, [statusFilter])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select
            selectedKey={statusFilter}
            onSelectionChange={(key) => setStatusFilter(key as string)}
            className="flex items-center gap-2"
          >
            <Label className="text-sm text-black/60 dark:text-white/60">{t('disputes.filter', 'Filter')}:</Label>
            <Button className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-1.5 text-sm text-start min-w-[140px]">
              <SelectValue />
            </Button>
            <Popover className="w-[--trigger-width] rounded-lg border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-xl shadow-lg">
              <ListBox className="p-1 outline-none">
                <ListBoxItem id="all" className="rounded px-3 py-2 text-sm cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10">
                  {t('disputes.all', 'All')}
                </ListBoxItem>
                <ListBoxItem id="open" className="rounded px-3 py-2 text-sm cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10">
                  {t('disputes.open', 'Open')}
                </ListBoxItem>
                <ListBoxItem id="investigating" className="rounded px-3 py-2 text-sm cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10">
                  {t('disputes.investigating', 'Investigating')}
                </ListBoxItem>
                <ListBoxItem id="resolved" className="rounded px-3 py-2 text-sm cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10">
                  {t('disputes.resolved', 'Resolved')}
                </ListBoxItem>
                <ListBoxItem id="escalated" className="rounded px-3 py-2 text-sm cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10">
                  {t('disputes.escalated', 'Escalated')}
                </ListBoxItem>
              </ListBox>
            </Popover>
          </Select>
        </div>
        <Button
          onPress={onCreateDispute}
          className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 transition-colors"
        >
          {t('disputes.createDispute', 'Create Dispute')}
        </Button>
      </div>

      {/* Dispute table */}
      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 bg-black/3 dark:bg-white/3">
              <th className="px-3 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('disputes.disputeNo', 'Dispute #')}</th>
              <th className="px-3 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('disputes.invoiceNo', 'Invoice #')}</th>
              <th className="px-3 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('disputes.customer', 'Customer')}</th>
              <th className="px-3 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('disputes.reason', 'Reason')}</th>
              <th className="px-3 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('disputes.status', 'Status')}</th>
              <th className="px-3 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('disputes.assignedTo', 'Assigned To')}</th>
              <th className="px-3 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('disputes.created', 'Created')}</th>
              <th className="px-3 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('disputes.slaDeadline', 'SLA Deadline')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((dispute) => {
              const sla = getSLARemaining(dispute.slaDeadline)
              return (
                <tr
                  key={dispute.id}
                  onClick={() => onSelectDispute(dispute.id)}
                  className="border-b border-black/5 dark:border-white/5 cursor-pointer hover:bg-[#2563EB]/3 transition-colors"
                >
                  <td className="px-3 py-2.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-[#2563EB] font-medium">
                    {dispute.id}
                  </td>
                  <td className="px-3 py-2.5 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {dispute.invoiceNumber}
                  </td>
                  <td className="px-3 py-2.5">{dispute.customerName}</td>
                  <td className="px-3 py-2.5 max-w-[160px] truncate">{dispute.reason}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={dispute.status} variant="dispute" />
                  </td>
                  <td className="px-3 py-2.5 text-black/60 dark:text-white/60">
                    {dispute.assignedTo ?? '--'}
                  </td>
                  <td className="px-3 py-2.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                    {new Date(dispute.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2.5">
                    {sla.isOverdue ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">
                        OVERDUE
                      </span>
                    ) : (
                      <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs ${sla.isUrgent ? 'text-red-600 dark:text-red-400 font-bold' : 'text-black/60 dark:text-white/60'}`}>
                        {sla.text}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-sm text-black/40 dark:text-white/40">
          {t('disputes.noDisputes', 'No disputes found')}
        </div>
      )}
    </div>
  )
}
