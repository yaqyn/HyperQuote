import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from 'react-aria-components'
import { getInvoices, batchSendInvoices, batchGenerateInvoices } from '../../../lib/server/finance-invoices'
import { useFinanceStore } from '../../../stores/finance'
import { CurrencyCell } from '../shared/CurrencyCell'
import { StatusBadge } from '../shared/StatusBadge'
import type { Invoice, InvoiceStatus, ETASubmissionStatus } from '../../../types/finance'

// ─── Status grouping for "The Document Press" ──────────
type StatusGroup = 'draft' | 'sent' | 'overdue' | 'paid'

const STATUS_GROUP_MAP: Record<InvoiceStatus, StatusGroup> = {
  draft: 'draft',
  sent: 'sent',
  viewed: 'sent',
  partially_paid: 'sent',
  paid: 'paid',
  overdue: 'overdue',
  collections: 'overdue',
  disputed: 'overdue',
  resolved: 'paid',
  adjusted: 'paid',
  written_off: 'paid',
}

const GROUP_ORDER: StatusGroup[] = ['draft', 'sent', 'overdue', 'paid']

const GROUP_LABELS: Record<StatusGroup, string> = {
  draft: 'Draft',
  sent: 'Sent',
  overdue: 'Overdue',
  paid: 'Paid',
}

// ─── ETA badge ────────────────────────────────────────
const ETA_BADGE_STYLES: Record<ETASubmissionStatus, string> = {
  pending: 'bg-black/[0.06] dark:bg-white/[0.06] text-black/40 dark:text-white/40',
  submitted: 'bg-[#2563EB]/10 text-[#2563EB]',
  accepted: 'bg-green-500/10 text-green-600 dark:text-green-400',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

const ETA_LABELS: Record<ETASubmissionStatus, string> = {
  pending: 'ETA Pending',
  submitted: 'ETA Sent',
  accepted: 'ETA OK',
  rejected: 'ETA Rejected',
  error: 'ETA Error',
}

function ETABadge({ status }: { status: ETASubmissionStatus }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide uppercase ${ETA_BADGE_STYLES[status]}`}
    >
      {ETA_LABELS[status]}
    </span>
  )
}

// ─── Age calculation ───────────────────────────────────
function getAge(issuedDate: string): string {
  const now = new Date()
  const issued = new Date(issuedDate)
  const days = Math.floor((now.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1d'
  return `${days}d`
}

const STATUS_FILTERS: InvoiceStatus[] = [
  'draft', 'sent', 'viewed', 'partially_paid', 'paid',
  'overdue', 'collections', 'disputed', 'resolved', 'adjusted', 'written_off',
]

/**
 * "The Document Press" — Dense invoice list grouped by status.
 * Each invoice is a single row: invoice # (mono blue) + customer + amount (mono)
 * + due date + status dot + age. Grouped by Draft | Sent | Overdue | Paid.
 */
export function InvoiceList() {
  const { t } = useTranslation('finance')
  const setSelectedInvoiceId = useFinanceStore((s) => s.setSelectedInvoiceId)

  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('draft')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState<'send' | 'generate' | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'invoices'],
    queryFn: () => getInvoices(),
    staleTime: 30_000,
  })

  const invoices = data?.invoices ?? []

  // Filter
  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter && inv.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!inv.number.toLowerCase().includes(q) && !inv.customerName.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [invoices, statusFilter, search])

  // Group by status
  const grouped = useMemo(() => {
    const groups: Record<StatusGroup, Invoice[]> = { draft: [], sent: [], overdue: [], paid: [] }
    for (const inv of filtered) {
      const group = STATUS_GROUP_MAP[inv.status] ?? 'sent'
      groups[group].push(inv)
    }
    return groups
  }, [filtered])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((inv) => inv.id)))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-xs tracking-widest uppercase text-black/30 dark:text-white/30">
          Loading
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* ─── Batch send banner for drafts ──────────────── */}
      {(() => {
        const draftCount = invoices.filter((inv) => inv.status === 'draft').length
        if (draftCount === 0) return null
        return (
          <div className="flex items-center gap-4 px-5 py-3 border-b-2 border-[#2563EB]/20 bg-[#2563EB]/[0.04]">
            <span className="size-2 rounded-full bg-[#2563EB] shrink-0" />
            <span className="text-sm font-medium text-black dark:text-white flex-1">
              {t('invoicing.draftsReady', '{{count}} draft invoices ready to send', { count: draftCount })}
            </span>
            <CurrencyCell
              amount={invoices.filter((inv) => inv.status === 'draft').reduce((s, inv) => s + inv.grandTotal, 0)}
              className="text-sm text-black/50 dark:text-white/50"
            />
            <Button
              isDisabled={batchLoading === 'send'}
              onPress={async () => {
                const draftIds = invoices.filter((inv) => inv.status === 'draft').map((inv) => inv.id)
                setBatchLoading('send')
                try {
                  await batchSendInvoices({ data: { invoiceIds: draftIds, channels: ['portal', 'email'] } })
                } finally {
                  setBatchLoading(null)
                }
              }}
              className="rounded-md bg-[#2563EB] text-white px-5 py-2 text-sm font-medium hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-colors"
            >
              {batchLoading === 'send'
                ? t('invoicing.sending', 'Sending...')
                : t('invoicing.sendAllDrafts', 'Send all {{count}} drafts', { count: draftCount })}
            </Button>
          </div>
        )
      })()}

      {/* ─── Toolbar ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        {/* Status filter pills */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setStatusFilter('')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              statusFilter === ''
                ? 'bg-black/[0.06] dark:bg-white/[0.06] text-black dark:text-white'
                : 'text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70'
            }`}
          >
            {t('invoicing.all', 'All')}
          </button>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                statusFilter === s
                  ? 'bg-black/[0.06] dark:bg-white/[0.06] text-black dark:text-white font-medium'
                  : 'text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('invoicing.searchPlaceholder', 'Search...')}
          className="w-48 bg-transparent border-b border-black/10 dark:border-white/10 px-0 py-1 text-xs outline-none placeholder:text-black/25 dark:placeholder:text-white/25 focus:border-[#2563EB] transition-colors"
        />
      </div>

      {/* ─── Bulk Action Bar ────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeIn' }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-2 border-b border-[#2563EB]/20 bg-[#2563EB]/[0.03]">
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[#2563EB]">
                {selectedIds.size}
              </span>
              <span className="text-xs text-black/40 dark:text-white/40">
                {t('invoicing.selected', 'selected')}
              </span>
              <div className="flex-1" />
              <Button
                isDisabled={batchLoading === 'send'}
                onPress={async () => {
                  setBatchLoading('send')
                  try {
                    await batchSendInvoices({ data: { invoiceIds: Array.from(selectedIds), channels: ['portal', 'email'] } })
                    setSelectedIds(new Set())
                  } finally {
                    setBatchLoading(null)
                  }
                }}
                className="rounded-md bg-[#2563EB] text-white px-3 py-1 text-xs font-medium hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 disabled:opacity-50 transition-colors"
              >
                {batchLoading === 'send' ? t('invoicing.sending', 'Sending...') : t('invoicing.batchSend', 'Batch Send')}
              </Button>
              <Button
                isDisabled={batchLoading === 'generate'}
                onPress={async () => {
                  setBatchLoading('generate')
                  try {
                    await batchGenerateInvoices({ data: { deliveryIds: Array.from(selectedIds) } })
                    setSelectedIds(new Set())
                  } finally {
                    setBatchLoading(null)
                  }
                }}
                className="rounded-md border border-black/10 dark:border-white/10 px-3 py-1 text-xs font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.03] disabled:opacity-50 transition-colors"
              >
                {batchLoading === 'generate' ? t('invoicing.generating', 'Generating...') : t('invoicing.batchGenerate', 'Batch Generate')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Grouped Invoice Rows ───────────────────────── */}
      <div>
        {/* Column header */}
        <div className="grid grid-cols-[28px_1fr_1.5fr_1fr_0.8fr_80px_50px_72px] items-center gap-0 px-5 py-2 text-[10px] tracking-wider uppercase text-black/30 dark:text-white/30 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-black/15 dark:border-white/15 size-3"
            />
          </div>
          <div>{t('invoicing.invoiceNumber', 'Invoice')}</div>
          <div>{t('invoicing.customer', 'Customer')}</div>
          <div className="text-end">{t('invoicing.amount', 'Amount')}</div>
          <div>{t('invoicing.dueDate', 'Due')}</div>
          <div className="text-center">{t('invoicing.status', 'Status')}</div>
          <div className="text-end">{t('invoicing.age', 'Age')}</div>
          <div className="text-center">ETA</div>
        </div>

        {GROUP_ORDER.map((group) => {
          const items = grouped[group]
          if (items.length === 0) return null

          return (
            <div key={group}>
              {/* Group header */}
              <div className="px-5 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-[10px] tracking-widest uppercase font-medium text-black/35 dark:text-white/35">
                  {GROUP_LABELS[group]}
                </span>
                <span className="ms-2 font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/20 dark:text-white/20">
                  {items.length}
                </span>
              </div>

              {/* Invoice rows */}
              {items.map((inv) => (
                <div
                  key={inv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedInvoiceId(inv.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSelectedInvoiceId(inv.id) }}
                  className="grid grid-cols-[28px_1fr_1.5fr_1fr_0.8fr_80px_50px_72px] items-center gap-0 px-5 py-2.5 border-b border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(inv.id)}
                      onChange={() => toggleSelect(inv.id)}
                      className="rounded border-black/15 dark:border-white/15 size-3"
                    />
                  </div>

                  {/* Invoice # — mono blue */}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[#2563EB] font-medium">
                    {inv.number}
                  </span>

                  {/* Customer */}
                  <span className="text-xs text-black/70 dark:text-white/70 truncate pe-3">
                    {inv.customerName}
                  </span>

                  {/* Amount — mono, end-aligned */}
                  <span className="text-end">
                    <CurrencyCell amount={inv.grandTotal} className="text-xs" />
                  </span>

                  {/* Due date — mono */}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
                    {inv.dueDate}
                  </span>

                  {/* Status dot + label */}
                  <div className="text-center">
                    <StatusBadge status={inv.status} />
                  </div>

                  {/* Age */}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-end text-black/30 dark:text-white/30">
                    {getAge(inv.issuedDate)}
                  </span>

                  {/* ETA badge */}
                  <div className="flex justify-center">
                    <ETABadge status={inv.etaStatus} />
                  </div>
                </div>
              ))}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <span className="text-xs text-black/25 dark:text-white/25 tracking-wider uppercase">
              {t('invoicing.noInvoices', 'No invoices')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
